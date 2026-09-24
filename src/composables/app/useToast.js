import { ref } from 'vue'

const TOAST_MS = 2200

// A short message at the bottom of the screen
export function useToast() {
  const toastMessage = ref('')
  let timer = null

  function showToast(message) {
    toastMessage.value = message
    clearTimeout(timer)
    timer = setTimeout(() => {
      toastMessage.value = ''
    }, TOAST_MS)
  }

  return { toastMessage, showToast }
}
