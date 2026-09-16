import { defineConfig } from 'vite';
export default defineConfig({ base: process.env.PAGES_BASE || './', server: { host: '127.0.0.1', hmr: false }, build: { target: 'es2022' }, worker: { format: 'es' } });
