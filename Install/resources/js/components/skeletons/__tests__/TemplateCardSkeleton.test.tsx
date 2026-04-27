import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TemplateCardSkeleton } from '../TemplateCardSkeleton';

describe('TemplateCardSkeleton', () => {
    it('renders card container', () => {
        render(<TemplateCardSkeleton />);
        expect(screen.getByTestId('template-card-skeleton')).toBeInTheDocument();
    });

    it('renders image placeholder', () => {
        render(<TemplateCardSkeleton />);
        expect(screen.getByTestId('template-card-image-skeleton')).toBeInTheDocument();
    });

    it('renders image with aspect-video class', () => {
        render(<TemplateCardSkeleton />);
        const image = screen.getByTestId('template-card-image-skeleton');
        expect(image).toHaveClass('aspect-video');
    });

    it('renders category badge placeholder', () => {
        render(<TemplateCardSkeleton />);
        expect(screen.getByTestId('template-card-badge-skeleton')).toBeInTheDocument();
    });

    it('renders title placeholder', () => {
        render(<TemplateCardSkeleton />);
        expect(screen.getByTestId('template-card-title-skeleton')).toBeInTheDocument();
    });

    it('renders description placeholder', () => {
        render(<TemplateCardSkeleton />);
        expect(screen.getByTestId('template-card-description-skeleton')).toBeInTheDocument();
    });
});
