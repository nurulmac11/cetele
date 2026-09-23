import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const root = new URL('../', import.meta.url)
const indexHtml = readFileSync(new URL('index.html', root), 'utf8')
const vercel = JSON.parse(readFileSync(new URL('vercel.json', root), 'utf8'))

function findHeader(name) {
  for (const rule of vercel.headers) {
    const header = rule.headers.find((h) => h.key === name)
    if (header) return header.value
  }
  return null
}

describe('Deployment config', () => {
  it('allows every inline script in index.html through the CSP hash list', () => {
    const csp = findHeader('Content-Security-Policy') || findHeader('Content-Security-Policy-Report-Only')
    expect(csp).toBeTruthy()
    const inlineScripts = [...indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
    expect(inlineScripts.length).toBeGreaterThan(0)
    for (const body of inlineScripts) {
      const hash = `'sha256-${createHash('sha256').update(body).digest('base64')}'`
      // If this fails after editing an inline script, put the new hash in vercel.json
      expect(csp).toContain(hash)
    }
  })
})
