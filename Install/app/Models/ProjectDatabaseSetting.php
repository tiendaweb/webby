<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectDatabaseSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'database_mode',
        'credentials',
        'base_paths',
        'is_connected',
        'last_tested_at',
        'last_error',
    ];

    protected function casts(): array
    {
        return [
            'credentials' => 'encrypted:array',
            'base_paths' => 'array',
            'is_connected' => 'boolean',
            'last_tested_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
