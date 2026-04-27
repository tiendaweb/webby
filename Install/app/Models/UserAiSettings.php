<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserAiSettings extends Model
{
    /**
     * Available sound styles.
     */
    public const SOUND_STYLES = ['minimal', 'playful', 'retro', 'sci-fi'];

    protected $fillable = [
        'user_id',
        'preferred_provider',
        'preferred_model',
        'openai_api_key',
        'anthropic_api_key',
        'grok_api_key',
        'deepseek_api_key',
        'zhipu_api_key',
        'sounds_enabled',
        'sound_style',
        'sound_volume',
    ];

    protected $casts = [
        'openai_api_key' => 'encrypted',
        'anthropic_api_key' => 'encrypted',
        'grok_api_key' => 'encrypted',
        'deepseek_api_key' => 'encrypted',
        'zhipu_api_key' => 'encrypted',
        'sounds_enabled' => 'boolean',
        'sound_volume' => 'integer',
    ];

    protected $hidden = [
        'openai_api_key',
        'anthropic_api_key',
        'grok_api_key',
        'deepseek_api_key',
        'zhipu_api_key',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if user has an API key configured for the given provider.
     */
    public function hasApiKeyFor(string $provider): bool
    {
        return match ($provider) {
            'openai' => ! empty($this->openai_api_key),
            'anthropic' => ! empty($this->anthropic_api_key),
            'grok' => ! empty($this->grok_api_key),
            'deepseek' => ! empty($this->deepseek_api_key),
            'zhipu' => ! empty($this->zhipu_api_key),
            default => false,
        };
    }

    /**
     * Get the API key for the given provider.
     */
    public function getApiKeyFor(string $provider): ?string
    {
        return match ($provider) {
            'openai' => $this->openai_api_key,
            'anthropic' => $this->anthropic_api_key,
            'grok' => $this->grok_api_key,
            'deepseek' => $this->deepseek_api_key,
            'zhipu' => $this->zhipu_api_key,
            default => null,
        };
    }

    /**
     * Check if any custom API key is configured.
     */
    public function hasAnyApiKey(): bool
    {
        return $this->hasApiKeyFor('openai')
            || $this->hasApiKeyFor('anthropic')
            || $this->hasApiKeyFor('grok')
            || $this->hasApiKeyFor('deepseek')
            || $this->hasApiKeyFor('zhipu');
    }

    /**
     * Get masked API key for display (shows last 4 characters).
     */
    public function getMaskedApiKeyFor(string $provider): ?string
    {
        $key = $this->getApiKeyFor($provider);

        if (empty($key)) {
            return null;
        }

        $length = strlen($key);
        if ($length <= 8) {
            return str_repeat('*', $length);
        }

        return str_repeat('*', $length - 4).substr($key, -4);
    }

    /**
     * Get sound settings as an array for frontend.
     */
    public function getSoundSettings(): array
    {
        return [
            'enabled' => $this->sounds_enabled ?? true,
            'style' => $this->sound_style ?? 'playful',
            'volume' => $this->sound_volume ?? 100,
        ];
    }
}
