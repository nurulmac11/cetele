export function encodeSharePayload(tab) {
  if (!tab) return ''
  const payload = {
    title: tab.title || 'Untitled',
    content: tab.content || ''
  }
  try {
    const json = JSON.stringify(payload)
    const encoded = btoa(encodeURIComponent(json))
    return `${window.location.origin}${window.location.pathname}#doc=${encoded}`
  } catch (err) {
    console.error('Error encoding share link:', err)
    return ''
  }
}

export function decodeSharePayload() {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash
  if (!hash || !hash.includes('#doc=')) return null

  try {
    const rawPayload = hash.split('#doc=')[1]
    if (!rawPayload) return null
    const decodedJson = decodeURIComponent(atob(rawPayload))
    const parsed = JSON.parse(decodedJson)

    if (parsed && (typeof parsed.content === 'string' || typeof parsed.text === 'string')) {
      return {
        title: parsed.title || 'Shared Tab',
        content: parsed.content !== undefined ? parsed.content : parsed.text
      }
    }
  } catch (err) {
    console.warn('Could not parse share URL payload:', err)
  }

  return null
}
