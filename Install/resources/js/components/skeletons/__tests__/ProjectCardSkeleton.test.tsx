import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProjectCardSkeleton } from '../ProjectCardSkeleton';

describe('ProjectCardSkeleton', () => {
    it('renders card container', () => {
        render(<ProjectCardSkeleton />);
        expect(screen.getByTestId('project-card-skeleton')).toBeInTheDocument();
    });

    it('renders thumbnail placeholder', () => {
        render(<ProjectCardSkeleton />);
        expect(screen.getByTestId('project-card-thumbnail-skeleton')).toBeInTheDocument();
    });

    it('renders title placeholder', () => {
        render(<ProjectCardSkeleton />);
        expect(screen.getByTestId('project-card-title-skeleton')).toBeInTheDocument();
    });

    it('renders meta placeholder', () => {
        render(<ProjectCardSkeleton />);
        expect(screen.getByTestId('project-card-meta-skeleton')).toBeInTheDocument();
    });

    it('renders in grid mode by default', () => {
        render(<ProjectCardSkeleton />);
        const thumbnail = screen.getByTestId('project-card-thumbnail-skeleton');
        expect(thumbnail).toHaveClass('aspect-video');
    });

    it('renders in list mode when specified', () => {
        render(<ProjectCardSkeleton viewMode="list" />);
        const thumbnail = screen.getByTestId('project-card-thumbnail-skeleton');
        // List mode has different dimensions
        expect(thumbnail).toHaveClass('h-16', 'w-24');
    });

    it('renders in large mode', () => {
        render(<ProjectCardSkeleton viewMode="large" />);
        const thumbnail = screen.getByTestId('project-card-thumbnail-skeleton');
        expect(thumbnail).toHaveClass('aspect-video');
    });
});
