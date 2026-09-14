<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class McpToolCall extends Model
{
    protected $fillable = [
        'server',
        'tool_name',
        'admin_user_id',
        'project_id',
        'connector_token_id',
        'arguments',
        'success',
        'error_message',
        'ip_address',
        'duration_ms',
    ];

    protected function casts(): array
    {
        return [
            'arguments' => 'array',
            'success' => 'boolean',
        ];
    }
}
