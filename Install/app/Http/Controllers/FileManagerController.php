<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FileManagerController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Get user's projects with file counts and storage info
        $projects = $user->projects()
            ->withCount('files')
            ->withSum('files', 'size')
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(fn ($project) => [
                'id' => $project->id,
                'name' => $project->name,
                'files_count' => $project->files_count ?? 0,
                'storage_used' => $project->files_sum_size ?? 0,
            ]);

        // Get user's storage usage
        $storageUsage = $user->canUseFileStorage() ? $user->getStorageUsage() : [
            'used_bytes' => 0,
            'used_mb' => 0,
            'limit_mb' => 0,
            'unlimited' => false,
            'remaining_bytes' => 0,
            'percentage' => 0,
        ];

        // Get plan limits
        $plan = $user->getCurrentPlan();
        $planLimits = $plan ? [
            'file_storage_enabled' => $plan->fileStorageEnabled(),
            'max_storage_mb' => $plan->getMaxStorageMb(),
            'max_file_size_mb' => $plan->getMaxFileSizeMb(),
            'allowed_file_types' => $plan->getAllowedFileTypes(),
            'unlimited_storage' => $plan->hasUnlimitedStorage(),
        ] : [
            'file_storage_enabled' => false,
            'max_storage_mb' => 0,
            'max_file_size_mb' => 0,
            'allowed_file_types' => null,
            'unlimited_storage' => false,
        ];

        return Inertia::render('FileManager/Index', [
            'projects' => $projects,
            'storageUsage' => $storageUsage,
            'planLimits' => $planLimits,
        ]);
    }
}
