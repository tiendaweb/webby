import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
    SkeletonText,
    SkeletonButton,
    SkeletonBadge,
    SkeletonInput,
    SkeletonIcon,
    SkeletonAvatar,
} from '../skeleton-primitives';

describe('SkeletonText', () => {
    it('renders with default size', () => {
        render(<SkeletonText data-testid="skeleton-text" />);
        const element = screen.getByTestId('skeleton-text');
        expect(element).toBeInTheDocument();
        expect(element).toHaveClass('h-4'); // base size default
    });

    it('renders sm size', () => {
        render(<SkeletonText size="sm" data-testid="skeleton-text" />);
        expect(screen.getByTestId('skeleton-text')).toHaveClass('h-3');
    });

    it('renders lg size', () => {
        render(<SkeletonText size="lg" data-testid="skeleton-text" />);
        expect(screen.getByTestId('skeleton-text')).toHaveClass('h-5');
    });

    it('renders xl size', () => {
        render(<SkeletonText size="xl" data-testid="skeleton-text" />);
        expect(screen.getByTestId('skeleton-text')).toHaveClass('h-6');
    });

    it('applies custom width', () => {
        render(<SkeletonText width="w-32" data-testid="skeleton-text" />);
        expect(screen.getByTestId('skeleton-text')).toHaveClass('w-32');
    });

    it('applies custom className', () => {
        render(<SkeletonText className="custom-class" data-testid="skeleton-text" />);
        expect(screen.getByTestId('skeleton-text')).toHaveClass('custom-class');
    });
});

describe('SkeletonButton', () => {
    it('renders with default size', () => {
        render(<SkeletonButton data-testid="skeleton-button" />);
        const element = screen.getByTestId('skeleton-button');
        expect(element).toBeInTheDocument();
        expect(element).toHaveClass('h-9'); // md size default
    });

    it('renders sm size', () => {
        render(<SkeletonButton size="sm" data-testid="skeleton-button" />);
        expect(screen.getByTestId('skeleton-button')).toHaveClass('h-8');
    });

    it('renders lg size', () => {
        render(<SkeletonButton size="lg" data-testid="skeleton-button" />);
        expect(screen.getByTestId('skeleton-button')).toHaveClass('h-10');
    });

    it('renders icon variant as square', () => {
        render(<SkeletonButton variant="icon" data-testid="skeleton-button" />);
        const element = screen.getByTestId('skeleton-button');
        expect(element).toHaveClass('w-9');
        expect(element).toHaveClass('h-9');
    });

    it('renders default variant with width', () => {
        render(<SkeletonButton data-testid="skeleton-button" />);
        const element = screen.getByTestId('skeleton-button');
        expect(element).toHaveClass('w-24');
    });
});

describe('SkeletonBadge', () => {
    it('renders with default width', () => {
        render(<SkeletonBadge data-testid="skeleton-badge" />);
        const element = screen.getByTestId('skeleton-badge');
        expect(element).toBeInTheDocument();
        expect(element).toHaveClass('w-16');
    });

    it('applies custom width', () => {
        render(<SkeletonBadge width="w-24" data-testid="skeleton-badge" />);
        expect(screen.getByTestId('skeleton-badge')).toHaveClass('w-24');
    });

    it('has rounded-full class for pill shape', () => {
        render(<SkeletonBadge data-testid="skeleton-badge" />);
        expect(screen.getByTestId('skeleton-badge')).toHaveClass('rounded-full');
    });
});

describe('SkeletonInput', () => {
    it('renders with default width', () => {
        render(<SkeletonInput data-testid="skeleton-input" />);
        const element = screen.getByTestId('skeleton-input');
        expect(element).toBeInTheDocument();
        expect(element).toHaveClass('w-full');
    });

    it('applies custom width', () => {
        render(<SkeletonInput width="w-[300px]" data-testid="skeleton-input" />);
        expect(screen.getByTestId('skeleton-input')).toHaveClass('w-[300px]');
    });

    it('has correct height for input', () => {
        render(<SkeletonInput data-testid="skeleton-input" />);
        expect(screen.getByTestId('skeleton-input')).toHaveClass('h-9');
    });
});

describe('SkeletonIcon', () => {
    it('renders with default size (md)', () => {
        render(<SkeletonIcon data-testid="skeleton-icon" />);
        const element = screen.getByTestId('skeleton-icon');
        expect(element).toBeInTheDocument();
        expect(element).toHaveClass('h-5');
        expect(element).toHaveClass('w-5');
    });

    it('renders sm size', () => {
        render(<SkeletonIcon size="sm" data-testid="skeleton-icon" />);
        const element = screen.getByTestId('skeleton-icon');
        expect(element).toHaveClass('h-4');
        expect(element).toHaveClass('w-4');
    });

    it('renders lg size', () => {
        render(<SkeletonIcon size="lg" data-testid="skeleton-icon" />);
        const element = screen.getByTestId('skeleton-icon');
        expect(element).toHaveClass('h-6');
        expect(element).toHaveClass('w-6');
    });

    it('renders square shape by default', () => {
        render(<SkeletonIcon data-testid="skeleton-icon" />);
        expect(screen.getByTestId('skeleton-icon')).toHaveClass('rounded-md');
    });

    it('renders circle shape', () => {
        render(<SkeletonIcon shape="circle" data-testid="skeleton-icon" />);
        expect(screen.getByTestId('skeleton-icon')).toHaveClass('rounded-full');
    });
});

describe('SkeletonAvatar', () => {
    it('renders with default size (md)', () => {
        render(<SkeletonAvatar data-testid="skeleton-avatar" />);
        const element = screen.getByTestId('skeleton-avatar');
        expect(element).toBeInTheDocument();
        expect(element).toHaveClass('h-8');
        expect(element).toHaveClass('w-8');
    });

    it('renders sm size', () => {
        render(<SkeletonAvatar size="sm" data-testid="skeleton-avatar" />);
        const element = screen.getByTestId('skeleton-avatar');
        expect(element).toHaveClass('h-6');
        expect(element).toHaveClass('w-6');
    });

    it('renders lg size', () => {
        render(<SkeletonAvatar size="lg" data-testid="skeleton-avatar" />);
        const element = screen.getByTestId('skeleton-avatar');
        expect(element).toHaveClass('h-10');
        expect(element).toHaveClass('w-10');
    });

    it('is circular', () => {
        render(<SkeletonAvatar data-testid="skeleton-avatar" />);
        expect(screen.getByTestId('skeleton-avatar')).toHaveClass('rounded-full');
    });
});
