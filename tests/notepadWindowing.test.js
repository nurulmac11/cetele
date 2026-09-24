// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import Notepad from '../src/components/Notepad.vue'

const LINE_HEIGHT = 26

function bigTab(count = 2000) {
  return reactive({ id: 't', title: 'T', content: Array.from({ length: count }, (_, i) => `v${i} = ${i}`).join('\n') })
}

const spacerHeights = (el) => [...el.querySelectorAll(':scope > .row-spacer')].map((s) => parseInt(s.style.height, 10))

describe('Notepad row windowing', () => {
  it('draws only the rows near the view, with spacers keeping the full height', async () => {
    const tab = bigTab()
    const wrapper = mount(Notepad, { props: { tab }, attachTo: document.body })
    await nextTick()

    const gutter = wrapper.find('.gutter').element
    const results = wrapper.find('.results').element
    const backdrop = wrapper.find('.editor-backdrop').element
    const rowCounts = [gutter.querySelectorAll('.g-num').length, results.querySelectorAll('.r').length]
    expect(rowCounts[0]).toBeLessThan(200)
    expect(rowCounts[1]).toBe(rowCounts[0])
    expect(backdrop.querySelectorAll('.backdrop-line').length).toBe(rowCounts[0])

    // Every column accounts for all 2000 lines
    for (const el of [gutter, results, backdrop]) {
      const [top, bottom] = spacerHeights(el)
      const drawn = el.querySelectorAll('.g-num, .r, .backdrop-line').length
      expect(top + bottom + drawn * LINE_HEIGHT).toBe(2000 * LINE_HEIGHT)
    }
    wrapper.unmount()
  })

  it('shows the right lines after scrolling', async () => {
    const tab = bigTab()
    const wrapper = mount(Notepad, { props: { tab }, attachTo: document.body })
    await nextTick()

    const textarea = wrapper.find('textarea').element
    textarea.scrollTop = 1500 * LINE_HEIGHT
    await wrapper.find('textarea').trigger('scroll')
    await nextTick()

    const numbers = wrapper.findAll('.g-num .num-text').map((n) => Number(n.text()))
    expect(numbers).toContain(1501)
    expect(numbers).not.toContain(1)
    const firstDrawn = numbers[0] - 1
    expect(spacerHeights(wrapper.find('.gutter').element)[0]).toBe(firstDrawn * LINE_HEIGHT)
    const results = wrapper.findAll('.results .r')
    expect(results.find((r) => r.text().includes('1,500'))).toBeTruthy()
    wrapper.unmount()
  })

  it('updates the visible results when a line is edited', async () => {
    const tab = bigTab(300)
    const wrapper = mount(Notepad, { props: { tab }, attachTo: document.body })
    await nextTick()
    tab.content = tab.content.replace('v0 = 0', 'v0 = 41 + 1')
    await nextTick()
    expect(wrapper.findAll('.results .r')[0].text()).toContain('42')
    wrapper.unmount()
  })
})
