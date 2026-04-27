<!DOCTYPE html>
@php
    $siteName = \App\Models\SystemSetting::get('site_name', config('app.name'));
    $siteDescription = \App\Models\SystemSetting::get('site_description', '');
    $favicon = \App\Models\SystemSetting::get('site_favicon');
    $defaultTheme = \App\Models\SystemSetting::get('default_theme', 'system');
    $colorTheme = \App\Models\SystemSetting::get('color_theme', 'neutral');
    $locale = app()->getLocale();
    try {
        $isRtl = \App\Models\Language::where('code', $locale)->value('is_rtl') ?? false;
    } catch (\Exception $e) {
        $isRtl = false;
    }
@endphp
<html lang="{{ str_replace('_', '-', $locale) }}" dir="{{ $isRtl ? 'rtl' : 'ltr' }}" data-theme="{{ $colorTheme }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        @if($siteDescription)
        <meta name="description" content="{{ $siteDescription }}">
        @endif

        @if($favicon)
        <link rel="icon" href="{{ Storage::url($favicon) }}" type="image/x-icon">
        <link rel="shortcut icon" href="{{ Storage::url($favicon) }}">
        @else
        <link rel="icon" href="/favicon.ico" type="image/x-icon">
        <link rel="shortcut icon" href="/favicon.ico">
        @endif

        <!-- Theme and locale initialization (prevents FOUC) -->
        <script>
            (function() {
                // Theme
                const defaultTheme = '{{ $defaultTheme }}';
                const theme = localStorage.getItem('app-theme') || defaultTheme;
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'dark' || (theme === 'system' && prefersDark)) {
                    document.documentElement.classList.add('dark');
                }
                // RTL - check stored RTL preference
                const isRtl = localStorage.getItem('app-locale-rtl') === 'true';
                if (isRtl) {
                    document.documentElement.dir = 'rtl';
                }
            })();
        </script>

        <!-- Pass site name to JavaScript for dynamic title -->
        <script>
            window.__APP_NAME__ = @json($siteName);
        </script>

        <title inertia>{{ $siteName }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
