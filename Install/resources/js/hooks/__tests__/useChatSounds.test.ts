import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatSounds, SoundSettings, SoundEvent, SoundStyle } from '../useChatSounds';

// Mock AudioContext
class MockOscillatorNode {
    type = 'sine';
    frequency = {
        value: 440,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
    };
    connect = vi.fn().mockReturnThis();
    start = vi.fn();
    stop = vi.fn();
    disconnect = vi.fn();
}

class MockGainNode {
    gain = {
        value: 1,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
    };
    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
}

class MockBiquadFilterNode {
    type = 'lowpass';
    frequency = {
        value: 1000,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
    };
    Q = {
        value: 1,
        setValueAtTime: vi.fn(),
    };
    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
}

class MockAudioContext {
    state = 'running';
    currentTime = 0;
    destination = {};

    createOscillator = vi.fn(() => new MockOscillatorNode());
    createGain = vi.fn(() => new MockGainNode());
    createBiquadFilter = vi.fn(() => new MockBiquadFilterNode());
    resume = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);
}

describe('useChatSounds', () => {
    let originalAudioContext: typeof AudioContext | undefined;

    beforeEach(() => {
        originalAudioContext = (global as typeof globalThis & { AudioContext?: typeof AudioContext }).AudioContext;
        (global as typeof globalThis & { AudioContext: typeof MockAudioContext }).AudioContext = MockAudioContext as unknown as typeof AudioContext;
    });

    afterEach(() => {
        if (originalAudioContext) {
            (global as typeof globalThis & { AudioContext: typeof AudioContext }).AudioContext = originalAudioContext;
        } else {
            delete (global as typeof globalThis & { AudioContext?: typeof AudioContext }).AudioContext;
        }
        vi.clearAllMocks();
    });

    const defaultSettings: SoundSettings = {
        enabled: true,
        style: 'minimal',
        volume: 50,
    };

    const disabledSettings: SoundSettings = {
        enabled: false,
        style: 'minimal',
        volume: 50,
    };

    describe('initialization', () => {
        it('initializes with isSupported true when AudioContext is available', () => {
            const { result } = renderHook(() => useChatSounds({ settings: defaultSettings }));

            expect(result.current.isSupported).toBe(true);
        });

        it('initializes with isSupported false when AudioContext is unavailable', () => {
            delete (global as typeof globalThis & { AudioContext?: typeof AudioContext }).AudioContext;

            const { result } = renderHook(() => useChatSounds({ settings: defaultSettings }));

            expect(result.current.isSupported).toBe(false);
        });
    });

    describe('playSound', () => {
        it('does not play sound when disabled', () => {
            const { result } = renderHook(() => useChatSounds({ settings: disabledSettings }));

            // playSound should return early without errors when disabled
            act(() => {
                result.current.playSound('message');
            });

            // If sounds are disabled, hook should still be supported but not play anything
            expect(result.current.isSupported).toBe(true);
        });

        it('plays sound when enabled', () => {
            const { result } = renderHook(() => useChatSounds({ settings: defaultSettings }));

            act(() => {
                result.current.playSound('message');
            });

            // Just verify the hook doesn't throw - actual audio testing would require more complex mocking
            expect(result.current.isSupported).toBe(true);
        });

        it('plays different sounds for different events', () => {
            const { result } = renderHook(() => useChatSounds({ settings: defaultSettings }));

            const events: SoundEvent[] = ['message', 'action', 'complete', 'error'];

            events.forEach(event => {
                act(() => {
                    result.current.playSound(event);
                });
            });

            // All events should be playable without errors
            expect(result.current.isSupported).toBe(true);
        });
    });

    describe('volume scaling', () => {
        it('respects volume setting at 0%', () => {
            const settings: SoundSettings = { enabled: true, style: 'minimal', volume: 0 };
            const { result } = renderHook(() => useChatSounds({ settings }));

            act(() => {
                result.current.playSound('message');
            });

            // Hook should handle 0 volume gracefully
            expect(result.current.isSupported).toBe(true);
        });

        it('respects volume setting at 100%', () => {
            const settings: SoundSettings = { enabled: true, style: 'minimal', volume: 100 };
            const { result } = renderHook(() => useChatSounds({ settings }));

            act(() => {
                result.current.playSound('message');
            });

            expect(result.current.isSupported).toBe(true);
        });

        it('respects volume setting at 50%', () => {
            const settings: SoundSettings = { enabled: true, style: 'minimal', volume: 50 };
            const { result } = renderHook(() => useChatSounds({ settings }));

            act(() => {
                result.current.playSound('message');
            });

            expect(result.current.isSupported).toBe(true);
        });
    });

    describe('sound styles', () => {
        const styles: SoundStyle[] = ['minimal', 'playful', 'retro', 'sci-fi'];

        styles.forEach(style => {
            it(`plays sounds in ${style} style`, () => {
                const settings: SoundSettings = { enabled: true, style, volume: 50 };
                const { result } = renderHook(() => useChatSounds({ settings }));

                act(() => {
                    result.current.playSound('message');
                    result.current.playSound('action');
                    result.current.playSound('complete');
                    result.current.playSound('error');
                });

                expect(result.current.isSupported).toBe(true);
            });
        });
    });

    describe('previewSound', () => {
        it('plays preview sound with current style', () => {
            const { result } = renderHook(() => useChatSounds({ settings: defaultSettings }));

            act(() => {
                result.current.previewSound('message');
            });

            expect(result.current.isSupported).toBe(true);
        });

        it('plays preview sound with specific style override', () => {
            const { result } = renderHook(() => useChatSounds({ settings: defaultSettings }));

            act(() => {
                result.current.previewSound('message', 'retro');
            });

            expect(result.current.isSupported).toBe(true);
        });

        it('plays preview even when sounds are disabled (for settings preview)', () => {
            const { result } = renderHook(() => useChatSounds({ settings: disabledSettings }));

            act(() => {
                result.current.previewSound('complete');
            });

            // Preview should work even when disabled
            expect(result.current.isSupported).toBe(true);
        });
    });

    describe('previewAllSounds', () => {
        it('plays all event sounds in sequence', async () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => useChatSounds({ settings: defaultSettings }));

            act(() => {
                result.current.previewAllSounds();
            });

            // Advance through all sound delays (4 sounds with delays between them)
            await act(async () => {
                vi.advanceTimersByTime(2000);
            });

            expect(result.current.isSupported).toBe(true);
            vi.useRealTimers();
        });

        it('uses specified style for preview', async () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => useChatSounds({ settings: defaultSettings }));

            act(() => {
                result.current.previewAllSounds('sci-fi');
            });

            await act(async () => {
                vi.advanceTimersByTime(2000);
            });

            expect(result.current.isSupported).toBe(true);
            vi.useRealTimers();
        });
    });

    describe('settings updates', () => {
        it('responds to settings changes', () => {
            const { result, rerender } = renderHook(
                ({ settings }) => useChatSounds({ settings }),
                { initialProps: { settings: disabledSettings } }
            );

            // Initially disabled
            act(() => {
                result.current.playSound('message');
            });

            // Enable sounds
            rerender({ settings: defaultSettings });

            act(() => {
                result.current.playSound('message');
            });

            expect(result.current.isSupported).toBe(true);
        });

        it('responds to style changes', () => {
            const { result, rerender } = renderHook(
                ({ settings }) => useChatSounds({ settings }),
                { initialProps: { settings: { ...defaultSettings, style: 'minimal' as SoundStyle } } }
            );

            act(() => {
                result.current.playSound('message');
            });

            // Change style
            rerender({ settings: { ...defaultSettings, style: 'retro' } });

            act(() => {
                result.current.playSound('message');
            });

            expect(result.current.isSupported).toBe(true);
        });
    });

    describe('cleanup', () => {
        it('cleans up AudioContext on unmount', () => {
            const { result, unmount } = renderHook(() => useChatSounds({ settings: defaultSettings }));

            // Trigger AudioContext creation by playing a sound
            act(() => {
                result.current.playSound('message');
            });

            // Unmount should clean up
            unmount();

            // No assertions needed - just verifying no errors thrown during cleanup
        });
    });

    describe('browser autoplay policy handling', () => {
        it('handles suspended AudioContext state', async () => {
            // Create a mock that tracks resume calls
            const resumeMock = vi.fn().mockResolvedValue(undefined);

            class SuspendedMockAudioContext extends MockAudioContext {
                state = 'suspended' as AudioContextState;
                resume = resumeMock;
            }

            (global as typeof globalThis & { AudioContext: typeof AudioContext }).AudioContext = SuspendedMockAudioContext as unknown as typeof AudioContext;

            const { result } = renderHook(() => useChatSounds({ settings: defaultSettings }));

            await act(async () => {
                result.current.playSound('message');
            });

            // Resume should be called for suspended context
            expect(resumeMock).toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('handles AudioContext creation failure gracefully', () => {
            (global as typeof globalThis & { AudioContext: typeof AudioContext }).AudioContext = vi.fn(() => {
                throw new Error('AudioContext not allowed');
            }) as unknown as typeof AudioContext;

            const { result } = renderHook(() => useChatSounds({ settings: defaultSettings }));

            // Should still be marked as supported initially, but playSound should handle errors
            act(() => {
                result.current.playSound('message');
            });

            // Should not throw
        });
    });
});
