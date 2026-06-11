#!/bin/bash
# THE BACKROOMS — double-click this file on a Mac to play.
# It installs everything the first time, then starts the game and
# opens it in your browser.
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "First-time setup (about a minute)..."
  npm install --no-fund --no-audit
fi
if [ ! -f dist/index.html ]; then
  echo "Building the game..."
  npm run build
fi

# figure out the address phones on the same Wi-Fi can use
IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')

echo ""
echo "==============================================="
echo "  THE BACKROOMS is running."
echo ""
echo "  Play on this computer:  http://localhost:8787"
if [ -n "$IP" ]; then
  echo "  iPhone / iPad (same Wi-Fi):  http://$IP:8787"
fi
echo ""
echo "  Friends join with the 4-letter room code"
echo "  shown at the top of your screen."
echo ""
echo "  Press Ctrl+C in this window to stop."
echo "==============================================="
echo ""

# open the browser after the server is up
( sleep 2 && (open "http://localhost:8787" 2>/dev/null || xdg-open "http://localhost:8787" 2>/dev/null) ) &
node server/server.js
