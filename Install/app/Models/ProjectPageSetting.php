<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectPageSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'page_path',
        'title',
        'description',
        'slug',
        'canonical_url',
        'social_image',
        'favicon',
        'indexable',
    ];

    protected function casts(): array
    {
        return [
            'indexable' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
