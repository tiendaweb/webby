<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\ChecksDemoMode;
use App\Models\AiConnectorModule;
use App\Models\ProjectAiConnectorActivation;
use App\Models\Transaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * Admin UI for the sellable "AI Connector" module system: catalog CRUD
 * (pricing_type/price/active) and per-project activation oversight
 * (approve/reject pending bank-transfer purchases). Mirrors the same
 * business logic already exposed as MCP tools
 * (App\Services\Mcp\Tools\Admin\AdminConnectorModules*Tool /
 * AdminConnectorActivationsReviewTool) — this is the human-facing surface
 * for the same operations.
 */
class AdminAiConnectorController extends Controller
{
    use ChecksDemoMode;

    public function index(Request $request)
    {
        $modules = AiConnectorModule::withCount([
            'activations as active_count' => fn ($q) => $q->where('status', ProjectAiConnectorActivation::STATUS_ACTIVE),
        ])->orderBy('sort_order')->get()->map(fn (AiConnectorModule $module) => [
            'id' => $module->id,
            'name' => $module->name,
            'slug' => $module->slug,
            'description' => $module->description,
            'pricing_type' => $module->pricing_type,
            // Cast the decimal:2 attributes to float: they serialize as strings
            // otherwise and the UI formats them as numbers.
            'price' => (float) $module->price,
            'is_active' => (bool) $module->is_active,
            'active_count' => (int) $module->active_count,
        ]);

        $query = ProjectAiConnectorActivation::with(['project:id,name', 'user:id,name,email', 'module:id,name'])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $activations = $query->paginate(15)->withQueryString();

        // requires_approval is a model method, not a column, so it has to be
        // projected explicitly — the UI needs it to show approve/reject.
        $activations->through(fn (ProjectAiConnectorActivation $activation) => [
            'id' => $activation->id,
            'status' => $activation->status,
            'amount' => (float) $activation->amount,
            'payment_method' => $activation->payment_method,
            'requires_approval' => $activation->requiresApproval(),
            'project' => $activation->project
                ? ['id' => $activation->project->id, 'name' => $activation->project->name]
                : null,
            'user' => $activation->user
                ? ['id' => $activation->user->id, 'name' => $activation->user->name, 'email' => $activation->user->email]
                : null,
            'module' => $activation->module
                ? ['id' => $activation->module->id, 'name' => $activation->module->name]
                : null,
            'renewal_at' => $activation->renewal_at?->toIso8601String(),
            'created_at' => $activation->created_at?->toIso8601String(),
        ]);

        return Inertia::render('Admin/AiConnector/Index', [
            'modules' => $modules,
            'activations' => $activations,
            'filters' => $request->only(['status']),
            'stats' => [
                'active_projects' => ProjectAiConnectorActivation::where('status', ProjectAiConnectorActivation::STATUS_ACTIVE)->count(),
                'pending_approval' => ProjectAiConnectorActivation::where('status', ProjectAiConnectorActivation::STATUS_PENDING)
                    ->where('payment_method', 'bank_transfer')
                    ->whereNull('approved_at')
                    ->count(),
                'revenue_this_month' => (float) Transaction::where('type', Transaction::TYPE_CONNECTOR_ACTIVATION)
                    ->where('status', Transaction::STATUS_COMPLETED)
                    ->thisMonth()
                    ->sum('amount'),
            ],
        ]);
    }

    public function storeModule(Request $request): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:ai_connector_modules,slug',
            'description' => 'nullable|string',
            'pricing_type' => 'required|in:one_time,monthly,yearly',
            'price' => 'required|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $validated['slug'] = $validated['slug'] ?? Str::slug($validated['name']);
        $validated['is_active'] = $validated['is_active'] ?? true;

        AiConnectorModule::create($validated);

        return back()->with('success', 'Module created successfully.');
    }

    public function updateModule(Request $request, AiConnectorModule $module): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'pricing_type' => 'sometimes|in:one_time,monthly,yearly',
            'price' => 'sometimes|numeric|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $module->update($validated);

        return back()->with('success', 'Module updated successfully.');
    }

    public function reviewActivation(Request $request, ProjectAiConnectorActivation $activation): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        if (! $activation->requiresApproval()) {
            return back()->withErrors(['activation' => 'This activation is not awaiting approval.']);
        }

        $validated = $request->validate([
            'action' => 'required|in:approve,reject',
            'notes' => 'nullable|string|max:1000',
        ]);

        $admin = Auth::user();
        $approve = $validated['action'] === 'approve';

        if ($approve) {
            $activation->approve($admin, $validated['notes'] ?? null);
        } else {
            $activation->reject($admin, $validated['notes'] ?? null);
        }

        Transaction::where('ai_connector_activation_id', $activation->id)
            ->where('status', Transaction::STATUS_PENDING)
            ->update([
                'status' => $approve ? Transaction::STATUS_COMPLETED : Transaction::STATUS_FAILED,
                'processed_by' => $admin->id,
                'notes' => $validated['notes'] ?? ($approve ? 'Approved by admin' : 'Rejected by admin'),
            ]);

        return back()->with('success', $approve ? 'Activation approved.' : 'Activation rejected.');
    }
}
