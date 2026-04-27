import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MessageBubbleSkeleton } from '../MessageBubbleSkeleton';

describe('MessageBubbleSkeleton', () => {
    it('renders user variant right-aligned without avatar', () => {
        render(<MessageBubbleSkeleton variant="user" />);
        const container = screen.getByTestId('user-message-skeleton');
        expect(container).toHaveClass('justify-end');
        expect(screen.queryByTestId('avatar-skeleton')).not.toBeInTheDocument();
    });

    it('renders assistant variant left-aligned with avatar', () => {
        render(<MessageBubbleSkeleton variant="assistant" />);
        const container = screen.getByTestId('assistant-message-skeleton');
        expect(container).toHaveClass('justify-start');
        expect(screen.getByTestId('avatar-skeleton')).toBeInTheDocument();
    });

    it('applies animate-pulse to skeleton elements', () => {
        render(<MessageBubbleSkeleton variant="user" />);
        const skeletons = screen.getAllByTestId(/line-skeleton/);
        skeletons.forEach(el => expect(el).toHaveClass('animate-pulse'));
    });
});
