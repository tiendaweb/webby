import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FileGridSkeleton } from '../FileGridSkeleton';

describe('FileGridSkeleton', () => {
    it('renders grid container', () => {
        render(<FileGridSkeleton />);
        expect(screen.getByTestId('file-grid-skeleton')).toBeInTheDocument();
    });

    it('renders 6 file cards by default', () => {
        render(<FileGridSkeleton />);
        const cards = screen.getAllByTestId('file-card-skeleton');
        expect(cards).toHaveLength(6);
    });

    it('renders custom number of file cards', () => {
        render(<FileGridSkeleton count={4} />);
        const cards = screen.getAllByTestId('file-card-skeleton');
        expect(cards).toHaveLength(4);
    });

    it('renders file thumbnail placeholder', () => {
        render(<FileGridSkeleton count={1} />);
        expect(screen.getByTestId('file-card-thumbnail-skeleton')).toBeInTheDocument();
    });

    it('renders file name placeholder', () => {
        render(<FileGridSkeleton count={1} />);
        expect(screen.getByTestId('file-card-name-skeleton')).toBeInTheDocument();
    });

    it('renders thumbnails for all cards', () => {
        render(<FileGridSkeleton count={3} />);
        const thumbnails = screen.getAllByTestId('file-card-thumbnail-skeleton');
        expect(thumbnails).toHaveLength(3);
    });
});
