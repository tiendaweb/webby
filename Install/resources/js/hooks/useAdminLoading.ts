/**
 * Re-export usePageLoading as useAdminLoading for backward compatibility.
 * Admin pages and other pages now share the same loading hook.
 */
export { usePageLoading as useAdminLoading } from './usePageLoading';
