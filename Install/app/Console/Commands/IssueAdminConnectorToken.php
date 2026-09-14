<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/**
 * Phase 1 stopgap: there is no admin UI yet for issuing MCP connector
 * tokens (that's a later phase) so this command mints a Sanctum personal
 * access token for an admin user directly. Abilities are never granted by
 * default — pass --ability explicitly for each one needed, especially
 * users:impersonate and database:execute.
 *
 * Usage:
 *   php artisan mcp:issue-admin-token admin@webby.com --ability=users:read --ability=users:impersonate
 */
class IssueAdminConnectorToken extends Command
{
    protected $signature = 'mcp:issue-admin-token
        {email : Email of the admin user to issue the token for}
        {--name=admin-mcp-token : Label stored on the token}
        {--ability=* : Ability to grant, e.g. users:read (repeatable). Omit for a read-only default set.}
        {--expires= : Optional expiry, e.g. "2026-12-31" or "+30 days"}';

    protected $description = 'Issue a Sanctum personal access token for the admin MCP connector (/api/mcp/admin).';

    public function handle(): int
    {
        $user = User::where('email', $this->argument('email'))->first();

        if (! $user) {
            $this->error('No user found with that email.');

            return self::FAILURE;
        }

        if (! $user->isAdmin()) {
            $this->error('That user is not an admin. Only admins can hold /api/mcp/admin tokens.');

            return self::FAILURE;
        }

        $abilities = $this->option('ability') ?: ['users:read'];
        $expiresOption = $this->option('expires');
        $expiresAt = $expiresOption ? now()->parse($expiresOption) : null;

        $token = $user->createToken($this->option('name'), $abilities, $expiresAt);

        $this->info('Admin MCP token issued.');
        $this->line('Abilities: '.implode(', ', $abilities));
        if ($expiresAt) {
            $this->line('Expires: '.$expiresAt->toIso8601String());
        }
        $this->newLine();
        $this->warn('Raw token (shown once, store it securely):');
        $this->line($token->plainTextToken);

        return self::SUCCESS;
    }
}
