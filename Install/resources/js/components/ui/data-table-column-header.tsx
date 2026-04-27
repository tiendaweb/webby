"use client"

import { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import {
    TableActionMenu,
    TableActionMenuTrigger,
    TableActionMenuContent,
    TableActionMenuItem,
    TableActionMenuSeparator,
} from "@/components/ui/table-action-menu"
import { useTranslation } from "@/contexts/LanguageContext"

interface DataTableColumnHeaderProps<TData, TValue>
    extends React.HTMLAttributes<HTMLDivElement> {
    column: Column<TData, TValue>
    title: string
}

export function DataTableColumnHeader<TData, TValue>({
    column,
    title,
    className,
}: DataTableColumnHeaderProps<TData, TValue>) {
    const { t } = useTranslation()

    if (!column.getCanSort()) {
        return <div className={cn(className)}>{title}</div>
    }

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <TableActionMenu>
                <TableActionMenuTrigger className="-ms-3 h-8 px-2 w-auto">
                    <span>{title}</span>
                    {column.getIsSorted() === "desc" ? (
                        <ArrowDown className="ms-2 h-4 w-4" />
                    ) : column.getIsSorted() === "asc" ? (
                        <ArrowUp className="ms-2 h-4 w-4" />
                    ) : (
                        <ChevronsUpDown className="ms-2 h-4 w-4" />
                    )}
                </TableActionMenuTrigger>
                <TableActionMenuContent>
                    <TableActionMenuItem onClick={() => column.toggleSorting(false)}>
                        <ArrowUp className="me-2 h-3.5 w-3.5 text-muted-foreground/70" />
                        {t('Ascending')}
                    </TableActionMenuItem>
                    <TableActionMenuItem onClick={() => column.toggleSorting(true)}>
                        <ArrowDown className="me-2 h-3.5 w-3.5 text-muted-foreground/70" />
                        {t('Descending')}
                    </TableActionMenuItem>
                    <TableActionMenuSeparator />
                    <TableActionMenuItem onClick={() => column.toggleVisibility(false)}>
                        <EyeOff className="me-2 h-3.5 w-3.5 text-muted-foreground/70" />
                        {t('Hide')}
                    </TableActionMenuItem>
                </TableActionMenuContent>
            </TableActionMenu>
        </div>
    )
}
