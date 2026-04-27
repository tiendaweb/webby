<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LandingContent extends Model
{
    protected $fillable = [
        'section_id',
        'locale',
        'field',
        'value',
    ];

    /**
     * JSON fields that should be auto-decoded/encoded.
     */
    protected array $jsonFields = [
        'headlines',
        'subtitles',
        'typing_prompts',
        'suggestions',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(LandingSection::class, 'section_id');
    }

    /**
     * Accessor to auto-decode JSON for array fields.
     */
    public function getValueAttribute($value)
    {
        if (in_array($this->field, $this->jsonFields)) {
            return json_decode($value, true) ?? [];
        }

        return $value;
    }

    /**
     * Mutator to auto-encode arrays as JSON.
     */
    public function setValueAttribute($value)
    {
        if (is_array($value)) {
            $this->attributes['value'] = json_encode($value);
        } else {
            $this->attributes['value'] = $value;
        }
    }
}
