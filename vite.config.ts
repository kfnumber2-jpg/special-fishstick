import { defineConfig } from 'vite'

// In dev, the game server (server/server.js) runs separately on :8787 and
// vite proxies the websocket to it. In production the game server serves
// the built dist/ folder itself, so client and server share one origin.
export default defineConfig({
  server: {
    host: true,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8787',
        ws: true,
      },
    },
  },
})
