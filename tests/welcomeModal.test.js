// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import WelcomeModal from '../src/components/WelcomeModal.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

const pressEscape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

describe('Welcome dialog', () => {
  it('switches language from the picker', async () => {
    const wrapper = mount(WelcomeModal, { props: { isOpen: true }, attachTo: document.body })
    await nextTick()
    const dialog = () => document.querySelector('.welcome-modal')
    const before = dialog().textContent

    document.querySelector('.btn-lang-toggle').click()
    await nextTick()
    const options = [...document.querySelectorAll('.lang-option')]
    expect(options.length).toBeGreaterThan(1)
    options.find((o) => !o.classList.contains('is-selected')).click()
    await nextTick()

    expect(document.querySelector('.lang-dropdown-menu')).toBeNull()
    expect(dialog().textContent).not.toBe(before)
    wrapper.unmount()
  })

  it('closes the language menu first on Escape, then the dialog', async () => {
    const wrapper = mount(WelcomeModal, { props: { isOpen: true }, attachTo: document.body })
    await nextTick()
    await nextTick()
    document.querySelector('.btn-lang-toggle').click()
    await nextTick()
    expect(document.querySelector('.lang-dropdown-menu')).not.toBeNull()

    pressEscape()
    await nextTick()
    expect(document.querySelector('.lang-dropdown-menu')).toBeNull()
    expect(wrapper.emitted('close')).toBeUndefined()

    pressEscape()
    await nextTick()
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })
})
