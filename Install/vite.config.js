import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    build: {
        // Increase chunk size warning limit (default is 500 kB)
        chunkSizeWarningLimit: 700,
        rollupOptions: {
            output: {
                manualChunks: {
                    // Split large vendor dependencies into separate chunks
                    'monaco-editor': ['@monaco-editor/react', 'monaco-editor'],
                    'react-vendor': ['react', 'react-dom', 'react-dom/client'],
                    'radix-ui': [
                        '@radix-ui/react-dialog',
                        '@radix-ui/react-dropdown-menu',
                        '@radix-ui/react-select',
                        '@radix-ui/react-tabs',
                        '@radix-ui/react-tooltip',
                        '@radix-ui/react-scroll-area',
                    ],
                },
            },
        },
    },
});
