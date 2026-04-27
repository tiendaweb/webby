import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SoundSettingsCard from '../SoundSettingsCard';
import { SoundStyle } from '@/hooks/useChatSounds';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        locale: 'en',
        isRtl: false,
    }),
}));

// Mock useChatSounds hook
const mockPlaySound = vi.fn();
const mockPreviewSound = vi.fn();
const mockPreviewAllSounds = vi.fn();

vi.mock('@/hooks/useChatSounds', () => ({
    useChatSounds: () => ({
        playSound: mockPlaySound,
        previewSound: mockPreviewSound,
        previewAllSounds: mockPreviewAllSounds,
        isSupported: true,
    }),
}));

// Create a controllable mock for useForm
const createUseFormMock = (overrides = {}) => {
    const defaultData = {
        sounds_enabled: false,
        sound_style: 'minimal',
        sound_volume: 50,
    };
    const mergedData = { ...defaultData, ...overrides };

    return {
        data: mergedData,
        setData: vi.fn(),
        put: vi.fn(),
        processing: false,
        recentlySuccessful: false,
        errors: {},
        ...overrides,
    };
};

let mockUseFormReturn = createUseFormMock();

vi.mock('@inertiajs/react', () => ({
    useForm: () => mockUseFormReturn,
    router: {
        put: vi.fn(),
    },
}));

describe('SoundSettingsCard', () => {
    const defaultProps = {
        settings: {
            enabled: false,
            style: 'minimal' as SoundStyle,
            volume: 50,
        },
        soundStyles: ['minimal', 'playful', 'retro', 'sci-fi'] as SoundStyle[],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseFormReturn = createUseFormMock();
    });

    it('renders the sound settings card with title', () => {
        render(<SoundSettingsCard {...defaultProps} />);

        expect(screen.getByText('Chat Sounds')).toBeInTheDocument();
    });

    it('renders the enable sounds toggle', () => {
        render(<SoundSettingsCard {...defaultProps} />);

        expect(screen.getByRole('switch')).toBeInTheDocument();
        expect(screen.getByText('Enable chat sounds')).toBeInTheDocument();
    });

    it('shows toggle as unchecked when sounds disabled', () => {
        mockUseFormReturn = createUseFormMock({ sounds_enabled: false });
        render(<SoundSettingsCard {...defaultProps} />);

        const toggle = screen.getByRole('switch');
        expect(toggle).toHaveAttribute('data-state', 'unchecked');
    });

    it('shows toggle as checked when sounds enabled', () => {
        mockUseFormReturn = createUseFormMock({ sounds_enabled: true });
        const props = {
            ...defaultProps,
            settings: { ...defaultProps.settings, enabled: true },
        };
        render(<SoundSettingsCard {...props} />);

        const toggle = screen.getByRole('switch');
        expect(toggle).toHaveAttribute('data-state', 'checked');
    });

    it('hides options when sounds are disabled', () => {
        mockUseFormReturn = createUseFormMock({ sounds_enabled: false });
        render(<SoundSettingsCard {...defaultProps} />);

        expect(screen.queryByText('Sound Style')).not.toBeInTheDocument();
        expect(screen.queryByText('Volume')).not.toBeInTheDocument();
    });

    it('shows options when sounds are enabled', () => {
        mockUseFormReturn = createUseFormMock({ sounds_enabled: true });
        const props = {
            ...defaultProps,
            settings: { ...defaultProps.settings, enabled: true },
        };
        render(<SoundSettingsCard {...props} />);

        expect(screen.getByText('Sound Style')).toBeInTheDocument();
        expect(screen.getByText('Volume')).toBeInTheDocument();
    });

    it('shows preview button when sounds are enabled', () => {
        mockUseFormReturn = createUseFormMock({ sounds_enabled: true });
        const props = {
            ...defaultProps,
            settings: { ...defaultProps.settings, enabled: true },
        };
        render(<SoundSettingsCard {...props} />);

        expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    });

    it('shows save button', () => {
        render(<SoundSettingsCard {...defaultProps} />);

        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('calls previewAllSounds when preview button is clicked', async () => {
        const user = userEvent.setup();
        mockUseFormReturn = createUseFormMock({ sounds_enabled: true, sound_style: 'playful' });
        const props = {
            ...defaultProps,
            settings: { ...defaultProps.settings, enabled: true },
        };
        render(<SoundSettingsCard {...props} />);

        const previewButton = screen.getByRole('button', { name: /preview/i });
        await user.click(previewButton);

        expect(mockPreviewAllSounds).toHaveBeenCalled();
    });

    it('displays volume percentage', () => {
        mockUseFormReturn = createUseFormMock({ sounds_enabled: true, sound_volume: 75 });
        const props = {
            ...defaultProps,
            settings: { ...defaultProps.settings, enabled: true, volume: 75 },
        };
        render(<SoundSettingsCard {...props} />);

        expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('shows description text', () => {
        render(<SoundSettingsCard {...defaultProps} />);

        expect(screen.getByText(/play notification sounds/i)).toBeInTheDocument();
    });

    it('disables save button while processing', () => {
        mockUseFormReturn = createUseFormMock({ processing: true });

        render(<SoundSettingsCard {...defaultProps} />);

        const saveButton = screen.getByRole('button', { name: /save/i });
        expect(saveButton).toBeDisabled();
    });

    it('renders style dropdown with current selection', () => {
        mockUseFormReturn = createUseFormMock({ sounds_enabled: true, sound_style: 'minimal' });
        const props = {
            ...defaultProps,
            settings: { ...defaultProps.settings, enabled: true },
        };
        render(<SoundSettingsCard {...props} />);

        // Check that the dropdown trigger exists (combobox role)
        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('calls setData when toggle is clicked', async () => {
        const user = userEvent.setup();
        const setDataMock = vi.fn();
        mockUseFormReturn = createUseFormMock({ sounds_enabled: false });
        mockUseFormReturn.setData = setDataMock;

        render(<SoundSettingsCard {...defaultProps} />);

        const toggle = screen.getByRole('switch');
        await user.click(toggle);

        expect(setDataMock).toHaveBeenCalledWith('sounds_enabled', true);
    });

    it('calls put when form is submitted', async () => {
        const user = userEvent.setup();
        const putMock = vi.fn();
        mockUseFormReturn = createUseFormMock();
        mockUseFormReturn.put = putMock;

        render(<SoundSettingsCard {...defaultProps} />);

        const saveButton = screen.getByRole('button', { name: /save/i });
        await user.click(saveButton);

        expect(putMock).toHaveBeenCalledWith('/profile/sound-settings', expect.any(Object));
    });
});
