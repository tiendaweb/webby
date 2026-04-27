import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PreviewSkeleton } from '../PreviewSkeleton';

describe('PreviewSkeleton', () => {
    it('renders full-size container', () => {
        render(<PreviewSkeleton />);
        const container = screen.getByTestId('preview-skeleton');
        expect(container).toHaveClass('h-full', 'w-full');
    });

    it('shows browser mockup skeleton', () => {
        render(<PreviewSkeleton />);
        expect(screen.getByTestId('browser-mockup')).toBeInTheDocument();
    });
});
