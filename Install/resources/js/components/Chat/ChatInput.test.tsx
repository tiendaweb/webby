import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
    it('renders input field and send button', () => {
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} />);

        expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    });

    it('allows user to type in the input field', async () => {
        const user = userEvent.setup();
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} />);

        const input = screen.getByPlaceholderText('Type your message...');
        await user.type(input, 'Hello world');

        expect(input).toHaveValue('Hello world');
    });

    it('calls onSend when send button is clicked with valid message', async () => {
        const user = userEvent.setup();
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} />);

        const input = screen.getByPlaceholderText('Type your message...');
        await user.type(input, 'Test message');
        await user.click(screen.getByRole('button', { name: /send message/i }));

        expect(onSend).toHaveBeenCalledWith('Test message');
    });

    it('clears input after sending message', async () => {
        const user = userEvent.setup();
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} />);

        const input = screen.getByPlaceholderText('Type your message...');
        await user.type(input, 'Test message');
        await user.click(screen.getByRole('button', { name: /send message/i }));

        expect(input).toHaveValue('');
    });

    it('sends message when Enter is pressed (without Shift)', async () => {
        const user = userEvent.setup();
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} />);

        const input = screen.getByPlaceholderText('Type your message...');
        await user.type(input, 'Test message');
        await user.keyboard('{Enter}');

        expect(onSend).toHaveBeenCalledWith('Test message');
    });

    it('does not send message when Shift+Enter is pressed', async () => {
        const user = userEvent.setup();
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} />);

        const input = screen.getByPlaceholderText('Type your message...');
        await user.type(input, 'Test message');
        await user.keyboard('{Shift>}{Enter}{/Shift}');

        expect(onSend).not.toHaveBeenCalled();
    });

    it('does not send empty message', async () => {
        const user = userEvent.setup();
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} />);

        await user.click(screen.getByRole('button', { name: /send message/i }));

        expect(onSend).not.toHaveBeenCalled();
    });

    it('does not send whitespace-only message', async () => {
        const user = userEvent.setup();
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} />);

        const input = screen.getByPlaceholderText('Type your message...');
        await user.type(input, '   ');
        await user.click(screen.getByRole('button', { name: /send message/i }));

        expect(onSend).not.toHaveBeenCalled();
    });

    it('disables input and button when disabled prop is true', () => {
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} disabled={true} />);

        expect(screen.getByPlaceholderText('Type your message...')).toBeDisabled();
        expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
    });

    it('trims whitespace from message before sending', async () => {
        const user = userEvent.setup();
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} />);

        const input = screen.getByPlaceholderText('Type your message...');
        await user.type(input, '  Test message  ');
        await user.click(screen.getByRole('button', { name: /send message/i }));

        expect(onSend).toHaveBeenCalledWith('Test message');
    });

    it('shows keyboard hint text', () => {
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} />);

        expect(screen.getByText(/press enter to send/i)).toBeInTheDocument();
    });
});
