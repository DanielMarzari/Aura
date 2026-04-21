// Add this entry to /var/www/apps/ecosystem.config.js in the `apps` array
// (alongside cookbook/roam/library/metaphor/chess).
//
// Port 3004 is assumed — adjust if taken. Keep it in sync with the Caddyfile.
{
  name: 'aura',
  script: 'server.js',
  cwd: '/var/www/apps/aura',
  env: {
    NODE_ENV: 'production',
    PORT: 3004,
    HOSTNAME: '0.0.0.0',
  },
  max_memory_restart: '500M',
  error_file: '/var/www/apps/aura/logs/error.log',
  out_file: '/var/www/apps/aura/logs/out.log',
}
