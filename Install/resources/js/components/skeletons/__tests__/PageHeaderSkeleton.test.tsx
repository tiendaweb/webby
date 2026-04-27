import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PageHeaderSkeleton } from '../PageHeaderSkeleton';

describe('PageHeaderSkeleton', () => {
    it('renders title by default', () => {
        render(<PageHeaderSkeleton />);
        expect(screen.getByTestId('page-header-title-skeleton')).toBeInTheDocument();
    });

    it('hides title when showTitle is false', () => {
        render(<PageHeaderSkeleton showTitle={false} />);
        expect(screen.queryByTestId('page-header-title-skeleton')).not.toBeInTheDocument();
    });

    it('does not render description by default', () => {
        render(<PageHeaderSkeleton />);
        expect(screen.queryByTestId('page-header-description-skeleton')).not.toBeInTheDocument();
    });

    it('renders description when showDescription is true', () => {
        render(<PageHeaderSkeleton showDescription />);
        expect(screen.getByTestId('page-header-description-skeleton')).toBeInTheDocument();
    });

    it('does not render project selector by default', () => {
        render(<PageHeaderSkeleton />);
        expect(screen.queryByTestId('page-header-project-selector-skeleton')).not.toBeInTheDocument();
    });

    it('renders project selector when showProjectSelector is true', () => {
        render(<PageHeaderSkeleton showProjectSelector />);
        expect(screen.getByTestId('page-header-project-selector-skeleton')).toBeInTheDocument();
    });

    it('does not render action buttons by default', () => {
        render(<PageHeaderSkeleton />);
        expect(screen.queryByTestId('page-header-action-skeleton')).not.toBeInTheDocument();
    });

    it('renders correct number of action buttons', () => {
        render(<PageHeaderSkeleton actionCount={3} />);
        const actions = screen.getAllByTestId('page-header-action-skeleton');
        expect(actions).toHaveLength(3);
    });

    it('renders all elements together', () => {
        render(<PageHeaderSkeleton showTitle showDescription showProjectSelector actionCount={2} />);
        expect(screen.getByTestId('page-header-title-skeleton')).toBeInTheDocument();
        expect(screen.getByTestId('page-header-description-skeleton')).toBeInTheDocument();
        expect(screen.getByTestId('page-header-project-selector-skeleton')).toBeInTheDocument();
        expect(screen.getAllByTestId('page-header-action-skeleton')).toHaveLength(2);
    });
});
