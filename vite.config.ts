import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiKeys = (env.GEMINI_API_KEYS || env.GEMINI_API_KEY || '')
      .split(',')
      .map(key => key.trim())
      .filter(Boolean);
    const serializedKeys = apiKeys.join(',');
    const primaryKey = apiKeys[0] || '';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: ['danish.scicloud.site'],
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(primaryKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(primaryKey),
        'process.env.GEMINI_API_KEYS': JSON.stringify(serializedKeys)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
