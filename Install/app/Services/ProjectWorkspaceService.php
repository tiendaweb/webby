<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectFile;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\Process\Process;
use ZipArchive;

class ProjectWorkspaceService
{
    private const MAX_EDIT_BYTES = 2_000_000;
    private const MAX_ZIP_FILES = 5000;
    private const MAX_ZIP_UNCOMPRESSED_BYTES = 200_000_000;
    private const FRONTEND_BUILD_TIMEOUT_SECONDS = 120;

    /** Ceiling for a file pulled in from a URL. */
    private const MAX_DOWNLOAD_BYTES = 26_214_400; // 25 MiB

    /** Extensions whose bytes are not worth scanning for text matches. */
    private const BINARY_EXTENSIONS = [
        'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'ico', 'pdf', 'woff', 'woff2',
        'ttf', 'otf', 'eot', 'mp3', 'wav', 'ogg', 'mp4', 'webm', 'mov', 'wasm',
        'xls', 'xlsx', 'doc', 'docx', 'ppt', 'pptx', 'lockb',
    ];

    private const ALLOWED_EXTENSIONS = [
        'html', 'htm', 'css', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx',
        'php', 'json', 'lock', 'txt', 'md', 'xml', 'csv', 'sql', 'svg',
        'yaml', 'yml', 'webmanifest',
        'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'ico',
        'woff', 'woff2', 'ttf', 'otf', 'eot', 'pdf', 'map',
        'xls', 'xlsx', 'doc', 'docx', 'ppt', 'pptx',
        'mp3', 'wav', 'ogg', 'mp4', 'webm', 'mov',
        'wasm', 'lockb',
    ];

    private const ALLOWED_EXTENSIONLESS_FILENAMES = [
        'error_log',
        '.gitignore',
        '.editorconfig',
        '.prettierrc',
        'license',
        'readme',
    ];

    private const FRONTEND_ENTRYPOINTS = [
        'src/main.tsx',
        'src/main.ts',
        'src/main.jsx',
        'src/main.js',
        'src/index.tsx',
        'src/index.ts',
        'src/index.jsx',
        'src/index.js',
    ];

    public function root(Project $project): string
    {
        return "project-files/{$project->id}";
    }

    public function rootPath(Project $project): string
    {
        return Storage::disk('local')->path($this->root($project));
    }

    public function ensureRoot(Project $project): void
    {
        Storage::disk('local')->makeDirectory($this->root($project));
    }

    public function normalizePath(string $path): string
    {
        $path = trim(str_replace('\\', '/', $path));
        $path = ltrim($path, '/');

        if ($path === '' || $path === '.') {
            throw new InvalidArgumentException('Invalid path');
        }

        if (str_contains($path, "\0") || str_starts_with($path, '../') || str_contains($path, '/../') || str_contains($path, '..')) {
            throw new InvalidArgumentException('Invalid path');
        }

        if (preg_match('#(^|/)\.(git|env|htaccess|user\.ini)(/|$)#i', $path)) {
            throw new InvalidArgumentException('Protected path');
        }

        return $path;
    }

    public function listFiles(Project $project): array
    {
        $this->ensureRoot($project);
        $root = $this->root($project);
        $files = [];
        $directories = [];

        foreach (Storage::disk('local')->allDirectories($root) as $directory) {
            $relative = ltrim(Str::after($directory, $root), '/');
            if ($relative !== '') {
                $directories[$relative] = [
                    'path' => $relative,
                    'name' => basename($relative),
                    'size' => 0,
                    'is_dir' => true,
                    'mod_time' => now()->toIso8601String(),
                ];
            }
        }

        foreach (Storage::disk('local')->allFiles($root) as $file) {
            $relative = ltrim(Str::after($file, $root), '/');
            if ($relative === '') {
                continue;
            }

            $files[] = [
                'path' => $relative,
                'name' => basename($relative),
                'size' => Storage::disk('local')->size($file),
                'is_dir' => false,
                'mod_time' => now()->toIso8601String(),
            ];
        }

        return [
            'files' => array_values(array_merge($directories, $files)),
            'runtime' => $this->detectRuntime($project),
        ];
    }

    public function readFile(Project $project, string $path): array
    {
        $relative = $this->normalizePath($path);
        $storagePath = "{$this->root($project)}/{$relative}";

        if (! Storage::disk('local')->exists($storagePath)) {
            throw new RuntimeException('File not found');
        }

        if (Storage::disk('local')->size($storagePath) > self::MAX_EDIT_BYTES) {
            throw new RuntimeException('File is too large to edit in the browser');
        }

        return [
            'path' => $relative,
            'content' => Storage::disk('local')->get($storagePath),
        ];
    }

    public function writeFile(Project $project, string $path, string $content): array
    {
        $relative = $this->normalizePath($path);
        $this->assertAllowedExtension($relative);
        $this->ensureRoot($project);

        $storagePath = "{$this->root($project)}/{$relative}";
        Storage::disk('local')->put($storagePath, $content);
        $this->indexFile($project, $relative, 'editor');

        // The file is saved either way, but a failed build is reported
        // rather than swallowed: it means the published site still shows
        // the previous version, and the caller needs to know that.
        $previewWarning = $this->syncPreviewSafely($project);

        return ['success' => true, 'path' => $relative, 'preview_warning' => $previewWarning];
    }

    /**
     * Change parts of a file in place, instead of rewriting the whole thing.
     *
     * Every edit is a literal find/replace (or a regex when asked), applied
     * in order. The whole set is all-or-nothing: if any "find" matches
     * nothing, or matches a different number of times than the caller
     * expected, nothing is written and the reasons come back. That is the
     * point — a rewrite-the-file tool silently loses whatever the model did
     * not know about, and a find/replace that quietly matches zero times is
     * indistinguishable from one that worked.
     *
     * @param  array<int, array{find: string, replace: string, all?: bool, regex?: bool, expected_occurrences?: int}>  $edits
     */
    public function applyEdits(Project $project, string $path, array $edits, bool $dryRun = false): array
    {
        $relative = $this->normalizePath($path);
        $this->assertAllowedExtension($relative);

        $storagePath = "{$this->root($project)}/{$relative}";

        if (! Storage::disk('local')->exists($storagePath)) {
            throw new RuntimeException("File not found: {$relative}");
        }

        if (Storage::disk('local')->size($storagePath) > self::MAX_EDIT_BYTES) {
            throw new RuntimeException("File is too large to edit: {$relative}");
        }

        if ($edits === []) {
            throw new RuntimeException('At least one edit is required.');
        }

        $original = Storage::disk('local')->get($storagePath);
        $content = $original;
        $applied = [];
        $problems = [];

        foreach ($edits as $index => $edit) {
            $find = (string) ($edit['find'] ?? '');
            $replace = (string) ($edit['replace'] ?? '');
            $all = (bool) ($edit['all'] ?? true);
            $isRegex = (bool) ($edit['regex'] ?? false);

            if ($find === '') {
                $problems[] = "Edit #{$index}: \"find\" is required.";

                continue;
            }

            if ($isRegex) {
                $pattern = '#'.str_replace('#', '\#', $find).'#u';
                $occurrences = @preg_match_all($pattern, $content);

                if ($occurrences === false) {
                    $problems[] = "Edit #{$index}: the regular expression is not valid.";

                    continue;
                }
            } else {
                $occurrences = substr_count($content, $find);
            }

            if ($occurrences === 0) {
                $problems[] = "Edit #{$index}: no match for \"".Str::limit($find, 80).'".';

                continue;
            }

            $expected = $edit['expected_occurrences'] ?? null;

            if ($expected !== null && (int) $expected !== $occurrences) {
                $problems[] = "Edit #{$index}: expected {$expected} match(es) but found {$occurrences}.";

                continue;
            }

            if (! $all && $occurrences > 1) {
                $problems[] = "Edit #{$index}: \"find\" matches {$occurrences} times; make it unique or set all=true.";

                continue;
            }

            $limit = $all ? -1 : 1;
            $content = $isRegex
                ? preg_replace('#'.str_replace('#', '\#', $find).'#u', $replace, $content, $limit)
                : $this->replaceLiteral($content, $find, $replace, $limit);

            $applied[] = ['index' => $index, 'occurrences' => $occurrences, 'regex' => $isRegex];
        }

        if ($problems !== []) {
            // Nothing was written: $content is a local copy.
            return [
                'success' => false,
                'message' => 'No edit was applied: '.implode(' ', $problems),
                'path' => $relative,
                'problems' => $problems,
            ];
        }

        if ($dryRun) {
            return [
                'success' => true,
                'dry_run' => true,
                'path' => $relative,
                'edits_applied' => $applied,
                'bytes_before' => strlen($original),
                'bytes_after' => strlen($content),
                'unchanged' => $content === $original,
            ];
        }

        Storage::disk('local')->put($storagePath, $content);
        $this->indexFile($project, $relative, 'editor');
        $previewWarning = $this->syncPreviewSafely($project);

        return [
            'success' => true,
            'path' => $relative,
            'edits_applied' => $applied,
            'bytes_before' => strlen($original),
            'bytes_after' => strlen($content),
            'preview_warning' => $previewWarning,
        ];
    }

    /**
     * str_replace with a replacement limit, which str_replace itself lacks.
     */
    private function replaceLiteral(string $subject, string $find, string $replace, int $limit): string
    {
        if ($limit < 0) {
            return str_replace($find, $replace, $subject);
        }

        $position = strpos($subject, $find);

        return $position === false
            ? $subject
            : substr_replace($subject, $replace, $position, strlen($find));
    }

    /**
     * Pull a file from a public URL straight into the workspace — the way a
     * connector gets an image into a site without a human downloading it and
     * re-uploading it by hand.
     *
     * The destination extension still has to be one the workspace allows, so
     * this cannot be used to smuggle in file types the upload path rejects.
     */
    public function downloadFile(Project $project, string $url, ?string $path = null, bool $overwrite = false): array
    {
        $this->assertPublicHttpUrl($url);

        $temporary = tempnam(sys_get_temp_dir(), 'webby-download-');

        try {
            $response = Http::timeout(30)
                ->withHeaders(['User-Agent' => config('app.name').' workspace downloader'])
                ->sink($temporary)
                ->get($url);

            if (! $response->successful()) {
                throw new RuntimeException("The download failed with HTTP {$response->status()}.");
            }

            $bytes = (int) (@filesize($temporary) ?: 0);

            if ($bytes === 0) {
                throw new RuntimeException('The downloaded file is empty.');
            }

            if ($bytes > self::MAX_DOWNLOAD_BYTES) {
                throw new RuntimeException('The file is larger than the 25 MB download limit.');
            }

            $contentType = strtolower(explode(';', (string) $response->header('Content-Type'))[0]);
            $relative = $this->normalizePath($path ?: $this->filenameFromUrl($url, $contentType));
            $this->assertAllowedExtension($relative);

            $storagePath = "{$this->root($project)}/{$relative}";

            if (! $overwrite && Storage::disk('local')->exists($storagePath)) {
                throw new RuntimeException("File already exists: {$relative}. Pass overwrite=true to replace it.");
            }

            $this->ensureRoot($project);
            Storage::disk('local')->put($storagePath, file_get_contents($temporary));
            $this->indexFile($project, $relative, 'upload');
        } finally {
            @unlink($temporary);
        }

        $previewWarning = $this->syncPreviewSafely($project);

        return [
            'success' => true,
            'path' => $relative,
            'bytes' => $bytes,
            'content_type' => $contentType ?: null,
            'source_url' => $url,
            'preview_warning' => $previewWarning,
        ];
    }

    /**
     * Escribe un fichero binario que llega en base64.
     *
     * `writeFile()` escribe texto y `downloadFile()` trae algo **de una URL
     * pública**. Entre las dos quedaba un hueco: una imagen que el asistente
     * genera, o que la persona le pega en la conversación, no vive en
     * ninguna URL y no es texto. Sin esto, la única salida era subirla antes
     * a algún sitio ajeno para poder bajarla — pasear un fichero por
     * internet para moverlo dos carpetas.
     *
     * Mismos límites que la descarga: mismas extensiones permitidas y el
     * mismo tope de tamaño, porque el destino es el mismo workspace.
     */
    public function writeBinaryFile(Project $project, string $path, string $base64, bool $overwrite = false): array
    {
        $limpio = preg_replace('/^data:[^;]*;base64,/i', '', trim($base64)) ?? '';
        $contenido = base64_decode(strtr($limpio, '-_', '+/'), true);

        if ($contenido === false) {
            throw new RuntimeException('The content is not valid base64.');
        }

        $bytes = strlen($contenido);

        if ($bytes === 0) {
            throw new RuntimeException('The decoded file is empty.');
        }

        if ($bytes > self::MAX_DOWNLOAD_BYTES) {
            throw new RuntimeException('The file is larger than the 25 MB limit.');
        }

        $relative = $this->normalizePath($path);
        $this->assertAllowedExtension($relative);

        $storagePath = "{$this->root($project)}/{$relative}";

        if (! $overwrite && Storage::disk('local')->exists($storagePath)) {
            throw new RuntimeException("File already exists: {$relative}. Pass overwrite=true to replace it.");
        }

        $this->ensureRoot($project);
        Storage::disk('local')->put($storagePath, $contenido);
        $this->indexFile($project, $relative, 'upload');

        return [
            'success' => true,
            'path' => $relative,
            'bytes' => $bytes,
            'preview_warning' => $this->syncPreviewSafely($project),
        ];
    }

    /**
     * Work out where a downloaded file should land when the caller did not
     * say. Falls back to the content type when the URL carries no usable
     * extension, which is common for CDN and generated-image links.
     */
    private function filenameFromUrl(string $url, string $contentType): string
    {
        $name = basename((string) parse_url($url, PHP_URL_PATH));
        $name = preg_replace('/[^A-Za-z0-9._-]/', '-', $name) ?? '';
        $name = trim($name, '-.');
        $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));

        if ($extension === '') {
            $extension = match ($contentType) {
                'image/png' => 'png',
                'image/jpeg', 'image/jpg' => 'jpg',
                'image/gif' => 'gif',
                'image/webp' => 'webp',
                'image/avif' => 'avif',
                'image/svg+xml' => 'svg',
                'image/x-icon', 'image/vnd.microsoft.icon' => 'ico',
                'application/pdf' => 'pdf',
                'font/woff2' => 'woff2',
                'font/woff' => 'woff',
                'text/css' => 'css',
                'application/javascript', 'text/javascript' => 'js',
                'application/json' => 'json',
                default => throw new RuntimeException(
                    "Could not work out a file type for {$url} (content-type: ".($contentType ?: 'unknown').'). Pass an explicit "path".'
                ),
            };

            $name = ($name !== '' ? $name : 'download').'.'.$extension;
        }

        return 'assets/'.$name;
    }

    /**
     * Only public http(s). Without this, a URL argument turns the connector
     * into an SSRF primitive aimed at whatever else runs on this host.
     */
    private function assertPublicHttpUrl(string $url): void
    {
        $parts = parse_url($url);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = (string) ($parts['host'] ?? '');

        if (! in_array($scheme, ['http', 'https'], true) || $host === '') {
            throw new RuntimeException('The URL must be http or https.');
        }

        $ip = filter_var($host, FILTER_VALIDATE_IP) ? $host : gethostbyname($host);

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            throw new RuntimeException('The URL must point at a public host.');
        }
    }

    /**
     * Find where something lives before changing it — the read half of
     * editing one detail without rewriting the file.
     *
     * @return array{matches: array<int, array{path: string, line: int, text: string}>, files_searched: int, truncated: bool}
     */
    public function searchFiles(
        Project $project,
        string $query,
        ?string $pathPrefix = null,
        bool $regex = false,
        bool $caseSensitive = false,
        int $limit = 100,
    ): array {
        if (trim($query) === '') {
            throw new RuntimeException('A search query is required.');
        }

        $root = $this->root($project);
        $this->ensureRoot($project);
        $limit = min(max($limit, 1), 500);

        $pattern = $regex
            ? '#'.str_replace('#', '\#', $query).'#u'.($caseSensitive ? '' : 'i')
            : null;

        if ($pattern !== null && @preg_match($pattern, '') === false) {
            throw new RuntimeException('The regular expression is not valid.');
        }

        $matches = [];
        $filesSearched = 0;
        $truncated = false;

        foreach (Storage::disk('local')->allFiles($root) as $file) {
            $relative = ltrim(Str::after($file, $root), '/');

            if ($pathPrefix !== null && $pathPrefix !== '' && ! str_starts_with($relative, ltrim($pathPrefix, '/'))) {
                continue;
            }

            if (in_array(strtolower(pathinfo($relative, PATHINFO_EXTENSION)), self::BINARY_EXTENSIONS, true)) {
                continue;
            }

            if (Storage::disk('local')->size($file) > self::MAX_EDIT_BYTES) {
                continue;
            }

            $filesSearched++;
            $lines = preg_split('/\r\n|\r|\n/', Storage::disk('local')->get($file)) ?: [];

            foreach ($lines as $number => $line) {
                $hit = $pattern !== null
                    ? preg_match($pattern, $line) === 1
                    : ($caseSensitive ? str_contains($line, $query) : stripos($line, $query) !== false);

                if (! $hit) {
                    continue;
                }

                if (count($matches) >= $limit) {
                    $truncated = true;
                    break 2;
                }

                $matches[] = [
                    'path' => $relative,
                    'line' => $number + 1,
                    'text' => Str::limit(trim($line), 300),
                ];
            }
        }

        return ['matches' => $matches, 'files_searched' => $filesSearched, 'truncated' => $truncated];
    }

    public function createDirectory(Project $project, string $path): array
    {
        $relative = $this->normalizePath($path);
        $this->ensureRoot($project);
        Storage::disk('local')->makeDirectory("{$this->root($project)}/{$relative}");

        return ['success' => true, 'path' => $relative];
    }

    public function deletePath(Project $project, string $path): array
    {
        $relative = $this->normalizePath($path);
        $storagePath = "{$this->root($project)}/{$relative}";

        if (Storage::disk('local')->exists($storagePath)) {
            Storage::disk('local')->delete($storagePath);
            ProjectFile::where('project_id', $project->id)->where('path', $storagePath)->delete();
        } elseif (Storage::disk('local')->exists($storagePath.'/')) {
            Storage::disk('local')->deleteDirectory($storagePath);
            ProjectFile::where('project_id', $project->id)->where('path', 'like', $storagePath.'/%')->delete();
        }

        $previewWarning = $this->syncPreviewSafely($project);

        return ['success' => true, 'preview_warning' => $previewWarning];
    }

    public function renamePath(Project $project, string $from, string $to): array
    {
        $sourceRelative = $this->normalizePath($from);
        $targetRelative = $this->normalizePath($to);

        if ($sourceRelative === $targetRelative) {
            return ['success' => true, 'path' => $targetRelative];
        }

        $disk = Storage::disk('local');
        $root = $this->root($project);
        $sourcePath = "{$root}/{$sourceRelative}";
        $targetPath = "{$root}/{$targetRelative}";
        $sourceFullPath = $disk->path($sourcePath);
        $targetFullPath = $disk->path($targetPath);
        $sourceIsFile = File::isFile($sourceFullPath);
        $sourceIsDirectory = File::isDirectory($sourceFullPath);

        if (! $sourceIsFile && ! $sourceIsDirectory) {
            throw new RuntimeException('Source path not found');
        }

        if (File::exists($targetFullPath)) {
            throw new RuntimeException('Destination path already exists');
        }

        if ($sourceIsDirectory && str_starts_with($targetRelative.'/', $sourceRelative.'/')) {
            throw new InvalidArgumentException('Cannot move a directory inside itself');
        }

        if ($sourceIsFile) {
            $this->assertAllowedExtension($targetRelative);
        }

        $this->ensureParentDirectory($project, $targetRelative);

        if ($sourceIsFile) {
            if (! $disk->move($sourcePath, $targetPath)) {
                throw new RuntimeException('Failed to rename file');
            }

            $this->updateIndexedFile($project, $sourcePath, $targetPath, $targetRelative);
        } else {
            if (! File::moveDirectory($sourceFullPath, $targetFullPath, false)) {
                throw new RuntimeException('Failed to rename folder');
            }

            $this->updateIndexedDirectory($project, $sourcePath, $targetPath, $targetRelative);
        }

        $previewWarning = $this->syncPreviewSafely($project);

        return ['success' => true, 'path' => $targetRelative, 'preview_warning' => $previewWarning];
    }

    public function uploadFile(Project $project, UploadedFile $file, bool $overwrite = false): array
    {
        $relative = $this->normalizePath($file->getClientOriginalName());
        $this->assertAllowedExtension($relative);
        $storagePath = "{$this->root($project)}/{$relative}";

        if (! $overwrite && Storage::disk('local')->exists($storagePath)) {
            throw new RuntimeException("File already exists: {$relative}");
        }

        Storage::disk('local')->put($storagePath, file_get_contents($file->getRealPath()));
        $this->indexFile($project, $relative, 'upload');
        $previewWarning = $this->syncPreviewSafely($project);

        return $this->filePayload($project, $relative) + ['preview_warning' => $previewWarning];
    }

    /**
     * Extract a template ZIP from a filesystem path into the project workspace.
     * Skips template.json (metadata only) and always overwrites.
     */
    /**
     * Empaqueta el workspace entero en un zip, en la ruta que se le indique.
     *
     * Es la otra mitad de `importZipFromPath()`, que llevaba tiempo sola. Sin
     * exportación no hay copia de seguridad antes de un cambio grande: las
     * revisiones cubren lo que el sistema decidió versionar, no lo que a una
     * persona se le ocurra guardar por su cuenta antes de tocar nada.
     *
     * Vive junto al importador a propósito. Son un par —lo que una escribe la
     * otra tiene que poder leerlo— y separarlas en dos ficheros es como se
     * empiezan a distanciar.
     *
     * @return array{files:int, bytes:int}
     */
    public function exportZip(Project $project, string $destination): array
    {
        $root = $this->root($project);

        if (! Storage::disk('local')->exists($root)) {
            throw new RuntimeException('This project has no files to export yet.');
        }

        $zip = new \ZipArchive;

        if ($zip->open($destination, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Could not create the archive.');
        }

        $ficheros = 0;
        $bytes = 0;

        try {
            foreach (Storage::disk('local')->allFiles($root) as $file) {
                $relative = ltrim(Str::after($file, $root), '/');
                $absolute = Storage::disk('local')->path($file);

                if (! $zip->addFile($absolute, $relative)) {
                    throw new RuntimeException("Could not add {$relative} to the archive.");
                }

                $ficheros++;
                $bytes += (int) (@filesize($absolute) ?: 0);
            }

            if ($ficheros === 0) {
                throw new RuntimeException('This project has no files to export yet.');
            }
        } catch (\Throwable $e) {
            $zip->close();
            @unlink($destination);

            throw $e;
        }

        $zip->close();

        return ['files' => $ficheros, 'bytes' => $bytes];
    }

    public function importZipFromPath(Project $project, string $zipFilePath): array
    {
        $zip = new ZipArchive();

        if ($zip->open($zipFilePath) !== true) {
            throw new RuntimeException('Failed to open template ZIP file');
        }

        $this->ensureRoot($project);
        $imported = 0;

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $stat = $zip->statIndex($i);
            $name = $stat['name'] ?? '';

            if (str_ends_with($name, '/')) {
                continue;
            }

            // Skip template metadata file
            if (basename($name) === 'template.json') {
                continue;
            }

            $relative = $this->normalizeZipEntry($name);
            if ($relative === null) {
                continue;
            }

            $ext = strtolower(pathinfo($relative, PATHINFO_EXTENSION));
            if ($ext && ! in_array($ext, self::ALLOWED_EXTENSIONS, true)) {
                continue;
            }

            $contents = $zip->getFromIndex($i);
            if ($contents === false) {
                continue;
            }

            Storage::disk('local')->put("{$this->root($project)}/{$relative}", $contents);
            $this->indexFile($project, $relative, 'template');
            $imported++;
        }

        $zip->close();
        $previewWarning = $this->syncPreviewSafely($project);


        // Mismo motivo que en syncPreview: una importación disparada desde
        // consola dejaría el workspace de root y el editor no podría leerlo.
        $this->normalizeOwnership($this->rootPath($project));

        return [
            'success' => true,
            'extracted_files' => $imported,
            'runtime' => $this->detectRuntime($project),
            'preview_warning' => $previewWarning,
        ];
    }

    public function importZip(Project $project, UploadedFile $zipFile, bool $overwrite = false): array
    {
        $zip = new ZipArchive();

        if ($zip->open($zipFile->getRealPath()) !== true) {
            throw new RuntimeException('Failed to open ZIP file');
        }

        $entries = [];
        $conflicts = [];
        $totalBytes = 0;

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $stat = $zip->statIndex($i);
            $name = $stat['name'] ?? '';

            if (str_ends_with($name, '/')) {
                continue;
            }

            $relative = $this->normalizeZipEntry($name);
            if ($relative === null) {
                continue;
            }

            $this->assertAllowedExtension($relative);
            $totalBytes += (int) ($stat['size'] ?? 0);

            if (count($entries) >= self::MAX_ZIP_FILES || $totalBytes > self::MAX_ZIP_UNCOMPRESSED_BYTES) {
                $zip->close();
                throw new RuntimeException('ZIP file exceeds project import limits');
            }

            $target = "{$this->root($project)}/{$relative}";
            if (! $overwrite && Storage::disk('local')->exists($target)) {
                $conflicts[] = $relative;
            }

            $entries[] = [$i, $relative];
        }

        if ($conflicts !== []) {
            $zip->close();
            return [
                'success' => false,
                'conflicts' => $conflicts,
                'message' => 'Some files already exist. Enable overwrite to replace them.',
            ];
        }

        $this->ensureRoot($project);
        $imported = [];

        foreach ($entries as [$index, $relative]) {
            $contents = $zip->getFromIndex($index);
            if ($contents === false) {
                continue;
            }

            Storage::disk('local')->put("{$this->root($project)}/{$relative}", $contents);
            $this->indexFile($project, $relative, 'upload');
            $imported[] = $this->filePayload($project, $relative);
        }

        $zip->close();
        $previewWarning = $this->syncPreviewSafely($project);

        return [
            'success' => true,
            'preview_warning' => $previewWarning,
            'files' => $imported,
            'extracted_files' => count($imported),
            'runtime' => $this->detectRuntime($project),
        ];
    }

    /**
     * Rebuild the preview, atomically.
     *
     * The build happens in a staging directory and only replaces the live
     * one once it has succeeded. This matters because the preview is what
     * the published site is served from: the previous version used to wipe
     * the directory *before* building, so one TSX file that failed to
     * compile took the customer's published site down to a 404 until the
     * next successful build. Now a failed build leaves the last good
     * preview exactly where it was, and the error propagates to the caller.
     */
    public function syncPreview(Project $project): void
    {
        $livePath = "previews/{$project->id}";
        $stagingPath = "previews/staging-{$project->id}";
        $root = $this->root($project);

        // No workspace yet: there is nothing to serve, so clear the preview.
        if (! Storage::disk('local')->exists($root)) {
            if (Storage::disk('local')->exists($livePath)) {
                Storage::disk('local')->deleteDirectory($livePath);
            }
            Storage::disk('local')->makeDirectory($livePath);

            return;
        }

        if (Storage::disk('local')->exists($stagingPath)) {
            Storage::disk('local')->deleteDirectory($stagingPath);
        }

        Storage::disk('local')->makeDirectory($stagingPath);

        try {
            if ($this->isBuildableFrontendProject($project)) {
                $this->buildFrontendPreview($project, $stagingPath);
            } else {
                foreach (Storage::disk('local')->allFiles($root) as $file) {
                    $relative = ltrim(Str::after($file, $root), '/');
                    Storage::disk('local')->put("{$stagingPath}/{$relative}", Storage::disk('local')->get($file));
                }
            }

            $this->injectPreviewBaseTag($project, $stagingPath);
        } catch (\Throwable $e) {
            Storage::disk('local')->deleteDirectory($stagingPath);

            throw $e;
        }

        // Swap. Everything above this line is reversible; nothing below it
        // can fail in a way that leaves the site without a preview for long.
        $liveAbsolute = Storage::disk('local')->path($livePath);
        $stagingAbsolute = Storage::disk('local')->path($stagingPath);

        if (is_dir($liveAbsolute)) {
            File::deleteDirectory($liveAbsolute);
        }

        File::moveDirectory($stagingAbsolute, $liveAbsolute);

        $this->normalizeOwnership($liveAbsolute);
    }

    /**
     * Deja el árbol con el mismo dueño que el resto de `storage`.
     *
     * Quien llame a esto puede no ser el servidor web. Un comando de consola,
     * una tarea de cron o un `docker exec` corren como root, y los ficheros
     * que escriben quedan de root; como las carpetas de `storage` son 0700,
     * php-fpm —que corre como www-data— no puede ni listarlas. El resultado
     * es un sitio publicado que **devuelve 404 en todo** con los ficheros
     * perfectamente puestos en disco, que es de los fallos más difíciles de
     * leer: no hay error, no hay traza, sólo ausencia.
     *
     * El dueño correcto no se escribe a mano: se lee de la propia carpeta de
     * `storage`, que es la que el contenedor ya dejó bien. Y sólo se toca lo
     * que difiere, para no recorrer miles de ficheros por gusto.
     *
     * Sólo root puede cambiar de dueño, así que cuando corre el servidor web
     * esto es una comprobación barata que no hace nada — que es exactamente
     * lo que debe pasar: en ese caso los ficheros ya nacieron bien.
     */
    private function normalizeOwnership(string $absolutePath): void
    {
        if (! function_exists('posix_geteuid') || posix_geteuid() !== 0) {
            return;
        }

        $referencia = @stat(Storage::disk('local')->path(''));
        if ($referencia === false) {
            return;
        }

        $uid = $referencia['uid'];
        $gid = $referencia['gid'];

        $ajustar = function (string $ruta) use ($uid, $gid): void {
            $actual = @lstat($ruta);
            if ($actual === false || ($actual['uid'] === $uid && $actual['gid'] === $gid)) {
                return;
            }
            @chown($ruta, $uid);
            @chgrp($ruta, $gid);
        };

        $ajustar($absolutePath);

        if (! is_dir($absolutePath)) {
            return;
        }

        $iterador = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($absolutePath, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST,
        );

        foreach ($iterador as $entrada) {
            $ajustar($entrada->getPathname());
        }
    }

    /**
     * Rebuild the preview and hand back the failure instead of throwing.
     *
     * Callers that have already written the file want to report "saved, but
     * the site did not rebuild" rather than fail the whole operation — the
     * write really did happen, and hiding the build error (which is what
     * this used to do with an empty catch) is how a broken build went
     * unnoticed.
     *
     * @return string|null the build error, or null when the preview is current
     */
    public function syncPreviewSafely(Project $project): ?string
    {
        try {
            $this->syncPreview($project);

            return null;
        } catch (\Throwable $e) {
            report($e);

            return Str::limit($e->getMessage(), 800);
        }
    }

    public function detectRuntime(Project $project): string
    {
        $root = $this->root($project);

        if (Storage::disk('local')->exists("{$root}/index.php")) {
            return 'php';
        }

        if ($this->isBuildableFrontendProject($project)) {
            return 'frontend';
        }

        return 'html';
    }

    private function isBuildableFrontendProject(Project $project): bool
    {
        $root = $this->root($project);

        if (
            Storage::disk('local')->exists("{$root}/index.php")
            || ! Storage::disk('local')->exists("{$root}/package.json")
            || ! Storage::disk('local')->exists("{$root}/index.html")
        ) {
            return false;
        }

        $package = $this->packageJson($project);

        if (! $this->packageLooksLikeFrontendApp($package)) {
            return false;
        }

        foreach (self::FRONTEND_ENTRYPOINTS as $entrypoint) {
            if (Storage::disk('local')->exists("{$root}/{$entrypoint}")) {
                return true;
            }
        }

        $index = Storage::disk('local')->get("{$root}/index.html");

        return str_contains($index, '/src/')
            || str_contains($index, './src/')
            || str_contains($index, '.tsx')
            || str_contains($index, '.jsx')
            || str_contains($index, '.ts');
    }

    private function packageJson(Project $project): array
    {
        $content = Storage::disk('local')->get("{$this->root($project)}/package.json");
        $decoded = json_decode($content, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function packageLooksLikeFrontendApp(array $package): bool
    {
        $scripts = $package['scripts'] ?? [];
        if (is_array($scripts) && str_contains((string) ($scripts['build'] ?? ''), 'vite')) {
            return true;
        }

        $dependencies = array_merge(
            array_keys(is_array($package['dependencies'] ?? null) ? $package['dependencies'] : []),
            array_keys(is_array($package['devDependencies'] ?? null) ? $package['devDependencies'] : [])
        );

        return count(array_intersect($dependencies, [
            'vite',
            'react',
            'react-dom',
            '@vitejs/plugin-react',
            'typescript',
        ])) > 0;
    }

    private function buildFrontendPreview(Project $project, string $previewPath): void
    {
        $projectRoot = $this->rootPath($project);
        $previewRoot = Storage::disk('local')->path($previewPath);
        $cacheDir = storage_path("framework/cache/webby-vite/{$project->id}");

        File::ensureDirectoryExists($cacheDir);

        $script = sprintf(<<<'JS'
import { build } from 'vite';
import react from '@vitejs/plugin-react';

const projectRoot = %s;

// Tags JSX elements with data-webby-source="relative/path.tsx:line" so the
// preview inspector can map rendered DOM nodes back to their source file.
const webbySourceAttribute = ({ types: t }) => ({
  visitor: {
    JSXOpeningElement(path, state) {
      const loc = path.node.loc;
      if (!loc) return;

      const file = state.file.opts.filename || '';
      if (!file.startsWith(projectRoot) || file.includes('node_modules')) return;

      // Only tag host elements (div, h1, ...); component tags receive props,
      // not DOM attributes, so tagging them would be useless or noisy.
      const name = path.node.name;
      if (name.type !== 'JSXIdentifier' || !/^[a-z]/.test(name.name)) return;

      const alreadyTagged = path.node.attributes.some(
        attr => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'data-webby-source'
      );
      if (alreadyTagged) return;

      const relative = file.slice(projectRoot.length).replace(/^\/+/, '');
      path.node.attributes.push(
        t.jsxAttribute(
          t.jsxIdentifier('data-webby-source'),
          t.stringLiteral(relative + ':' + loc.start.line)
        )
      );
    }
  }
});

await build({
  root: projectRoot,
  base: './',
  plugins: [react({ babel: { plugins: [webbySourceAttribute] } })],
  cacheDir: %s,
  logLevel: 'warn',
  build: {
    outDir: %s,
    emptyOutDir: true,
    sourcemap: false
  }
});
JS,
            json_encode($projectRoot),
            json_encode($cacheDir),
            json_encode($previewRoot)
        );

        $process = new Process(['node', '--input-type=module', '-e', $script], base_path(), [
            'CI' => 'true',
            'NODE_ENV' => 'production',
            'PATH' => base_path('node_modules/.bin').PATH_SEPARATOR.(getenv('PATH') ?: '/usr/local/bin:/usr/bin:/bin'),
        ]);
        $process->setTimeout(self::FRONTEND_BUILD_TIMEOUT_SECONDS);
        $process->run();

        if (! $process->isSuccessful()) {
            $output = trim($process->getErrorOutput() ?: $process->getOutput());
            // Vite colours its output; the escape codes are noise once the
            // message is travelling through JSON to a model or a log.
            $output = preg_replace('/\e\[[0-9;]*m/', '', $output) ?? $output;

            throw new RuntimeException('Frontend build failed: '.Str::limit($output ?: 'unknown error', 1000));
        }

        if (! is_file("{$previewRoot}/index.html")) {
            throw new RuntimeException('Frontend build did not produce an index.html file.');
        }
    }

    private function injectPreviewBaseTag(Project $project, string $previewPath): void
    {
        $indexPath = "{$previewPath}/index.html";

        if (! Storage::disk('local')->exists($indexPath)) {
            return;
        }

        $html = Storage::disk('local')->get($indexPath);
        $baseTag = '<base href="/preview/'.$project->id.'/">';
        $count = 0;
        $updated = preg_replace('/<base\s+[^>]*href=["\'][^"\']*["\'][^>]*>/i', $baseTag, $html, 1, $count);

        if ($count === 0) {
            $updated = preg_replace('/<head(\s[^>]*)?>/i', '$0'."\n    {$baseTag}", $html, 1, $count);
        }

        if ($count === 0) {
            $updated = $baseTag."\n".$html;
        }

        Storage::disk('local')->put($indexPath, $updated ?? $html);
    }

    private function normalizeZipEntry(string $name): ?string
    {
        $name = trim(str_replace('\\', '/', $name));
        $name = ltrim($name, '/');

        if ($name === '' || str_starts_with($name, '__MACOSX/') || str_ends_with($name, '/.DS_Store')) {
            return null;
        }

        if (preg_match('#(^|/)\.(git|env|htaccess|user\.ini)(/|$)#i', $name)) {
            return null;
        }

        return $this->normalizePath($name);
    }

    private function assertAllowedExtension(string $path): void
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $filename = strtolower(basename($path));

        if ($extension === '' && in_array($filename, self::ALLOWED_EXTENSIONLESS_FILENAMES, true)) {
            return;
        }

        if ($extension === '' || ! in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            throw new InvalidArgumentException("File type is not allowed: {$path}");
        }
    }

    private function indexFile(Project $project, string $relative, string $source): void
    {
        $storagePath = "{$this->root($project)}/{$relative}";
        $fullPath = Storage::disk('local')->path($storagePath);

        ProjectFile::where('project_id', $project->id)->where('path', $storagePath)->delete();

        ProjectFile::create([
            'project_id' => $project->id,
            'filename' => Str::uuid().'.'.pathinfo($relative, PATHINFO_EXTENSION),
            'original_filename' => $relative,
            'path' => $storagePath,
            'mime_type' => File::mimeType($fullPath) ?: 'application/octet-stream',
            'size' => Storage::disk('local')->size($storagePath),
            'source' => $source,
            'checksum' => hash_file('sha256', $fullPath),
        ]);
    }

    private function ensureParentDirectory(Project $project, string $relative): void
    {
        $parent = dirname($relative);

        if ($parent === '.' || $parent === '') {
            return;
        }

        Storage::disk('local')->makeDirectory("{$this->root($project)}/{$parent}");
    }

    private function updateIndexedFile(Project $project, string $sourcePath, string $targetPath, string $targetRelative): void
    {
        $fullPath = Storage::disk('local')->path($targetPath);

        ProjectFile::where('project_id', $project->id)
            ->where('path', $sourcePath)
            ->update([
                'path' => $targetPath,
                'original_filename' => $targetRelative,
                'mime_type' => File::mimeType($fullPath) ?: 'application/octet-stream',
                'size' => Storage::disk('local')->size($targetPath),
                'checksum' => hash_file('sha256', $fullPath),
            ]);
    }

    private function updateIndexedDirectory(Project $project, string $sourcePath, string $targetPath, string $targetRelative): void
    {
        ProjectFile::where('project_id', $project->id)
            ->where('path', 'like', $sourcePath.'/%')
            ->get()
            ->each(function (ProjectFile $file) use ($sourcePath, $targetPath, $targetRelative) {
                $newPath = $targetPath.Str::after($file->path, $sourcePath);
                $relative = $targetRelative.Str::after($file->path, $sourcePath);

                $file->update([
                    'path' => $newPath,
                    'original_filename' => ltrim($relative, '/'),
                ]);
            });
    }

    private function filePayload(Project $project, string $relative): array
    {
        $record = ProjectFile::where('project_id', $project->id)
            ->where('path', "{$this->root($project)}/{$relative}")
            ->latest()
            ->first();

        return [
            'id' => $record?->id,
            'filename' => $relative,
            'size' => $record?->getHumanReadableSize() ?? null,
            'type' => $record?->mime_type,
            'url' => $record?->getApiUrl(),
        ];
    }
}
