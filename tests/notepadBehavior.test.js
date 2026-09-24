// @vitest-environment happy-dom
// Characterization tests: pin down Notepad behaviour through its UI, so refactors can't change it
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import Notepad from '../src/components/Notepad.vue'

function mountNotepad(content) {
  const tab = reactive({ id: 't1', title: 'T', content })
  const wrapper = mount(Notepad, {
    props: { tab, 'onUpdate:content': (value) => (tab.content = value) },
    attachTo: document.body
  })
  return { tab, wrapper }
}

async function typeInto(wrapper, value, caret = value.length) {
  const textarea = wrapper.find('textarea')
  textarea.element.value = value
  textarea.element.setSelectionRange(caret, caret)
  await textarea.trigger('input')
  await textarea.trigger('keyup')
  await nextTick()
}

const press = (wrapper, key, extra = {}) => wrapper.find('textarea').trigger('keydown', { key, ...extra })

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('Notepad behaviour', () => {
  it('undoes and redoes edits with Ctrl+Z and Ctrl+Y', async () => {
    vi.useFakeTimers()
    const { tab, wrapper } = mountNotepad('a = 1')
    await typeInto(wrapper, 'a = 1\nb = 2')
    vi.advanceTimersByTime(400) // history groups keystrokes for 300 ms
    await press(wrapper, 'z', { ctrlKey: true })
    expect(tab.content).toBe('a = 1')
    await press(wrapper, 'y', { ctrlKey: true })
    expect(tab.content).toBe('a = 1\nb = 2')
    wrapper.unmount()
  })

  it('suggests variables and inserts one with Tab', async () => {
    const { tab, wrapper } = mountNotepad('salary = 5000\n')
    await typeInto(wrapper, 'salary = 5000\nsal')
    expect(wrapper.find('.autocomplete-menu').exists()).toBe(true)
    expect(wrapper.find('.ac-item.active .ac-name').text()).toBe('salary')
    await press(wrapper, 'Tab')
    await vi.waitFor(() => expect(tab.content).toBe('salary = 5000\nsalary'))
    wrapper.unmount()
  })

  it('lets Enter start a new line unless a suggestion was chosen with the arrows', async () => {
    const { tab, wrapper } = mountNotepad('')
    await typeInto(wrapper, '5 km')
    const enter = await wrapper.find('textarea').trigger('keydown', { key: 'Enter' })
    expect(enter).toBeUndefined()
    expect(wrapper.find('.autocomplete-menu').exists()).toBe(false)
    expect(tab.content).toBe('5 km')

    await typeInto(wrapper, '5 km')
    await press(wrapper, 'ArrowDown')
    await press(wrapper, 'Enter')
    await vi.waitFor(() => expect(tab.content).not.toBe('5 km'))
    wrapper.unmount()
  })

  it('inserts a reference to a line from its result row', async () => {
    const { tab, wrapper } = mountNotepad('a = 5\nb = ')
    const textarea = wrapper.find('textarea').element
    textarea.setSelectionRange(10, 10)
    await wrapper.findAll('.row-insert-ref')[0].trigger('click')
    await vi.waitFor(() => expect(tab.content).toBe('a = 5\nb = #1'))
    wrapper.unmount()
  })

  it('highlights the lines the edited line reads', async () => {
    const { wrapper } = mountNotepad('a = 1\nb = 2\na + b')
    await wrapper.find('textarea').trigger('focus')
    await typeInto(wrapper, 'a = 1\nb = 2\na + b')
    const targets = wrapper.findAll('.gutter .g-num').map((g) => g.classes().includes('is-ref-target'))
    expect(targets).toEqual([true, true, false])
    wrapper.unmount()
  })

  it('folds a section, hiding its lines and making the text read-only', async () => {
    const { wrapper } = mountNotepad('=== A ===\nx = 1\ny = 2\n=== B ===\nz = 3')
    expect(wrapper.findAll('.gutter .g-num')).toHaveLength(5)
    await wrapper.find('.btn-fold').trigger('click')
    expect(wrapper.findAll('.gutter .g-num')).toHaveLength(3)
    expect(wrapper.find('textarea').attributes('readonly')).toBeDefined()
    await wrapper.find('.btn-fold').trigger('click')
    expect(wrapper.findAll('.gutter .g-num')).toHaveLength(5)
    expect(wrapper.find('textarea').attributes('readonly')).toBeUndefined()
    wrapper.unmount()
  })
})
