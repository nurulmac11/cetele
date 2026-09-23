import { describe, it, expect } from 'vitest'
import { getFormattedCopyAllText } from '../src/services/evaluator.js'
import { encodeSharePayload, decodeSharePayload } from '../src/services/shareService.js'

describe('Application Helper Services', () => {
  it('formats Copy All text with implicit results (= result)', () => {
    const input = `rent = 1000\nutilities = 200\ntotal_exp = rent + utilities`
    const formatted = getFormattedCopyAllText(input)
    expect(formatted).toContain('rent = 1000')
    expect(formatted).toContain('utilities = 200')
    expect(formatted).toContain('total_exp = rent + utilities = 1,200')
  })

  it('round-trips a compressed share link', async () => {
    const tab = { title: 'Bütçe 2026 🚀', content: 'maaş = 5000\nkira = 1500\n' + 'x = 1\n'.repeat(500) }
    const url = await encodeSharePayload(tab)
    expect(url).toContain('#z=')
    const hash = url.slice(url.indexOf('#'))
    expect(await decodeSharePayload(hash)).toEqual({ title: tab.title, content: tab.content })
  })

  it('compresses long documents well below the uncompressed size', async () => {
    const tab = { title: 'Long', content: 'rent = 1500\n'.repeat(1000) }
    const url = await encodeSharePayload(tab)
    expect(url.length).toBeLessThan(tab.content.length / 10)
  })

  it('still opens legacy #doc= links', async () => {
    const json = JSON.stringify({ title: 'Budget', content: 'income = 5000' })
    const hash = '#doc=' + btoa(encodeURIComponent(json))
    expect(await decodeSharePayload(hash)).toEqual({ title: 'Budget', content: 'income = 5000' })
  })

  it('refuses share links that expand beyond 1 MB (zip bombs)', async () => {
    const bomb = await encodeSharePayload({ title: 'x', content: '0'.repeat(5_000_000) })
    const hash = bomb.slice(bomb.indexOf('#'))
    expect(hash.length).toBeLessThan(20_000) // tiny link...
    expect(await decodeSharePayload(hash)).toEqual({ tooLarge: true }) // ...not a 5 MB document

    const legacy = '#doc=' + btoa(encodeURIComponent(JSON.stringify({ title: 'x', content: 'a'.repeat(1_100_000) })))
    expect(await decodeSharePayload(legacy)).toEqual({ tooLarge: true })
  })

  it('still opens documents just under the limit', async () => {
    const tab = { title: 'Big', content: 'rent = 1500\n'.repeat(80_000) } // ~960 KB
    const url = await encodeSharePayload(tab)
    expect(await decodeSharePayload(url.slice(url.indexOf('#')))).toEqual(tab)
  })

  it('ignores malformed share links', async () => {
    expect(await decodeSharePayload('#z=not-valid')).toBeNull()
    expect(await decodeSharePayload('#doc=%%%')).toBeNull()
    expect(await decodeSharePayload('#section')).toBeNull()
  })
})
