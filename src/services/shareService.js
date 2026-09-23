// Share links carry the document in the URL hash, so nothing is sent to a server.
//   #z=<base64url(deflate-raw(json))>   compressed links (current)
//   #doc=<base64(encodeURIComponent(json))>   original uncompressed links, still readable

const COMPRESSED_PREFIX = '#z='
const LEGACY_PREFIX = '#doc='

function bytesToBase64Url(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function pipeThrough(bytes, stream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

function canCompress() {
  return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function'
}

function shareBaseUrl() {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://cetele.online'
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'
  return `${origin}${pathname}`
}

export async function encodeSharePayload(tab) {
  if (!tab) return ''
  const json = JSON.stringify({
    title: tab.title || 'Untitled',
    content: tab.content || ''
  })
  try {
    if (canCompress()) {
      const compressed = await pipeThrough(new TextEncoder().encode(json), new CompressionStream('deflate-raw'))
      return `${shareBaseUrl()}${COMPRESSED_PREFIX}${bytesToBase64Url(compressed)}`
    }
    return `${shareBaseUrl()}${LEGACY_PREFIX}${btoa(encodeURIComponent(json))}`
  } catch (err) {
    console.error('Error encoding share link:', err)
    return ''
  }
}

function toSharedDoc(parsed) {
  if (parsed && (typeof parsed.content === 'string' || typeof parsed.text === 'string')) {
    return {
      title: typeof parsed.title === 'string' && parsed.title ? parsed.title : 'Shared Tab',
      content: typeof parsed.content === 'string' ? parsed.content : parsed.text
    }
  }
  return null
}

// Reads a shared document from a hash (defaults to the current page's hash)
export async function decodeSharePayload(hash = typeof window !== 'undefined' ? window.location.hash : '') {
  if (!hash) return null

  try {
    if (hash.startsWith(COMPRESSED_PREFIX)) {
      if (!canCompress()) return null
      const bytes = base64UrlToBytes(hash.slice(COMPRESSED_PREFIX.length))
      const json = new TextDecoder().decode(await pipeThrough(bytes, new DecompressionStream('deflate-raw')))
      return toSharedDoc(JSON.parse(json))
    }
    if (hash.includes(LEGACY_PREFIX)) {
      const rawPayload = hash.split(LEGACY_PREFIX)[1]
      if (!rawPayload) return null
      return toSharedDoc(JSON.parse(decodeURIComponent(atob(rawPayload))))
    }
  } catch (err) {
    console.warn('Could not parse share URL payload:', err)
  }

  return null
}
