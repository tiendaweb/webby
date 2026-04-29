<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatTemplate extends Model
{
    use HasFactory;

    public const VISIBILITY_PRIVATE = 'private';
    public const VISIBILITY_ACCOUNT = 'account';
    public const VISIBILITY_TEAM = 'team';

    protected $fillable = [
        'user_id',
        'name',
        'system_prompt',
        'starter_prompt',
        'variables_json',
        'visibility',
        'provider_preferences',
    ];

    protected function casts(): array
    {
        return [
            'variables_json' => 'array',
            'provider_preferences' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
