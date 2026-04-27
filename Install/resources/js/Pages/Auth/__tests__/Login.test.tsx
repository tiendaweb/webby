import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';

// Mock all Inertia hooks
vi.mock('@inertiajs/react', () => ({
    usePage: vi.fn(),
    useForm: vi.fn(() => ({
        data: { email: '', password: '', remember: false, recaptcha_token: '' },
        setData: vi.fn(),
        processing: false,
        errors: {},
        reset: vi.fn(),
    })),
    Head: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    Link: ({ children, ...props }: { children?: React.ReactNode; href: string }) => <a {...props}>{children}</a>,
    router: { post: vi.fn() },
}));

vi.mock('@/Layouts/GuestLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/Auth/SocialLoginButtons', () => ({
    SocialLoginButtons: () => null,
}));

vi.mock('@/components/Auth/ReCaptchaProvider', () => ({
    useReCaptcha: () => ({ getToken: vi.fn(), isEnabled: false }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
    useTranslation: () => ({ t: (s: string) => s }),
}));

// Mock route() global
vi.stubGlobal('route', (name: string) => `/${name}`);

function mockPageProps(props: Partial<PageProps> = {}) {
    vi.mocked(usePage).mockReturnValue({
        props: {
            appSettings: { enable_registration: true },
            ...props,
        } as PageProps,
    } as ReturnType<typeof usePage>);
}

// Import after mocks
import Login from '../Login';

describe('Login demo banner', () => {
    it('shows demo info banner when demoCredentials is provided', () => {
        mockPageProps({ isDemo: true });
        render(
            <Login
                canResetPassword={true}
                demoCredentials={{ email: 'admin@webby.com', password: 'password' }}
            />
        );
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/register/i)).toBeInTheDocument();
    });

    it('does not show demo banner when demoCredentials is null', () => {
        mockPageProps({ isDemo: false });
        render(
            <Login
                canResetPassword={true}
                demoCredentials={null}
            />
        );
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
