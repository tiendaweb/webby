<?php

namespace App\Console\Commands;

use App\Models\CronLog;
use App\Services\InternalAiService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RefreshInternalAiContent extends Command
{
    protected $signature = 'internal-ai:refresh-content
                            {--dry-run : Show what would happen without making API calls}
                            {--triggered-by=cron : Who triggered this command}';

    protected $description = 'Regenerate AI content (suggestions, typing prompts, greetings) - scheduled 3x daily';

    public function __construct(
        protected InternalAiService $internalAiService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        $cronLog = CronLog::startLog(
            'Refresh Internal AI Content',
            self::class,
            $this->option('triggered-by')
        );

        try {
            if ($dryRun) {
                return $this->handleDryRun($cronLog);
            }

            $this->info('Refreshing internal AI content...');

            // Generate all content
            $results = $this->internalAiService->refreshAllContent();

            // Display results
            $this->displayResults($results);

            $suggestionsCount = count($results['suggestions']);
            $typingPromptsCount = count($results['typing_prompts']);
            $greetingsCount = count($results['greetings']);
            $heroHeadlinesCount = count($results['hero_headlines']);
            $heroSubtitlesCount = count($results['hero_subtitles']);

            $message = "Refreshed: suggestions={$suggestionsCount}, "
                      ."typing_prompts={$typingPromptsCount}, "
                      ."greetings={$greetingsCount}, "
                      ."hero_headlines={$heroHeadlinesCount}, "
                      ."hero_subtitles={$heroSubtitlesCount}";

            $this->info("✓ {$message}");
            $cronLog->markSuccess($message);

            Log::info('Internal AI content refreshed successfully', $results);

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("Failed to refresh content: {$e->getMessage()}");
            $cronLog->markFailed($e->getTraceAsString(), $e->getMessage());
            Log::error('Internal AI content refresh failed', [
                'error' => $e->getMessage(),
            ]);

            return Command::FAILURE;
        }
    }

    protected function handleDryRun(CronLog $cronLog): int
    {
        $this->info('DRY RUN - Would refresh content');
        $this->table(
            ['Content Type', 'Cache Key', 'Status'],
            [
                ['Suggestions', $this->internalAiService->getSuggestionsCacheKey(), 'Would refresh'],
                ['Typing Prompts', $this->internalAiService->getTypingPromptsCacheKey(), 'Would refresh'],
                ['Greetings', $this->internalAiService->getGreetingsCacheKey(), 'Would refresh'],
                ['Hero Headlines', $this->internalAiService->getHeroHeadlinesCacheKey(), 'Would refresh'],
                ['Hero Subtitles', $this->internalAiService->getHeroSubtitlesCacheKey(), 'Would refresh'],
            ]
        );

        $cronLog->markSuccess('Dry run completed');

        return Command::SUCCESS;
    }

    protected function displayResults(array $results): void
    {
        $this->table(
            ['Content Type', 'Count', 'Status'],
            [
                ['Suggestions', count($results['suggestions']), '✓ Cached'],
                ['Typing Prompts', count($results['typing_prompts']), '✓ Cached'],
                ['Greetings', count($results['greetings']), '✓ Cached'],
                ['Hero Headlines', count($results['hero_headlines']), '✓ Cached'],
                ['Hero Subtitles', count($results['hero_subtitles']), '✓ Cached'],
            ]
        );
    }
}
