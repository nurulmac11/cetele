// @vitest-environment happy-dom
// Characterization tests: pin down App behaviour through its UI, so refactors can't change it
import 'fake-indexeddb/auto'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import App from '../src/App.vue'
import { clearLocalDatabase } from '../src/services/localDb.js'
import { _resetVersionMemory } from '../src/services/versionService.js'

async function mountApp() {
  localStorage.setItem('cetele_welcome_seen', 'true')
  const wrapper = mount(App, { attachTo: document.body })
  await flushPromises()
  await new Promise((r) => setTimeout(r, 20))
  await flushPromises()
  return wrapper
}

const tabTitles = (wrapper) => wrapper.findAll('.tabs-list [role="tab"] .tab-title').map((t) => t.text())
const keydown = async (init) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }))
  await flushPromises()
  await nextTick()
}

beforeEach(async () => {
  // The example tab asks for historical rates; keep tests off the network
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }))
  )
  // Reset through the app's own connection (deleteDatabase is blocked while it is open)
  await clearLocalDatabase()
  _resetVersionMemory()
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('App behaviour', () => {
  it('starts with the two example tabs', async () => {
    const wrapper = await mountApp()
    expect(tabTitles(wrapper)).toEqual(['Calculator', 'Monthly Budget'])
    wrapper.unmount()
  })

  it('creates, closes and reopens tabs', async () => {
    const wrapper = await mountApp()
    await wrapper.find('.btn-add-tab').trigger('click')
    expect(tabTitles(wrapper)).toEqual(['Calculator', 'Monthly Budget', 'Tab 3'])

    await wrapper.findAll('.btn-tab-close').at(-1).trigger('click')
    expect(tabTitles(wrapper)).toEqual(['Calculator', 'Monthly Budget'])

    await keydown({ key: 'T', code: 'KeyT', altKey: true, shiftKey: true })
    expect(tabTitles(wrapper)).toEqual(['Calculator', 'Monthly Budget', 'Tab 3'])

    await keydown({ key: 'n', code: 'KeyN', altKey: true })
    expect(tabTitles(wrapper)).toHaveLength(4)
    wrapper.unmount()
  })

  it('renames a tab', async () => {
    const wrapper = await mountApp()
    await wrapper.findAll('.btn-tab-rename')[0].trigger('click')
    const input = wrapper.find('.tab-title-input')
    await input.setValue('Groceries')
    await input.trigger('keyup', { key: 'Enter' })
    expect(tabTitles(wrapper)[0]).toBe('Groceries')
    wrapper.unmount()
  })

  it('runs commands from the Ctrl+K palette', async () => {
    const wrapper = await mountApp()
    await keydown({ key: 'k', ctrlKey: true })
    expect(wrapper.find('.palette-card').exists()).toBe(true)
    await wrapper.find('.palette-input').setValue('new tab')
    await wrapper.find('.palette-input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.find('.palette-card').exists()).toBe(false)
    expect(tabTitles(wrapper)).toHaveLength(3)
    wrapper.unmount()
  })

  it('asks before clearing a tab', async () => {
    const wrapper = await mountApp()
    const original = wrapper.find('textarea').element.value
    expect(original).toContain('çetele')
    await keydown({ key: 'k', ctrlKey: true })
    await wrapper.find('.palette-input').setValue('clear')
    await wrapper.find('.palette-input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.find('.confirm-card').text()).toContain('Clear this tab?')

    await wrapper.find('.btn-cancel').trigger('click')
    await flushPromises()
    expect(wrapper.find('textarea').element.value).toBe(original)

    await keydown({ key: 'k', ctrlKey: true })
    await wrapper.find('.palette-input').setValue('clear')
    await wrapper.find('.palette-input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    await wrapper.find('.btn-confirm-danger').trigger('click')
    // Clearing first saves a version to IndexedDB
    await vi.waitFor(async () => {
      await nextTick()
      expect(wrapper.find('textarea').element.value).toBe('')
    })
    wrapper.unmount()
  })

  it('opens version history for the active tab', async () => {
    const wrapper = await mountApp()
    await wrapper.find('.save-card').findAll('.btn-action').at(-1).trigger('click')
    await flushPromises()
    expect(wrapper.find('.history-card').text()).toContain('Version history')
    wrapper.unmount()
  })
})
