import { reactive } from 'vue'

const DEFAULTS = {
  title: 'Are you sure?',
  message: '',
  details: [],
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  danger: false
}

// State for the single app-wide ConfirmDialog (mounted in App.vue)
export const confirmState = reactive({ open: false, ...DEFAULTS, resolve: null })

/**
 * Shows the in-app confirmation dialog.
 * @param {{ title?: string, message?: string, details?: string[], confirmLabel?: string, cancelLabel?: string, danger?: boolean }} options
 * @returns {Promise<boolean>} true when the user confirms
 */
export function askConfirm(options = {}) {
  // A newer request replaces an unanswered one, which counts as cancelled
  confirmState.resolve?.(false)
  return new Promise((resolve) => {
    Object.assign(confirmState, DEFAULTS, options, { open: true, resolve })
  })
}

export function settleConfirm(confirmed) {
  const resolve = confirmState.resolve
  confirmState.open = false
  confirmState.resolve = null
  resolve?.(Boolean(confirmed))
}
