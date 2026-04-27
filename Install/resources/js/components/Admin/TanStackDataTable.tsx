"use client";

import { useState } from 'react';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    SortingState,
    getFilteredRowModel,
    ColumnFiltersState,
    getPaginationRowModel,
    VisibilityState,
} from '@tanstack/react-table';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface TanStackDataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    searchPlaceholder?: string;
    searchColumn?: string;
    showSearch?: boolean;
    showPagination?: boolean;
    // Server-side pagination
    serverPagination?: {
        pageCount: number;
        pageIndex: number;
        pageSize: number;
        total: number;
        onPageChange: (page: number) => void;
        onPageSizeChange?: (size: number) => void;
    };
    // Server-side search
    serverSearch?: {
        value: string;
        onChange: (value: string) => void;
    };
}

export function TanStackDataTable<TData, TValue>({
    columns,
    data,
    searchPlaceholder,
    searchColumn,
    showSearch = true,
    showPagination = true,
    serverPagination,
    serverSearch,
}: TanStackDataTableProps<TData, TValue>) {
    const { t } = useTranslation();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = useState({});
    const [globalFilter, setGlobalFilter] = useState('');

    const isServerSide = !!serverPagination;

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        // Client-side features (disabled when server-side)
        ...(isServerSide
            ? {
                  manualPagination: true,
                  pageCount: serverPagination.pageCount,
              }
            : {
                  getPaginationRowModel: getPaginationRowModel(),
              }),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: isServerSide ? undefined : getFilteredRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: 'includesString',
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter: serverSearch ? serverSearch.value : globalFilter,
            ...(isServerSide && {
                pagination: {
                    pageIndex: serverPagination.pageIndex,
                    pageSize: serverPagination.pageSize,
                },
            }),
        },
    });

    const handleSearchChange = (value: string) => {
        if (serverSearch) {
            serverSearch.onChange(value);
        } else if (searchColumn) {
            table.getColumn(searchColumn)?.setFilterValue(value);
        } else {
            setGlobalFilter(value);
        }
    };

    const searchValue = serverSearch
        ? serverSearch.value
        : searchColumn
          ? (table.getColumn(searchColumn)?.getFilterValue() as string) ?? ''
          : globalFilter;

    // Pagination info
    const pageIndex = isServerSide
        ? serverPagination.pageIndex
        : table.getState().pagination.pageIndex;
    const pageSize = isServerSide
        ? serverPagination.pageSize
        : table.getState().pagination.pageSize;
    const pageCount = isServerSide ? serverPagination.pageCount : table.getPageCount();
    const totalRows = isServerSide ? serverPagination.total : table.getFilteredRowModel().rows.length;

    const canPreviousPage = isServerSide ? pageIndex > 0 : table.getCanPreviousPage();
    const canNextPage = isServerSide ? pageIndex < pageCount - 1 : table.getCanNextPage();

    const goToPage = (page: number) => {
        if (isServerSide) {
            serverPagination.onPageChange(page);
        } else {
            table.setPageIndex(page);
        }
    };

    const handleSetPageSize = (size: number) => {
        if (isServerSide && serverPagination.onPageSizeChange) {
            serverPagination.onPageSizeChange(size);
        } else {
            table.setPageSize(size);
        }
    };

    return (
        <div className="space-y-4">
            {showSearch && (
                <div className="relative max-w-sm">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={searchPlaceholder ?? t("Search...")}
                        value={searchValue}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="ps-9"
                    />
                </div>
            )}

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef.header,
                                                  header.getContext()
                                              )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    {t("No results.")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {showPagination && (
                <div className="flex items-center justify-between px-2">
                    <div className="flex-1 text-sm text-muted-foreground">
                        {t(":count row(s) total.", { count: totalRows })}
                    </div>
                    <div className="flex items-center gap-6 lg:gap-8">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{t("Rows per page")}</p>
                            <Select
                                value={pageSize.toString()}
                                onValueChange={(value) => handleSetPageSize(Number(value))}
                            >
                                <SelectTrigger className="h-8 w-[70px]">
                                    <SelectValue placeholder={pageSize.toString()} />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[10, 20, 30, 40, 50].map((size) => (
                                        <SelectItem key={size} value={size.toString()}>
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                            {t("Page :current of :total", {
                                current: pageIndex + 1,
                                total: pageCount || 1
                            })}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex"
                                onClick={() => goToPage(0)}
                                disabled={!canPreviousPage}
                            >
                                <span className="sr-only">{t("Go to first page")}</span>
                                <ChevronsLeft className="h-4 w-4 rtl:rotate-180" />
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => goToPage(pageIndex - 1)}
                                disabled={!canPreviousPage}
                            >
                                <span className="sr-only">{t("Go to previous page")}</span>
                                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => goToPage(pageIndex + 1)}
                                disabled={!canNextPage}
                            >
                                <span className="sr-only">{t("Go to next page")}</span>
                                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                            </Button>
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex"
                                onClick={() => goToPage(pageCount - 1)}
                                disabled={!canNextPage}
                            >
                                <span className="sr-only">{t("Go to last page")}</span>
                                <ChevronsRight className="h-4 w-4 rtl:rotate-180" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
