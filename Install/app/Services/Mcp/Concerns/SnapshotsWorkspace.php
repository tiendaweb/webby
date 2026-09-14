<?php

namespace App\Services\Mcp\Concerns;

use App\Models\Project;
use App\Models\ProjectRevision;
use App\Models\User;
use App\Services\ProjectRevisionService;

/**
 * Deja un punto de retorno antes de que un conector toque los ficheros.
 *
 * La interfaz ya lo hace en cada guardado (`file_save`, `ai_chat`, …). Las
 * herramientas no lo hacían, así que un asistente con `files:write` podía
 * reescribir un sitio en producción sin dejar forma de volver atrás: le
 * dábamos el cuchillo sin la marcha atrás.
 *
 * Con antirrebote a propósito. Una instantánea copia el workspace entero, y
 * un asistente no escribe un fichero: escribe doce seguidos. Lo que hace
 * falta es **un** punto de retorno por sesión de edición —el estado anterior
 * a la tanda— y no doce copias casi idénticas del mismo sitio.
 */
trait SnapshotsWorkspace
{
    /** Minutos que una instantánea de conector sigue valiendo por la tanda entera. */
    protected int $minutosEntreInstantaneas = 5;

    /**
     * @return string|null  id de la revisión a la que volver, o null si no se
     *                      pudo tomar ninguna. Es un UUID, no un entero: las
     *                      revisiones usan HasUuids.
     */
    protected function snapshotBeforeWrite(Project $project, ?User $user, string $label, array $metadata = []): ?string
    {
        $reciente = ProjectRevision::where('project_id', $project->id)
            ->where('trigger', 'connector_write')
            ->where('created_at', '>=', now()->subMinutes($this->minutosEntreInstantaneas))
            ->latest()
            ->first();

        if ($reciente) {
            return $reciente->id;
        }

        try {
            return app(ProjectRevisionService::class)
                ->create($project, $user, 'connector_write', $label, $metadata)
                ->id;
        } catch (\Throwable $e) {
            // Que falle la red de seguridad no puede impedir el trabajo, pero
            // sí tiene que notarse: quien llame devuelve `revision_id: null` y
            // eso es lo que le dice al asistente que esta vez no hay vuelta atrás.
            report($e);

            return null;
        }
    }
}
