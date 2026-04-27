<?php

namespace App\Traits;

use App\Models\SystemSetting;

trait HandlesLocale
{
    /**
     * Execute callback with temporarily switched locale.
     * Restores original locale after execution.
     */
    protected function withLocale(string $locale, callable $callback): mixed
    {
        $originalLocale = app()->getLocale();

        try {
            app()->setLocale($locale);

            return $callback();
        } finally {
            app()->setLocale($originalLocale);
        }
    }

    /**
     * Get the locale for a notifiable entity.
     */
    protected function getNotifiableLocale(object $notifiable): string
    {
        if (method_exists($notifiable, 'getLocale')) {
            return $notifiable->getLocale();
        }

        return SystemSetting::get('default_locale', 'en');
    }

    /**
     * Get admin locale for admin notifications.
     */
    protected function getAdminLocale(): string
    {
        return SystemSetting::get('admin_email_locale')
            ?? SystemSetting::get('default_locale', 'en');
    }
}
