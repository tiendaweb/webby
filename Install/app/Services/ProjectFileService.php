<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectFile;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProjectFileService
{
    /**
     * Upload a file for a project.
     */
    public function upload(Project $project, UploadedFile $file, string $source = 'dashboard'): ProjectFile
    {
        $user = $project->user;
        $plan = $user?->getCurrentPlan();

        if (! $plan || ! $plan->fileStorageEnabled()) {
            throw new \Exception('File storage is not enabled for your plan.');
        }

        $canUpload = $this->canUpload($project, $file->getSize(), $file->getMimeType());

        if (! $canUpload['allowed']) {
            throw new \Exception(implode(' ', $canUpload['errors']));
        }

        // Generate unique filename
        $extension = $file->getClientOriginalExtension();
        $filename = Str::uuid().'.'.$extension;

        // Store the file
        $storagePath = "project-files/{$project->id}";
        $file->storeAs($storagePath, $filename, 'local');

        // Calculate checksum
        $fullPath = Storage::disk('local')->path("{$storagePath}/{$filename}");
        $checksum = hash_file('sha256', $fullPath);

        // Create the file record
        $projectFile = ProjectFile::create([
            'project_id' => $project->id,
            'filename' => $filename,
            'original_filename' => $file->getClientOriginalName(),
            'path' => "{$storagePath}/{$filename}",
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'source' => $source,
            'checksum' => $checksum,
        ]);

        // Update project storage used
        $project->incrementStorageUsed($file->getSize());

        return $projectFile;
    }

    /**
     * Delete a file.
     */
    public function delete(ProjectFile $file): bool
    {
        $project = $file->project;
        $size = $file->size;

        // Delete from storage
        $file->deleteFromDisk();

        // Delete the record
        $file->delete();

        // Update project storage used
        $project->decrementStorageUsed($size);

        return true;
    }

    /**
     * Get files for a project.
     */
    public function getFiles(Project $project, ?string $path = null): Collection
    {
        $query = $project->files();

        if ($path !== null) {
            $query->where('path', 'like', $path.'%');
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    /**
     * Check if a file can be uploaded.
     *
     * @return array{allowed: bool, errors: array<string>}
     */
    public function canUpload(Project $project, int $size, string $mimeType): array
    {
        $errors = [];
        $user = $project->user;
        $plan = $user?->getCurrentPlan();

        if (! $plan || ! $plan->fileStorageEnabled()) {
            return [
                'allowed' => false,
                'errors' => ['File storage is not enabled for your plan.'],
            ];
        }

        // Check storage limit
        if (! $plan->hasUnlimitedStorage()) {
            $remainingBytes = $user->getRemainingStorageBytes();
            if ($size > $remainingBytes) {
                $errors[] = 'Not enough storage space. Please upgrade your plan or delete some files.';
            }
        }

        // Check file size limit
        $maxFileSizeBytes = $plan->getMaxFileSizeMb() * 1024 * 1024;
        if ($size > $maxFileSizeBytes) {
            $errors[] = "File size exceeds the maximum allowed ({$plan->getMaxFileSizeMb()} MB).";
        }

        // Check file type
        $allowedTypes = $plan->getAllowedFileTypes();
        if ($allowedTypes !== null && ! $this->isFileTypeAllowed($mimeType, $allowedTypes)) {
            $errors[] = 'This file type is not allowed for your plan.';
        }

        return [
            'allowed' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Calculate total storage used for a project.
     */
    public function calculateStorageUsed(Project $project): int
    {
        return (int) $project->files()->sum('size');
    }

    /**
     * Recalculate and sync storage used for a project.
     */
    public function syncStorageUsed(Project $project): int
    {
        $actualUsed = $this->calculateStorageUsed($project);
        $project->update(['storage_used_bytes' => $actualUsed]);

        return $actualUsed;
    }

    /**
     * Check if a MIME type matches the allowed types.
     */
    protected function isFileTypeAllowed(string $mimeType, array $allowedTypes): bool
    {
        foreach ($allowedTypes as $allowedType) {
            // Handle wildcards like "image/*"
            if (str_ends_with($allowedType, '/*')) {
                $typePrefix = str_replace('/*', '/', $allowedType);
                if (str_starts_with($mimeType, $typePrefix)) {
                    return true;
                }
            } elseif ($mimeType === $allowedType) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the contents of a file.
     */
    public function getFileContents(ProjectFile $file): ?string
    {
        if (! $file->existsOnDisk()) {
            return null;
        }

        return Storage::disk('local')->get($file->getStoragePath());
    }

    /**
     * Get a streaming response for a file.
     */
    public function streamFile(ProjectFile $file): ?\Symfony\Component\HttpFoundation\StreamedResponse
    {
        if (! $file->existsOnDisk()) {
            return null;
        }

        return Storage::disk('local')->download(
            $file->getStoragePath(),
            $file->original_filename,
            ['Content-Type' => $file->mime_type]
        );
    }
}
