<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class SentryReporterService
{
    const INGEST_PATH = '/api/error-logs/ingest';

    const TIMEOUT = 5;

    const MAX_ATTEMPTS = 3;

    const BATCH_SIZE = 50;

    /**
     * Buffer an exception for later flushing.
     */
    public function buffer(\Throwable $e): void
    {
        try {
            if (! SystemSetting::get('sentry_enabled', false)) {
                return;
            }

            $purchaseCode = SystemSetting::get('purchase_code');
            if (empty($purchaseCode)) {
                return;
            }

            if ($this->shouldSkip($e)) {
                return;
            }

            $payload = $this->buildPayload($e, $purchaseCode);

            DB::table('sentry_pending_reports')->insert([
                'payload' => json_encode($payload),
                'attempts' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable) {
            // Silently ignore — cannot risk exception loops
        }
    }

    /**
     * Flush pending reports to the Sentry endpoint.
     *
     * @return array{sent: int, failed: int, pruned: int}
     */
    public function flush(): array
    {
        $enabled = SystemSetting::get('sentry_enabled', false);
        $purchaseCode = SystemSetting::get('purchase_code');

        // Clean up stale buffer when disabled or no purchase code
        if (! $enabled || empty($purchaseCode)) {
            $pruned = DB::table('sentry_pending_reports')->count();
            DB::table('sentry_pending_reports')->delete();

            return ['sent' => 0, 'failed' => 0, 'pruned' => $pruned];
        }

        $reports = DB::table('sentry_pending_reports')
            ->orderBy('created_at')
            ->limit(self::BATCH_SIZE)
            ->get();

        $sent = 0;
        $failed = 0;
        $pruned = 0;

        foreach ($reports as $report) {
            $payload = json_decode($report->payload, true);

            if ($this->sendPayload($payload)) {
                DB::table('sentry_pending_reports')->where('id', $report->id)->delete();
                $sent++;
            } else {
                $newAttempts = $report->attempts + 1;

                if ($newAttempts >= self::MAX_ATTEMPTS) {
                    DB::table('sentry_pending_reports')->where('id', $report->id)->delete();
                    $pruned++;
                } else {
                    DB::table('sentry_pending_reports')
                        ->where('id', $report->id)
                        ->update(['attempts' => $newAttempts, 'updated_at' => now()]);
                    $failed++;
                }
            }
        }

        return ['sent' => $sent, 'failed' => $failed, 'pruned' => $pruned];
    }

    /**
     * Send a payload to the Sentry endpoint.
     */
    protected function sendPayload(array $payload): bool
    {
        try {
            $endpoint = rtrim(config('services.sentry.endpoint', 'https://sentry.titansys.dev'), '/').self::INGEST_PATH;
            $response = Http::timeout(self::TIMEOUT)->post($endpoint, $payload);

            return $response->successful();
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Determine if an exception should be skipped.
     */
    protected function shouldSkip(\Throwable $e): bool
    {
        if ($e instanceof ValidationException) {
            return true;
        }

        if ($e instanceof AuthenticationException) {
            return true;
        }

        if ($e instanceof HttpException && $e->getStatusCode() < 500) {
            return true;
        }

        return false;
    }

    /**
     * Build the payload for an exception.
     */
    protected function buildPayload(\Throwable $e, string $purchaseCode): array
    {
        $context = [];
        if (app()->runningInConsole() === false) {
            $request = request();
            $context = [
                'url' => $request->path(),
                'method' => $request->method(),
            ];
        }

        return [
            'purchase_code' => $purchaseCode,
            'exception_class' => class_basename($e),
            'message' => $e->getMessage(),
            'file' => str_replace(base_path().'/', '', $e->getFile()),
            'line' => $e->getLine(),
            'stack_trace' => mb_substr($e->getTraceAsString(), 0, 5000),
            'context' => $context,
            'environment' => app()->environment(),
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'app_version' => $this->getAppVersion(),
            'level' => $this->mapLevel($e),
        ];
    }

    /**
     * Map an exception to a severity level.
     */
    protected function mapLevel(\Throwable $e): string
    {
        if ($e instanceof \ErrorException) {
            return 'warning';
        }

        if (str_contains(get_class($e), 'Critical')) {
            return 'critical';
        }

        return 'error';
    }

    /**
     * Read the application version from .version file.
     */
    protected function getAppVersion(): string
    {
        $versionFile = base_path('.version');

        if (file_exists($versionFile)) {
            return trim(file_get_contents($versionFile));
        }

        return 'unknown';
    }
}
