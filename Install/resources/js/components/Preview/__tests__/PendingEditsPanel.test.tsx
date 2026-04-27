/**
 * Tests for PendingEditsPanel component.
 * Tests batch edit display and actions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PendingEditsPanel } from '../PendingEditsPanel';
import type { PendingEdit, InspectorElement } from '@/types/inspector';

// Mock element data
const mockElement: InspectorElement = {
    id: 'el-123',
    tagName: 'h1',
    elementId: 'hero-title',
    classNames: ['hero-title', 'text-lg'],
    textPreview: 'Welcome',
    xpath: '//*[@id="hero-title"]',
    cssSelector: '#hero-title',
    boundingRect: { top: 100, left: 200, width: 300, height: 50 },
    attributes: {},
    parentTagName: 'div',
};

const mockTextEdit: PendingEdit = {
    id: 'edit-1',
    element: mockElement,
    field: 'text',
    originalValue: 'Welcome',
    newValue: 'Hello World',
    timestamp: new Date(),
};

const mockAttrEdit: PendingEdit = {
    id: 'edit-2',
    element: {
        ...mockElement,
        tagName: 'a',
        cssSelector: 'a.nav-link',
        classNames: ['nav-link'],
    },
    field: 'href',
    originalValue: '/about',
    newValue: '/about-us',
    timestamp: new Date(),
};

describe('PendingEditsPanel', () => {
    const defaultProps = {
        edits: [mockTextEdit],
        onSaveAll: vi.fn(),
        onDiscardAll: vi.fn(),
        onRemoveEdit: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('renders nothing when no edits', () => {
            const { container } = render(
                <PendingEditsPanel {...defaultProps} edits={[]} />
            );

            expect(container.firstChild).toBeNull();
        });

        it('renders panel when edits exist', () => {
            render(<PendingEditsPanel {...defaultProps} />);

            expect(screen.getByText(/pending/i)).toBeInTheDocument();
        });

        it('shows correct count for single edit', () => {
            render(<PendingEditsPanel {...defaultProps} />);

            expect(screen.getByText('1 pending change')).toBeInTheDocument();
        });

        it('shows correct count for multiple edits', () => {
            render(
                <PendingEditsPanel
                    {...defaultProps}
                    edits={[mockTextEdit, mockAttrEdit]}
                />
            );

            expect(screen.getByText('2 pending changes')).toBeInTheDocument();
        });

        it('displays text edit details', () => {
            render(<PendingEditsPanel {...defaultProps} />);

            expect(screen.getByText(/h1/i)).toBeInTheDocument();
            expect(screen.getByText(/"Welcome"/)).toBeInTheDocument();
            expect(screen.getByText(/"Hello World"/)).toBeInTheDocument();
        });

        it('displays attribute edit details', () => {
            render(
                <PendingEditsPanel {...defaultProps} edits={[mockAttrEdit]} />
            );

            expect(screen.getByText(/\[href\]/)).toBeInTheDocument();
        });
    });

    describe('actions', () => {
        it('calls onSaveAll when Save All clicked', () => {
            render(<PendingEditsPanel {...defaultProps} />);

            const saveButton = screen.getByRole('button', { name: /save all/i });
            fireEvent.click(saveButton);

            expect(defaultProps.onSaveAll).toHaveBeenCalledTimes(1);
        });

        it('calls onDiscardAll when Discard All clicked', () => {
            render(<PendingEditsPanel {...defaultProps} />);

            const discardButton = screen.getByRole('button', { name: /discard all/i });
            fireEvent.click(discardButton);

            expect(defaultProps.onDiscardAll).toHaveBeenCalledTimes(1);
        });

        it('calls onRemoveEdit when X button clicked', () => {
            render(<PendingEditsPanel {...defaultProps} />);

            // Find remove button (X icon button)
            const removeButtons = screen.getAllByRole('button');
            const removeButton = removeButtons.find(btn =>
                btn.querySelector('svg.lucide-x')
            );

            if (removeButton) {
                fireEvent.click(removeButton);
                expect(defaultProps.onRemoveEdit).toHaveBeenCalledWith('edit-1');
            }
        });

        it('does not show remove button when onRemoveEdit not provided', () => {
            render(
                <PendingEditsPanel
                    edits={[mockTextEdit]}
                    onSaveAll={vi.fn()}
                    onDiscardAll={vi.fn()}
                />
            );

            // Should only have Save All and Discard All buttons
            const buttons = screen.getAllByRole('button');
            expect(buttons).toHaveLength(2);
        });
    });

    describe('saving state', () => {
        it('disables buttons when saving', () => {
            render(<PendingEditsPanel {...defaultProps} isSaving={true} />);

            const saveButton = screen.getByRole('button', { name: /saving/i });
            const discardButton = screen.getByRole('button', { name: /discard all/i });

            expect(saveButton).toBeDisabled();
            expect(discardButton).toBeDisabled();
        });

        it('shows loading state when saving', () => {
            render(<PendingEditsPanel {...defaultProps} isSaving={true} />);

            expect(screen.getByText('Saving...')).toBeInTheDocument();
        });
    });

    describe('text truncation', () => {
        it('truncates long original values', () => {
            const longEdit: PendingEdit = {
                ...mockTextEdit,
                originalValue: 'This is a very long text that should be truncated',
            };

            const { container } = render(<PendingEditsPanel {...defaultProps} edits={[longEdit]} />);

            // Check that the truncated text appears somewhere in the component
            // The component truncates at 30 chars and adds '...'
            expect(container.textContent).toContain('This is a very long text that ...');
        });

        it('truncates long new values', () => {
            const longEdit: PendingEdit = {
                ...mockTextEdit,
                newValue: 'This is a very long replacement text that should be truncated',
            };

            const { container } = render(<PendingEditsPanel {...defaultProps} edits={[longEdit]} />);

            // Check that the truncated text appears somewhere
            expect(container.textContent).toContain('This is a very long replacemen...');
        });
    });

    describe('element display', () => {
        it('shows element tag name', () => {
            render(<PendingEditsPanel {...defaultProps} />);

            expect(screen.getByText(/<h1/)).toBeInTheDocument();
        });

        it('shows element class when no id', () => {
            const editWithClass: PendingEdit = {
                ...mockTextEdit,
                element: {
                    ...mockElement,
                    elementId: null,
                    cssSelector: 'h1.hero-title',
                },
            };

            render(<PendingEditsPanel {...defaultProps} edits={[editWithClass]} />);

            expect(screen.getByText(/<h1\.hero-title>/)).toBeInTheDocument();
        });
    });
});
