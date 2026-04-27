import { useState, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Square } from 'lucide-react';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    onCancel?: () => void;
}

export function ChatInput({ onSend, disabled = false, onCancel }: ChatInputProps) {
    const [message, setMessage] = useState('');

    const handleSend = () => {
        const trimmed = message.trim();
        if (trimmed && !disabled) {
            onSend(trimmed);
            setMessage('');
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter to send, Shift+Enter for new line
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="border-t bg-background p-4">
            <div className="flex items-end gap-2 max-w-4xl mx-auto">
                <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    disabled={disabled}
                    rows={1}
                    className="min-h-[44px] max-h-[200px] resize-none"
                />
                {onCancel ? (
                    <Button
                        onClick={onCancel}
                        variant="destructive"
                        size="icon"
                        className="shrink-0 h-11 w-11"
                    >
                        <Square className="h-4 w-4" />
                        <span className="sr-only">Cancel</span>
                    </Button>
                ) : (
                    <Button
                        onClick={handleSend}
                        disabled={disabled || !message.trim()}
                        size="icon"
                        className="shrink-0 h-11 w-11"
                    >
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Send message</span>
                    </Button>
                )}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
                Press Enter to send, Shift+Enter for new line
            </p>
        </div>
    );
}
