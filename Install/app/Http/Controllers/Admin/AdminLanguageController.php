<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\ChecksDemoMode;
use App\Models\Language;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminLanguageController extends Controller
{
    use ChecksDemoMode;

    /**
     * Display a listing of languages.
     */
    public function index(Request $request): Response
    {
        $languages = Language::orderBy('sort_order')->get();
        $availableLocales = $this->getAvailableLocales($languages);

        return Inertia::render('Admin/Languages/Index', [
            'languages' => $languages,
            'availableLocales' => $availableLocales,
        ]);
    }

    /**
     * Get available locales from lang/ directory that haven't been added yet.
     */
    protected function getAvailableLocales($existingLanguages): array
    {
        $langPath = lang_path();
        $existingCodes = $existingLanguages->pluck('code')->toArray();
        $availableLocales = [];

        // Scan lang directory for subdirectories (e.g., lang/en/, lang/ar/)
        if (is_dir($langPath)) {
            $directories = array_filter(glob($langPath.'/*'), 'is_dir');
            foreach ($directories as $dir) {
                $code = basename($dir);
                // Only include if not already added and has json files
                if (! in_array($code, $existingCodes) && count(glob($dir.'/*.json')) > 0) {
                    $availableLocales[] = $code;
                }
            }
        }

        return $availableLocales;
    }

    /**
     * Store a newly created language.
     */
    public function store(Request $request): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'code' => 'required|string|max:10|unique:languages,code',
            'country_code' => 'required|string|size:2|alpha|uppercase',
            'name' => 'required|string|max:255',
            'native_name' => 'required|string|max:255',
            'is_rtl' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $validated['sort_order'] = (Language::max('sort_order') ?? 0) + 1;
        $validated['is_rtl'] = $validated['is_rtl'] ?? false;
        $validated['is_active'] = $validated['is_active'] ?? true;

        Language::create($validated);

        return back()->with('success', __('Language created successfully.'));
    }

    /**
     * Update the specified language.
     */
    public function update(Request $request, Language $language): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:10', Rule::unique('languages')->ignore($language->id)],
            'country_code' => 'required|string|size:2|alpha|uppercase',
            'name' => 'required|string|max:255',
            'native_name' => 'required|string|max:255',
            'is_rtl' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $language->update($validated);

        return back()->with('success', __('Language updated successfully.'));
    }

    /**
     * Remove the specified language.
     */
    public function destroy(Language $language): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        if ($language->is_default) {
            return back()->withErrors(['language' => __('Cannot delete the default language.')]);
        }

        // Check if any users are using this language
        $usersCount = User::where('locale', $language->code)->count();
        if ($usersCount > 0) {
            return back()->withErrors(['language' => __('Cannot delete language. :count users are using it.', ['count' => $usersCount])]);
        }

        $language->delete();

        return back()->with('success', __('Language deleted successfully.'));
    }

    /**
     * Toggle the active status of the language.
     */
    public function toggleStatus(Language $language): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        if ($language->is_default && $language->is_active) {
            return back()->withErrors(['language' => __('Cannot deactivate the default language.')]);
        }

        $language->update(['is_active' => ! $language->is_active]);

        return back()->with('success', __('Language status updated.'));
    }

    /**
     * Set the language as the default.
     */
    public function setDefault(Language $language): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        if (! $language->is_active) {
            return back()->withErrors(['language' => __('Cannot set inactive language as default.')]);
        }

        // Unset current default
        Language::where('is_default', true)->update(['is_default' => false]);

        // Set new default
        $language->update(['is_default' => true]);

        return back()->with('success', __('Default language updated.'));
    }

    /**
     * Reorder the languages.
     */
    public function reorder(Request $request): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:languages,id',
        ]);

        foreach ($validated['ids'] as $index => $id) {
            Language::where('id', $id)->update(['sort_order' => $index]);
        }

        return back()->with('success', __('Languages reordered.'));
    }
}
