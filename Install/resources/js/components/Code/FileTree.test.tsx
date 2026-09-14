import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileTree } from './FileTree';

vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        isAxiosError: vi.fn((error: unknown) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError)),
    },
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('FileTree', () => {
    let promptSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(axios.get).mockResolvedValue({
            data: {
                files: [
                    {
                        path: 'src/App.tsx',
                        name: 'App.tsx',
                        size: 123,
                        is_dir: false,
                        mod_time: '2026-05-17T00:00:00Z',
                    },
                ],
            },
        });
        promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('src/RenamedApp.tsx');
    });

    afterEach(() => {
        promptSpy.mockRestore();
    });

    it('renames the selected file and selects the renamed path', async () => {
        const user = userEvent.setup();
        const onFileSelect = vi.fn();
        vi.mocked(axios.patch).mockResolvedValue({
            data: { path: 'src/RenamedApp.tsx' },
        });

        render(
            <FileTree
                projectId="project-1"
                onFileSelect={onFileSelect}
                selectedFile={null}
            />
        );

        await user.click(await screen.findByText('App.tsx'));
        await user.click(screen.getByTitle('Rename'));

        await waitFor(() => {
            expect(axios.patch).toHaveBeenCalledWith('/builder/projects/project-1/path', {
                from: 'src/App.tsx',
                to: 'src/RenamedApp.tsx',
            });
        });
        expect(onFileSelect).toHaveBeenLastCalledWith('src/RenamedApp.tsx');
    });

    it('uploads a dropped HTML file and selects it', async () => {
        const onFileSelect = vi.fn();
        vi.mocked(axios.put).mockResolvedValue({
            data: { success: true },
        });

        const { container } = render(
            <FileTree
                projectId="project-1"
                onFileSelect={onFileSelect}
                selectedFile={null}
            />
        );

        await screen.findByText('App.tsx');

        const file = new File(['<html><body>Hello</body></html>'], 'index.html', {
            type: 'text/html',
        });
        Object.defineProperty(file, 'text', {
            value: vi.fn().mockResolvedValue('<html><body>Hello</body></html>'),
        });

        fireEvent.drop(container.firstElementChild as Element, {
            dataTransfer: {
                files: [file],
                types: ['Files'],
            },
        });

        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith('/builder/projects/project-1/file', {
                path: 'index.html',
                content: '<html><body>Hello</body></html>',
            });
        });
        expect(onFileSelect).toHaveBeenLastCalledWith('index.html');
    });
});
