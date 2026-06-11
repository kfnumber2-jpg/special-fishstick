// Thin websocket wrapper. Same-origin /ws in production; vite proxies it to
// the game server during dev.

export type ServerMsg = Record<string, unknown> & { t: string }

export class Net {
  private ws: WebSocket | null = null
  private handlers = new Map<string, ((m: ServerMsg) => void)[]>()
  onclose: (() => void) | null = null

  connect(name: string, room: string): Promise<void> {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    this.ws = new WebSocket(`${proto}://${location.host}/ws`)
    return new Promise((resolve, reject) => {
      this.ws!.onopen = () => {
        this.send({ t: 'join', name, room })
        resolve()
      }
      this.ws!.onerror = () => reject(new Error('connection failed'))
      this.ws!.onmessage = (ev) => {
        let msg: ServerMsg
        try {
          msg = JSON.parse(ev.data)
        } catch {
          return
        }
        for (const h of this.handlers.get(msg.t) ?? []) h(msg)
      }
      this.ws!.onclose = () => this.onclose?.()
    })
  }

  on(type: string, handler: (m: ServerMsg) => void) {
    const list = this.handlers.get(type) ?? []
    list.push(handler)
    this.handlers.set(type, list)
  }

  send(msg: Record<string, unknown>) {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(msg))
  }
}
