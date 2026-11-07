/** Descarga un Blob como archivo. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Se libera con retraso: revocar de inmediato cancela la descarga en algunos navegadores.
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}
