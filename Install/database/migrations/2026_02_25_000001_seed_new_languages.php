<?php

use App\Models\Language;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Seed Italian, Chinese, Indonesian, and Portuguese languages
     * for existing installations that are upgrading.
     */
    public function up(): void
    {
        if (! Schema::hasTable('languages')) {
            return;
        }

        $newLanguages = [
            [
                'code' => 'it',
                'country_code' => 'IT',
                'name' => 'Italian',
                'native_name' => 'Italiano',
                'is_rtl' => false,
                'is_active' => true,
                'is_default' => false,
            ],
            [
                'code' => 'zh',
                'country_code' => 'CN',
                'name' => 'Chinese',
                'native_name' => '中文',
                'is_rtl' => false,
                'is_active' => true,
                'is_default' => false,
            ],
            [
                'code' => 'id',
                'country_code' => 'ID',
                'name' => 'Indonesian',
                'native_name' => 'Bahasa Indonesia',
                'is_rtl' => false,
                'is_active' => true,
                'is_default' => false,
            ],
            [
                'code' => 'pt',
                'country_code' => 'BR',
                'name' => 'Portuguese',
                'native_name' => 'Português',
                'is_rtl' => false,
                'is_active' => true,
                'is_default' => false,
            ],
        ];

        foreach ($newLanguages as $lang) {
            if (! Language::where('code', $lang['code'])->exists()) {
                $lang['sort_order'] = (Language::max('sort_order') ?? 0) + 1;
                $lang['created_at'] = now();
                $lang['updated_at'] = now();
                Language::create($lang);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Don't remove languages on rollback as admins may have customized them
    }
};
