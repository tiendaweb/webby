import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CardGridSkeleton, CardSkeleton, PlanCardSkeleton, PluginCardSkeleton } from '../CardGridSkeleton';

describe('CardSkeleton', () => {
    it('renders with default generic variant', () => {
        render(<CardSkeleton data-testid="card-skeleton" />);
        expect(screen.getByTestId('card-skeleton')).toBeInTheDocument();
    });

    it('renders header when showHeader is true', () => {
        render(<CardSkeleton showHeader data-testid="card-skeleton" />);
        expect(screen.getByTestId('card-header-skeleton')).toBeInTheDocument();
    });

    it('renders footer when showFooter is true', () => {
        render(<CardSkeleton showFooter data-testid="card-skeleton" />);
        expect(screen.getByTestId('card-footer-skeleton')).toBeInTheDocument();
    });
});

describe('PlanCardSkeleton', () => {
    it('renders plan card with features list', () => {
        render(<PlanCardSkeleton data-testid="plan-card-skeleton" />);
        expect(screen.getByTestId('plan-card-skeleton')).toBeInTheDocument();
        expect(screen.getByTestId('plan-features-skeleton')).toBeInTheDocument();
    });

    it('renders plan card with price section', () => {
        render(<PlanCardSkeleton data-testid="plan-card-skeleton" />);
        expect(screen.getByTestId('plan-price-skeleton')).toBeInTheDocument();
    });

    it('renders plan card with stats section', () => {
        render(<PlanCardSkeleton data-testid="plan-card-skeleton" />);
        expect(screen.getByTestId('plan-stats-skeleton')).toBeInTheDocument();
    });
});

describe('PluginCardSkeleton', () => {
    it('renders plugin card with icon', () => {
        render(<PluginCardSkeleton data-testid="plugin-card-skeleton" />);
        expect(screen.getByTestId('plugin-card-skeleton')).toBeInTheDocument();
        expect(screen.getByTestId('plugin-icon-skeleton')).toBeInTheDocument();
    });

    it('renders plugin card with description', () => {
        render(<PluginCardSkeleton data-testid="plugin-card-skeleton" />);
        expect(screen.getByTestId('plugin-description-skeleton')).toBeInTheDocument();
    });
});

describe('CardGridSkeleton', () => {
    it('renders correct number of cards', () => {
        render(<CardGridSkeleton count={4} />);
        const cards = screen.getAllByTestId('card-skeleton');
        expect(cards).toHaveLength(4);
    });

    it('uses plan variant when specified', () => {
        render(<CardGridSkeleton count={2} cardVariant="plan" />);
        const cards = screen.getAllByTestId('plan-card-skeleton');
        expect(cards).toHaveLength(2);
    });

    it('uses plugin variant when specified', () => {
        render(<CardGridSkeleton count={3} cardVariant="plugin" />);
        const cards = screen.getAllByTestId('plugin-card-skeleton');
        expect(cards).toHaveLength(3);
    });

    it('applies grid column classes', () => {
        render(<CardGridSkeleton count={4} columns={4} data-testid="card-grid" />);
        const grid = screen.getByTestId('card-grid');
        expect(grid).toHaveClass('xl:grid-cols-4');
    });

    it('has animate-in classes for smooth entrance', () => {
        render(<CardGridSkeleton data-testid="card-grid" />);
        expect(screen.getByTestId('card-grid')).toHaveClass('animate-in', 'fade-in');
    });
});
