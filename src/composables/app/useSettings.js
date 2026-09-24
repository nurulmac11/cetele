import { ref, watch } from 'vue'
import { getLocalSettings, saveLocalSettings } from '../../services/localDb.js'

function applyTheme(themeName) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', themeName || 'dark')
  }
}

// User preferences: theme, decimals and sidebar, saved on this device
export function useSettings({ showToast }) {
  const userProfile = ref({ showDecimals: true, theme: 'dark' })
  const showSidebar = ref(true)

  watch(
    () => userProfile.value.theme,
    (theme) => applyTheme(theme)
  )

  async function loadSettings() {
    const settings = await getLocalSettings()
    if (settings) {
      userProfile.value = { showDecimals: true, theme: 'dark', showSidebar: true, ...settings }
      showSidebar.value = userProfile.value.showSidebar !== false
    }
    applyTheme(userProfile.value.theme)
  }

  async function saveProfile(profileData) {
    userProfile.value = { ...userProfile.value, ...profileData }
    applyTheme(userProfile.value.theme)
    try {
      await saveLocalSettings(userProfile.value)
    } catch (err) {
      console.error('Failed to save profile settings:', err)
    }
  }

  function toggleShowDecimals() {
    userProfile.value.showDecimals = !userProfile.value.showDecimals
    saveProfile(userProfile.value)
    showToast(userProfile.value.showDecimals ? 'Decimals Enabled' : 'Decimals Disabled (Whole Numbers)')
  }

  function toggleTheme() {
    const next = userProfile.value.theme === 'dark' ? 'light' : 'dark'
    userProfile.value.theme = next
    saveProfile(userProfile.value)
    showToast(`Switched to ${next === 'dark' ? 'Dark' : 'Light'} Theme`)
  }

  function toggleSidebar() {
    showSidebar.value = !showSidebar.value
    userProfile.value.showSidebar = showSidebar.value
    saveProfile(userProfile.value)
    showToast(showSidebar.value ? 'Right sidebar restored' : 'Calculation area expanded (sidebar hidden)')
  }

  return { userProfile, showSidebar, loadSettings, saveProfile, toggleShowDecimals, toggleTheme, toggleSidebar }
}
