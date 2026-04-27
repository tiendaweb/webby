import { useCallback, useRef, useEffect } from 'react';

export type SoundStyle = 'minimal' | 'playful' | 'retro' | 'sci-fi';
export type SoundEvent = 'send' | 'message' | 'action' | 'complete' | 'error' | 'build' | 'open';

export interface SoundSettings {
    enabled: boolean;
    style: SoundStyle;
    volume: number; // 0-100
}

interface UseChatSoundsOptions {
    settings: SoundSettings;
}

interface UseChatSoundsReturn {
    playSound: (event: SoundEvent) => void;
    previewSound: (event: SoundEvent, style?: SoundStyle) => void;
    previewAllSounds: (style?: SoundStyle) => void;
    isSupported: boolean;
}

// Sound generator type
type SoundGenerator = (ctx: AudioContext, volume: number) => void;

// Sound generators for each style and event
const soundGenerators: Record<SoundStyle, Record<SoundEvent, SoundGenerator>> = {
    minimal: {
        send: (ctx, volume) => {
            // Subtle ascending "whoosh" for sending
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
            osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        },
        message: (ctx, volume) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
            gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        },
        action: (ctx, volume) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(660, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        },
        complete: (ctx, volume) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

            osc.start();
            osc.stop(ctx.currentTime + 0.3);

            // Second note
            setTimeout(() => {
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);

                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
                gain2.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

                osc2.start();
                osc2.stop(ctx.currentTime + 0.4);
            }, 150);
        },
        error: (ctx, volume) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
            gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        },
        build: (ctx, volume) => {
            // Satisfying success chime with harmonics
            const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 - major chord
            frequencies.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);
                // Stagger the start slightly for richness
                const startTime = ctx.currentTime + i * 0.02;
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(volume * 0.2, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

                osc.start();
                osc.stop(startTime + 0.5);
            });

            // Add a higher octave shimmer
            setTimeout(() => {
                const shimmer = ctx.createOscillator();
                const shimmerGain = ctx.createGain();
                shimmer.connect(shimmerGain);
                shimmerGain.connect(ctx.destination);

                shimmer.type = 'sine';
                shimmer.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
                shimmerGain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
                shimmerGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

                shimmer.start();
                shimmer.stop(ctx.currentTime + 0.4);
            }, 100);
        },
        open: (ctx, volume) => {
            // Soft "whoosh" with bell - like opening a door to a workspace
            // Noise-like whoosh using detuned oscillators
            const whoosh1 = ctx.createOscillator();
            const whoosh2 = ctx.createOscillator();
            const whooshGain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            whoosh1.connect(filter);
            whoosh2.connect(filter);
            filter.connect(whooshGain);
            whooshGain.connect(ctx.destination);

            whoosh1.type = 'sine';
            whoosh2.type = 'sine';
            whoosh1.frequency.setValueAtTime(200, ctx.currentTime);
            whoosh2.frequency.setValueAtTime(203, ctx.currentTime); // slight detune
            whoosh1.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.12);
            whoosh2.frequency.exponentialRampToValueAtTime(806, ctx.currentTime + 0.12);

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(400, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            filter.Q.setValueAtTime(2, ctx.currentTime);

            whooshGain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
            whooshGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

            whoosh1.start();
            whoosh2.start();
            whoosh1.stop(ctx.currentTime + 0.15);
            whoosh2.stop(ctx.currentTime + 0.15);

            // Bell chime after whoosh
            setTimeout(() => {
                const bell = ctx.createOscillator();
                const bellGain = ctx.createGain();
                bell.connect(bellGain);
                bellGain.connect(ctx.destination);

                bell.type = 'sine';
                bell.frequency.setValueAtTime(1318.5, ctx.currentTime); // E6 - high bell
                bellGain.gain.setValueAtTime(volume * 0.12, ctx.currentTime);
                bellGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

                bell.start();
                bell.stop(ctx.currentTime + 0.3);
            }, 80);
        },
    },
    playful: {
        send: (ctx, volume) => {
            // Bouncy "pop" send sound
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.06);
            gain.gain.setValueAtTime(volume * 0.35, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        },
        message: (ctx, volume) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
            osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        },
        action: (ctx, volume) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(volume * 0.35, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

            osc.start();
            osc.stop(ctx.currentTime + 0.12);
        },
        complete: (ctx, volume) => {
            // Happy ascending arpeggio
            const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
            notes.forEach((freq, i) => {
                setTimeout(() => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, ctx.currentTime);
                    gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

                    osc.start();
                    osc.stop(ctx.currentTime + 0.2);
                }, i * 80);
            });
        },
        error: (ctx, volume) => {
            // Descending "womp womp"
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(311.13, ctx.currentTime); // Eb4
            osc.frequency.exponentialRampToValueAtTime(185, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        },
        build: (ctx, volume) => {
            // Bouncy celebratory "da-da-ding!" with rising pitch
            const notes = [392, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
            notes.forEach((freq, i) => {
                setTimeout(() => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, ctx.currentTime);
                    // Last note rings longer
                    const duration = i === notes.length - 1 ? 0.4 : 0.12;
                    const vol = i === notes.length - 1 ? volume * 0.4 : volume * 0.3;
                    gain.gain.setValueAtTime(vol, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

                    osc.start();
                    osc.stop(ctx.currentTime + duration);
                }, i * 70);
            });
        },
        open: (ctx, volume) => {
            // Bouncy "pop-pop-ding" welcome - matches playful style
            const notes = [392, 523.25, 659.25]; // G4, C5, E5 - ascending welcome
            notes.forEach((freq, i) => {
                setTimeout(() => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.type = 'triangle';
                    // Bouncy pitch bend like other playful sounds
                    osc.frequency.setValueAtTime(freq * 0.8, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(freq, ctx.currentTime + 0.05);
                    osc.frequency.exponentialRampToValueAtTime(freq * 0.95, ctx.currentTime + 0.1);
                    gain.gain.setValueAtTime(volume * 0.35, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

                    osc.start();
                    osc.stop(ctx.currentTime + 0.12);
                }, i * 80);
            });
        },
    },
    retro: {
        send: (ctx, volume) => {
            // 8-bit "blip" send sound
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'square';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.03);
            gain.gain.setValueAtTime(volume * 0.12, ctx.currentTime);
            gain.gain.setValueAtTime(0, ctx.currentTime + 0.08);

            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        },
        message: (ctx, volume) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'square';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
            gain.gain.setValueAtTime(0, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0, ctx.currentTime + 0.13);

            osc.start();
            osc.stop(ctx.currentTime + 0.13);
        },
        action: (ctx, volume) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'square';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
            gain.gain.setValueAtTime(0, ctx.currentTime + 0.1);

            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        },
        complete: (ctx, volume) => {
            // 8-bit victory fanfare
            const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
            notes.forEach((freq, i) => {
                setTimeout(() => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.type = 'square';
                    osc.frequency.setValueAtTime(freq, ctx.currentTime);
                    gain.gain.setValueAtTime(volume * 0.12, ctx.currentTime);
                    gain.gain.setValueAtTime(0, ctx.currentTime + 0.1);

                    osc.start();
                    osc.stop(ctx.currentTime + 0.1);
                }, i * 100);
            });
        },
        error: (ctx, volume) => {
            // 8-bit game over sound
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'square';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.4);
            gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);

            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        },
        build: (ctx, volume) => {
            // 8-bit "level complete" fanfare
            const melody = [
                { freq: 523.25, time: 0, dur: 0.1 },      // C5
                { freq: 659.25, time: 0.1, dur: 0.1 },    // E5
                { freq: 783.99, time: 0.2, dur: 0.1 },    // G5
                { freq: 1046.5, time: 0.3, dur: 0.3 },    // C6 (hold)
            ];
            melody.forEach(({ freq, time, dur }) => {
                setTimeout(() => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.type = 'square';
                    osc.frequency.setValueAtTime(freq, ctx.currentTime);
                    gain.gain.setValueAtTime(volume * 0.12, ctx.currentTime);
                    gain.gain.setValueAtTime(volume * 0.12, ctx.currentTime + dur - 0.02);
                    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);

                    osc.start();
                    osc.stop(ctx.currentTime + dur);
                }, time * 1000);
            });
        },
        open: (ctx, volume) => {
            // 8-bit "warp zone" teleport - sweeping frequency
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'square';
            // Sweep from low to high (teleport arriving)
            osc.frequency.setValueAtTime(110, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
            osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.15);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);

            gain.gain.setValueAtTime(volume * 0.1, ctx.currentTime);
            gain.gain.setValueAtTime(volume * 0.12, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0, ctx.currentTime + 0.22);

            osc.start();
            osc.stop(ctx.currentTime + 0.22);
        },
    },
    'sci-fi': {
        send: (ctx, volume) => {
            // Futuristic "transmission" send sound
            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.06);

            gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        },
        message: (ctx, volume) => {
            // FM synthesis-like warble
            const carrier = ctx.createOscillator();
            const modulator = ctx.createOscillator();
            const modGain = ctx.createGain();
            const gain = ctx.createGain();

            modulator.connect(modGain);
            modGain.connect(carrier.frequency);
            carrier.connect(gain);
            gain.connect(ctx.destination);

            carrier.type = 'sine';
            carrier.frequency.setValueAtTime(1200, ctx.currentTime);
            modulator.type = 'sine';
            modulator.frequency.setValueAtTime(30, ctx.currentTime);
            modGain.gain.setValueAtTime(200, ctx.currentTime);
            gain.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

            carrier.start();
            modulator.start();
            carrier.stop(ctx.currentTime + 0.2);
            modulator.stop(ctx.currentTime + 0.2);
        },
        action: (ctx, volume) => {
            // Laser zap
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(1500, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        },
        complete: (ctx, volume) => {
            // Power-up whoosh
            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.4);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(500, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + 0.3);

            gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
            gain.gain.setValueAtTime(volume * 0.25, ctx.currentTime + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        },
        error: (ctx, volume) => {
            // System failure buzz
            const osc = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sawtooth';
            osc2.type = 'sawtooth';
            osc.frequency.setValueAtTime(80, ctx.currentTime);
            osc2.frequency.setValueAtTime(83, ctx.currentTime); // Slight detuning
            gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
            gain.gain.setValueAtTime(0, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0, ctx.currentTime + 0.25);
            gain.gain.setValueAtTime(volume * 0.1, ctx.currentTime + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

            osc.start();
            osc2.start();
            osc.stop(ctx.currentTime + 0.5);
            osc2.stop(ctx.currentTime + 0.5);
        },
        build: (ctx, volume) => {
            // Sci-fi "system online" / materialization with confirmation tone
            // First: Rising whoosh
            const whoosh = ctx.createOscillator();
            const whooshFilter = ctx.createBiquadFilter();
            const whooshGain = ctx.createGain();

            whoosh.connect(whooshFilter);
            whooshFilter.connect(whooshGain);
            whooshGain.connect(ctx.destination);

            whoosh.type = 'sawtooth';
            whoosh.frequency.setValueAtTime(80, ctx.currentTime);
            whoosh.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);

            whooshFilter.type = 'lowpass';
            whooshFilter.frequency.setValueAtTime(200, ctx.currentTime);
            whooshFilter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.2);

            whooshGain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
            whooshGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

            whoosh.start();
            whoosh.stop(ctx.currentTime + 0.25);

            // Then: Confirmation chord (after whoosh)
            setTimeout(() => {
                const chordFreqs = [523.25, 659.25, 783.99]; // C major
                chordFreqs.forEach((freq) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, ctx.currentTime);
                    gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

                    osc.start();
                    osc.stop(ctx.currentTime + 0.4);
                });
            }, 200);
        },
        open: (ctx, volume) => {
            // Hologram materializing with data stream effect
            // Rapid descending "data load" blips
            const blipFreqs = [2000, 1600, 1200, 800];
            blipFreqs.forEach((freq, i) => {
                setTimeout(() => {
                    const blip = ctx.createOscillator();
                    const blipGain = ctx.createGain();
                    blip.connect(blipGain);
                    blipGain.connect(ctx.destination);

                    blip.type = 'sine';
                    blip.frequency.setValueAtTime(freq, ctx.currentTime);
                    blipGain.gain.setValueAtTime(volume * 0.1, ctx.currentTime);
                    blipGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

                    blip.start();
                    blip.stop(ctx.currentTime + 0.04);
                }, i * 25);
            });

            // Final "materialized" confirmation tone
            setTimeout(() => {
                const confirm = ctx.createOscillator();
                const confirmGain = ctx.createGain();
                confirm.connect(confirmGain);
                confirmGain.connect(ctx.destination);

                confirm.type = 'sine';
                confirm.frequency.setValueAtTime(600, ctx.currentTime);
                confirm.frequency.setValueAtTime(800, ctx.currentTime + 0.05);
                confirmGain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
                confirmGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

                confirm.start();
                confirm.stop(ctx.currentTime + 0.15);
            }, 120);
        },
    },
};

export function useChatSounds({ settings }: UseChatSoundsOptions): UseChatSoundsReturn {
    const audioContextRef = useRef<AudioContext | null>(null);
    const isSupported = typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);

    // Get or create AudioContext (lazy initialization for browser autoplay policy)
    const getAudioContext = useCallback((): AudioContext | null => {
        if (!isSupported) return null;

        try {
            if (!audioContextRef.current) {
                const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                audioContextRef.current = new AudioContextClass();
            }

            // Resume if suspended (browser autoplay policy)
            if (audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume();
            }

            return audioContextRef.current;
        } catch {
            return null;
        }
    }, [isSupported]);

    // Convert volume (0-100) to gain (0-1)
    const volumeToGain = useCallback((volume: number): number => {
        return Math.max(0, Math.min(1, volume / 100));
    }, []);

    // Play a sound for an event
    const playSound = useCallback((event: SoundEvent) => {
        if (!settings.enabled) return;

        const ctx = getAudioContext();
        if (!ctx) return;

        const generator = soundGenerators[settings.style]?.[event];
        if (generator) {
            try {
                generator(ctx, volumeToGain(settings.volume));
            } catch {
                // Silently fail - sound is non-critical
            }
        }
    }, [settings.enabled, settings.style, settings.volume, getAudioContext, volumeToGain]);

    // Preview a sound (works even when disabled, for settings preview)
    const previewSound = useCallback((event: SoundEvent, style?: SoundStyle) => {
        const ctx = getAudioContext();
        if (!ctx) return;

        const styleToUse = style ?? settings.style;
        const generator = soundGenerators[styleToUse]?.[event];
        if (generator) {
            try {
                generator(ctx, volumeToGain(settings.volume));
            } catch {
                // Silently fail
            }
        }
    }, [settings.style, settings.volume, getAudioContext, volumeToGain]);

    // Preview all sounds in sequence
    const previewAllSounds = useCallback((style?: SoundStyle) => {
        const events: SoundEvent[] = ['open', 'send', 'message', 'action', 'complete', 'build', 'error'];
        const delay = 500; // ms between sounds

        events.forEach((event, index) => {
            setTimeout(() => {
                previewSound(event, style);
            }, index * delay);
        });
    }, [previewSound]);

    // Cleanup AudioContext on unmount
    useEffect(() => {
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {
                    // Ignore errors during cleanup
                });
                audioContextRef.current = null;
            }
        };
    }, []);

    return {
        playSound,
        previewSound,
        previewAllSounds,
        isSupported,
    };
}
