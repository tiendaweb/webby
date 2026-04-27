<?php

namespace App\Services;

use App\Models\SystemSetting;

class EmailThemeService
{
    protected static array $themeColors = [
        'neutral' => ['primary' => '#171717', 'primary_foreground' => '#fafafa'],
        'blue' => ['primary' => '#3b82f6', 'primary_foreground' => '#f8fafc'],
        'green' => ['primary' => '#16a34a', 'primary_foreground' => '#f0fdf4'],
        'orange' => ['primary' => '#f97316', 'primary_foreground' => '#fff7ed'],
        'red' => ['primary' => '#dc2626', 'primary_foreground' => '#fef2f2'],
        'rose' => ['primary' => '#e11d48', 'primary_foreground' => '#fff1f2'],
        'violet' => ['primary' => '#8b5cf6', 'primary_foreground' => '#f5f3ff'],
        'yellow' => ['primary' => '#eab308', 'primary_foreground' => '#422006'],
    ];

    public static function getEmailData(): array
    {
        $theme = SystemSetting::get('color_theme', 'neutral');
        $colors = self::$themeColors[$theme] ?? self::$themeColors['neutral'];

        // Get logo URL (absolute URL for emails)
        $logoPath = SystemSetting::get('site_logo');
        $logoUrl = $logoPath ? url('/storage/'.$logoPath) : null;

        return [
            'primaryColor' => $colors['primary'],
            'primaryForeground' => $colors['primary_foreground'],
            'appName' => SystemSetting::get('site_name', config('app.name')),
            'appUrl' => config('app.url'),
            'logoUrl' => $logoUrl,
        ];
    }
}
