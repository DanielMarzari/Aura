// Add this entry to /var/www/apps/ecosystem.config.js in the `apps` array
// (alongside cookbook/roam/library/metaphor/chess/reader).
// Port 3007 — next after reader (3006). No database, no auth.
{
  name: "aura",
  cwd: "/var/www/apps/aura",
  script: "server.js",
  env: {
    PORT: 3007,
    HOSTNAME: "0.0.0.0",
    DATABASE_PATH: "/var/www/apps/aura/aura.db",
    NODE_ENV: "production"
  }
}
