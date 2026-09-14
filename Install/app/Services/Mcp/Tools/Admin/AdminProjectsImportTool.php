<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\Project;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\Concerns\SnapshotsWorkspace;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;
use Illuminate\Support\Str;

/**
 * Upload a whole project at once: a ZIP handed over inline (base64) or
 * fetched from a URL, extracted into an existing workspace or into a
 * project created on the spot.
 *
 * This is the "subir un proyecto por el conector" path — admin_files_write
 * is fine for a handful of files, but a site with dozens of assets is one
 * archive, not forty tool calls that each risk a truncated argument.
 *
 * Extraction reuses ProjectWorkspaceService::importZipFromPath, so the
 * workspace's own rules still apply: path traversal is rejected, and only
 * allowed extensions land on disk (anything else is skipped, and counted in
 * the result so the caller can see what did not make it).
 */
class AdminProjectsImportTool extends McpTool
{
    use ResolvesAdminTargets;
    use SnapshotsWorkspace;

    /** Decoded archive ceiling. Bigger uploads belong in the file manager. */
    private const MAX_BYTES = 26_214_400; // 25 MiB

    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_projects_import';
    }

    public function description(): string
    {
        return 'Upload a ZIP into a project workspace — pass zip_base64 (inline, up to 25 MB) or zip_url (https). '
            .'Targets an existing project via project_id, or creates a new one when "name" is given instead. '
            .'Use this instead of many admin_files_write calls when moving a whole site.';
    }

    public function requiredAbility(): ?string
    {
        return 'files:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'project_id' => ['type' => 'string', 'description' => 'Existing project id or subdomain. Omit to create a new project.'],
                'name' => ['type' => 'string', 'description' => 'Name of the project to create when project_id is omitted.'],
                'user_id' => ['type' => ['integer', 'string'], 'description' => 'Owner of the new project. Defaults to the calling admin.'],
                'user_email' => ['type' => 'string'],
                'zip_base64' => ['type' => 'string', 'description' => 'Base64-encoded ZIP archive (a data: prefix is tolerated).'],
                'zip_url' => ['type' => 'string', 'description' => 'Public http(s) URL to download the ZIP from.'],
            ],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        try {
            $bytes = $this->resolveArchive($arguments);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        $created = false;

        try {
            if (trim((string) ($arguments['project_id'] ?? '')) !== '') {
                $project = $this->resolveProject($arguments);
            } else {
                $name = trim((string) ($arguments['name'] ?? ''));

                if ($name === '') {
                    return ['success' => false, 'message' => 'Pass "project_id" to import into an existing project, or "name" to create one.'];
                }

                $owner = $this->resolveOwner($arguments, $context);
                $project = Project::create([
                    'user_id' => $owner->id,
                    'type' => 'blank',
                    'name' => $name,
                    'description' => $arguments['description'] ?? null,
                    'initial_prompt' => '[MCP import]',
                    'build_status' => 'completed',
                    'last_viewed_at' => now(),
                    'api_token' => Str::random(32),
                ]);
                $created = true;
            }
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        // Punto de retorno antes de que el zip pise lo que había. En un
        // proyecto recién creado no hay nada que guardar, así que no se
        // toma: una instantánea de un workspace vacío sólo gasta disco.
        $revisionId = $created
            ? null
            : $this->snapshotBeforeWrite(
                $project,
                $context instanceof \App\Models\User ? $context : null,
                'Antes de importar un zip',
                ['tool' => $this->name()],
            );

        $tmp = tempnam(sys_get_temp_dir(), 'mcp-import-').'.zip';

        try {
            file_put_contents($tmp, $bytes);
            $result = $this->workspace->importZipFromPath($project, $tmp);
        } catch (\Throwable $e) {
            if ($created) {
                $project->forceDelete();
            }

            return ['success' => false, 'message' => 'Import failed: '.$e->getMessage()];
        } finally {
            @unlink($tmp);
        }

        if (($result['extracted_files'] ?? 0) === 0 && $created) {
            $project->forceDelete();

            return ['success' => false, 'message' => 'The archive contained no importable file; the new project was rolled back.'];
        }

        $project->refresh();

        return [
            'success' => true,
            'revision_id' => $revisionId,
            'project' => $this->projectSummary($project),
            'project_created' => $created,
            'extracted_files' => $result['extracted_files'] ?? 0,
            'runtime' => $result['runtime'] ?? null,
            'preview_warning' => $result['preview_warning'] ?? null,
        ];
    }

    /**
     * @return string raw ZIP bytes
     */
    private function resolveArchive(array $arguments): string
    {
        $base64 = (string) ($arguments['zip_base64'] ?? '');
        $url = trim((string) ($arguments['zip_url'] ?? ''));

        if ($base64 !== '') {
            // Tolerate a data: URI wrapper, which several clients add.
            if (str_contains($base64, ',') && str_starts_with($base64, 'data:')) {
                $base64 = substr($base64, strpos($base64, ',') + 1);
            }

            $bytes = base64_decode(preg_replace('/\s+/', '', $base64) ?? '', true);

            if ($bytes === false) {
                throw new \RuntimeException('"zip_base64" is not valid base64.');
            }

            return $this->assertArchive($bytes);
        }

        if ($url === '') {
            throw new \RuntimeException('Pass "zip_base64" or "zip_url".');
        }

        $this->assertFetchableUrl($url);

        $bytes = @file_get_contents($url, false, stream_context_create([
            'http' => ['timeout' => 30, 'follow_location' => 0, 'user_agent' => config('app.name').' MCP importer'],
        ]));

        if ($bytes === false) {
            throw new \RuntimeException("Could not download the archive from {$url}.");
        }

        return $this->assertArchive($bytes);
    }

    private function assertArchive(string $bytes): string
    {
        if ($bytes === '') {
            throw new \RuntimeException('The archive is empty.');
        }

        if (strlen($bytes) > self::MAX_BYTES) {
            throw new \RuntimeException('The archive is larger than the 25 MB import limit.');
        }

        // "PK\x03\x04" (or the empty-archive variant) — fail here rather than
        // deep inside ZipArchive with an unhelpful message.
        if (! str_starts_with($bytes, "PK\x03\x04") && ! str_starts_with($bytes, "PK\x05\x06")) {
            throw new \RuntimeException('That does not look like a ZIP archive.');
        }

        return $bytes;
    }

    /**
     * Only public http(s). Without this the tool would be an SSRF primitive
     * pointed at whatever else runs on this host or its private network.
     */
    private function assertFetchableUrl(string $url): void
    {
        $parts = parse_url($url);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = (string) ($parts['host'] ?? '');

        if (! in_array($scheme, ['http', 'https'], true) || $host === '') {
            throw new \RuntimeException('"zip_url" must be an http(s) URL.');
        }

        $ip = filter_var($host, FILTER_VALIDATE_IP) ? $host : gethostbyname($host);

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            throw new \RuntimeException('"zip_url" must point at a public host.');
        }
    }
}
