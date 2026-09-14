import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Database, Loader2, Plus, RefreshCw, Save, Search, Trash2, Pencil, Table2, PanelLeftClose } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/contexts/LanguageContext';

type ColumnType = 'text' | 'integer' | 'real' | 'boolean' | 'datetime' | 'json';
type CellValue = string | number | boolean | null;
type RowRecord = Record<string, CellValue> & { __rowKey?: string | number | null };

interface TableColumn {
    name: string;
    type: string;
    nullable: boolean;
    primary: boolean;
}

interface TableInfo {
    name: string;
    columns: TableColumn[];
    protected?: boolean;
}

interface CrudIndexResponse {
    connection: { name: string; driver: string; database?: string | null; status?: string; table_count?: number; error?: string | null } | null;
    connections: Array<{ name: string; driver: string; database?: string | null; status: string; table_count?: number; error?: string | null }>;
    tables: TableInfo[];
    message?: string | null;
}

const COLUMN_TYPES: ColumnType[] = ['text', 'integer', 'real', 'boolean', 'datetime', 'json'];

function valueForInput(value: CellValue): string {
    if (value === null || value === undefined) return '';
    return String(value);
}

function castValue(value: string, type: string): CellValue {
    if (value === '') return '';

    const normalizedType = type.toLowerCase();
    if (normalizedType.includes('int')) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? Math.trunc(parsed) : value;
    }

    if (normalizedType.includes('real') || normalizedType.includes('float') || normalizedType.includes('double') || normalizedType.includes('decimal')) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : value;
    }

    if (normalizedType.includes('bool')) {
        return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
    }

    return value;
}

function emptyRow(columns: TableColumn[]): RowRecord {
    return columns.reduce<RowRecord>((row, column) => {
        row[column.name] = '';
        return row;
    }, {});
}

export function DatabaseCrudEditor() {
    const { t } = useTranslation();
    const [loadingMeta, setLoadingMeta] = useState(false);
    const [loadingRows, setLoadingRows] = useState(false);
    const [savingRowKey, setSavingRowKey] = useState<string | number | null>(null);
    const [connection, setConnection] = useState<CrudIndexResponse['connection'] | null>(null);
    const [connections, setConnections] = useState<CrudIndexResponse['connections']>([]);
    const [selectedConnection, setSelectedConnection] = useState('');
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [columns, setColumns] = useState<TableColumn[]>([]);
    const [rows, setRows] = useState<RowRecord[]>([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [newRow, setNewRow] = useState<RowRecord>({});
    const [tableSearch, setTableSearch] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newTableName, setNewTableName] = useState('');
    const [newTableColumns, setNewTableColumns] = useState<Array<{ name: string; type: ColumnType }>>([{ name: 'title', type: 'text' }]);
    const [newColumnName, setNewColumnName] = useState('');
    const [newColumnType, setNewColumnType] = useState<ColumnType>('text');

    const loadMeta = useCallback(async () => {
        setLoadingMeta(true);
        try {
            const response = await axios.get<CrudIndexResponse>('/database/api', {
                params: selectedConnection ? { connection: selectedConnection } : undefined,
            });

            setConnections(response.data.connections || []);
            setConnection(response.data.connection || null);
            const nextTables = response.data.tables || [];
            setTables(nextTables);

            const nextConnection = response.data.connection?.name
                || selectedConnection
                || response.data.connections?.find((item) => item.status === 'ready')?.name
                || response.data.connections?.[0]?.name
                || '';

            if (nextConnection !== selectedConnection) {
                setSelectedConnection(nextConnection);
            }

            setSelectedTable((current) => (
                nextTables.some((table) => table.name === current)
                    ? current
                    : nextTables[0]?.name || ''
            ));
        } catch {
            toast.error(t('Failed to load database metadata'));
        } finally {
            setLoadingMeta(false);
        }
    }, [selectedConnection, t]);

    const loadRows = useCallback(async () => {
        if (!selectedTable) {
            setColumns([]);
            setRows([]);
            setNewRow({});
            return;
        }

        setLoadingRows(true);
        try {
            const response = await axios.get<{
                columns: TableColumn[];
                rows: RowRecord[];
                pagination: { current_page: number; last_page: number };
                protected?: boolean;
            }>(`/database/api/tables/${selectedTable}/rows`, {
                params: {
                    page,
                    ...(selectedConnection ? { connection: selectedConnection } : {}),
                },
            });

            setColumns(response.data.columns || []);
            setRows(response.data.rows || []);
            setNewRow(emptyRow(response.data.columns || []));
            setLastPage(Math.max(response.data.pagination.last_page || 1, 1));
            if (response.data.protected) {
                setTables((current) => current.map((table) => (
                    table.name === selectedTable ? { ...table, protected: true } : table
                )));
            }
        } catch {
            toast.error(t('Failed to load rows'));
        } finally {
            setLoadingRows(false);
        }
    }, [page, selectedConnection, selectedTable, t]);

    useEffect(() => { void loadMeta(); }, [loadMeta]);
    useEffect(() => { void loadRows(); }, [loadRows]);
    useEffect(() => { setPage(1); }, [selectedConnection, selectedTable]);

    const filteredTables = useMemo(() => {
        const query = tableSearch.trim().toLowerCase();
        if (!query) return tables;
        return tables.filter((table) => table.name.toLowerCase().includes(query));
    }, [tableSearch, tables]);

    const selectedTableInfo = useMemo(
        () => tables.find((table) => table.name === selectedTable) || null,
        [tables, selectedTable]
    );
    const selectedTableProtected = selectedTableInfo?.protected === true;

    const connectionParams = useMemo(() => (
        selectedConnection ? { connection: selectedConnection } : undefined
    ), [selectedConnection]);

    const handleCreateTable = async (event: FormEvent) => {
        event.preventDefault();
        if (!newTableName.trim()) return;

        try {
            const response = await axios.post<{ tables: TableInfo[] }>('/database/api/tables', {
                name: newTableName.trim(),
                columns: newTableColumns.filter((column) => column.name.trim() !== ''),
            }, { params: connectionParams });
            setTables(response.data.tables || []);
            setSelectedTable(newTableName.trim());
            setShowCreateDialog(false);
            setNewTableName('');
            setNewTableColumns([{ name: 'title', type: 'text' }]);
            toast.success(t('Table created'));
        } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
            toast.error(message || t('Failed to create table'));
        }
    };

    const handleRenameTable = async () => {
        if (!selectedTable || selectedTableProtected) return;

        const nextName = window.prompt(t('Rename table'), selectedTable);
        if (!nextName || nextName.trim() === '' || nextName.trim() === selectedTable) return;

        try {
            const response = await axios.put<{ tables: TableInfo[] }>(`/database/api/tables/${selectedTable}`, {
                name: nextName.trim(),
            }, { params: connectionParams });
            setTables(response.data.tables || []);
            setSelectedTable(nextName.trim());
            toast.success(t('Table renamed'));
        } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
            toast.error(message || t('Failed to rename table'));
        }
    };

    const handleDeleteTable = async () => {
        if (!selectedTable || selectedTableProtected || !window.confirm(t('Delete this table and all its rows?'))) return;

        try {
            const response = await axios.delete<{ tables: TableInfo[] }>(`/database/api/tables/${selectedTable}`, {
                params: connectionParams,
            });
            setTables(response.data.tables || []);
            setSelectedTable(response.data.tables?.[0]?.name || '');
            toast.success(t('Table deleted'));
        } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
            toast.error(message || t('Failed to delete table'));
        }
    };

    const handleAddColumn = async () => {
        if (!selectedTable || selectedTableProtected || !newColumnName.trim()) return;

        try {
            const response = await axios.post<{ tables: TableInfo[] }>(`/database/api/tables/${selectedTable}/columns`, {
                name: newColumnName.trim(),
                type: newColumnType,
            }, { params: connectionParams });
            setTables(response.data.tables || []);
            setNewColumnName('');
            setNewColumnType('text');
            toast.success(t('Column added'));
        } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
            toast.error(message || t('Failed to add column'));
        }
    };

    const updateNewRowValue = (column: TableColumn, value: string) => {
        setNewRow((current) => ({ ...current, [column.name]: castValue(value, column.type) }));
    };

    const updateRowValue = (rowIndex: number, column: TableColumn, value: string) => {
        setRows((current) => current.map((row, index) => (index === rowIndex ? { ...row, [column.name]: castValue(value, column.type) } : row)));
    };

    const saveNewRow = async () => {
        if (!selectedTable) return;
        const confirmProtected = selectedTableProtected
            ? window.confirm(t('This is a protected system table. Continue with this row change?'))
            : false;
        if (selectedTableProtected && !confirmProtected) return;

        try {
            await axios.post(`/database/api/tables/${selectedTable}/rows`, {
                values: newRow,
                confirm_protected: confirmProtected,
            }, {
                params: connectionParams,
            });
            await loadRows();
            toast.success(t('Row created'));
        } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
            toast.error(message || t('Failed to create row'));
        }
    };

    const saveRow = async (row: RowRecord) => {
        if (!selectedTable || row.__rowKey === undefined || row.__rowKey === null) return;
        const confirmProtected = selectedTableProtected
            ? window.confirm(t('This is a protected system table. Continue with this row change?'))
            : false;
        if (selectedTableProtected && !confirmProtected) return;

        setSavingRowKey(row.__rowKey);
        try {
            const values = columns.reduce<RowRecord>((payload, column) => {
                payload[column.name] = row[column.name];
                return payload;
            }, {});
            await axios.put(`/database/api/tables/${selectedTable}/rows/${encodeURIComponent(String(row.__rowKey))}`, {
                values,
                confirm_protected: confirmProtected,
            }, {
                params: connectionParams,
            });
            await loadRows();
            toast.success(t('Row saved'));
        } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
            toast.error(message || t('Failed to save row'));
        } finally {
            setSavingRowKey(null);
        }
    };

    const deleteRow = async (row: RowRecord) => {
        if (!selectedTable || row.__rowKey === undefined || row.__rowKey === null || !window.confirm(t('Delete this row?'))) return;
        const confirmProtected = selectedTableProtected
            ? window.confirm(t('This is a protected system table. Continue with this row deletion?'))
            : false;
        if (selectedTableProtected && !confirmProtected) return;

        try {
            await axios.delete(`/database/api/tables/${selectedTable}/rows/${encodeURIComponent(String(row.__rowKey))}`, {
                params: {
                    ...(connectionParams ?? {}),
                    confirm_protected: confirmProtected,
                },
            });
            await loadRows();
            toast.success(t('Row deleted'));
        } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : null;
            toast.error(message || t('Failed to delete row'));
        }
    };

    const renderValueEditor = (column: TableColumn, value: CellValue, onChange: (value: string) => void) => {
        const isTextArea = column.type.toLowerCase().includes('json') || valueForInput(value).length > 120;
        if (isTextArea) {
            return (
                <Textarea
                    value={valueForInput(value)}
                    onChange={(event) => onChange(event.target.value)}
                    className="min-h-24 font-mono text-xs"
                />
            );
        }

        return (
            <Input
                type={column.type.toLowerCase().includes('int') || column.type.toLowerCase().includes('real') ? 'number' : 'text'}
                value={valueForInput(value)}
                onChange={(event) => onChange(event.target.value)}
            />
        );
    };

    return (
        <div className="flex h-full min-h-0 flex-col bg-background">
            <div className="flex h-14 items-center justify-between gap-3 border-b px-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <h2 className="truncate text-sm font-semibold">{t('SQL Connections')}</h2>
                    </div>
                    {connection && (
                        <p className="truncate text-xs text-muted-foreground">
                            {connection.name} · {connection.driver}{connection.database ? ` · ${connection.database}` : ''}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Select
                        value={selectedConnection}
                        onValueChange={(value) => {
                            setSelectedConnection(value);
                            setSelectedTable('');
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-64">
                            <SelectValue placeholder={t('Connection')} />
                        </SelectTrigger>
                        <SelectContent>
                            {connections.map((item) => (
                                <SelectItem key={item.name} value={item.name}>
                                    {item.name} · {item.driver}{item.database ? ` · ${item.database}` : ''}{item.status !== 'ready' ? ` · ${t('Unavailable')}` : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="sm" onClick={handleRenameTable} disabled={!selectedTable || selectedTableProtected}>
                        <Pencil className="h-4 w-4 me-1.5" />
                        {t('Rename')}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleDeleteTable} disabled={!selectedTable || selectedTableProtected}>
                        <Trash2 className="h-4 w-4 me-1.5" />
                        {t('Delete')}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4 me-1.5" />
                        {t('Table')}
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => { void loadMeta(); void loadRows(); }} disabled={loadingMeta || loadingRows}>
                        <RefreshCw className={`h-4 w-4 ${(loadingMeta || loadingRows) ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {connection?.status === 'unavailable' && (
                <div className="border-b bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <p className="font-medium">{t('Database connection unavailable')}</p>
                    <p className="mt-1 text-xs opacity-90">{connection.error || t('No supported tables were detected for the selected connection.')}</p>
                </div>
            )}

            <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_1fr]">
                <aside className="min-h-0 border-e bg-muted/20">
                    <div className="border-b px-4 py-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={tableSearch}
                                onChange={(event) => setTableSearch(event.target.value)}
                                placeholder={t('Search tables')}
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <ScrollArea className="h-[calc(100%-57px)]">
                        <div className="space-y-1 p-2">
                            {loadingMeta ? (
                                <div className="p-4 text-sm text-muted-foreground">
                                    <Loader2 className="me-2 inline h-4 w-4 animate-spin" />
                                    {t('Loading tables...')}
                                </div>
                            ) : connections.length === 0 ? (
                                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                                    {t('No database connections found')}
                                </div>
                            ) : filteredTables.length === 0 ? (
                                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                                    {t('No tables found for this connection')}
                                </div>
                            ) : (
                                filteredTables.map((table) => (
                                    <button
                                        key={table.name}
                                        type="button"
                                        onClick={() => setSelectedTable(table.name)}
                                        className={`flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                                            selectedTable === table.name ? 'border-primary bg-primary/10' : 'border-transparent hover:border-border hover:bg-background'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Table2 className="h-4 w-4 text-muted-foreground" />
                                                <span className="truncate text-sm font-medium">{table.name}</span>
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {table.columns.length} {t('columns')}{table.protected ? ` · ${t('Protected')}` : ''}
                                            </p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </aside>

                <main className="min-h-0 flex flex-col">
                    <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                        <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('Table')}</p>
                            <p className="truncate font-mono text-xs text-muted-foreground">{selectedTable || t('No table selected')}</p>
                            {connection?.name && (
                                <p className="truncate text-xs text-muted-foreground">{t('Connection')}: {connection.name}</p>
                            )}
                            {selectedTableProtected && (
                                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                    {t('Protected table: schema changes are blocked and row edits require confirmation.')}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedTable && (
                            <Button type="button" variant="outline" size="sm" onClick={handleAddColumn} disabled={selectedTableProtected}>
                                <PanelLeftClose className="h-4 w-4 me-1.5" />
                                {t('Columns')}
                                </Button>
                            )}
                        </div>
                    </div>

                    {selectedTable && (
                        <div className="flex items-end gap-3 border-b px-4 py-3">
                            <div className="w-64 space-y-1">
                                <Label className="text-xs">{t('New column')}</Label>
                                <Input value={newColumnName} onChange={(event) => setNewColumnName(event.target.value)} />
                            </div>
                            <Select value={newColumnType} onValueChange={(value) => setNewColumnType(value as ColumnType)}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {COLUMN_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddColumn} disabled={!newColumnName.trim() || selectedTableProtected}>
                                <Plus className="h-4 w-4 me-1.5" />
                                {t('Add')}
                            </Button>
                        </div>
                    )}

                    <ScrollArea className="min-h-0 flex-1">
                        {loadingRows ? (
                            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                {t('Loading rows...')}
                            </div>
                        ) : selectedTable ? (
                            <div className="p-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {columns.map((column) => (
                                                <TableHead key={column.name} className="min-w-48">
                                                    <div className="flex flex-col">
                                                        <span>{column.name}</span>
                                                        <span className="text-xs font-normal text-muted-foreground">{column.type || 'text'}</span>
                                                    </div>
                                                </TableHead>
                                            ))}
                                            <TableHead className="w-24">{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            {columns.map((column) => (
                                                <TableCell key={column.name} className="min-w-56 align-top">
                                                    {renderValueEditor(column, newRow[column.name] ?? '', (value) => updateNewRowValue(column, value))}
                                                </TableCell>
                                            ))}
                                            <TableCell className="align-top">
                                                <Button type="button" variant="outline" size="icon" onClick={saveNewRow} title={t('Create row')}>
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        {rows.map((row, rowIndex) => (
                                            <TableRow key={String(row.__rowKey ?? rowIndex)}>
                                                {columns.map((column) => (
                                                    <TableCell key={column.name} className="min-w-56 align-top">
                                                        {renderValueEditor(column, row[column.name] ?? '', (value) => updateRowValue(rowIndex, column, value))}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="align-top">
                                                    <div className="flex gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => saveRow(row)}
                                                            disabled={savingRowKey === row.__rowKey || row.__rowKey === undefined || row.__rowKey === null}
                                                            title={t('Save')}
                                                        >
                                                            {savingRowKey === row.__rowKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                        </Button>
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => deleteRow(row)} title={t('Delete')}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                        {connections.length === 0 ? t('No database connection is available') : t('Select or create a table')}
                    </div>
                )}
            </ScrollArea>

                    {selectedTable && (
                        <div className="flex h-12 items-center justify-between border-t px-4">
                            <p className="text-xs text-muted-foreground">
                                {t('Page')} {page} / {lastPage}
                                {selectedTableInfo ? ` · ${selectedTableInfo.columns.length} ${t('columns')}` : ''}
                            </p>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => Math.max(current - 1, 1))} disabled={page <= 1}>
                                    {t('Previous')}
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => Math.min(current + 1, lastPage))} disabled={page >= lastPage}>
                                    {t('Next')}
                                </Button>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Create table')}</DialogTitle>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={handleCreateTable}>
                        <div className="space-y-2">
                            <Label>{t('Table name')}</Label>
                            <Input value={newTableName} onChange={(event) => setNewTableName(event.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Columns')}</Label>
                            <div className="space-y-2">
                                {newTableColumns.map((column, index) => (
                                    <div key={index} className="flex gap-2">
                                        <Input
                                            value={column.name}
                                            onChange={(event) => setNewTableColumns((current) => current.map((item, itemIndex) => (
                                                itemIndex === index ? { ...item, name: event.target.value } : item
                                            )))}
                                        />
                                        <Select
                                            value={column.type}
                                            onValueChange={(value) => setNewTableColumns((current) => current.map((item, itemIndex) => (
                                                itemIndex === index ? { ...item, type: value as ColumnType } : item
                                            )))}
                                        >
                                            <SelectTrigger className="w-32">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COLUMN_TYPES.map((type) => (
                                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => setNewTableColumns((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={newTableColumns.length <= 1}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => setNewTableColumns((current) => [...current, { name: '', type: 'text' }])}>
                                <Plus className="h-4 w-4 me-1.5" />
                                {t('Add column')}
                            </Button>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" disabled={!newTableName.trim() || newTableColumns.every((column) => !column.name.trim())}>
                                {t('Create')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default DatabaseCrudEditor;
