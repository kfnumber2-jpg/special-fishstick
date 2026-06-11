// Boot: Apple-device gate → lobby → connect → game.
import './style.css'
import { Net, type ServerMsg } from './net'
import { startGame } from './game'
import { unlock } from './audio'

// --- Apple exclusive -----------------------------------------------------------
// iPhone / iPad / Mac only. iPadOS reports itself as "Macintosh", which is
// fine — iPads are invited too. `?anydevice=1` is the dev/test backdoor.
function isAppleDevice(): boolean {
  if (new URLSearchParams(location.search).has('anydevice')) return true
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod|Macintosh|Mac OS X/.test(ua)
}

const $ = (id: string) => document.getElementById(id)!

if (!isAppleDevice()) {
  $('lobby').classList.add('hidden')
  $('gate').classList.remove('hidden')
} else {
  setupLobby()
}

function setupLobby() {
  const nameInput = $('name') as HTMLInputElement
  const roomInput = $('room') as HTMLInputElement
  const joinBtn = $('join') as HTMLButtonElement
  nameInput.value = localStorage.getItem('br-name') ?? ''

  if ('ontouchstart' in window && navigator.maxTouchPoints > 0) {
    $('lobby-hint').textContent =
      'left stick move · drag right side to look · push stick to rim to sprint'
  }

  joinBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim() || 'WANDERER'
    localStorage.setItem('br-name', name)
    joinBtn.disabled = true
    joinBtn.textContent = 'DESCENDING…'
    unlock() // audio must start inside a user gesture on iOS

    const net = new Net()
    try {
      await net.connect(name, roomInput.value.trim())
    } catch {
      joinBtn.disabled = false
      joinBtn.textContent = '⚠ CONNECTION FAILED — RETRY'
      return
    }
    net.on('full', () => {
      joinBtn.disabled = false
      joinBtn.textContent = '⚠ ROOM FULL (4 MAX) — RETRY'
    })
    net.on('init', (init: ServerMsg) => {
      $('lobby').classList.add('hidden')
      startGame(net, init, name.toUpperCase())
    })
  })
}
