import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ratesUpdatedAt } from '../services/evaluator.js'

// "5m ago"-style age of the exchange rates, refreshed every minute
export function useRatesAge() {
  const now = ref(Date.now())
  let timer = null
  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now()
    }, 60000)
  })
  onUnmounted(() => clearInterval(timer))

  const ratesAgeText = computed(() => {
    if (!ratesUpdatedAt.value) return 'offline defaults'
    const minutes = Math.floor((now.value - ratesUpdatedAt.value) / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 48) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  })

  const ratesTitle = computed(() =>
    ratesUpdatedAt.value
      ? `Exchange rates updated ${new Date(ratesUpdatedAt.value).toLocaleString()}`
      : 'Live rates have not loaded yet; using built-in approximate rates'
  )

  return { ratesAgeText, ratesTitle }
}
