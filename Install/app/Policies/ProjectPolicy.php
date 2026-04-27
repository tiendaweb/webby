<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Project $project): bool
    {
        return $user->id === $project->user_id
            || $project->sharedWith->contains('id', $user->id);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Project $project): bool
    {
        if ($user->id === $project->user_id) {
            return true;
        }

        $share = $project->sharedWith->firstWhere('id', $user->id);

        return $share && in_array($share->pivot->permission, ['edit', 'admin']);
    }

    public function delete(User $user, Project $project): bool
    {
        return $user->id === $project->user_id;
    }

    public function restore(User $user, Project $project): bool
    {
        return $user->id === $project->user_id;
    }

    public function forceDelete(User $user, Project $project): bool
    {
        return $user->id === $project->user_id;
    }
}
