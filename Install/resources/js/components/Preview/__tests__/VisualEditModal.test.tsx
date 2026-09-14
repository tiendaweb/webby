import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { VisualEditModal } from '../VisualEditModal';
import type { InspectorElement } from '@/types/inspector';

vi.mock('axios');

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
    },
}));

vi.mock('@/contexts/LanguageContext', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const mockedAxios = vi.mocked(axios, true);

const baseElement: InspectorElement = {
    id: 'el-1',
    tagName: 'section',
    elementId: null,
    classNames: ['gallery'],
    textPreview: 'Gallery',
    xpath: '/html/body/section',
    cssSelector: 'section.gallery',
    boundingRect: { top: 0, left: 0, width: 100, height: 100 },
    attributes: {},
    parentTagName: 'body',
    images: [
        {
            id: 'img-1',
            cssSelector: '.gallery img:nth-of-type(1)',
            src: '/images/one.png',
            currentSrc: '/images/one.png',
            alt: 'One',
            title: '',
        },
        {
            id: 'img-2',
            cssSelector: '.gallery img:nth-of-type(2)',
            src: '/images/two.png',
            currentSrc: '/images/two.png',
            alt: 'Two',
            title: '',
        },
    ],
};

describe('VisualEditModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fills the bulk URL when an image file is uploaded', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: {
                file: {
                    id: 10,
                    original_filename: 'bulk.png',
                    mime_type: 'image/png',
                    size: 123,
                    human_size: '123 B',
                    is_image: true,
                    url: '/storage/bulk.png',
                    api_url: '/api/files/10',
                },
            },
        });

        render(
            <VisualEditModal
                open
                projectId="project-1"
                element={baseElement}
                initialValues={{}}
                onOpenChange={vi.fn()}
                onApplyPreview={vi.fn()}
                onRevertPreview={vi.fn()}
            />
        );

        const uploadInput = document.getElementById('bulk-image-upload') as HTMLInputElement | null;
        expect(uploadInput).toBeTruthy();

        fireEvent.change(uploadInput!, {
            target: {
                files: [new File(['file'], 'bulk.png', { type: 'image/png' })],
            },
        });

        await waitFor(() => {
            expect(screen.getByDisplayValue('/api/files/10')).toBeInTheDocument();
        });
    });

    it('replaces only the selected source group when bulk applying', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: {
                success: true,
                sourcePath: 'index.html',
                preview_url: '/preview/project-1/',
                warning: null,
            },
        });

        render(
            <VisualEditModal
                open
                projectId="project-1"
                element={baseElement}
                initialValues={{}}
                onOpenChange={vi.fn()}
                onApplyPreview={vi.fn()}
                onRevertPreview={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /\/images\/one\.png/i }));

        fireEvent.change(screen.getByLabelText('Bulk image URL'), {
            target: { value: '/images/updated.png' },
        });

        fireEvent.click(screen.getByRole('button', { name: /replace selected source/i }));
        fireEvent.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/project/project-1/visual-edits',
                expect.objectContaining({
                    selector: '.gallery img:nth-of-type(1)',
                    field: 'src',
                    originalValue: '/images/one.png',
                    newValue: '/images/updated.png',
                })
            );
        });

        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });
});
