import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Download Renamer',
    description: 'Auto-renames downloads using AI. First encounter uses Claude; every repeat uses a local rule.',
    permissions: ['downloads', 'storage', 'alarms'],
    host_permissions: ['https://api.anthropic.com/*'],
  },
});
