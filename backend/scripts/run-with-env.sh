#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
BACKEND_DIR=$(dirname "$SCRIPT_DIR")
ROOT_DIR=$(dirname "$BACKEND_DIR")

set -a

if [ -f "$ROOT_DIR/.env" ]; then
  . "$ROOT_DIR/.env"
fi

if [ -f "$BACKEND_DIR/.env" ]; then
  . "$BACKEND_DIR/.env"
fi

set +a

exec "$@"
