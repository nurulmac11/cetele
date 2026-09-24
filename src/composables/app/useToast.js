import { ref } from 'vue'

const TOAST_MS = 2200

// A short message at the bottom of the screen, also announced to screen readers
// (App.vue renders it inside a role="status" live region)
export function useToast() {
  const toastMessage = ref('')
  const toastId = ref(0) // changes per message, so the banner re-animates
  let hideTimer = null
  let showTimer = null

  function showToast(message) {
    clearTimeout(hideTimer)
    clearTimeout(showTimer)
    const display = () => {
      toastMessage.value = message
      toastId.value++
      hideTimer = setTimeout(() => {
        toastMessage.value = ''
      }, TOAST_MS)
    }
    // Screen readers only announce changed text, so clear an identical message briefly first
    if (toastMessage.value === message) {
      toastMessage.value = ''
      showTimer = setTimeout(display, 60)
    } else {
      display()
    }
  }

  return { toastMessage, toastId, showToast }
}
