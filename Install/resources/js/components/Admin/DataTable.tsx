import { ReactNode, useState } from 'react';
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
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

export interface Column<T> {
    key: string;
    header: string;
    render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    searchPlaceholder?: string;
    showSearch?: boolean;
    showPagination?: boolean;
    pageSize?: number;
}

export function DataTable<T extends object>({
    columns,
    data,
    searchPlaceholder,
    showSearch = true,
    showPagination = true,
    pageSize = 10,
}: DataTableProps<T>) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Simple search filter (searches all string values)
    const filteredData = data.filter((item) => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        return Object.values(item).some(
            (value) =>
                typeof value === 'string' &&
                value.toLowerCase().includes(searchLower)
        );
    });

    // Pagination
    const totalPages = Math.ceil(filteredData.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

    return (
        <div className="space-y-4">
            {showSearch && (
                <div className="relative max-w-sm">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={searchPlaceholder ?? t("Search...")}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="ps-9"
                    />
                </div>
            )}

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((column) => (
                                <TableHead key={column.key}>{column.header}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item, index) => (
                                <TableRow key={index}>
                                    {columns.map((column) => (
                                        <TableCell key={column.key}>
                                            {column.render
                                                ? column.render(item)
                                                : ((item as Record<string, unknown>)[column.key] as ReactNode)}
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
                                    {t("No results found.")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {showPagination && totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        {t("Showing :from to :to of :total results", {
                            from: startIndex + 1,
                            to: Math.min(startIndex + pageSize, filteredData.length),
                            total: filteredData.length
                        })}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                            {t("Previous")}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            {t("Page :current of :total", {
                                current: currentPage,
                                total: totalPages
                            })}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setCurrentPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={currentPage === totalPages}
                        >
                            {t("Next")}
                            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
