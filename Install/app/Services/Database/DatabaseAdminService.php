<?php

namespace App\Services\Database;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Connection-agnostic database administration primitives (introspection +
 * schema/row mutation) shared by the MCP admin tools.
 *
 * The equivalent logic also lives, request-shaped, in
 * App\Http\Controllers\DatabaseCrudController — that controller backs the
 * /database admin UI and is left untouched on purpose (it is a live
 * surface). The one thing that must never drift between the two is the
 * protected-table policy, so both read PROTECTED_TABLES from here via
 * config('database.editor_protected_tables').
 *
 * Unlike the controller, nothing here aborts with an HTTP status: every
 * failure is a RuntimeException so MCP tools can turn it into a normal
 * tool-error result.
 */
class DatabaseAdminService
{
    /**
     * Tables whose schema may never be altered, and whose rows may only be
     * touched with an explicit confirmation flag. These are the tables the
     * platform itself depends on for auth, billing and MCP access control.
     */
    public const PROTECTED_TABLES = [
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
        'project_ai_connector_tokens',
        'project_ai_connector_activations',
        'mcp_tool_calls',
    ];

    // ---------------------------------------------------------------
    // Connections
    // ---------------------------------------------------------------

    /** @return string[] */
    public function connectionNames(): array
    {
        return array_values(array_filter(
            array_keys((array) config('database.connections', [])),
            fn (string $name) => is_array(config("database.connections.$name"))
        ));
    }

    public function resolveConnectionName(?string $requested = null): string
    {
        $configured = $this->connectionNames();

        if (is_string($requested) && $requested !== '') {
            if (! in_array($requested, $configured, true)) {
                throw new RuntimeException("Unknown database connection: {$requested}");
            }

            return $requested;
        }

        $default = (string) config('database.default');

        if ($default !== '' && in_array($default, $configured, true)) {
            return $default;
        }

        return $configured[0] ?? throw new RuntimeException('No database connections are configured.');
    }

    public function connection(?string $name = null): ConnectionInterface
    {
        return DB::connection($this->resolveConnectionName($name));
    }

    /**
     * Every configured connection with a reachability probe, so an MCP
     * caller can discover what it may target before touching anything.
     */
    public function connectionCandidates(): array
    {
        $candidates = [];

        foreach ($this->connectionNames() as $name) {
            $config = (array) config("database.connections.$name");
            $driver = (string) ($config['driver'] ?? '');

            if (! in_array($driver, ['sqlite', 'mysql', 'mariadb', 'pgsql', 'sqlsrv'], true)) {
                continue;
            }

            $candidate = [
                'name' => $name,
                'driver' => $driver,
                'database' => $config['database'] ?? null,
                'is_default' => $name === config('database.default'),
                'status' => 'unavailable',
                'table_count' => 0,
                'error' => null,
            ];

            try {
                $candidate['table_count'] = count($this->tableNames(DB::connection($name)));
                $candidate['status'] = 'ready';
            } catch (\Throwable $e) {
                $candidate['error'] = $e->getMessage();
            }

            $candidates[] = $candidate;
        }

        return $candidates;
    }

    // ---------------------------------------------------------------
    // Introspection
    // ---------------------------------------------------------------

    /** @return string[] */
    public function tableNames(ConnectionInterface $connection): array
    {
        $driver = $connection->getDriverName();

        $rows = match ($driver) {
            'sqlite' => $connection->select("SELECT name AS name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"),
            'mysql', 'mariadb' => $connection->select("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'"),
            'pgsql' => $connection->select('SELECT table_name AS name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = \'BASE TABLE\' ORDER BY table_name'),
            'sqlsrv' => $connection->select("SELECT TABLE_NAME AS name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"),
            default => [],
        };

        return array_values(array_map(function ($row) use ($driver) {
            $row = (array) $row;

            return (string) (in_array($driver, ['mysql', 'mariadb'], true)
                ? array_values($row)[0]
                : ($row['name'] ?? ''));
        }, $rows));
    }

    /**
     * Table list with columns. $withColumns=false keeps the payload small
     * on installations with hundreds of tables.
     */
    public function tables(ConnectionInterface $connection, bool $withColumns = true): array
    {
        return array_map(fn (string $name) => [
            'name' => $name,
            'protected' => $this->isProtectedTable($name),
            'columns' => $withColumns ? $this->columnsFor($connection, $name) : null,
        ], $this->tableNames($connection));
    }

    public function columnsFor(ConnectionInterface $connection, string $table): array
    {
        $table = $this->identifier($table);
        $driver = $connection->getDriverName();
        $primary = $this->primaryKeysFor($connection, $table);

        $map = function (array $row, string $nameKey, string $typeKey, string $nullKey) use ($primary) {
            $name = (string) ($row[$nameKey] ?? '');

            return [
                'name' => $name,
                'type' => strtolower((string) ($row[$typeKey] ?? 'text')),
                'nullable' => strtoupper((string) ($row[$nullKey] ?? 'YES')) === 'YES',
                'primary' => in_array($name, $primary, true),
            ];
        };

        if ($driver === 'sqlite') {
            return array_map(function ($row) {
                $row = (array) $row;

                return [
                    'name' => (string) ($row['name'] ?? ''),
                    'type' => strtolower((string) ($row['type'] ?? 'text')),
                    'nullable' => ((int) ($row['notnull'] ?? 0)) === 0,
                    'primary' => ((int) ($row['pk'] ?? 0)) > 0,
                ];
            }, $connection->select('PRAGMA table_info('.$this->wrap($connection, $table).')'));
        }

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            return array_map(fn ($row) => $map((array) $row, 'Field', 'Type', 'Null'), $connection->select('SHOW FULL COLUMNS FROM '.$this->wrap($connection, $table)));
        }

        if ($driver === 'pgsql') {
            return array_map(fn ($row) => $map((array) $row, 'column_name', 'data_type', 'is_nullable'), $connection->select(
                'SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ? ORDER BY ordinal_position',
                [$table]
            ));
        }

        if ($driver === 'sqlsrv') {
            return array_map(fn ($row) => $map((array) $row, 'COLUMN_NAME', 'DATA_TYPE', 'IS_NULLABLE'), $connection->select(
                'SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
                [$table]
            ));
        }

        return [];
    }

    /** @return string[] */
    public function primaryKeysFor(ConnectionInterface $connection, string $table): array
    {
        $table = $this->identifier($table);
        $driver = $connection->getDriverName();

        // Key lookup is case-insensitive on purpose: MySQL 8 returns
        // information_schema result columns upper-cased regardless of how
        // they were written in the SELECT, so an exact "Column_name" lookup
        // silently found nothing and every table looked primary-key-less.
        $pluck = function (array $rows, string $key): array {
            $wanted = strtolower($key);

            return array_values(array_filter(array_map(function ($row) use ($wanted) {
                foreach ((array) $row as $column => $value) {
                    if (strtolower((string) $column) === $wanted) {
                        return (string) $value;
                    }
                }

                return '';
            }, $rows), fn (string $name) => $name !== ''));
        };

        return match ($driver) {
            'sqlite' => $pluck(array_filter(
                $connection->select('PRAGMA table_info('.$this->wrap($connection, $table).')'),
                fn ($row) => ((int) (((array) $row)['pk'] ?? 0)) > 0
            ), 'name'),
            'mysql', 'mariadb' => $pluck($connection->select(
                "SELECT Column_name FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY' ORDER BY ORDINAL_POSITION",
                [$table]
            ), 'Column_name'),
            'pgsql' => $pluck($connection->select(
                'SELECT a.attname AS column_name FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = ?::regclass AND i.indisprimary',
                [$table]
            ), 'column_name'),
            'sqlsrv' => $pluck($connection->select(
                "SELECT KU.COLUMN_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS TC INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS KU ON TC.CONSTRAINT_NAME = KU.CONSTRAINT_NAME WHERE TC.TABLE_NAME = ? AND TC.CONSTRAINT_TYPE = 'PRIMARY KEY'",
                [$table]
            ), 'COLUMN_NAME'),
            default => [],
        };
    }

    public function singlePrimaryKey(array $columns): ?string
    {
        $keys = array_values(array_filter(array_map(
            fn (array $column) => $column['primary'] ? (string) $column['name'] : null,
            $columns
        )));

        return count($keys) === 1 ? $keys[0] : null;
    }

    // ---------------------------------------------------------------
    // Rows
    // ---------------------------------------------------------------

    public function rows(ConnectionInterface $connection, string $table, int $page = 1, int $perPage = 50, ?string $where = null, array $bindings = []): array
    {
        $table = $this->identifier($table);
        $columns = $this->columnsFor($connection, $table);
        $primaryKey = $this->singlePrimaryKey($columns);
        $perPage = min(max($perPage, 1), 500);
        $page = max($page, 1);

        $query = $connection->table($table);

        if (is_string($where) && trim($where) !== '') {
            $query->whereRaw($where, $bindings);
        }

        $total = $query->count();

        if ($primaryKey !== null) {
            $query->orderBy($primaryKey);
        }

        $rows = $query->offset(($page - 1) * $perPage)->limit($perPage)->get()
            ->map(fn ($row) => (array) $row)
            ->all();

        return [
            'table' => $table,
            'columns' => $columns,
            'primary_key' => $primaryKey,
            'rows' => $rows,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
        ];
    }

    public function insertRow(ConnectionInterface $connection, string $table, array $values, bool $confirmProtected = false): array
    {
        $table = $this->identifier($table);
        $this->assertRowMutationAllowed($table, $confirmProtected);

        $columns = $this->columnsFor($connection, $table);
        $payload = $this->sanitizeValues($values, $columns);

        if ($payload === []) {
            $connection->statement(in_array($connection->getDriverName(), ['mysql', 'mariadb'], true)
                ? 'INSERT INTO '.$this->wrap($connection, $table).' () VALUES ()'
                : 'INSERT INTO '.$this->wrap($connection, $table).' DEFAULT VALUES');

            return ['inserted' => 1, 'id' => null, 'values' => []];
        }

        $id = $connection->table($table)->insertGetId($payload);

        return ['inserted' => 1, 'id' => $id, 'values' => $payload];
    }

    public function updateRow(ConnectionInterface $connection, string $table, string $rowKey, array $values, bool $confirmProtected = false): array
    {
        $table = $this->identifier($table);
        $this->assertRowMutationAllowed($table, $confirmProtected);

        $columns = $this->columnsFor($connection, $table);
        $primaryKey = $this->singlePrimaryKey($columns);

        if ($primaryKey === null) {
            throw new RuntimeException('This table needs a single primary key to update rows by key.');
        }

        $payload = $this->sanitizeValues($values, $columns);

        if ($payload === []) {
            return ['updated' => 0, 'values' => []];
        }

        $updated = $connection->table($table)->where($primaryKey, $rowKey)->update($payload);

        return ['updated' => $updated, 'primary_key' => $primaryKey, 'values' => $payload];
    }

    public function deleteRow(ConnectionInterface $connection, string $table, string $rowKey, bool $confirmProtected = false): array
    {
        $table = $this->identifier($table);
        $this->assertRowMutationAllowed($table, $confirmProtected);

        $columns = $this->columnsFor($connection, $table);
        $primaryKey = $this->singlePrimaryKey($columns);

        if ($primaryKey === null) {
            throw new RuntimeException('This table needs a single primary key to delete rows by key.');
        }

        return [
            'deleted' => $connection->table($table)->where($primaryKey, $rowKey)->delete(),
            'primary_key' => $primaryKey,
        ];
    }

    // ---------------------------------------------------------------
    // Schema
    // ---------------------------------------------------------------

    public function createTable(ConnectionInterface $connection, string $table, array $columns, bool $withTimestamps = false, bool $allowProtected = false): array
    {
        $table = $this->identifier($table);
        $this->assertSchemaMutationAllowed($table, $allowProtected);

        if ($columns === []) {
            throw new RuntimeException('At least one column is required.');
        }

        $driver = $connection->getDriverName();
        $definitions = [];
        $sawPrimary = false;

        foreach ($columns as $column) {
            $name = $this->identifier((string) ($column['name'] ?? ''));
            $definition = $this->wrap($connection, $name).' '.$this->sqlType((string) ($column['type'] ?? 'text'), $driver);

            if (! ($column['nullable'] ?? true)) {
                $definition .= ' NOT NULL';
            }

            if ($column['primary'] ?? false) {
                if ($sawPrimary) {
                    throw new RuntimeException('Only one primary-key column may be declared.');
                }
                $sawPrimary = true;
                $definition .= ($column['auto_increment'] ?? false)
                    ? $this->autoIncrementPrimaryKeyClause($driver)
                    : ' PRIMARY KEY';
            }

            $definitions[] = $definition;
        }

        if ($withTimestamps) {
            $definitions[] = $this->wrap($connection, 'created_at').' DATETIME NULL';
            $definitions[] = $this->wrap($connection, 'updated_at').' DATETIME NULL';
        }

        $connection->statement('CREATE TABLE '.$this->wrap($connection, $table).' ('.implode(', ', $definitions).')');

        return ['table' => $table, 'columns' => $this->columnsFor($connection, $table)];
    }

    public function renameTable(ConnectionInterface $connection, string $from, string $to, bool $allowProtected = false): array
    {
        $from = $this->identifier($from);
        $to = $this->identifier($to);
        $this->assertSchemaMutationAllowed($from, $allowProtected);
        $this->assertSchemaMutationAllowed($to, $allowProtected);

        $connection->statement(sprintf(
            'ALTER TABLE %s RENAME TO %s',
            $this->wrap($connection, $from),
            $this->wrap($connection, $to)
        ));

        return ['from' => $from, 'to' => $to];
    }

    public function dropTable(ConnectionInterface $connection, string $table, bool $allowProtected = false): array
    {
        $table = $this->identifier($table);
        $this->assertSchemaMutationAllowed($table, $allowProtected);

        $connection->statement('DROP TABLE '.$this->wrap($connection, $table));

        return ['dropped' => $table];
    }

    public function addColumn(ConnectionInterface $connection, string $table, string $name, string $type, bool $nullable = true, bool $allowProtected = false): array
    {
        $table = $this->identifier($table);
        $name = $this->identifier($name);
        $this->assertSchemaMutationAllowed($table, $allowProtected);

        $definition = $this->wrap($connection, $name).' '.$this->sqlType($type, $connection->getDriverName());

        if (! $nullable) {
            $definition .= ' NOT NULL';
        }

        $connection->statement(sprintf('ALTER TABLE %s ADD COLUMN %s', $this->wrap($connection, $table), $definition));

        return ['table' => $table, 'columns' => $this->columnsFor($connection, $table)];
    }

    public function dropColumn(ConnectionInterface $connection, string $table, string $name, bool $allowProtected = false): array
    {
        $table = $this->identifier($table);
        $name = $this->identifier($name);
        $this->assertSchemaMutationAllowed($table, $allowProtected);

        $connection->statement(sprintf(
            'ALTER TABLE %s DROP COLUMN %s',
            $this->wrap($connection, $table),
            $this->wrap($connection, $name)
        ));

        return ['table' => $table, 'columns' => $this->columnsFor($connection, $table)];
    }

    // ---------------------------------------------------------------
    // Guards / helpers
    // ---------------------------------------------------------------

    public function isProtectedTable(string $table): bool
    {
        $configured = config('database.editor_protected_tables', self::PROTECTED_TABLES);
        $protected = is_array($configured) ? $configured : self::PROTECTED_TABLES;

        return in_array(strtolower($table), array_map('strtolower', $protected), true);
    }

    public function assertSchemaMutationAllowed(string $table, bool $allowProtected = false): void
    {
        if ($this->isProtectedTable($table) && ! $allowProtected) {
            throw new RuntimeException("\"{$table}\" is a protected system table. Schema changes require the database:protected ability and allow_protected=true.");
        }
    }

    public function assertRowMutationAllowed(string $table, bool $confirmProtected = false): void
    {
        if ($this->isProtectedTable($table) && ! $confirmProtected) {
            throw new RuntimeException("\"{$table}\" is a protected system table. Row changes require the database:protected ability and confirm_protected=true.");
        }
    }

    public function identifier(string $identifier): string
    {
        if (preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $identifier) !== 1) {
            throw new RuntimeException("Invalid database identifier: \"{$identifier}\"");
        }

        return $identifier;
    }

    public function wrap(ConnectionInterface $connection, string $identifier): string
    {
        return $connection->getQueryGrammar()->wrap($identifier);
    }

    public function sqlType(string $type, string $driver): string
    {
        return match (strtolower($type)) {
            // "increments"/"serial" are how a caller usually spells an
            // auto-increment surrogate key; without them they fell through
            // to TEXT and MySQL rejected the AUTO_INCREMENT clause.
            'integer', 'int', 'increments', 'serial' => 'INTEGER',
            'biginteger', 'bigincrements' => in_array($driver, ['mysql', 'mariadb'], true) ? 'BIGINT' : 'INTEGER',
            'bigint' => in_array($driver, ['mysql', 'mariadb'], true) ? 'BIGINT' : 'INTEGER',
            'real', 'float', 'double' => 'REAL',
            'decimal' => in_array($driver, ['mysql', 'mariadb'], true) ? 'DECIMAL(15,2)' : 'REAL',
            'boolean', 'bool' => in_array($driver, ['mysql', 'mariadb'], true) ? 'TINYINT(1)' : 'BOOLEAN',
            'datetime', 'date', 'timestamp' => 'DATETIME',
            'json' => $driver === 'sqlite' ? 'TEXT' : 'JSON',
            'string', 'varchar' => in_array($driver, ['mysql', 'mariadb'], true) ? 'VARCHAR(255)' : 'TEXT',
            default => 'TEXT',
        };
    }

    public function sanitizeValues(array $values, array $columns): array
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

            if (is_array($value)) {
                $clean[$name] = json_encode($value);

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

    private function autoIncrementPrimaryKeyClause(string $driver): string
    {
        return match ($driver) {
            'sqlite' => ' PRIMARY KEY AUTOINCREMENT',
            'pgsql' => ' PRIMARY KEY',
            'sqlsrv' => ' IDENTITY(1,1) PRIMARY KEY',
            default => ' AUTO_INCREMENT PRIMARY KEY',
        };
    }
}
