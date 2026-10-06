import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function googleSearchConsoleVerificationPlugin(): Plugin {
  return {
    name: "buymesho-google-search-console-verification",
    transformIndexHtml(html) {
      const token = process.env.VITE_GOOGLE_SITE_VERIFICATION?.trim();
      if (!token || /google-site-verification/i.test(html)) return html;

      const tag = `    <meta name="google-site-verification" content="${token.replace(/"/g, "&quot;")}" />`;
      return html.replace("</head>", tag + "\n  </head>");
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({mode}) => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      googleSearchConsoleVerificationPlugin(),
    ],
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
    build: {
      sourcemap: false,
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
