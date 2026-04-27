import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TabsSkeleton, SidebarNavSkeleton, FormSkeleton } from '../TabsSkeleton';

describe('TabsSkeleton', () => {
    it('renders correct number of tab triggers', () => {
        render(<TabsSkeleton tabCount={3} />);
        const tabs = screen.getAllByTestId('tab-trigger-skeleton');
        expect(tabs).toHaveLength(3);
    });

    it('renders content area with table variant', () => {
        render(<TabsSkeleton contentVariant="table" />);
        expect(screen.getByTestId('tabs-content-skeleton')).toBeInTheDocument();
    });

    it('renders content area with form variant', () => {
        render(<TabsSkeleton contentVariant="form" />);
        expect(screen.getByTestId('tabs-content-skeleton')).toBeInTheDocument();
    });

    it('has animate-in classes', () => {
        render(<TabsSkeleton data-testid="tabs-skeleton" />);
        expect(screen.getByTestId('tabs-skeleton')).toHaveClass('animate-in', 'fade-in');
    });
});

describe('SidebarNavSkeleton', () => {
    it('renders search when showSearch is true', () => {
        render(<SidebarNavSkeleton showSearch />);
        expect(screen.getByTestId('sidebar-search-skeleton')).toBeInTheDocument();
    });

    it('renders correct number of nav items', () => {
        render(<SidebarNavSkeleton itemCount={5} />);
        const items = screen.getAllByTestId('nav-item-skeleton');
        expect(items).toHaveLength(5);
    });

    it('renders category headers when specified', () => {
        render(<SidebarNavSkeleton categories={2} itemCount={6} />);
        const categories = screen.getAllByTestId('nav-category-skeleton');
        expect(categories).toHaveLength(2);
    });

    it('hides search when showSearch is false', () => {
        render(<SidebarNavSkeleton showSearch={false} />);
        expect(screen.queryByTestId('sidebar-search-skeleton')).not.toBeInTheDocument();
    });
});

describe('FormSkeleton', () => {
    it('renders correct number of fields', () => {
        render(<FormSkeleton fieldCount={4} />);
        const fields = screen.getAllByTestId('form-field-skeleton');
        expect(fields).toHaveLength(4);
    });

    it('renders with title when specified', () => {
        render(<FormSkeleton showTitle />);
        expect(screen.getByTestId('form-title-skeleton')).toBeInTheDocument();
    });

    it('renders with submit button when specified', () => {
        render(<FormSkeleton showSubmit />);
        expect(screen.getByTestId('form-submit-skeleton')).toBeInTheDocument();
    });
});
