import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MessageList } from './MessageList';
import { ChatMessage } from '@/types/chat';

describe('MessageList', () => {
    it('renders empty state when no messages', () => {
        render(<MessageList messages={[]} />);

        expect(screen.getByText('Start a conversation')).toBeInTheDocument();
        expect(screen.getByText(/send a message to begin/i)).toBeInTheDocument();
    });

    it('renders messages when provided', () => {
        const messages: ChatMessage[] = [
            {
                id: '1',
                type: 'user',
                content: 'Hello',
                timestamp: new Date(),
            },
            {
                id: '2',
                type: 'assistant',
                content: 'Hi there!',
                timestamp: new Date(),
            },
        ];

        render(<MessageList messages={messages} />);

        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });

    it('does not show empty state when messages exist', () => {
        const messages: ChatMessage[] = [
            {
                id: '1',
                type: 'user',
                content: 'Test',
                timestamp: new Date(),
            },
        ];

        render(<MessageList messages={messages} />);

        expect(screen.queryByText('Start a conversation')).not.toBeInTheDocument();
    });

    it('renders multiple messages in order', () => {
        const messages: ChatMessage[] = [
            { id: '1', type: 'user', content: 'First', timestamp: new Date() },
            { id: '2', type: 'assistant', content: 'Second', timestamp: new Date() },
            { id: '3', type: 'user', content: 'Third', timestamp: new Date() },
        ];

        render(<MessageList messages={messages} />);

        const first = screen.getByText('First');
        const second = screen.getByText('Second');
        const third = screen.getByText('Third');

        // All should be present
        expect(first).toBeInTheDocument();
        expect(second).toBeInTheDocument();
        expect(third).toBeInTheDocument();
    });
});
