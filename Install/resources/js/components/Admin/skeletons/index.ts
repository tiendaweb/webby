// Admin Skeleton Components
// Reusable skeleton loading components for admin pages

// Base page wrapper
export { AdminPageSkeleton, DetailPageSkeleton } from './AdminPageSkeleton';

// Table-based pages
export {
    TableSkeleton,
    TableToolbarSkeleton,
    TableRowSkeleton,
    TablePaginationSkeleton,
    type TableColumnConfig,
} from './TableSkeleton';

// Card grid pages (Plans, Plugins)
export {
    CardGridSkeleton,
    CardSkeleton,
    PlanCardSkeleton,
    PluginCardSkeleton,
} from './CardGridSkeleton';

// Tabbed and sidebar pages (Cronjobs, Settings)
export {
    TabsSkeleton,
    SidebarNavSkeleton,
    FormSkeleton,
    SettingsPageSkeleton,
} from './TabsSkeleton';
