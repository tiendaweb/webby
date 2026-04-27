<?php

namespace Database\Seeders;

use App\Models\Language;
use Illuminate\Database\Seeder;

class LanguageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $languages = [
            [
                'code' => 'en',
                'country_code' => 'US',
                'name' => 'English',
                'native_name' => 'English',
                'is_rtl' => false,
                'is_active' => true,
                'is_default' => true,
                'sort_order' => 0,
            ],
            [
                'code' => 'ar',
                'country_code' => 'SA',
                'name' => 'Arabic',
                'native_name' => 'العربية',
                'is_rtl' => true,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 1,
            ],
            [
                'code' => 'ja',
                'country_code' => 'JP',
                'name' => 'Japanese',
                'native_name' => '日本語',
                'is_rtl' => false,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 2,
            ],
            [
                'code' => 'ru',
                'country_code' => 'RU',
                'name' => 'Russian',
                'native_name' => 'Русский',
                'is_rtl' => false,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 3,
            ],
            [
                'code' => 'de',
                'country_code' => 'DE',
                'name' => 'German',
                'native_name' => 'Deutsch',
                'is_rtl' => false,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 4,
            ],
            [
                'code' => 'fr',
                'country_code' => 'FR',
                'name' => 'French',
                'native_name' => 'Français',
                'is_rtl' => false,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 5,
            ],
            [
                'code' => 'it',
                'country_code' => 'IT',
                'name' => 'Italian',
                'native_name' => 'Italiano',
                'is_rtl' => false,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 6,
            ],
            [
                'code' => 'zh',
                'country_code' => 'CN',
                'name' => 'Chinese',
                'native_name' => '中文',
                'is_rtl' => false,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 7,
            ],
            [
                'code' => 'id',
                'country_code' => 'ID',
                'name' => 'Indonesian',
                'native_name' => 'Bahasa Indonesia',
                'is_rtl' => false,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 8,
            ],
            [
                'code' => 'pt',
                'country_code' => 'BR',
                'name' => 'Portuguese',
                'native_name' => 'Português',
                'is_rtl' => false,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 9,
            ],
        ];

        foreach ($languages as $language) {
            Language::updateOrCreate(
                ['code' => $language['code']],
                $language
            );
        }
    }
}
