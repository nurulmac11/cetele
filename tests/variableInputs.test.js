// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { evaluateAll } from '../src/services/evaluator.js'
import { getVariableInputs } from '../src/services/variableInputs.js'
import Notepad from '../src/components/Notepad.vue'

const DOC = [
  'ek_hesap_taksit = 1000',
  'qnb_kart_borcu = 2000',
  'garanti_kart = 500 + 250',
  'kredi_taksit = ek_hesap_taksit * 2',
  'bu_ay_borclar = ek_hesap_taksit + qnb_kart_borcu + garanti_kart + kredi_taksit'
].join('\n')

function inputsOf(doc, name, atLine, isDefinition) {
  const result = getVariableInputs(doc.split('\n'), evaluateAll(doc).rendered, name, atLine, isDefinition)
  return (
    result && { ...result, rows: result.rows.map((r) => `${' '.repeat(r.depth)}${r.label}${r.repeated ? '*' : ''}`) }
  )
}

describe('Variable inputs', () => {
  it('lists the variables a variable is calculated from, and theirs in turn', () => {
    const res = inputsOf(DOC, 'bu_ay_borclar', 4, true)
    expect(res.lineIdx).toBe(4)
    expect(res.rows).toEqual([
      'ek_hesap_taksit',
      'qnb_kart_borcu',
      'garanti_kart',
      'kredi_taksit',
      ' ek_hesap_taksit*' // already listed above
    ])
  })

  it('uses the assignment in effect where the variable is read', () => {
    const doc = 'a = 1\nb = a + 1\nb = 5\nc = b * 2\nb'
    expect(inputsOf(doc, 'b', 3).lineIdx).toBe(2)
    expect(inputsOf(doc, 'b', 3).rows).toEqual([])
    expect(inputsOf(doc, 'b', 1, true).rows).toEqual(['a'])
  })

  it('names line references by line number', () => {
    const res = inputsOf('10 + 5\nx = #1 * 2', 'x', 1, true)
    expect(res.rows).toEqual(['#1'])
  })

  it('returns nothing for names that are not variables', () => {
    expect(inputsOf(DOC, 'nothing', 4)).toBeNull()
  })
})

describe('Clicking a variable in the editor', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows its inputs instead of suggesting the same name', async () => {
    const tab = reactive({ id: 't1', title: 'T', content: DOC })
    const wrapper = mount(Notepad, { props: { tab }, attachTo: document.body })
    const textarea = wrapper.find('textarea')
    const caret = DOC.lastIndexOf('bu_ay_bor') + 5
    textarea.element.focus()
    textarea.element.setSelectionRange(caret, caret)
    await textarea.trigger('click')
    await nextTick()

    expect(wrapper.find('.autocomplete-menu').exists()).toBe(false)
    const labels = wrapper.findAll('.ip-label').map((el) => el.text())
    expect(labels).toEqual(['ek_hesap_taksit', 'qnb_kart_borcu', 'garanti_kart', 'kredi_taksit', 'ek_hesap_taksit'])

    await textarea.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.inputs-panel').exists()).toBe(false)
    wrapper.unmount()
  })
})
