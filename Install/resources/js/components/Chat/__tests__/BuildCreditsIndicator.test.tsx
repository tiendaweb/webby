import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BuildCreditsIndicator } from '../BuildCreditsIndicator';

// Mock useTranslation
vi.mock('@/contexts/LanguageContext', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

describe('BuildCreditsIndicator', () => {
    it('displays remaining credits for limited plan', () => {
        render(
            <BuildCreditsIndicator
                remaining={45000}
                monthlyLimit={100000}
                isUnlimited={false}
                usingOwnKey={false}
            />
        );
        expect(screen.getByText(/45K/)).toBeInTheDocument();
        expect(screen.getByText(/100K/)).toBeInTheDocument();
        expect(screen.getByText(/credits/)).toBeInTheDocument();
    });

    it('displays unlimited indicator for unlimited plan', () => {
        render(
            <BuildCreditsIndicator
                remaining={0}
                monthlyLimit={0}
                isUnlimited={true}
                usingOwnKey={false}
            />
        );
        expect(screen.getByText('Unlimited credits')).toBeInTheDocument();
    });

    it('displays API key indicator when using own key', () => {
        render(
            <BuildCreditsIndicator
                remaining={0}
                monthlyLimit={0}
                isUnlimited={false}
                usingOwnKey={true}
            />
        );
        expect(screen.getByText('Using your API key')).toBeInTheDocument();
    });

    it('prioritizes own API key display over unlimited', () => {
        render(
            <BuildCreditsIndicator
                remaining={0}
                monthlyLimit={0}
                isUnlimited={true}
                usingOwnKey={true}
            />
        );
        // When both are true, own API key takes precedence
        expect(screen.getByText('Using your API key')).toBeInTheDocument();
        expect(screen.queryByText('Unlimited credits')).not.toBeInTheDocument();
    });

    it('shows warning color when credits below 20%', () => {
        const { container } = render(
            <BuildCreditsIndicator
                remaining={15000}
                monthlyLimit={100000}
                isUnlimited={false}
                usingOwnKey={false}
            />
        );
        expect(container.firstChild).toHaveClass('text-warning');
    });

    it('shows danger color when credits below 5%', () => {
        const { container } = render(
            <BuildCreditsIndicator
                remaining={3000}
                monthlyLimit={100000}
                isUnlimited={false}
                usingOwnKey={false}
            />
        );
        expect(container.firstChild).toHaveClass('text-destructive');
    });

    it('shows normal color when credits above 20%', () => {
        const { container } = render(
            <BuildCreditsIndicator
                remaining={50000}
                monthlyLimit={100000}
                isUnlimited={false}
                usingOwnKey={false}
            />
        );
        expect(container.firstChild).toHaveClass('text-muted-foreground');
        expect(container.firstChild).not.toHaveClass('text-warning');
        expect(container.firstChild).not.toHaveClass('text-destructive');
    });

    it('formats millions correctly', () => {
        render(
            <BuildCreditsIndicator
                remaining={1500000}
                monthlyLimit={5000000}
                isUnlimited={false}
                usingOwnKey={false}
            />
        );
        expect(screen.getByText(/1\.5M/)).toBeInTheDocument();
        expect(screen.getByText(/5\.0M/)).toBeInTheDocument();
    });

    it('formats small numbers without suffix', () => {
        render(
            <BuildCreditsIndicator
                remaining={500}
                monthlyLimit={999}
                isUnlimited={false}
                usingOwnKey={false}
            />
        );
        expect(screen.getByText(/500/)).toBeInTheDocument();
        expect(screen.getByText(/999/)).toBeInTheDocument();
    });

    it('shows loading spinner when refreshing', () => {
        const { container } = render(
            <BuildCreditsIndicator
                remaining={50000}
                monthlyLimit={100000}
                isUnlimited={false}
                usingOwnKey={false}
                isRefreshing={true}
            />
        );
        // Should have animate-spin class on the loader
        const spinner = container.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });
});
