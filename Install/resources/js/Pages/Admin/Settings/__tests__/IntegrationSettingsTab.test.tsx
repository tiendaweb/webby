import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import IntegrationSettingsTab from '../IntegrationSettingsTab';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        locale: 'en',
        isRtl: false,
    }),
}));

// Mock sonner
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock axios
vi.mock('axios', () => ({
    default: {
        post: vi.fn(),
    },
}));

// Create a controllable mock for useForm
const createUseFormMock = (overrides = {}) => {
    const defaultData = {
        broadcast_driver: 'pusher',
        pusher_app_id: '',
        pusher_key: '',
        pusher_secret: '',
        pusher_cluster: 'mt1',
        reverb_host: '',
        reverb_port: '8080',
        reverb_scheme: 'https',
        reverb_app_id: '',
        reverb_key: '',
        reverb_secret: '',
        internal_ai_provider_id: '',
        internal_ai_model: '',
        firebase_system_api_key: '',
        firebase_system_project_id: '',
        firebase_system_auth_domain: '',
        firebase_system_storage_bucket: '',
        firebase_system_messaging_sender_id: '',
        firebase_system_app_id: '',
    };

    return {
        data: { ...defaultData, ...overrides },
        setData: vi.fn(),
        put: vi.fn(),
        processing: false,
        errors: {},
    };
};

let mockUseFormReturn = createUseFormMock();

vi.mock('@inertiajs/react', () => ({
    useForm: () => mockUseFormReturn,
    router: {
        put: vi.fn(),
    },
}));

describe('IntegrationSettingsTab', () => {
    const defaultSettings = {
        broadcast_driver: 'pusher' as const,
        pusher_app_id: '',
        pusher_has_key: false,
        pusher_has_secret: false,
        pusher_cluster: 'mt1' as const,
        reverb_host: '',
        reverb_port: 8080,
        reverb_scheme: 'https' as const,
        reverb_app_id: '',
        reverb_has_key: false,
        reverb_has_secret: false,
        internal_ai_provider_id: null,
        internal_ai_model: '',
        firebase_system_project_id: '',
        firebase_system_auth_domain: '',
        firebase_system_storage_bucket: '',
        firebase_system_messaging_sender_id: '',
        firebase_system_app_id: '',
        firebase_has_api_key: false,
        firebase_configured: false,
        firebase_admin_configured: false,
        firebase_admin_project_id: null,
        firebase_admin_client_email: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseFormReturn = createUseFormMock();
    });

    it('renders secret fields with password type for pusher', () => {
        const settings = {
            ...defaultSettings,
            pusher_has_key: true,
        };

        render(<IntegrationSettingsTab settings={settings} aiProviders={[]} />);

        const pusherKeyInput = document.getElementById('pusher_key');
        expect(pusherKeyInput).toHaveAttribute('type', 'password');
    });

    it('renders configured badge with success variant when secret exists', () => {
        const settings = {
            ...defaultSettings,
            pusher_has_key: true,
        };

        render(<IntegrationSettingsTab settings={settings} aiProviders={[]} />);

        const badges = screen.getAllByText('Configured');
        expect(badges.length).toBeGreaterThan(0);

        // Check that the badge has the success variant styling
        const badge = badges[0].closest('[data-slot="badge"]');
        expect(badge).toBeTruthy();
        expect(badge?.className).toMatch(/bg-success/);
    });

    it('does not show configured badge when secret is not set', () => {
        render(<IntegrationSettingsTab settings={defaultSettings} aiProviders={[]} />);

        const badges = screen.queryAllByText('Configured');
        // No Configured badges for broadcast section (pusher is default)
        const pusherBadges = badges.filter(b => {
            const label = b.closest('.space-y-2')?.querySelector('label');
            return label?.textContent === 'App Key' || label?.textContent === 'App Secret';
        });
        expect(pusherBadges).toHaveLength(0);
    });

});
