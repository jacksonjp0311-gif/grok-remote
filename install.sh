#!/usr/bin/env bash
# Grok Remote — install script
# The front door. Clean, quiet, walks you through it.

set -e

echo ""
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  G R O K   R E M O T E"
echo "  install"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ! command -v node &>/dev/null; then
  echo "  ✗ node not found. install node.js and retry."
  exit 1
fi
echo "  ✓ node found"

PLUGIN_DIR="$HOME/.grok/plugins/grok-remote"
mkdir -p "$PLUGIN_DIR/hooks" "$PLUGIN_DIR/mcp"
cp -r plugin/* "$PLUGIN_DIR/"
echo "  ✓ plugin dropped to $PLUGIN_DIR"

if command -v grok &>/dev/null; then
  grok plugin install "$PLUGIN_DIR" --trust 2>/dev/null || true
  echo "  ✓ plugin registered"
else
  echo "  – grok not on path. run 'grok plugin install $PLUGIN_DIR --trust' after install."
fi

RELAY_URL="${RELAY_URL:-http://localhost:3001}"
echo ""
echo "  relay url: $RELAY_URL"
echo ""
echo "  next:"
echo "    1. start the relay:  node relay/server.js"
echo "    2. add the url at grok.com/connectors"
echo "    3. open grok build. the plugin loads."
echo ""
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
