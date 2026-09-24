import { EXAMPLE_TEXT, MONTHLY_BUDGET_TEXT, LEGACY_DEFAULT_TAB_CONTENTS } from './evaluator/constants.js'

// The example tabs a new visitor starts with
const DEFAULT_TABS = [
  { id: 'tab-1', title: 'Calculator', content: EXAMPLE_TEXT, position: 0, isActive: true },
  { id: 'tab-2', title: 'Monthly Budget', content: MONTHLY_BUDGET_TEXT, position: 1, isActive: false }
]

export const FIRST_DEFAULT_TAB_ID = DEFAULT_TABS[0].id

// Fresh copies, so edits never touch the templates
export function defaultTabs() {
  return DEFAULT_TABS.map((tab) => ({ ...tab }))
}

// A guest example tab nobody has edited; not worth adding to an account that already has tabs
export function isUntouchedDefaultTab(tab) {
  const def = DEFAULT_TABS.find((d) => d.id === tab.id)
  return Boolean(
    def && def.title === tab.title && (def.content === tab.content || LEGACY_DEFAULT_TAB_CONTENTS.includes(tab.content))
  )
}
