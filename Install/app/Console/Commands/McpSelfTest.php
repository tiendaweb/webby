<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\ProjectAiConnectorToken;
use App\Models\User;
use App\Services\Mcp\McpTool;
use App\Services\Mcp\McpToolRegistry;
use App\Http\Controllers\Admin\AdminApiTokenController;
use Illuminate\Console\Command;

/**
 * Llama a todas las herramientas MCP y comprueba que responden.
 *
 *     php artisan mcp:selftest
 *     php artisan mcp:selftest --keep   (deja el proyecto de pruebas)
 *
 * Existe por dos fallos que llegaron a producción con un conector real
 * delante: `admin_projects_create` reventaba al no pasarle `type`, y las
 * claves primarias no se detectaban porque MySQL 8 devuelve el nombre de la
 * columna en mayúsculas. Ninguno de los dos necesitaba más que **llamar una
 * vez a la herramienta** para salir a la luz.
 *
 * Cubre dos cosas distintas:
 *
 *  1. El contrato, en todas: nombre único y con el prefijo de su servidor,
 *     descripción, esquema de entrada bien formado y permiso conocido.
 *  2. La ejecución, en las de lectura: se llaman de verdad contra un
 *     proyecto desechable. No se ejecutan las que escriben ni las que
 *     cobran dinero — una prueba que se corre a diario no puede publicar
 *     sitios ni suplantar usuarios.
 */
class McpSelfTest extends Command
{
    protected $signature = 'mcp:selftest {--keep : No borrar el proyecto de pruebas al terminar}';

    protected $description = 'Comprueba el contrato de todas las herramientas MCP y ejecuta las de lectura';

    /**
     * Herramientas que la prueba no ejecuta.
     *
     * No es una lista de «rotas»: son las que cambian dinero, identidad o el
     * mundo exterior. Correrlas en una comprobación rutinaria sería peor que
     * no comprobarlas.
     */
    private const NO_EJECUTAR = [
        'admin_users_impersonate',      // emite una sesión de otra persona
        'admin_users_create',           // crea cuentas reales
        'admin_projects_delete',
        'admin_projects_publish',
        'admin_projects_import',
        'admin_domains_verify',         // consulta DNS de terceros
        'admin_database_query',         // SQL arbitrario
        'admin_settings_set',
        'admin_plans_update',
        'admin_transactions_review',
        'admin_subscriptions_manage',
        'admin_ai_providers_upsert',
        'admin_connector_activations_review',
        'admin_connector_modules_upsert',
        'admin_firebase_credentials_set',
    ];

    public function handle(McpToolRegistry $registry): int
    {
        $fallos = [];
        $ejecutadas = 0;
        $vistas = [];

        [$proyecto, $admin, $creado] = $this->prepararEntorno();

        foreach (['admin', 'project'] as $servidor) {
            $this->newLine();
            $this->line("<comment>── servidor {$servidor}</comment>");

            $contexto = $servidor === 'admin'
                ? $admin
                : ['project' => $proyecto, 'token' => new ProjectAiConnectorToken];

            foreach ($registry->all($servidor) as $tool) {
                /** @var McpTool $tool */
                $nombre = $tool->name();

                foreach ($this->problemasDeContrato($tool, $servidor, $vistas) as $problema) {
                    $fallos[] = "{$nombre}: {$problema}";
                }
                $vistas[] = $nombre;

                if (! $this->esDeLectura($tool) || in_array($nombre, self::NO_EJECUTAR, true)) {
                    continue;
                }

                $argumentos = $this->argumentosMinimos($tool, $proyecto);

                if ($argumentos === [] && ($tool->inputSchema()['required'] ?? []) !== []) {
                    $this->line("  <fg=gray>· {$nombre}: sin datos con los que probarla</>");

                    continue;
                }

                try {
                    $resultado = $tool->handle($argumentos, $contexto);
                    $ejecutadas++;

                    if (! is_array($resultado) || ! array_key_exists('success', $resultado)) {
                        $fallos[] = "{$nombre}: la respuesta no trae 'success'";
                    }
                } catch (\Throwable $e) {
                    $fallos[] = "{$nombre}: excepción — ".$e->getMessage();
                }
            }

            $this->line('  '.count($registry->all($servidor)).' herramientas revisadas');
        }

        if ($creado && ! $this->option('keep')) {
            $proyecto->forceDelete();
        }

        $this->devolverStorage();

        $this->newLine();
        $this->line("Ejecutadas de verdad: {$ejecutadas}");

        if ($fallos === []) {
            $this->info('✓ Todas las herramientas cumplen el contrato y las de lectura responden.');

            return self::SUCCESS;
        }

        foreach ($fallos as $f) {
            $this->error('✗ '.$f);
        }

        return self::FAILURE;
    }

    /**
     * Devuelve `storage` a www-data si esta orden se corrió como root.
     *
     * Correrla escribe caché y vistas compiladas. Hecho desde `docker exec`
     * —que es como se corre— esos ficheros quedan de root, y php-fpm, que es
     * www-data, empieza a fallar al escribir dentro de un directorio ajeno.
     * La aplicación entera pasa a devolver 500 con un mensaje
     * ("file_put_contents: No such file or directory") que no menciona los
     * permisos por ningún lado. Una comprobación de salud no puede tumbar el
     * sitio que comprueba.
     */
    private function devolverStorage(): void
    {
        if (! function_exists('posix_geteuid') || posix_geteuid() !== 0) {
            return;
        }

        // Nada de exec(): está deshabilitado en este PHP, y una orden que
        // depende de que el shell esté disponible falla justo donde más
        // duele. Se recorre el árbol y se corrige lo que difiera.
        $referencia = @stat(storage_path('framework/sessions'));

        if ($referencia === false) {
            return;
        }

        $uid = $referencia['uid'];
        $gid = $referencia['gid'];

        $iterador = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator(storage_path(), \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST,
        );

        $corregidos = 0;

        foreach ($iterador as $entrada) {
            $ruta = $entrada->getPathname();
            $actual = @lstat($ruta);

            if ($actual === false || ($actual['uid'] === $uid && $actual['gid'] === $gid)) {
                continue;
            }

            @chown($ruta, $uid);
            @chgrp($ruta, $gid);
            $corregidos++;
        }

        if ($corregidos > 0) {
            $this->line("  <fg=gray>· storage: {$corregidos} entradas devueltas a su dueño (esta orden corrió como root)</>");
        }
    }

    /** @return array{0: Project, 1: User, 2: bool} */
    private function prepararEntorno(): array
    {
        $admin = User::where('role', 'admin')->first() ?? User::first();

        if (! $admin) {
            $this->error('No hay ningún usuario en la base: la prueba necesita uno para hacer de administrador.');
            exit(self::FAILURE);
        }

        // Se prefiere un proyecto que ya exista: así las herramientas se
        // prueban contra ficheros de verdad y no contra un workspace vacío,
        // que es donde casi todo devuelve la lista vacía y no prueba nada.
        $proyecto = Project::whereNotNull('subdomain')->latest('updated_at')->first()
            ?? Project::latest('updated_at')->first();

        if ($proyecto) {
            return [$proyecto, $admin, false];
        }

        return [Project::create([
            'user_id' => $admin->id,
            'type' => 'blank',
            'name' => 'mcp-selftest',
            'initial_prompt' => '[mcp:selftest]',
            'build_status' => 'completed',
            'api_token' => \Illuminate\Support\Str::random(32),
        ]), $admin, true];
    }

    /** @return string[] */
    private function problemasDeContrato(McpTool $tool, string $servidor, array $vistas): array
    {
        $problemas = [];
        $nombre = $tool->name();

        if (in_array($nombre, $vistas, true)) {
            $problemas[] = 'nombre repetido';
        }

        if (! str_starts_with($nombre, $servidor === 'admin' ? 'admin_' : 'project_')
            && ! in_array($nombre, ['search', 'fetch'], true)) {
            $problemas[] = "el nombre no lleva el prefijo del servidor ({$servidor})";
        }

        if (trim($tool->description()) === '') {
            $problemas[] = 'sin descripción';
        }

        $esquema = $tool->inputSchema();

        if (($esquema['type'] ?? null) !== 'object') {
            $problemas[] = 'el esquema de entrada no es de tipo object';
        }

        if (! array_key_exists('properties', $esquema)) {
            $problemas[] = 'el esquema no declara properties';
        }

        // Un `required` que nombra una propiedad inexistente hace que el
        // modelo mande siempre un argumento que la herramienta no lee.
        foreach ($esquema['required'] ?? [] as $obligatoria) {
            $propiedades = $esquema['properties'] ?? [];
            if (is_array($propiedades) && ! array_key_exists($obligatoria, $propiedades)) {
                $problemas[] = "«{$obligatoria}» es obligatoria pero no está en properties";
            }
        }

        $permiso = $tool->requiredAbility();

        if ($servidor === 'admin' && $permiso !== null && ! in_array($permiso, AdminApiTokenController::ABILITIES, true)) {
            $problemas[] = "el permiso «{$permiso}» no existe en AdminApiTokenController::ABILITIES";
        }

        return $problemas;
    }

    /**
     * De lectura = su permiso no termina en :write y su nombre no delata una
     * escritura. Es una heurística, y por eso NO_EJECUTAR existe encima.
     */
    private function esDeLectura(McpTool $tool): bool
    {
        $permiso = (string) $tool->requiredAbility();

        if (str_ends_with($permiso, ':write') || str_ends_with($permiso, ':delete')
            || in_array($permiso, ['users:impersonate', 'database:execute', 'database:schema', 'connectors:manage'], true)) {
            return false;
        }

        return ! preg_match('/_(create|update|write|delete|set|upsert|restore|publish|unpublish|duplicate|import|respond|manage|review|impersonate|rename|mkdir|build|verify|download|upload|replace)\b/', $tool->name());
    }

    /**
     * Argumentos de verdad para las claves que nombran algo que tiene que
     * existir.
     *
     * Rellenar un `revision_id` con un 1 o una `table` con "a" no prueba la
     * herramienta: prueba su mensaje de error. Y como error legítimo que es,
     * la prueba lo contaría como fallo y acabaría ignorándose entera.
     *
     * @return array<string, mixed>|null  null si no hay con qué rellenar
     */
    private function valorReal(string $clave, Project $proyecto): mixed
    {
        return match ($clave) {
            'project_id' => $proyecto->id,
            'revision_id' => \App\Models\ProjectRevision::where('project_id', $proyecto->id)->value('id'),
            'table' => 'users',
            'user_id' => \App\Models\User::value('id'),
            default => null,
        };
    }

    private function argumentosMinimos(McpTool $tool, Project $proyecto): array
    {
        $esquema = $tool->inputSchema();
        $propiedades = is_array($esquema['properties'] ?? null) ? $esquema['properties'] : [];
        $argumentos = [];

        foreach ($esquema['required'] ?? [] as $clave) {
            $real = $this->valorReal($clave, $proyecto);

            if ($real !== null) {
                $argumentos[$clave] = $real;

                continue;
            }

            // Una clave que nombra algo existente y para la que no hay nada
            // en la base: no se inventa un valor, se salta la herramienta.
            if (in_array($clave, ['revision_id', 'user_id'], true)) {
                return [];
            }

            $argumentos[$clave] = match (true) {
                $clave === 'query' => 'a',
                ($propiedades[$clave]['type'] ?? null) === 'integer' => 1,
                ($propiedades[$clave]['type'] ?? null) === 'boolean' => false,
                ($propiedades[$clave]['type'] ?? null) === 'array' => [],
                default => 'a',
            };
        }

        // `project_id` no siempre es obligatorio, pero cuando la herramienta
        // lo acepta conviene dárselo: si no, la mitad de las de lectura
        // contestan sobre toda la plataforma en vez de sobre un proyecto.
        if (array_key_exists('project_id', $propiedades) && ! isset($argumentos['project_id'])) {
            $argumentos['project_id'] = $proyecto->id;
        }

        return $argumentos;
    }
}
