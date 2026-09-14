import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { SectionCodeEditModal } from '../SectionCodeEditModal';
import type { InspectorElement } from '@/types/inspector';

vi.mock('axios');

vi.mock('@monaco-editor/react', () => ({
    default: ({ value, onChange, options }: { value: string; onChange: (value: string) => void; options?: { readOnly?: boolean } }) => (
        <textarea
            aria-label="code-editor"
            value={value}
            readOnly={options?.readOnly}
            onChange={event => onChange(event.target.value)}
        />
    ),
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
    },
}));

const mockedAxios = vi.mocked(axios, true);

const mockElement: InspectorElement = {
    id: 'el-1',
    tagName: 'section',
    elementId: null,
    classNames: ['hero'],
    textPreview: 'Hello',
    xpath: '/html/body/section',
    cssSelector: 'section.hero',
    boundingRect: { top: 0, left: 0, width: 100, height: 100 },
    attributes: {},
    parentTagName: 'body',
};

describe('SectionCodeEditModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedAxios.isAxiosError.mockReturnValue(false);
    });

    it('loads resolved section code and saves edited content', async () => {
        mockedAxios.post
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    sourcePath: 'index.html',
                    code: '<section class="hero"><h1>Hello</h1></section>',
                    language: 'html',
                },
            })
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    sourcePath: 'index.html',
                    preview_url: '/preview/project-1/',
                    warning: null,
                },
            });

        const onOpenChange = vi.fn();
        const onSaved = vi.fn();

        render(
            <SectionCodeEditModal
                open
                projectId="project-1"
                element={mockElement}
                outerHTML='<section class="hero"><h1>Hello</h1></section>'
                onOpenChange={onOpenChange}
                onSaved={onSaved}
            />
        );

        const editor = await screen.findByLabelText('code-editor');
        expect(editor).toHaveValue('<section class="hero"><h1>Hello</h1></section>');

        fireEvent.change(editor, {
            target: { value: '<section class="hero"><h1>Updated</h1></section>' },
        });
        fireEvent.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
            expect(mockedAxios.post).toHaveBeenLastCalledWith('/project/project-1/section-code/save', {
                sourcePath: 'index.html',
                originalCode: '<section class="hero"><h1>Hello</h1></section>',
                newCode: '<section class="hero"><h1>Updated</h1></section>',
            });
        });
        expect(onSaved).toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('shows source candidates when resolution is ambiguous', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: {
                success: false,
                needs_source_choice: true,
                message: 'Choose the source file to edit.',
                candidates: [
                    { sourcePath: 'index.html', occurrences: 1, snippet: '<section>Hero</section>' },
                    { sourcePath: 'about.html', occurrences: 1, snippet: '<section>Hero</section>' },
                ],
            },
        });

        render(
            <SectionCodeEditModal
                open
                projectId="project-1"
                element={mockElement}
                outerHTML="<section>Hero</section>"
                onOpenChange={vi.fn()}
            />
        );

        expect(await screen.findByText('index.html')).toBeInTheDocument();
        expect(screen.getByText('about.html')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });
});
