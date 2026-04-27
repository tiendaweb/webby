<?php

use App\Models\SystemSetting;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Subscription management - daily
Schedule::command('subscriptions:manage')->daily();

// Build credits reset - runs on the 1st of each month at midnight
Schedule::command('credits:reset')->monthlyOn(1, '00:00');

// GDPR data retention commands
Schedule::command('accounts:process-deletions')->daily();
Schedule::command('data:prune-exports')->daily();
Schedule::command('data:prune-audit-logs')->weekly();

// Project cleanup
Schedule::command('projects:purge-trash')->daily();

// Builder workspace cleanup
Schedule::command('builder:clean-workspaces')->daily();

// Stale build session checker - every 5 minutes
Schedule::command('builder:check-stale-sessions')->everyFiveMinutes();

// Cron log cleanup
Schedule::command('cron:prune')->daily();

// Internal AI content refresh - 3x daily at period boundaries
Schedule::command('internal-ai:refresh-content')->dailyAt('05:00');
Schedule::command('internal-ai:refresh-content')->dailyAt('12:00');
Schedule::command('internal-ai:refresh-content')->dailyAt('17:00');

// Sentry error report flushing - every 5 minutes (only when sentry is enabled)
Schedule::command('sentry:flush')
    ->everyFiveMinutes()
    ->when(fn () => SystemSetting::get('sentry_enabled', false));

// Custom domain SSL provisioning - every minute (only when custom domains are enabled)
Schedule::command('domain:provision-ssl')
    ->everyMinute()
    ->withoutOverlapping()
    ->when(fn () => SystemSetting::get('domain_enable_custom_domains', false));

// Demo mode cleanup - runs every 3 hours (only in demo mode)
// Note: This job is intentionally NOT in AdminCronjobController::getJobs()
// so it doesn't appear in the admin panel
// Uses ->when() instead of if() so it evaluates at runtime, not at config cache time
Schedule::command('demo:cleanup')->everyThreeHours()->when(fn () => config('app.demo'));
