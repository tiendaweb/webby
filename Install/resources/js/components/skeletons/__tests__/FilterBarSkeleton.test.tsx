import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FilterBarSkeleton } from '../FilterBarSkeleton';

describe('FilterBarSkeleton', () => {
    it('renders filter bar container', () => {
        render(<FilterBarSkeleton />);
        expect(screen.getByTestId('filter-bar-skeleton')).toBeInTheDocument();
    });

    it('does not render search by default', () => {
        render(<FilterBarSkeleton />);
        expect(screen.queryByTestId('filter-bar-search-skeleton')).not.toBeInTheDocument();
    });

    it('renders search when showSearch is true', () => {
        render(<FilterBarSkeleton showSearch />);
        expect(screen.getByTestId('filter-bar-search-skeleton')).toBeInTheDocument();
    });

    it('does not render sort by default', () => {
        render(<FilterBarSkeleton />);
        expect(screen.queryByTestId('filter-bar-sort-skeleton')).not.toBeInTheDocument();
    });

    it('renders sort when showSort is true', () => {
        render(<FilterBarSkeleton showSort />);
        expect(screen.getByTestId('filter-bar-sort-skeleton')).toBeInTheDocument();
    });

    it('does not render filter by default', () => {
        render(<FilterBarSkeleton />);
        expect(screen.queryByTestId('filter-bar-filter-skeleton')).not.toBeInTheDocument();
    });

    it('renders filter when showFilter is true', () => {
        render(<FilterBarSkeleton showFilter />);
        expect(screen.getByTestId('filter-bar-filter-skeleton')).toBeInTheDocument();
    });

    it('does not render visibility by default', () => {
        render(<FilterBarSkeleton />);
        expect(screen.queryByTestId('filter-bar-visibility-skeleton')).not.toBeInTheDocument();
    });

    it('renders visibility when showVisibility is true', () => {
        render(<FilterBarSkeleton showVisibility />);
        expect(screen.getByTestId('filter-bar-visibility-skeleton')).toBeInTheDocument();
    });

    it('does not render view toggle by default', () => {
        render(<FilterBarSkeleton />);
        expect(screen.queryByTestId('filter-bar-view-toggle-skeleton')).not.toBeInTheDocument();
    });

    it('renders view toggle when showViewToggle is true', () => {
        render(<FilterBarSkeleton showViewToggle />);
        expect(screen.getByTestId('filter-bar-view-toggle-skeleton')).toBeInTheDocument();
    });

    it('renders all elements together', () => {
        render(
            <FilterBarSkeleton
                showSearch
                showSort
                showFilter
                showVisibility
                showViewToggle
            />
        );
        expect(screen.getByTestId('filter-bar-search-skeleton')).toBeInTheDocument();
        expect(screen.getByTestId('filter-bar-sort-skeleton')).toBeInTheDocument();
        expect(screen.getByTestId('filter-bar-filter-skeleton')).toBeInTheDocument();
        expect(screen.getByTestId('filter-bar-visibility-skeleton')).toBeInTheDocument();
        expect(screen.getByTestId('filter-bar-view-toggle-skeleton')).toBeInTheDocument();
    });
});
