<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\ChecksDemoMode;
use App\Models\Plan;
use App\Models\Template;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use ZipArchive;

class AdminTemplateController extends Controller
{
    use ChecksDemoMode;

    /**
     * Display a listing of templates.
     */
    public function index(Request $request): Response
    {
        $templates = Template::with('plans')
            ->latest()
            ->paginate($request->input('per_page', 10));

        return Inertia::render('Admin/Templates/Index', [
            'templates' => $templates,
            'plans' => Plan::orderBy('sort_order')->get(['id', 'name']),
        ]);
    }

    /**
     * Store a newly created template.
     */
    public function store(Request $request): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'thumbnail' => 'nullable|image|max:2048',
            'zip_file' => 'required|file|mimes:zip|max:10240', // 10MB max
            'plan_ids' => 'nullable|array',
            'plan_ids.*' => 'exists:plans,id',
        ]);

        // Handle thumbnail upload
        if ($request->hasFile('thumbnail')) {
            $path = $request->file('thumbnail')->store('thumbnails', 'public');
            $validated['thumbnail'] = $path;
        }

        // Store zip file
        $zipPath = $request->file('zip_file')->store('templates', 'local');

        // Extract and validate template.json
        $metadata = null;
        $zip = new ZipArchive;

        $fullZipPath = Storage::disk('local')->path($zipPath);
        if ($zip->open($fullZipPath) === true) {
            $jsonContent = $zip->getFromName('template.json');
            if ($jsonContent) {
                $decoded = json_decode($jsonContent, true);
                if ($decoded && is_array($decoded)) {
                    $metadata = $decoded;
                }
            }
            $zip->close();
        }

        // Create template record
        $template = Template::create([
            'slug' => Str::slug($request->name),
            'name' => $request->name,
            'description' => $request->description,
            'thumbnail' => $validated['thumbnail'] ?? null,
            'zip_path' => $zipPath,
            'metadata' => $metadata,
        ]);

        // Sync plan assignments
        $template->plans()->sync($request->input('plan_ids', []));

        return redirect()->route('admin.ai-templates')
            ->with('success', 'Template uploaded successfully');
    }

    /**
     * Update the specified template.
     */
    public function update(Request $request, Template $template): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'thumbnail' => 'nullable|image|max:2048',
            'zip_file' => 'nullable|file|mimes:zip|max:10240',
            'plan_ids' => 'nullable|array',
            'plan_ids.*' => 'exists:plans,id',
        ]);

        // Prevent editing system templates
        if ($template->is_system) {
            return redirect()
                ->route('admin.ai-templates')
                ->with('error', 'System templates cannot be modified.');
        }

        // Handle thumbnail upload
        if ($request->hasFile('thumbnail')) {
            // Delete old thumbnail
            if ($template->thumbnail) {
                Storage::disk('public')->delete($template->thumbnail);
            }
            $validated['thumbnail'] = $request->file('thumbnail')->store('thumbnails', 'public');
        }

        // Handle new zip file
        $metadata = $template->metadata;
        if ($request->hasFile('zip_file')) {
            // Delete old zip file (use raw value since accessor adds full path)
            if ($template->getRawOriginal('zip_path')) {
                Storage::disk('local')->delete($template->getRawOriginal('zip_path'));
            }

            $zipPath = $request->file('zip_file')->store('templates', 'local');

            // Extract metadata from new zip
            $zip = new ZipArchive;
            $fullZipPath = Storage::disk('local')->path($zipPath);
            if ($zip->open($fullZipPath) === true) {
                $jsonContent = $zip->getFromName('template.json');
                if ($jsonContent) {
                    $decoded = json_decode($jsonContent, true);
                    if ($decoded && is_array($decoded)) {
                        $metadata = $decoded;
                    }
                }
                $zip->close();
            }

            $validated['zip_path'] = $zipPath;
        }

        $template->update([
            'name' => $request->name,
            'description' => $request->description,
            'thumbnail' => $validated['thumbnail'] ?? $template->thumbnail,
            'zip_path' => $validated['zip_path'] ?? $template->getRawOriginal('zip_path'),
            'metadata' => $metadata,
        ]);

        // Sync plan assignments
        $template->plans()->sync($request->input('plan_ids', []));

        return redirect()->route('admin.ai-templates')
            ->with('success', 'Template updated successfully');
    }

    /**
     * Remove the specified template.
     */
    public function destroy(Template $template): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        try {
            // Delete zip file (use raw value since accessor adds full path)
            if ($template->getRawOriginal('zip_path')) {
                Storage::disk('local')->delete($template->getRawOriginal('zip_path'));
            }

            // Delete thumbnail
            if ($template->thumbnail) {
                Storage::disk('public')->delete($template->thumbnail);
            }

            $template->delete();

            return redirect()->route('admin.ai-templates')
                ->with('success', 'Template deleted successfully');
        } catch (\Exception $e) {
            return redirect()
                ->route('admin.ai-templates')
                ->with('error', 'System templates cannot be deleted.');
        }
    }

    /**
     * Get metadata for a template (JSON response).
     */
    public function metadata(Template $template): JsonResponse
    {
        return response()->json($template->metadata ?? [
            'error' => 'No metadata available',
        ]);
    }
}
