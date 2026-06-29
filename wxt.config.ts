import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Download Renamer',
    description: 'Auto-renames downloads using AI. First encounter uses Claude; every repeat uses a local rule.',
    permissions: ['downloads', 'storage', 'alarms', 'notifications'],
    host_permissions: [
      'https://*.workers.dev/*',
      'https://api.anthropic.com/*',   // required per CLAUDE.md architecture spec
    ],
  },
});
