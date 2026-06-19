#!/usr/bin/env bash
# Demo wrapper for the README VHS recording. Runs the real unseal CLI but filters
# pdfjs-dist's internal "Warning:" chatter from stdout so the GIF shows only the
# tool's own output. Does NOT alter unseal's behavior or exit codes.
#
# Usage: scripts/demo-run.sh <args...>   (e.g. scripts/demo-run.sh audit assets/secret.pdf)

set -o pipefail
node dist/cli.js "$@" 2>/dev/null | grep -v -E '^Warning:' || true
