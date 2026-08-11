import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({mode}) => {
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
              return 'vendor-react';
            }

            if (id.includes('node_modules/firebase/')) {
              return 'vendor-firebase';
            }

            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-lucide';
            }

            return 'vendor';
          },
        },
      },
    },
  };
});
