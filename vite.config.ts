
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    },
    server: {
      port: 3000
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', '@google/genai'],
    },
    define: {
      // Correctly map process.env.API_KEY to the build environment variable
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Polyfill process.env to prevent errors in libraries that expect it
      'process.env': {}
    }
  };
});
