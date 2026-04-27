import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MessageListSkeleton } from '../MessageListSkeleton';

describe('MessageListSkeleton', () => {
    it('renders 3 message skeletons by default', () => {
        render(<MessageListSkeleton />);
        const messages = screen.getAllByTestId(/message-skeleton/);
        expect(messages).toHaveLength(3);
    });

    it('accepts custom count prop', () => {
        render(<MessageListSkeleton count={5} />);
        const messages = screen.getAllByTestId(/message-skeleton/);
        expect(messages).toHaveLength(5);
    });

    it('alternates user and assistant styles', () => {
        render(<MessageListSkeleton count={4} />);
        expect(screen.getAllByTestId('user-message-skeleton')).toHaveLength(2);
        expect(screen.getAllByTestId('assistant-message-skeleton')).toHaveLength(2);
    });

    it('has space-y-4 spacing', () => {
        render(<MessageListSkeleton />);
        const container = screen.getByTestId('message-list-skeleton');
        expect(container).toHaveClass('space-y-4');
    });
});
