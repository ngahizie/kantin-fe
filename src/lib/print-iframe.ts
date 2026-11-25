/**
 * Mencetak dokumen HTML lengkap melalui iframe tersembunyi tanpa mengganggu tampilan halaman utama.
 */
export function printHtmlInHiddenIframe(
  html: string,
  frameId = 'receipt-print-iframe'
): void {
  const existingFrame = document.getElementById(frameId)
  if (existingFrame) {
    existingFrame.remove()
  }

  const iframe = document.createElement('iframe')
  iframe.id = frameId
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) return

  doc.open()
  doc.write(html)
  doc.close()

  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => {
      iframe.remove()
    }, 3000)
  }, 250)
}
