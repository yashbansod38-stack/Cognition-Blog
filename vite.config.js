import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                blogPost1: resolve(__dirname, 'blogs/ai-agents-business-stack-2026.html'),
                blogPost2: resolve(__dirname, 'blogs/mastering-ai-agents.html'),
                blogPost3: resolve(__dirname, 'blogs/State-of-Blogging.html'),
                blogPost4: resolve(__dirname, 'blogs/Outperforming-Vidiq-TubeBuddy.html'),
                blogPost5: resolve(__dirname, 'blogs/Vidiq vs TubeBuddy.html'),
                blogPost6: resolve(__dirname, 'blogs/Indian-Longevity-Stack.html'),
                notFound: resolve(__dirname, '404.html'),
            },
        },
    },
});
