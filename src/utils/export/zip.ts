/** Escritor ZIP mínimo (método «store», sin compresión) suficiente para contenedores OOXML como XLSX. */
export interface ZipEntry { name: string; data: Uint8Array }

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

export function buildZip(entries: ZipEntry[], when: Date): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder()
  const dosTime = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1)
  const dosDate = ((Math.max(when.getFullYear(), 1980) - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate()

  const prepared = entries.map((e) => ({ ...e, nameBytes: enc.encode(e.name), crc: crc32(e.data) }))
  const localSize = prepared.reduce((n, e) => n + 30 + e.nameBytes.length + e.data.length, 0)
  const centralSize = prepared.reduce((n, e) => n + 46 + e.nameBytes.length, 0)
  const out = new Uint8Array(localSize + centralSize + 22)
  const view = new DataView(out.buffer)
  let p = 0
  const offsets: number[] = []

  for (const e of prepared) {
    offsets.push(p)
    view.setUint32(p, 0x04034b50, true)
    view.setUint16(p + 4, 20, true) // versión necesaria
    view.setUint16(p + 6, 0x0800, true) // nombres en UTF-8
    view.setUint16(p + 8, 0, true) // store
    view.setUint16(p + 10, dosTime, true)
    view.setUint16(p + 12, dosDate, true)
    view.setUint32(p + 14, e.crc, true)
    view.setUint32(p + 18, e.data.length, true)
    view.setUint32(p + 22, e.data.length, true)
    view.setUint16(p + 26, e.nameBytes.length, true)
    view.setUint16(p + 28, 0, true)
    out.set(e.nameBytes, p + 30)
    out.set(e.data, p + 30 + e.nameBytes.length)
    p += 30 + e.nameBytes.length + e.data.length
  }

  const centralStart = p
  prepared.forEach((e, i) => {
    view.setUint32(p, 0x02014b50, true)
    view.setUint16(p + 4, 20, true) // creada con
    view.setUint16(p + 6, 20, true) // versión necesaria
    view.setUint16(p + 8, 0x0800, true)
    view.setUint16(p + 10, 0, true)
    view.setUint16(p + 12, dosTime, true)
    view.setUint16(p + 14, dosDate, true)
    view.setUint32(p + 16, e.crc, true)
    view.setUint32(p + 20, e.data.length, true)
    view.setUint32(p + 24, e.data.length, true)
    view.setUint16(p + 28, e.nameBytes.length, true)
    view.setUint32(p + 42, offsets[i], true)
    out.set(e.nameBytes, p + 46)
    p += 46 + e.nameBytes.length
  })

  view.setUint32(p, 0x06054b50, true)
  view.setUint16(p + 8, prepared.length, true)
  view.setUint16(p + 10, prepared.length, true)
  view.setUint32(p + 12, p - centralStart, true)
  view.setUint32(p + 16, centralStart, true)
  return out
}
