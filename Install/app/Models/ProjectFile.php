<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

class ProjectFile extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'filename',
        'original_filename',
        'path',
        'mime_type',
        'size',
        'source',
        'checksum',
    ];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
        ];
    }

    /**
     * Get the project that owns the file.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get a signed URL for the file.
     */
    public function getUrl(): string
    {
        return URL::signedRoute('project.file.serve', [
            'project' => $this->project_id,
            'file' => $this->id,
        ], now()->addHours(1));
    }

    /**
     * Get public URL for this file.
     * Can be used directly in img src, href, or CSS without authentication.
     * Safe because filenames are UUIDs (unguessable).
     */
    public function getApiUrl(): string
    {
        return url("/api/files/{$this->project_id}/{$this->filename}");
    }

    /**
     * Check if the file is an image.
     */
    public function isImage(): bool
    {
        return str_starts_with($this->mime_type, 'image/');
    }

    /**
     * Check if the file is a PDF.
     */
    public function isPdf(): bool
    {
        return $this->mime_type === 'application/pdf';
    }

    /**
     * Check if the file is a video.
     */
    public function isVideo(): bool
    {
        return str_starts_with($this->mime_type, 'video/');
    }

    /**
     * Check if the file is an audio file.
     */
    public function isAudio(): bool
    {
        return str_starts_with($this->mime_type, 'audio/');
    }

    /**
     * Get human-readable file size.
     */
    public function getHumanReadableSize(): string
    {
        $bytes = $this->size;

        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2).' GB';
        }

        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2).' MB';
        }

        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 2).' KB';
        }

        return $bytes.' bytes';
    }

    /**
     * Get the full storage path for the file.
     */
    public function getStoragePath(): string
    {
        return "project-files/{$this->project_id}/{$this->filename}";
    }

    /**
     * Check if the file exists on disk.
     */
    public function existsOnDisk(): bool
    {
        return Storage::disk('local')->exists($this->getStoragePath());
    }

    /**
     * Delete the file from disk.
     */
    public function deleteFromDisk(): bool
    {
        return Storage::disk('local')->delete($this->getStoragePath());
    }
}
