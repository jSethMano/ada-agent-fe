#!/bin/sh
# Starts the Ada Worker for local development.
#
# The port is not negotiable: vite.config.ts proxies /agents to 8787. Plain
# `wrangler dev` picks the next free port when 8787 is taken, which leaves the
# proxy pointing at nothing and every question failing with a 502. Pinning the
# port here means that failure surfaces as "address in use" instead.

set -e

WORKER_DIR="${ADA_WORKER_DIR:-../ada-agent}"
PORT="${ADA_WORKER_PORT:-8787}"

if [ ! -d "$WORKER_DIR" ]; then
  echo ""
  echo "  Cannot find the Ada Worker at: $WORKER_DIR"
  echo ""
  echo "  This repo is the front end only. Clone the Worker alongside it:"
  echo "    git clone <ada-agent remote> $WORKER_DIR"
  echo ""
  echo "  Or point at it explicitly:"
  echo "    ADA_WORKER_DIR=/path/to/ada-agent npm run dev"
  echo ""
  echo "  To run the front end on its own (every question will show the"
  echo "  Worker-unreachable error state):"
  echo "    npm run dev:web"
  echo ""
  exit 1
fi

if [ ! -d "$WORKER_DIR/node_modules" ]; then
  echo "Installing Worker dependencies in $WORKER_DIR..."
  (cd "$WORKER_DIR" && npm install)
fi

exec sh -c "cd '$WORKER_DIR' && npx wrangler dev --port $PORT"
