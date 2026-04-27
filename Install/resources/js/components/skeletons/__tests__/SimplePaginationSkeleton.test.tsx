import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SimplePaginationSkeleton } from '../SimplePaginationSkeleton';

describe('SimplePaginationSkeleton', () => {
    it('renders pagination container', () => {
        render(<SimplePaginationSkeleton />);
        expect(screen.getByTestId('simple-pagination-skeleton')).toBeInTheDocument();
    });

    it('renders previous button placeholder', () => {
        render(<SimplePaginationSkeleton />);
        expect(screen.getByTestId('pagination-prev-skeleton')).toBeInTheDocument();
    });

    it('renders page info placeholder', () => {
        render(<SimplePaginationSkeleton />);
        expect(screen.getByTestId('pagination-info-skeleton')).toBeInTheDocument();
    });

    it('renders next button placeholder', () => {
        render(<SimplePaginationSkeleton />);
        expect(screen.getByTestId('pagination-next-skeleton')).toBeInTheDocument();
    });

    it('has correct layout with justify-between', () => {
        render(<SimplePaginationSkeleton />);
        const container = screen.getByTestId('simple-pagination-skeleton');
        expect(container).toHaveClass('justify-between');
    });
});
