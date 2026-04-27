import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GlobalCredits } from '../GlobalCredits';

// Mock useTranslation
vi.mock('@/contexts/LanguageContext', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

describe('GlobalCredits', () => {
    it('displays unlimited for unlimited plan', () => {
        render(
            <GlobalCredits
                remaining={0}
                monthlyLimit={0}
                isUnlimited={true}
                usingOwnKey={false}
            />
        );
        expect(screen.getByText('Unlimited Credits')).toBeInTheDocument();
    });

    it('displays API key indicator when using own API key', () => {
        render(
            <GlobalCredits
                remaining={50000}
                monthlyLimit={100000}
                isUnlimited={false}
                usingOwnKey={true}
            />
        );
        expect(screen.getByText('Using your API key')).toBeInTheDocument();
    });

    it('prioritizes own API key over unlimited', () => {
        render(
            <GlobalCredits
                remaining={0}
                monthlyLimit={0}
                isUnlimited={true}
                usingOwnKey={true}
            />
        );
        // Own API key takes priority over unlimited
        expect(screen.getByText('Using your API key')).toBeInTheDocument();
    });

    it('displays credits for limited plan', () => {
        render(
            <GlobalCredits
                remaining={50000}
                monthlyLimit={100000}
                isUnlimited={false}
                usingOwnKey={false}
            />
        );
        expect(screen.getByText(/50,000/)).toBeInTheDocument();
        expect(screen.getByText(/100,000/)).toBeInTheDocument();
        expect(screen.getByText(/credits/)).toBeInTheDocument();
    });

    it('formats large numbers with locale formatting', () => {
        render(
            <GlobalCredits
                remaining={1500000}
                monthlyLimit={5000000}
                isUnlimited={false}
                usingOwnKey={false}
            />
        );
        // Should use toLocaleString formatting
        expect(screen.getByText(/1,500,000/)).toBeInTheDocument();
        expect(screen.getByText(/5,000,000/)).toBeInTheDocument();
    });

    it('displays small numbers correctly', () => {
        render(
            <GlobalCredits
                remaining={500}
                monthlyLimit={1000}
                isUnlimited={false}
                usingOwnKey={false}
            />
        );
        expect(screen.getByText(/500/)).toBeInTheDocument();
        expect(screen.getByText(/1,000/)).toBeInTheDocument();
    });

    it('displays zero credits correctly', () => {
        render(
            <GlobalCredits
                remaining={0}
                monthlyLimit={100000}
                isUnlimited={false}
                usingOwnKey={false}
            />
        );
        expect(screen.getByText(/^0/)).toBeInTheDocument();
        expect(screen.getByText(/100,000/)).toBeInTheDocument();
    });

    it('has correct styling classes', () => {
        const { container } = render(
            <GlobalCredits
                remaining={50000}
                monthlyLimit={100000}
                isUnlimited={false}
                usingOwnKey={false}
            />
        );
        const span = container.querySelector('span');
        expect(span).toHaveClass('text-xs');
        expect(span).toHaveClass('text-muted-foreground');
    });
});
