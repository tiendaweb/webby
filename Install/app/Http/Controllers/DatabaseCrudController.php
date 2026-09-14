<?php

namespace App\Http\Controllers;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DatabaseCrudController extends Controller
{
    private const PROTECTED_TABLES = [
        'users',
        'password_reset_tokens',
        'sessions',
        'jobs',
        'job_batches',
        'failed_jobs',
        'cache',
        'cache_locks',
        'migrations',
        'system_settings',
        'plugins',
        'transactions',
        'subscriptions',
        'personal_access_tokens',
    ];

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $candidateNames = $this->configuredConnectionNames();
        $selectedName = $this->resolveConnectionName($request);
        $inspection = $selectedName !== ''
            ? $this->inspectConnection($selectedName)
            : null;

        return response()->json([
            'connections' => $this->connectionCandidates(),
            'connection' => $inspection ? $inspection['connection'] : null,
            'tables' => $inspection['tables'] ?? [],
            'message' => $inspection['message'] ?? null,
            'detected' => count(array_filter($this->connectionCandidates(), fn (array $candidate) => $candidate['status'] === 'ready')),
            'default_connection' => config('database.default'),
            'configured_connections' => $candidateNames,
        ]);
    }

    public function tables(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $inspection = $this->inspectConnection($this->resolveConnectionName($request));

        return response()->json([
            'tables' => $inspection['tables'] ?? [],
            'connection' => $inspection['connection'] ?? null,
            'message' => $inspection['message'] ?? null,
        ]);
    }

    public function rows(Request $request, string $table): JsonResponse
    {
        $this->authorizeAdmin($request);

        $connection = $this->connection($request);
        $table = $this->identifier($table);
        $columns = $this->columnsFor($connection, $table);
        $primaryKey = $this->singlePrimaryKey($columns);
        $perPage = min(max((int) $request->query('per_page', 50), 1), 100);
        $page = max((int) $request->query('page', 1), 1);
        $offset = ($page - 1) * $perPage;

        $query = $connection->table($table);
        $count = $query->count();

        if ($primaryKey !== null) {
            $query->orderBy($primaryKey);
        }

        $rows = $query
            ->offset($offset)
            ->limit($perPage)
            ->get()
            ->map(function ($row) use ($primaryKey) {
                $data = (array) $row;
                $data['__rowKey'] = $primaryKey !== null ? ($data[$primaryKey] ?? null) : null;

                return $data;
            })
            ->all();

        return response()->json([
            'columns' => $columns,
            'rows' => $rows,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $count,
                'last_page' => (int) max(1, ceil($count / $perPage)),
            ],
            'writable' => $primaryKey !== null,
            'protected' => $this->isProtectedTable($table),
        ]);
    }

    public function createTable(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:64'],
            'columns' => ['required', 'array', 'min:1', 'max:30'],
            'columns.*.name' => ['required', 'string', 'max:64'],
            'columns.*.type' => ['required', 'string', 'max:24'],
        ]);

        $connection = $this->connection($request);
        $driver = $connection->getDriverName();
        $table = $this->identifier($validated['name']);
        $this->assertSchemaMutationAllowed($table);
        $definitions = collect($validated['columns'])
            ->map(fn (array $column) => $this->wrap($connection, $this->identifier($column['name'])).' '.$this->sqlType($column['type'], $driver))
            ->implode(', ');

        $connection->statement('CREATE TABLE '.$this->wrap($connection, $table).' ('.$definitions.')');

        return response()->json([
            'tables' => $this->tablesFor($connection),
        ]);
    }

    public function renameTable(Request $request, string $table): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:64'],
        ]);

        $connection = $this->connection($request);
        $table = $this->identifier($table);
        $this->assertSchemaMutationAllowed($table);
        $next = $this->identifier($validated['name']);
        $this->assertSchemaMutationAllowed($next);

        $connection->statement(sprintf(
            'ALTER TABLE %s RENAME TO %s',
            $this->wrap($connection, $table),
            $this->wrap($connection, $next)
        ));

        return response()->json([
            'tables' => $this->tablesFor($connection),
        ]);
    }

    public function destroyTable(Request $request, string $table): JsonResponse
    {
        $this->authorizeAdmin($request);

        $connection = $this->connection($request);
        $table = $this->identifier($table);
        $this->assertSchemaMutationAllowed($table);
        $connection->statement('DROP TABLE '.$this->wrap($connection, $table));

        return response()->json([
            'tables' => $this->tablesFor($connection),
        ]);
    }

    public function addColumn(Request $request, string $table): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:64'],
            'type' => ['required', 'string', 'max:24'],
        ]);

        $connection = $this->connection($request);
        $driver = $connection->getDriverName();
        $table = $this->identifier($table);
        $this->assertSchemaMutationAllowed($table);

        $connection->statement(sprintf(
            'ALTER TABLE %s ADD COLUMN %s %s',
            $this->wrap($connection, $table),
            $this->wrap($connection, $this->identifier($validated['name'])),
            $this->sqlType($validated['type'], $driver)
        ));

        return response()->json([
            'tables' => $this->tablesFor($connection),
        ]);
    }

    public function storeRow(Request $request, string $table): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'values' => ['required', 'array'],
        ]);

        $connection = $this->connection($request);
        $table = $this->identifier($table);
        $this->assertRowMutationAllowed($request, $table);
        $columns = $this->columnsFor($connection, $table);
        $payload = $this->sanitizeValues($validated['values'], $columns);

        if ($payload === []) {
            if ($connection->getDriverName() === 'mysql') {
                $connection->statement('INSERT INTO '.$this->wrap($connection, $table).' () VALUES ()');
            } else {
                $connection->statement('INSERT INTO '.$this->wrap($connection, $table).' DEFAULT VALUES');
            }
        } else {
            $connection->table($table)->insert($payload);
        }

        return $this->rows($request, $table);
    }

    public function updateRow(Request $request, string $table, string $rowKey): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'values' => ['required', 'array'],
        ]);

        $connection = $this->connection($request);
        $table = $this->identifier($table);
        $this->assertRowMutationAllowed($request, $table);
        $columns = $this->columnsFor($connection, $table);
        $primaryKey = $this->singlePrimaryKey($columns);

        abort_unless($primaryKey !== null, 422, 'The table needs a single primary key to edit rows.');

        $payload = $this->sanitizeValues($validated['values'], $columns);

        if ($payload !== []) {
            $connection->table($table)->where($primaryKey, $rowKey)->update($payload);
        }

        return $this->rows($request, $table);
    }

    public function destroyRow(Request $request, string $table, string $rowKey): JsonResponse
    {
        $this->authorizeAdmin($request);

        $connection = $this->connection($request);
        $table = $this->identifier($table);
        $this->assertRowMutationAllowed($request, $table);
        $columns = $this->columnsFor($connection, $table);
        $primaryKey = $this->singlePrimaryKey($columns);

        abort_unless($primaryKey !== null, 422, 'The table needs a single primary key to delete rows.');

        $connection->table($table)->where($primaryKey, $rowKey)->delete();

        return $this->rows($request, $table);
    }

    private function connection(Request $request): ConnectionInterface
    {
        $name = $this->resolveConnectionName($request);
        abort_unless(is_string($name) && $name !== '', 422, 'Database connection is not configured.');

        return DB::connection($name);
    }

    private function resolveConnectionName(Request $request): string
    {
        $configured = $this->configuredConnectionNames();
        $requested = $request->query('connection');

        if (is_string($requested) && $requested !== '' && in_array($requested, $configured, true)) {
            return $requested;
        }

        $default = config('database.default');
        if (is_string($default) && $default !== '' && in_array($default, $configured, true) && $this->isConnectionReady($default)) {
            return $default;
        }

        foreach ($this->preferredConnectionNames($configured) as $name) {
            if ($this->isConnectionReady($name)) {
                return $name;
            }
        }

        return $configured[0] ?? '';
    }

    private function configuredConnectionNames(): array
    {
        return array_values(array_filter(array_keys(config('database.connections', [])), fn (string $name) => is_array(config("database.connections.$name"))));
    }

    private function preferredConnectionNames(array $configured): array
    {
        $preferred = array_values(array_filter(
            $configured,
            fn (string $name) => $name !== 'sqlite'
        ));

        if (in_array('sqlite', $configured, true)) {
            $preferred[] = 'sqlite';
        }

        return $preferred;
    }

    private function connectionCandidates(): array
    {
        $candidates = [];
        $order = 0;

        foreach ($this->configuredConnectionNames() as $name) {
            $config = config("database.connections.$name");
            if (! is_array($config)) {
                continue;
            }

            $driver = (string) ($config['driver'] ?? '');
            if (! in_array($driver, ['sqlite', 'mysql', 'mariadb', 'pgsql', 'sqlsrv'], true)) {
                continue;
            }

            $candidate = [
                'name' => $name,
                'driver' => $driver,
                'database' => $config['database'] ?? null,
                'status' => 'unavailable',
                'table_count' => 0,
                'error' => null,
                'priority' => $name === config('database.default') ? 0 : ($name === 'sqlite' ? 2 : 1),
                '_order' => $order++,
            ];

            try {
                $connection = DB::connection($name);
                $candidate['status'] = 'ready';
                $candidate['table_count'] = count($this->tablesFor($connection));
            } catch (\Throwable $e) {
                $candidate['error'] = $e->getMessage();
            }

            $candidates[] = $candidate;
        }

        usort($candidates, function (array $left, array $right): int {
            $statusRank = ['ready' => 0, 'unavailable' => 1];

            $leftRank = $statusRank[$left['status']] ?? 9;
            $rightRank = $statusRank[$right['status']] ?? 9;
            if ($leftRank !== $rightRank) {
                return $leftRank <=> $rightRank;
            }

            if (($left['priority'] ?? 9) !== ($right['priority'] ?? 9)) {
                return ($left['priority'] ?? 9) <=> ($right['priority'] ?? 9);
            }

            return ($left['_order'] ?? 0) <=> ($right['_order'] ?? 0);
        });

        return array_map(
            fn (array $candidate) => array_diff_key($candidate, array_flip(['priority', '_order'])),
            $candidates
        );
    }

    private function inspectConnection(string $name): array
    {
        if ($name === '') {
            return [
                'connection' => null,
                'tables' => [],
                'message' => 'No database connections are configured.',
            ];
        }

        try {
            $connection = DB::connection($name);
            $tables = $this->tablesFor($connection);

            return [
                'connection' => [
                    'name' => $name,
                    'driver' => $connection->getDriverName(),
                    'database' => config("database.connections.$name.database"),
                    'status' => 'ready',
                    'table_count' => count($tables),
                ],
                'tables' => $tables,
                'message' => null,
            ];
        } catch (\Throwable $e) {
            return [
                'connection' => [
                    'name' => $name,
                    'driver' => (string) (config("database.connections.$name.driver") ?? ''),
                    'database' => config("database.connections.$name.database"),
                    'status' => 'unavailable',
                    'error' => $e->getMessage(),
                ],
                'tables' => [],
                'message' => $e->getMessage(),
            ];
        }
    }

    private function isConnectionReady(string $name): bool
    {
        try {
            $connection = DB::connection($name);
            $this->tablesFor($connection);

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function tablesFor(ConnectionInterface $connection): array
    {
        $driver = $connection->getDriverName();
        $rows = match ($driver) {
            'sqlite' => $connection->select("SELECT name AS name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"),
            'mysql' => $connection->select("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'"),
            'pgsql' => $connection->select("SELECT table_name AS name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' ORDER BY table_name"),
            'sqlsrv' => $connection->select("SELECT TABLE_NAME AS name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"),
            default => [],
        };

        return array_values(array_map(function ($row) use ($connection, $driver) {
            $row = (array) $row;
            $name = (string) ($driver === 'mysql'
                ? array_values($row)[0]
                : ($row['name'] ?? ''));

            return [
                'name' => $name,
                'columns' => $this->columnsFor($connection, $name),
                'protected' => $this->isProtectedTable($name),
            ];
        }, $rows));
    }

    private function columnsFor(ConnectionInterface $connection, string $table): array
    {
        $table = $this->identifier($table);
        $driver = $connection->getDriverName();

        if ($driver === 'sqlite') {
            $result = $connection->select('PRAGMA table_info('.$this->wrap($connection, $table).')');
            $columns = [];

            foreach ($result as $row) {
                $row = (array) $row;
                $columns[] = [
                    'name' => (string) ($row['name'] ?? ''),
                    'type' => strtolower((string) ($row['type'] ?? 'text')),
                    'nullable' => ((int) ($row['notnull'] ?? 0)) === 0,
                    'primary' => ((int) ($row['pk'] ?? 0)) > 0,
                ];
            }

            return $columns;
        }

        if ($driver === 'mysql') {
            $result = $connection->select('SHOW FULL COLUMNS FROM '.$this->wrap($connection, $table));
            $columns = [];
            $primaryColumns = $this->primaryKeysFor($connection, $table);

            foreach ($result as $row) {
                $row = (array) $row;
                $name = (string) ($row['Field'] ?? '');
                $columns[] = [
                    'name' => $name,
                    'type' => strtolower((string) ($row['Type'] ?? 'text')),
                    'nullable' => strtoupper((string) ($row['Null'] ?? 'YES')) === 'YES',
                    'primary' => in_array($name, $primaryColumns, true),
                ];
            }

            return $columns;
        }

        if ($driver === 'pgsql') {
            $result = $connection->select(
                'SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ? ORDER BY ordinal_position',
                [$table]
            );
            $columns = [];
            $primaryColumns = $this->primaryKeysFor($connection, $table);

            foreach ($result as $row) {
                $row = (array) $row;
                $name = (string) ($row['column_name'] ?? '');
                $columns[] = [
                    'name' => $name,
                    'type' => strtolower((string) ($row['data_type'] ?? 'text')),
                    'nullable' => strtoupper((string) ($row['is_nullable'] ?? 'YES')) === 'YES',
                    'primary' => in_array($name, $primaryColumns, true),
                ];
            }

            return $columns;
        }

        if ($driver === 'sqlsrv') {
            $result = $connection->select(
                'SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
                [$table]
            );
            $columns = [];
            $primaryColumns = $this->primaryKeysFor($connection, $table);

            foreach ($result as $row) {
                $row = (array) $row;
                $name = (string) ($row['COLUMN_NAME'] ?? '');
                $columns[] = [
                    'name' => $name,
                    'type' => strtolower((string) ($row['DATA_TYPE'] ?? 'text')),
                    'nullable' => strtoupper((string) ($row['IS_NULLABLE'] ?? 'YES')) === 'YES',
                    'primary' => in_array($name, $primaryColumns, true),
                ];
            }

            return $columns;
        }

        return [];
    }

    private function primaryKeysFor(ConnectionInterface $connection, string $table): array
    {
        $driver = $connection->getDriverName();

        if ($driver === 'sqlite') {
            return array_values(array_map(
                fn (array $row) => (string) ($row['name'] ?? ''),
                array_filter(array_map(fn ($row) => (array) $row, $connection->select('PRAGMA table_info('.$this->wrap($connection, $this->identifier($table)).')')), fn (array $row) => ((int) ($row['pk'] ?? 0)) > 0)
            ));
        }

        if ($driver === 'mysql') {
            return array_values(array_map(
                fn (array $row) => (string) ($row['Column_name'] ?? ''),
                array_map(fn ($row) => (array) $row, $connection->select(
                    "SELECT Column_name FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY' ORDER BY ORDINAL_POSITION",
                    [$this->identifier($table)]
                ))
            ));
        }

        if ($driver === 'pgsql') {
            return array_values(array_map(
                fn (array $row) => (string) ($row['column_name'] ?? ''),
                array_map(fn ($row) => (array) $row, $connection->select(
                    "SELECT a.attname AS column_name FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = ?::regclass AND i.indisprimary",
                    [$this->identifier($table)]
                ))
            ));
        }

        if ($driver === 'sqlsrv') {
            return array_values(array_map(
                fn (array $row) => (string) ($row['COLUMN_NAME'] ?? ''),
                array_map(fn ($row) => (array) $row, $connection->select(
                    "SELECT KU.COLUMN_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS TC INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS KU ON TC.CONSTRAINT_NAME = KU.CONSTRAINT_NAME WHERE TC.TABLE_NAME = ? AND TC.CONSTRAINT_TYPE = 'PRIMARY KEY'",
                    [$this->identifier($table)]
                ))
            ));
        }

        return [];
    }

    private function singlePrimaryKey(array $columns): ?string
    {
        $keys = array_values(array_filter(array_map(
            fn (array $column) => $column['primary'] ? (string) $column['name'] : null,
            $columns
        )));

        return count($keys) === 1 ? $keys[0] : null;
    }

    private function sanitizeValues(array $values, array $columns): array
    {
        $columnMap = [];
        foreach ($columns as $column) {
            $columnMap[$column['name']] = $column;
        }

        $clean = [];

        foreach ($values as $column => $value) {
            if ($column === '__rowKey') {
                continue;
            }

            $name = $this->identifier((string) $column);
            if (! isset($columnMap[$name])) {
                continue;
            }

            $type = strtolower((string) ($columnMap[$name]['type'] ?? 'text'));
            if ($value === '') {
                $clean[$name] = null;
                continue;
            }

            $clean[$name] = match (true) {
                str_contains($type, 'int') => is_numeric($value) ? (int) $value : $value,
                str_contains($type, 'real'),
                str_contains($type, 'double'),
                str_contains($type, 'float'),
                str_contains($type, 'decimal') => is_numeric($value) ? (float) $value : $value,
                str_contains($type, 'bool') => in_array(strtolower((string) $value), ['1', 'true', 'yes', 'on'], true),
                default => $value,
            };
        }

        return $clean;
    }

    private function sqlType(string $type, string $driver): string
    {
        return match (strtolower($type)) {
            'integer', 'int' => 'INTEGER',
            'real', 'float', 'double', 'decimal' => 'REAL',
            'boolean', 'bool' => $driver === 'mysql' ? 'TINYINT(1)' : 'BOOLEAN',
            'datetime', 'date', 'timestamp' => 'DATETIME',
            'json' => $driver === 'sqlite' ? 'TEXT' : 'JSON',
            default => 'TEXT',
        };
    }

    private function wrap(ConnectionInterface $connection, string $identifier): string
    {
        return $connection->getQueryGrammar()->wrap($identifier);
    }

    private function identifier(string $identifier): string
    {
        abort_unless(preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $identifier) === 1, 422, 'Invalid database identifier.');

        return $identifier;
    }

    private function assertSchemaMutationAllowed(string $table): void
    {
        abort_unless(
            ! $this->isProtectedTable($table),
            423,
            'Schema changes are blocked for protected system tables.'
        );
    }

    private function assertRowMutationAllowed(Request $request, string $table): void
    {
        if (! $this->isProtectedTable($table)) {
            return;
        }

        abort_unless(
            $request->boolean('confirm_protected'),
            423,
            'Protected system tables require explicit confirmation before editing rows.'
        );
    }

    private function isProtectedTable(string $table): bool
    {
        $configured = config('database.editor_protected_tables', self::PROTECTED_TABLES);
        $protected = is_array($configured) ? $configured : self::PROTECTED_TABLES;

        return in_array(strtolower($table), array_map('strtolower', $protected), true);
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->isAdmin(), 403);
    }
}
