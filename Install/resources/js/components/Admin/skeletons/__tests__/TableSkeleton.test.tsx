import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
    TableSkeleton,
    TableToolbarSkeleton,
    TableRowSkeleton,
    TablePaginationSkeleton,
} from '../TableSkeleton';

describe('TableRowSkeleton', () => {
    it('renders correct number of columns', () => {
        render(<TableRowSkeleton columns={5} />);
        const cells = screen.getAllByTestId('table-cell-skeleton');
        expect(cells).toHaveLength(5);
    });

    it('renders with column config array', () => {
        render(
            <TableRowSkeleton
                columns={[
                    { type: 'avatar-text' },
                    { type: 'badge' },
                    { type: 'text' },
                ]}
            />
        );
        const cells = screen.getAllByTestId('table-cell-skeleton');
        expect(cells).toHaveLength(3);
    });
});

describe('TableToolbarSkeleton', () => {
    it('renders search input', () => {
        render(<TableToolbarSkeleton showSearch />);
        expect(screen.getByTestId('search-skeleton')).toBeInTheDocument();
    });

    it('renders filter dropdowns', () => {
        render(<TableToolbarSkeleton filterCount={3} />);
        const filters = screen.getAllByTestId('filter-skeleton');
        expect(filters).toHaveLength(3);
    });

    it('hides search when showSearch is false', () => {
        render(<TableToolbarSkeleton showSearch={false} />);
        expect(screen.queryByTestId('search-skeleton')).not.toBeInTheDocument();
    });
});

describe('TablePaginationSkeleton', () => {
    it('renders pagination controls', () => {
        render(<TablePaginationSkeleton />);
        expect(screen.getByTestId('table-pagination-skeleton')).toBeInTheDocument();
    });

    it('renders rows per page selector', () => {
        render(<TablePaginationSkeleton />);
        expect(screen.getByTestId('rows-per-page-skeleton')).toBeInTheDocument();
    });
});

describe('TableSkeleton', () => {
    it('renders correct number of rows', () => {
        render(<TableSkeleton rows={5} columns={4} />);
        const rows = screen.getAllByTestId('table-row-skeleton');
        expect(rows).toHaveLength(5);
    });

    it('renders toolbar when showToolbar is true', () => {
        render(<TableSkeleton showToolbar />);
        expect(screen.getByTestId('table-toolbar-skeleton')).toBeInTheDocument();
    });

    it('hides toolbar when showToolbar is false', () => {
        render(<TableSkeleton showToolbar={false} />);
        expect(screen.queryByTestId('table-toolbar-skeleton')).not.toBeInTheDocument();
    });

    it('renders pagination when showPagination is true', () => {
        render(<TableSkeleton showPagination />);
        expect(screen.getByTestId('table-pagination-skeleton')).toBeInTheDocument();
    });

    it('hides pagination when showPagination is false', () => {
        render(<TableSkeleton showPagination={false} />);
        expect(screen.queryByTestId('table-pagination-skeleton')).not.toBeInTheDocument();
    });

    it('renders header row', () => {
        render(<TableSkeleton columns={4} />);
        expect(screen.getByTestId('table-header-skeleton')).toBeInTheDocument();
    });

    it('passes filterCount to toolbar', () => {
        render(<TableSkeleton showToolbar filterCount={2} />);
        const filters = screen.getAllByTestId('filter-skeleton');
        expect(filters).toHaveLength(2);
    });

    it('accepts numeric columns prop', () => {
        render(<TableSkeleton columns={6} rows={3} />);
        const rows = screen.getAllByTestId('table-row-skeleton');
        expect(rows).toHaveLength(3);
    });

    it('has animate-in classes for smooth entrance', () => {
        render(<TableSkeleton data-testid="table-skeleton" />);
        expect(screen.getByTestId('table-skeleton')).toHaveClass('animate-in', 'fade-in');
    });
});
