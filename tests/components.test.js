import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import App from '../src/App.vue'
import Notepad from '../src/components/Notepad.vue'
import SavedTabsPage from '../src/components/SavedTabsPage.vue'
import ConfirmDialog from '../src/components/ConfirmDialog.vue'
import { askConfirm, confirmState, settleConfirm } from '../src/services/confirmService.js'

// Server-side rendering runs each component's setup and template, which catches
// missing imports, undefined bindings and template errors without a browser.
const render = (component, props = {}) => renderToString(createSSRApp({ render: () => h(component, props) }))

const doc = [
  '=== Income ===',
  'maaş = 5k usd',
  'bonus = 500 tl',
  'subtotal',
  '12 miles',
  '5 to foo',
  'start = today',
  'end = start + 3 days',
  'end - start',
  'total'
].join('\n')

describe('Components', () => {
  it('renders the whole app', async () => {
    const html = await render(App)
    expect(html).toContain('role="tablist"')
  })

  it('renders results, units, errors and totals in the notepad', async () => {
    const html = await render(Notepad, { tab: { id: 't', title: 'T', content: doc } })
    expect(html).toMatch(/val-num"[^>]*>12<\/span><span class="val-unit"[^>]*>miles/)
    expect(html).toContain('3 days')
    expect(html).toContain('Cannot convert to foo')
    expect(html).toMatch(/total-val[^>]*>[^<]*USD/)
  })

  it('renders the saved library', async () => {
    const html = await render(SavedTabsPage, {
      library: [{ id: '1', title: 'Budget', content: doc, savedAt: new Date().toISOString() }]
    })
    expect(html).toContain('Budget')
  })
})

describe('Confirm dialog', () => {
  it('renders the open request', async () => {
    const answer = askConfirm({ title: 'Delete it?', details: ['Tab A'], confirmLabel: 'Delete', danger: true })
    const html = await render(ConfirmDialog)
    expect(html).toContain('role="alertdialog"')
    expect(html).toContain('Delete it?')
    expect(html).toContain('Tab A')
    settleConfirm(true)
    expect(await answer).toBe(true)
    expect(confirmState.open).toBe(false)
  })

  it('treats a replaced, unanswered request as cancelled', async () => {
    const first = askConfirm({ title: 'First' })
    const second = askConfirm({ title: 'Second' })
    expect(await first).toBe(false)
    settleConfirm(false)
    expect(await second).toBe(false)
  })
})
