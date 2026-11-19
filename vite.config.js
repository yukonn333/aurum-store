import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em desenvolvimento, o Vite repassa /api e /uploads para o servidor Node (porta 3001).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3001', '/uploads': 'http://localhost:3001' } },
});
