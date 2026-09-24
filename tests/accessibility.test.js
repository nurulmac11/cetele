// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import Notepad from '../src/components/Notepad.vue'
import { useToast } from '../src/composables/app/useToast.js'

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('Screen reader support', () => {
  it('re-announces a repeated toast by clearing it first', () => {
    vi.useFakeTimers()
    const { toastMessage, showToast } = useToast()
    showToast('Copied')
    expect(toastMessage.value).toBe('Copied')
    showToast('Copied')
    expect(toastMessage.value).toBe('') // changed text is what screen readers announce
    vi.advanceTimersByTime(100)
    expect(toastMessage.value).toBe('Copied')
  })

  it('announces the result of the line being edited', async () => {
    vi.useFakeTimers()
    const tab = reactive({ id: 't', title: 'T', content: 'rent = 1000\nfood = 250\nrent + food\n5 to foo' })
    const wrapper = mount(Notepad, { props: { tab }, attachTo: document.body })
    const textarea = wrapper.find('textarea')
    const live = () => wrapper.find('[role="status"]').text()

    await textarea.trigger('focus')
    textarea.element.setSelectionRange(26, 26) // on line 3
    await textarea.trigger('keyup')
    vi.advanceTimersByTime(700)
    await nextTick()
    expect(live()).toBe('Line 3: 1,250')

    textarea.element.setSelectionRange(tab.content.length, tab.content.length) // line 4
    await textarea.trigger('keyup')
    vi.advanceTimersByTime(700)
    await nextTick()
    expect(live()).toBe('Line 4: error, Cannot convert to foo')
    wrapper.unmount()
  })

  it('labels result rows with their line and position', async () => {
    const tab = reactive({ id: 't', title: 'T', content: 'a = 1\nb = 2' })
    const wrapper = mount(Notepad, { props: { tab }, attachTo: document.body })
    const list = wrapper.find('.results')
    expect(list.attributes('role')).toBe('list')
    const rows = list.findAll('[role="listitem"]')
    expect(rows[1].attributes('aria-posinset')).toBe('2')
    expect(rows[1].attributes('aria-setsize')).toBe('2')
    expect(rows[1].find('.sr-only').text()).toBe('Line 2:')
    wrapper.unmount()
  })
})
