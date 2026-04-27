import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AdminPageSkeleton, DetailPageSkeleton } from '../AdminPageSkeleton';

describe('AdminPageSkeleton', () => {
    it('renders page header skeleton', () => {
        render(<AdminPageSkeleton>content</AdminPageSkeleton>);
        expect(screen.getByTestId('admin-page-header-skeleton')).toBeInTheDocument();
    });

    it('renders action button when showAction is true', () => {
        render(<AdminPageSkeleton showAction>content</AdminPageSkeleton>);
        expect(screen.getByTestId('header-action-skeleton')).toBeInTheDocument();
    });

    it('hides action button when showAction is false', () => {
        render(<AdminPageSkeleton showAction={false}>content</AdminPageSkeleton>);
        expect(screen.queryByTestId('header-action-skeleton')).not.toBeInTheDocument();
    });

    it('renders children content', () => {
        render(<AdminPageSkeleton><div data-testid="child-content">Child</div></AdminPageSkeleton>);
        expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('has animate-in classes', () => {
        render(<AdminPageSkeleton data-testid="admin-skeleton">content</AdminPageSkeleton>);
        expect(screen.getByTestId('admin-skeleton')).toHaveClass('animate-in', 'fade-in');
    });
});

describe('DetailPageSkeleton', () => {
    it('renders subscription variant', () => {
        render(<DetailPageSkeleton variant="subscription" />);
        expect(screen.getByTestId('detail-page-skeleton')).toBeInTheDocument();
    });

    it('renders user info card', () => {
        render(<DetailPageSkeleton variant="subscription" />);
        expect(screen.getByTestId('user-info-card-skeleton')).toBeInTheDocument();
    });

    it('renders subscription details card', () => {
        render(<DetailPageSkeleton variant="subscription" />);
        expect(screen.getByTestId('subscription-details-card-skeleton')).toBeInTheDocument();
    });

    it('renders sidebar actions card', () => {
        render(<DetailPageSkeleton variant="subscription" />);
        expect(screen.getByTestId('actions-card-skeleton')).toBeInTheDocument();
    });

    it('has 3-column grid layout', () => {
        render(<DetailPageSkeleton variant="subscription" data-testid="detail-page-skeleton" />);
        const container = screen.getByTestId('detail-content-skeleton');
        expect(container).toHaveClass('lg:grid-cols-3');
    });
});
