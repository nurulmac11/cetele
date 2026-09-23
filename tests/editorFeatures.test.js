import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { evaluateAll } from '../src/services/evaluator.js'
import { getCompletions, UNITS, FUNCTIONS } from '../src/services/completions.js'
import { searchPalette } from '../src/services/paletteSearch.js'
import CommandPalette from '../src/components/CommandPalette.vue'

describe('Line dependencies', () => {
  it('records the lines each result reads', () => {
    const doc = [
      'rent = 1000',
      'food = 300',
      'rent + food',
      '#1 * 2',
      'prev + 1',
      'start = today',
      'start + 3 days'
    ].join('\n')
    const deps = evaluateAll(doc).rendered.map((r) => r.deps || [])
    expect(deps[2]).toEqual([0, 1]) // variables rent and food
    expect(deps[3]).toEqual([0]) // #1
    expect(deps[4]).toEqual([3]) // prev
    expect(deps[6]).toEqual([5]) // date variable
    expect(deps[0]).toEqual([])
  })

  it('points at the latest assignment of a variable', () => {
    const deps = evaluateAll('x = 1\nx = 2\nx * 10').rendered[2].deps
    expect(deps).toEqual([1])
  })
})

describe('Autocomplete', () => {
  const labels = (...args) => getCompletions(...args).map((c) => c.label)

  it('suggests variables, functions and keywords while writing an expression', () => {
    const vars = [{ name: 'salary', value: '5,000' }]
    expect(labels('sa', 'x = ', vars)).toContain('salary')
    expect(labels('lo', '')).toContain('loan()')
    expect(labels('to', '')).toContain('today')
  })

  it('suggests units and currencies after a number or after to/in', () => {
    expect(labels('us', '100 ')[0]).toBe('usd')
    expect(labels('li', '5 ')).toContain('liter')
    const afterTo = getCompletions('mi', '12 km to ')
    expect(afterTo.map((c) => c.label)).toContain('miles')
    expect(afterTo.every((c) => c.kind === 'currency' || c.kind === 'unit')).toBe(true)
  })

  it('suggests Turkish gold phrases', () => {
    expect(labels('gr', '5 ')).toContain('gram altın')
    expect(labels('çe', '1 ')).toContain('çeyrek altın')
  })

  it('places the cursor inside the brackets for functions', () => {
    const [loan] = getCompletions('loa', '')
    expect(loan.insert).toBe('loan()')
    expect(loan.caretOffset).toBe(-1)
  })

  it('needs two characters and skips exact matches', () => {
    expect(getCompletions('k', '5 ')).toEqual([])
    expect(labels('km', '5 ')).not.toContain('km')
  })

  it('only suggests units the calculator understands', () => {
    for (const { label } of UNITS) {
      const [line] = evaluateAll(`1 ${label}`).rendered
      expect(line.cls, `1 ${label}: ${line.error}`).not.toBe('err')
    }
  })

  it('only suggests functions the calculator understands', () => {
    const args = {
      loan: '1000, 5%, 12',
      pmt: '1%, 12, 1000',
      compound: '1000, 5%, 1',
      round: '4.567, 2',
      pow: '2, 3',
      gcd: '4, 6',
      lcm: '4, 6',
      min: '4, 2',
      max: '4, 2',
      sum: '4, 2',
      avg: '4, 2',
      average: '4, 2',
      median: '4, 2'
    }
    for (const { label } of FUNCTIONS) {
      const [line] = evaluateAll(`${label}(${args[label] || '0.5'})`).rendered
      expect(line.cls, `${label}(): ${line.error}`).not.toBe('err')
    }
  })
})

describe('Command palette search', () => {
  const tabs = [
    { id: 'a', title: 'Budget', content: 'rent = 1500\nfood = 400' },
    { id: 'b', title: 'Trip', content: 'hotel = 300 eur\nrent a car = 80' }
  ]
  const commands = [
    { id: 'new-tab', label: 'New tab' },
    { id: 'theme', label: 'Switch to dark theme', keywords: 'dark light mode' }
  ]

  it('finds lines in every tab', () => {
    const { lines } = searchPalette('rent', { tabs, commands })
    expect(lines.map((l) => [l.tabId, l.line])).toEqual([
      ['a', 0],
      ['b', 1]
    ])
    expect(lines[1].matchStart).toBe(0)
  })

  it('matches tabs by title and commands by word prefixes and keywords', () => {
    expect(searchPalette('trip', { tabs, commands }).tabs.map((t) => t.id)).toEqual(['b'])
    expect(searchPalette('new', { tabs, commands }).commands.map((c) => c.id)).toEqual(['new-tab'])
    expect(searchPalette('light', { tabs, commands }).commands.map((c) => c.id)).toEqual(['theme'])
  })

  it('lists everything but lines when the query is empty', () => {
    const res = searchPalette('', { tabs, commands })
    expect(res.tabs).toHaveLength(2)
    expect(res.commands).toHaveLength(2)
    expect(res.lines).toEqual([])
  })

  it('renders', async () => {
    const html = await renderToString(
      createSSRApp({ render: () => h(CommandPalette, { isOpen: true, tabs, commands, activeTabId: 'a' }) })
    )
    expect(html).toContain('role="combobox"')
    expect(html).toContain('Budget')
    expect(html).toContain('New tab')
  })
})
