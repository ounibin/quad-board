import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const S = 1024
const buf = Buffer.alloc(S * S * 4)

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

function roundRectDistance(x, y, x0, y0, x1, y1, r) {
  const cx = Math.min(Math.max(x, x0 + r), x1 - r)
  const cy = Math.min(Math.max(y, y0 + r), y1 - r)
  return Math.hypot(x - cx, y - cy) - r
}

function paint(x, y, color) {
  if (x < 0 || y < 0 || x >= S || y >= S) return
  const i = (y * S + x) * 4
  const [r, g, b] = color
  const a = color[3] === undefined ? 255 : color[3]
  const ia = buf[i + 3] / 255
  const na = a / 255
  const outA = na + ia * (1 - na)
  if (outA <= 0) return
  buf[i] = Math.round((r * na + buf[i] * ia * (1 - na)) / outA)
  buf[i + 1] = Math.round((g * na + buf[i + 1] * ia * (1 - na)) / outA)
  buf[i + 2] = Math.round((b * na + buf[i + 2] * ia * (1 - na)) / outA)
  buf[i + 3] = Math.round(outA * 255)
}

const tiles = [
  { x: 188, y: 188, color: '#E24B4A' },
  { x: 536, y: 188, color: '#378ADD' },
  { x: 188, y: 536, color: '#EF9F27' },
  { x: 536, y: 536, color: '#B4B2A9' }
]

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const d = roundRectDistance(x + 0.5, y + 0.5, 40, 40, S - 40, S - 40, 210)
    if (d <= 0) paint(x, y, hex('#FFFFFF'))
    for (const t of tiles) {
      const td = roundRectDistance(x + 0.5, y + 0.5, t.x, t.y, t.x + 300, t.y + 300, 68)
      if (td <= 0) paint(x, y, hex(t.color))
    }
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crcTable = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crcTable[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const b of body) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0)
  return Buffer.concat([len, body, crcBuf])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(S, 0)
ihdr.writeUInt32BE(S, 4)
ihdr[8] = 8
ihdr[9] = 6
ihdr[10] = 0
ihdr[11] = 0
ihdr[12] = 0

const raw = Buffer.alloc(S * (S * 4 + 1))
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0
  buf.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4)
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
])

writeFileSync('app-icon.png', png)
console.log('app-icon.png written', png.length)
