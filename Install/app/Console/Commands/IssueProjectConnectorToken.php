<?php

namespace App\Console\Commands;

use App\Models\AiConnectorModule;
use App\Models\Project;
use App\Models\ProjectAiConnectorActivation;
use App\Models\ProjectAiConnectorToken;
use Illuminate\Console\Command;

/**
 * Phase 1 stopgap: the purchase/activation flow and client-facing UI for
 * the AI Connector module ship in a later phase. Until then, this command
 * force-activates the "ai-connector" module for a project (status=active,
 * payment_method=manual) and issues a connector token, so the MCP project
 * endpoint can be exercised end-to-end.
 *
 * Usage:
 *   php artisan mcp:issue-project-token {project-uuid} --scope=files:read --scope=files:write
 */
class IssueProjectConnectorToken extends Command
{
    protected $signature = 'mcp:issue-project-token
        {project : Project UUID}
        {--name=project-mcp-token : Label stored on the token}
        {--scope=* : Scope to grant, e.g. files:read (repeatable). Defaults to files:read only.}
        {--expires= : Optional expiry, e.g. "+90 days"}';

    protected $description = 'Force-activate the AI Connector module for a project and issue a connector token (Phase 1 testing helper).';

    public function handle(): int
    {
        $project = Project::find($this->argument('project'));

        if (! $project) {
            $this->error('No project found with that id.');

            return self::FAILURE;
        }

        $module = AiConnectorModule::where('slug', AiConnectorModule::SLUG_AI_CONNECTOR)->first();

        if (! $module) {
            $this->error('The "ai-connector" module is not seeded. Run: php artisan db:seed --class=AiConnectorModuleSeeder');

            return self::FAILURE;
        }

        $activation = ProjectAiConnectorActivation::updateOrCreate(
            ['project_id' => $project->id, 'ai_connector_module_id' => $module->id],
            [
                'user_id' => $project->user_id,
                'status' => ProjectAiConnectorActivation::STATUS_ACTIVE,
                'amount' => $module->price,
                'payment_method' => 'manual',
                'starts_at' => now(),
                'renewal_at' => $module->isRecurring() ? now()->addMonth() : null,
                'ends_at' => null,
                'approved_at' => now(),
                'admin_notes' => 'Manually activated via mcp:issue-project-token (Phase 1, no purchase flow yet).',
            ]
        );

        $scopes = $this->option('scope') ?: ['files:read'];
        $expiresOption = $this->option('expires');
        $expiresAt = $expiresOption ? now()->parse($expiresOption) : null;

        $issued = ProjectAiConnectorToken::issue(
            $project,
            $activation,
            $this->option('name'),
            $scopes,
            $project->user_id,
            $expiresAt
        );

        $this->info('Project AI Connector activated and token issued.');
        $this->line('Project: '.$project->id.' ('.$project->name.')');
        $this->line('Scopes: '.implode(', ', $scopes));
        $this->newLine();
        $this->warn('Raw connector token (shown once, store it securely):');
        $this->line($issued['raw']);
        $this->newLine();
        $this->line('MCP endpoint: /api/mcp/project/'.$project->id);

        return self::SUCCESS;
    }
}
