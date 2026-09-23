# The production image deliberately runs the same supported Node major version
# declared in .nvmrc. Native dependencies are built once in the builder stage
# and the runtime image contains no compiler toolchain.
FROM node:22-bookworm-slim AS dependencies

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates gosu \
  && rm -rf /var/lib/apt/lists/*

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN chmod 0755 deploy/oracle/docker-entrypoint.sh \
  && mkdir -p /var/lib/rifkando/uploads /var/lib/rifkando/backups

ENV NODE_ENV=production \
  APP_ENV=production \
  PORT=5000 \
  DATABASE_ENGINE=postgres \
  POSTGRES_SSL=true \
  PERSISTENT_STORAGE_ROOT=/var/lib/rifkando \
  UPLOADS_DIR=/var/lib/rifkando/uploads \
  DB_BACKUP_DIR=/var/lib/rifkando/backups

EXPOSE 5000

# /ready includes the database readiness check, unlike the basic liveness route.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('node:http').get('http://127.0.0.1:5000/ready', (response) => process.exit(response.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["./deploy/oracle/docker-entrypoint.sh"]
CMD ["node", "--dns-result-order=ipv4first", "--use-system-ca", "server.js"]

