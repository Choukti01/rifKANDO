#!/bin/sh
set -eu

# Only this mounted path is writable at runtime. The application code remains
# read-only, which limits the blast radius of a compromised web process.
storage_root="${PERSISTENT_STORAGE_ROOT:-/var/lib/rifkando}"
mkdir -p "$storage_root/uploads" "$storage_root/backups"
chown -R node:node "$storage_root"

exec gosu node "$@"

