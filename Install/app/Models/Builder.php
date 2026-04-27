<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Http;

class Builder extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'url',
        'port',
        'server_key',
        'status',
        'max_iterations',
        'last_triggered_at',
    ];

    protected function casts(): array
    {
        return [
            'last_triggered_at' => 'datetime',
        ];
    }

    /**
     * Get all projects assigned to this builder.
     */
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    /**
     * Scope: Active builders only.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Get the full URL including port.
     */
    public function getFullUrlAttribute(): string
    {
        return "{$this->url}:{$this->port}";
    }

    /**
     * Select an available active builder at random.
     */
    public static function selectOptimal(): ?self
    {
        return static::active()->inRandomOrder()->first();
    }

    /**
     * Check if the builder is healthy/online.
     */
    public function checkHealth(): bool
    {
        try {
            $response = Http::timeout(5)->get("{$this->full_url}/health");

            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get builder details (version, sessions) from the builder's root URL.
     *
     * @return array{version: string, sessions: int, online: bool}
     */
    public function getDetails(): array
    {
        try {
            $response = Http::timeout(5)->get($this->full_url);

            if ($response->successful()) {
                $data = $response->json();

                return [
                    'version' => $data['version'] ?? '-',
                    'sessions' => $data['sessions'] ?? 0,
                    'online' => true,
                ];
            }

            return [
                'version' => '-',
                'sessions' => 0,
                'online' => false,
            ];
        } catch (\Exception $e) {
            return [
                'version' => '-',
                'sessions' => 0,
                'online' => false,
            ];
        }
    }
}
