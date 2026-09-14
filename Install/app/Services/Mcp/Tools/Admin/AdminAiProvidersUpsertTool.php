<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\AiProvider;
use App\Services\Mcp\McpTool;
use Illuminate\Support\Facades\Validator;

/**
 * Mirrors Admin\AiProviderController::store()/update() field set. api_key
 * is write-only (never read back — AiProvider::$hidden already covers
 * credentials), so this tool cannot leak existing keys.
 */
class AdminAiProvidersUpsertTool extends McpTool
{
    public function name(): string
    {
        return 'admin_ai_providers_upsert';
    }

    public function description(): string
    {
        return 'Create a new AI provider (for the app-generation builder pool) or update an existing one by id. api_key is write-only.';
    }

    public function requiredAbility(): ?string
    {
        return 'ai-providers:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'provider_id' => ['type' => 'integer', 'description' => 'Omit to create a new provider.'],
                'name' => ['type' => 'string'],
                'type' => ['type' => 'string', 'enum' => ['openai', 'anthropic', 'grok', 'deepseek', 'zhipu', 'gemini', 'nvidia']],
                'api_key' => ['type' => 'string'],
                'default_model' => ['type' => 'string'],
                'max_tokens' => ['type' => 'integer'],
                'available_models' => ['type' => 'array', 'items' => ['type' => 'string']],
                'status' => ['type' => 'string', 'enum' => ['active', 'inactive']],
            ],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $providerId = $arguments['provider_id'] ?? null;
        $provider = $providerId ? AiProvider::find((int) $providerId) : null;

        if ($providerId && ! $provider) {
            return ['success' => false, 'message' => 'AI provider not found.'];
        }

        $rules = [
            'name' => [$provider ? 'sometimes' : 'required', 'string', 'max:255'],
            'type' => [$provider ? 'sometimes' : 'required', 'in:openai,anthropic,grok,deepseek,zhipu,gemini,nvidia'],
            'api_key' => ['sometimes', 'string'],
            'default_model' => ['sometimes', 'string'],
            'max_tokens' => ['sometimes', 'integer', 'min:1'],
            'available_models' => ['sometimes', 'array'],
            'available_models.*' => ['string'],
            'status' => ['sometimes', 'in:active,inactive'],
        ];

        $validator = Validator::make($arguments, $rules);

        if ($validator->fails()) {
            return ['success' => false, 'message' => $validator->errors()->first()];
        }

        $validated = $validator->validated();

        $credentials = $provider?->credentials ?? [];
        if (isset($validated['api_key'])) {
            $credentials['api_key'] = $validated['api_key'];
        }

        $config = $provider?->config ?? [];
        if (isset($validated['default_model'])) {
            $config['default_model'] = $validated['default_model'];
        }
        if (isset($validated['max_tokens'])) {
            $config['max_tokens'] = $validated['max_tokens'];
        }

        $data = array_filter([
            'name' => $validated['name'] ?? null,
            'type' => $validated['type'] ?? null,
            'status' => $validated['status'] ?? null,
        ], fn ($v) => $v !== null);
        $data['credentials'] = $credentials;
        $data['config'] = $config;
        if (isset($validated['available_models'])) {
            $data['available_models'] = $validated['available_models'];
        }

        if ($provider) {
            $provider->update($data);
        } else {
            $data['status'] = $data['status'] ?? 'active';
            $provider = AiProvider::create($data);
        }

        return ['success' => true, 'provider' => $provider->fresh()->only(['id', 'name', 'type', 'status', 'available_models'])];
    }
}
