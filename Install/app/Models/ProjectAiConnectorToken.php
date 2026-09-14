<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * Bearer credential for the client-side AI Connector (MCP), scoped to
 * exactly one project. Improves on the existing plaintext Project::api_token
 * pattern by hashing the token at rest — only token_last_four is ever
 * readable again after issue() returns the raw value once.
 */
class ProjectAiConnectorToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'ai_connector_activation_id',
        'name',
        'token_hash',
        'token_last_four',
        'scopes',
        'last_used_at',
        'expires_at',
        'revoked_at',
        'created_by',
    ];

    protected $hidden = [
        'token_hash',
    ];

    protected function casts(): array
    {
        return [
            'scopes' => 'array',
            'last_used_at' => 'datetime',
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function activation(): BelongsTo
    {
        return $this->belongsTo(ProjectAiConnectorActivation::class, 'ai_connector_activation_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function hasScope(string $scope): bool
    {
        $scopes = $this->scopes ?? [];

        return in_array('*', $scopes, true) || in_array($scope, $scopes, true);
    }

    /**
     * Issue a new token, returning the raw value exactly once.
     *
     * @return array{raw: string, model: ProjectAiConnectorToken}
     */
    public static function issue(
        Project $project,
        ?ProjectAiConnectorActivation $activation,
        string $name,
        array $scopes,
        ?int $createdBy = null,
        ?\DateTimeInterface $expiresAt = null
    ): array {
        $raw = Str::random(48);

        $token = static::create([
            'project_id' => $project->id,
            'ai_connector_activation_id' => $activation?->id,
            'name' => $name,
            'token_hash' => hash('sha256', $raw),
            'token_last_four' => substr($raw, -4),
            'scopes' => $scopes,
            'expires_at' => $expiresAt,
            'created_by' => $createdBy,
        ]);

        return ['raw' => $raw, 'model' => $token];
    }
}
