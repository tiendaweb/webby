import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChatPageSkeleton } from '../ChatPageSkeleton';

describe('ChatPageSkeleton', () => {
    it('renders two-column layout', () => {
        render(<ChatPageSkeleton />);
        expect(screen.getByTestId('chat-column-skeleton')).toBeInTheDocument();
        expect(screen.getByTestId('preview-column-skeleton')).toBeInTheDocument();
    });

    it('chat column has correct width class', () => {
        render(<ChatPageSkeleton />);
        const chatCol = screen.getByTestId('chat-column-skeleton');
        expect(chatCol).toHaveClass('md:w-[420px]');
    });

    it('preview column hidden on mobile', () => {
        render(<ChatPageSkeleton />);
        const previewCol = screen.getByTestId('preview-column-skeleton');
        expect(previewCol).toHaveClass('hidden', 'md:flex');
    });
});
