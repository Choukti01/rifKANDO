# Oracle Always Free deployment

This deployment moves the rifKANDO API from a Windows laptop to one Ubuntu VM:

```
Netlify -> Cloudflare DNS / Tunnel -> private Docker API -> Neon PostgreSQL
```

It is a stable 24/7 single-instance deployment for the controlled Products + FINDit + COD launch. It removes the laptop dependency, but it is not yet multi-region high availability or horizontal autoscaling.

## VM baseline

Create an Ubuntu 24.04 Always Free VM in Oracle Cloud, allow SSH only, and do **not** open TCP 5000. The Cloudflare Tunnel makes an outbound encrypted connection, so no public API port is required.

On the VM, install Docker Engine and the Compose plugin using Docker's official Ubuntu installation instructions. Then clone the repository under `/opt/rifkando/app`.

```bash
sudo mkdir -p /opt/rifkando
sudo chown "$USER":"$USER" /opt/rifkando
git clone https://github.com/Choukti01/rifKANDO.git /opt/rifkando/app
cd /opt/rifkando/app/rifKANDI-backend
```

## Production environment

Create `/opt/rifkando/.env` from `.env.oracle.example`, preserving the **existing** production secrets and Neon `DATABASE_URL`. Do not rotate secrets during the cutover: that would log out active users and invalidate sessions. Lock it down:

```bash
chmod 600 /opt/rifkando/.env
```

Validate without exposing credentials:

```bash
docker compose -f deploy/oracle/compose.yml --env-file /opt/rifkando/.env config >/dev/null
docker compose -f deploy/oracle/compose.yml up -d --build api
docker compose -f deploy/oracle/compose.yml ps
curl --fail --silent --show-error http://127.0.0.1:5000/ready
```

The `api` container is read-only except for its named persistent volume. Its port binds only to `127.0.0.1`, not the public network.

## Cloudflare cutover

Only after `/ready` succeeds, create a new Cloudflare Tunnel for this VM and map `api.rifkando.com` to `http://api:5000`. Save its scoped token in `/opt/rifkando/.cloudflared.env` (mode 600), then start it:

```bash
chmod 600 /opt/rifkando/.cloudflared.env
set -a; . /opt/rifkando/.cloudflared.env; set +a
docker compose -f deploy/oracle/compose.yml --env-file /opt/rifkando/.env --profile tunnel up -d
docker compose -f deploy/oracle/compose.yml logs --tail=100 cloudflared
```

Test externally before stopping the Windows service:

```bash
curl --fail --silent --show-error https://api.rifkando.com/ready
```

Keep the Windows backend and its existing tunnel online until the external readiness check, Google sign-in, product browsing, cart creation, and a COD order smoke test succeed against the VM. Then stop the Windows backend and old tunnel. This provides a simple rollback: restart the Windows services and restore the old tunnel if the new host fails.

## Updating safely

```bash
cd /opt/rifkando/app
git pull --ff-only origin main
cd rifKANDI-backend
docker compose -f deploy/oracle/compose.yml up -d --build api
docker compose -f deploy/oracle/compose.yml ps
curl --fail --silent --show-error http://127.0.0.1:5000/ready
```

Run `npm run db:postgres:migrate` only from a one-off deployment shell when a future release contains a reviewed migration. This service uses Neon PostgreSQL only; it does not mount or use SQLite.
