<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CronLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;
use Inertia\Response;

class AdminCronjobController extends Controller
{
    /**
     * Get job registry with all scheduled commands.
     */
    protected function getJobs(): array
    {
        return [
            [
                'name' => __('Refresh Internal AI Content'),
                'class' => 'App\Console\Commands\RefreshInternalAiContent',
                'command' => 'internal-ai:refresh-content',
                'schedule' => __('3x Daily (05:00, 12:00, 17:00)'),
                'cron' => '0 5,12,17 * * *',
                'description' => __('Regenerate AI content (suggestions, typing prompts, greetings) 3 times per day'),
            ],
            [
                'name' => __('Manage Subscriptions'),
                'class' => 'App\Console\Commands\ManageSubscriptions',
                'command' => 'subscriptions:manage',
                'schedule' => __('Daily'),
                'cron' => '0 0 * * *',
                'description' => __('Expire overdue subscriptions and send renewal reminders'),
            ],
            [
                'name' => __('Reset Build Credits'),
                'class' => 'App\Console\Commands\ResetBuildCredits',
                'command' => 'credits:reset',
                'schedule' => __('Monthly (1st)'),
                'cron' => '0 0 1 * *',
                'description' => __('Reset build credits for all users based on their plan allocation'),
            ],
            [
                'name' => __('Process Account Deletions'),
                'class' => 'App\Console\Commands\ProcessAccountDeletions',
                'command' => 'accounts:process-deletions',
                'schedule' => __('Daily'),
                'cron' => '0 0 * * *',
                'description' => __('Process scheduled GDPR account deletions'),
            ],
            [
                'name' => __('Purge Trashed Projects'),
                'class' => 'App\Console\Commands\PurgeOldTrashedProjects',
                'command' => 'projects:purge-trash',
                'schedule' => __('Daily'),
                'cron' => '0 0 * * *',
                'description' => __('Permanently delete projects in trash for over 30 days'),
            ],
            [
                'name' => __('Clean Builder Workspaces'),
                'class' => 'App\Console\Commands\CleanBuilderWorkspaces',
                'command' => 'builder:clean-workspaces',
                'schedule' => __('Daily'),
                'cron' => '0 0 * * *',
                'description' => __('Remove orphaned workspaces from builder servers and local preview directories'),
            ],
            [
                'name' => __('Check Stale Build Sessions'),
                'class' => 'App\Console\Commands\CheckStaleBuildSessions',
                'command' => 'builder:check-stale-sessions',
                'schedule' => __('Every 5 Minutes'),
                'cron' => '*/5 * * * *',
                'description' => __('Check for stale building sessions and sync status from builder (prevents user lockout if builder crashes)'),
            ],
            [
                'name' => __('Prune Audit Logs'),
                'class' => 'App\Console\Commands\PruneAuditLogs',
                'command' => 'data:prune-audit-logs',
                'schedule' => __('Weekly'),
                'cron' => '0 0 * * 0',
                'description' => __('Delete audit logs older than the retention period'),
            ],
            [
                'name' => __('Prune Data Exports'),
                'class' => 'App\Console\Commands\PruneDataExports',
                'command' => 'data:prune-exports',
                'schedule' => __('Daily'),
                'cron' => '0 0 * * *',
                'description' => __('Delete expired data export files'),
            ],
            [
                'name' => __('Prune Cron Logs'),
                'class' => 'App\Console\Commands\PruneCronLogs',
                'command' => 'cron:prune',
                'schedule' => __('Daily'),
                'cron' => '0 0 * * *',
                'description' => __('Delete cron logs older than 30 days'),
            ],
            [
                'name' => __('Provision Custom Domain SSL'),
                'class' => 'App\Console\Commands\ProvisionCustomDomainSsl',
                'command' => 'domain:provision-ssl',
                'schedule' => __('Every Minute'),
                'cron' => '* * * * *',
                'description' => __('Provision SSL certificates for verified custom domains using Let\'s Encrypt and configure Nginx.'),
            ],
            [
                'name' => __('Flush Sentry Reports'),
                'class' => 'App\Console\Commands\FlushSentryReports',
                'command' => 'sentry:flush',
                'schedule' => __('Every 5 Minutes'),
                'cron' => '*/5 * * * *',
                'description' => __('Send buffered error reports to the Sentry endpoint for analysis'),
            ],
        ];
    }

    /**
     * Display the cronjobs page.
     */
    public function index(Request $request): Response
    {
        $jobs = $this->getJobsWithStatus();

        return Inertia::render('Admin/Cronjobs', [
            'cronjobs' => $jobs,
        ]);
    }

    /**
     * Get cron execution logs.
     */
    public function logs(Request $request): JsonResponse
    {
        $query = CronLog::query()->latest('started_at');

        // Search by job name or message
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('job_name', 'like', "%{$search}%")
                    ->orWhere('message', 'like', "%{$search}%");
            });
        }

        // Filter by status
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by job
        if ($request->filled('job') && $request->job !== 'all') {
            $query->where('job_name', $request->job);
        }

        $logs = $query->paginate($request->input('per_page', 15));

        // Transform the logs to include computed attributes
        $logs->getCollection()->transform(function ($log) {
            return [
                'id' => $log->id,
                'job_name' => $log->job_name,
                'job_class' => $log->job_class,
                'status' => $log->status,
                'started_at' => $log->started_at?->toISOString(),
                'completed_at' => $log->completed_at?->toISOString(),
                'duration' => $log->duration,
                'human_duration' => $log->human_duration,
                'triggered_by' => $log->triggered_by,
                'trigger_display' => $log->trigger_display,
                'message' => $log->message,
                'exception' => $log->exception,
                'created_at' => $log->created_at?->toISOString(),
            ];
        });

        return response()->json($logs);
    }

    /**
     * Trigger a job manually.
     */
    public function trigger(Request $request): JsonResponse
    {
        if (config('app.demo')) {
            return response()->json([
                'success' => false,
                'message' => 'This action is disabled in demo mode.',
            ], 403);
        }

        $request->validate([
            'command' => 'required|string',
        ]);

        $command = $request->input('command');

        // Verify the command is in our job registry
        $job = collect($this->getJobs())->firstWhere('command', $command);

        if (! $job) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid command.',
            ], 400);
        }

        // Prevent triggering SSL job when custom domains are disabled
        if ($command === 'domain:provision-ssl' && ! \App\Models\SystemSetting::get('domain_enable_custom_domains', false)) {
            return response()->json([
                'success' => false,
                'message' => 'Custom domains are not enabled.',
            ], 400);
        }

        // Prevent triggering Sentry flush when sentry is disabled
        if ($command === 'sentry:flush' && ! \App\Models\SystemSetting::get('sentry_enabled', false)) {
            return response()->json([
                'success' => false,
                'message' => 'Sentry reporting is not enabled.',
            ], 400);
        }

        try {
            $userId = auth()->id();

            // Run the command with the triggered-by option
            Artisan::call($command, [
                '--triggered-by' => "manual:{$userId}",
            ]);

            $output = Artisan::output();

            return response()->json([
                'success' => true,
                'message' => "Job '{$job['name']}' triggered successfully.",
                'output' => $output,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to trigger job: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get jobs with their last run status.
     */
    protected function getJobsWithStatus(): array
    {
        return collect($this->getJobs())
            ->filter(function ($job) {
                // Hide SSL provisioning job when custom domains are disabled
                if ($job['command'] === 'domain:provision-ssl') {
                    return \App\Models\SystemSetting::get('domain_enable_custom_domains', false);
                }

                // Hide Sentry flush job when sentry is disabled
                if ($job['command'] === 'sentry:flush') {
                    return \App\Models\SystemSetting::get('sentry_enabled', false);
                }

                return true;
            })
            ->map(function ($job) {
                $lastLog = CronLog::where('job_class', $job['class'])->latest('started_at')->first();

                return [
                    'name' => $job['name'],
                    'class' => $job['class'],
                    'command' => $job['command'],
                    'schedule' => $job['schedule'],
                    'cron' => $job['cron'],
                    'description' => $job['description'],
                    'last_run' => $lastLog?->started_at?->toISOString(),
                    'last_status' => $lastLog?->status ?? 'pending',
                    'next_run' => $this->calculateNextRun($job['cron']),
                ];
            })->values()->toArray();
    }

    /**
     * Calculate the next run time based on cron expression.
     */
    protected function calculateNextRun(string $cron): string
    {
        try {
            $cronExpression = new \Cron\CronExpression($cron);

            return $cronExpression->getNextRunDate()->format('c');
        } catch (\Exception $e) {
            return now()->addDay()->toISOString();
        }
    }
}
