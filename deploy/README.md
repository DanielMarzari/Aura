# Deploying Aura to aura.danmarzari.com

This follows the same pattern as the sibling apps (Cookbook, ROAM, Library, Metaphor, Chess).

## One-time setup

### 1. DNS

Point `aura.danmarzari.com` → `129.80.157.41` (A record).

### 2. GitHub repository secrets

At https://github.com/DanielMarzari/Aura/settings/secrets/actions add:

| Name             | Value                                         |
|------------------|-----------------------------------------------|
| `DEPLOY_SSH_KEY` | Contents of `~/Documents/Server/dan-server.key` |
| `DEPLOY_USER`    | `ubuntu`                                      |
| `DEPLOY_HOST`    | `129.80.157.41`                               |

### 3. Server-side directory

```bash
ssh -i ~/Documents/Server/dan-server.key ubuntu@129.80.157.41
sudo mkdir -p /var/www/apps/aura/logs
sudo chown -R ubuntu:ubuntu /var/www/apps/aura
```

### 4. PM2 ecosystem entry

Edit `/var/www/apps/ecosystem.config.js` and add the entry from
[ecosystem.aura.snippet.js](./ecosystem.aura.snippet.js) to the `apps` array.
Adjust the port (3007 assumed) if it's already taken — keep it in sync with the Caddyfile.

```bash
sudo nano /var/www/apps/ecosystem.config.js
```

### 5. Caddy vhost

Append [Caddyfile.snippet](./Caddyfile.snippet) to `/etc/caddy/Caddyfile`:

```bash
sudo nano /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy handles TLS automatically via Let's Encrypt.

### 6. First deploy

Push to `main` — GitHub Actions runs `.github/workflows/deploy.yml`:
- Installs deps, builds standalone output
- rsync's `.next/standalone` + `.next/static` + `public` to `/var/www/apps/aura/`
- `pm2 restart --only aura`

On the first deploy, you'll also need to manually start the app once so PM2 knows about it:

```bash
ssh -i ~/Documents/Server/dan-server.key ubuntu@129.80.157.41
cd /var/www/apps
pm2 start ecosystem.config.js --only aura
pm2 save
```

After that, subsequent pushes auto-restart.

## Verify

```bash
curl -I https://aura.danmarzari.com
# Expect: HTTP/2 200

ssh -i ~/Documents/Server/dan-server.key ubuntu@129.80.157.41 'pm2 status aura'
```

## Notes

- **No database.** Unlike sibling apps, Aura is static — no SQLite, no API routes that write.
- **Large static assets.** `public/scenes/*` will be ~150MB with all scenes. The Caddyfile applies `Cache-Control: max-age=31536000, immutable` to `/scenes/*` so browsers cache them aggressively.
- **Transfer size.** First rsync will push all video/audio — expect a slow initial deploy. Subsequent deploys only send changed files.
