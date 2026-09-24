<template>
  <div ref="rootRef" class="lang-selector-wrapper">
    <button
      class="btn-lang-toggle"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      title="Change language"
      @click="isOpen = !isOpen"
    >
      <Globe class="icon-globe" />
      <span class="lang-flag">{{ activeLangMeta.flag }}</span>
      <span class="lang-code">{{ activeLangMeta.code.toUpperCase() }}</span>
      <ChevronDown class="icon-chevron" :class="{ 'is-open': isOpen }" />
    </button>

    <Transition name="dropdown-fade">
      <div v-if="isOpen" class="lang-dropdown-menu" role="menu">
        <button
          v-for="lang in SUPPORTED_LANGUAGES"
          :key="lang.code"
          class="lang-option"
          :class="{ 'is-selected': lang.code === modelValue }"
          role="menuitem"
          @click="selectLanguage(lang.code)"
        >
          <span class="option-flag">{{ lang.flag }}</span>
          <span class="option-name">{{ lang.nativeName }}</span>
          <span v-if="lang.code === modelValue" class="option-check">✓</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Globe, ChevronDown } from '@lucide/vue'
import { SUPPORTED_LANGUAGES } from '../../i18n/welcomeTranslations.js'

const props = defineProps({
  modelValue: { type: String, required: true } // language code
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const rootRef = ref(null)

const activeLangMeta = computed(
  () => SUPPORTED_LANGUAGES.find((l) => l.code === props.modelValue) || SUPPORTED_LANGUAGES[0]
)

function selectLanguage(code) {
  emit('update:modelValue', code)
  isOpen.value = false
  try {
    localStorage.setItem('cetele_welcome_lang', code)
  } catch (e) {
    // Remembering the choice is optional
  }
}

function close() {
  isOpen.value = false
}

function handleClickOutside(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) close()
}

onMounted(() => window.addEventListener('click', handleClickOutside))
onUnmounted(() => window.removeEventListener('click', handleClickOutside))

// The dialog closes an open menu first when Escape is pressed
defineExpose({ isOpen, close })
</script>

<style scoped>
.lang-selector-wrapper {
  position: relative;
}

.btn-lang-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 10px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-lang-toggle:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.2);
}

.icon-globe {
  width: 14px;
  height: 14px;
  color: #16d9c4;
}

.lang-flag {
  font-size: 14px;
  line-height: 1;
}

.lang-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.icon-chevron {
  width: 12px;
  height: 12px;
  transition: transform 0.2s ease;
}

.icon-chevron.is-open {
  transform: rotate(180deg);
}

.lang-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 160px;
  background: #0d1726;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 6px;
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(22, 217, 196, 0.1);
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 100;
  max-height: 260px;
  overflow-y: auto;
}

.lang-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.lang-option:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.lang-option.is-selected {
  background: rgba(22, 217, 196, 0.12);
  color: #16d9c4;
  font-weight: 600;
}

.option-flag {
  font-size: 15px;
}

.option-name {
  flex: 1;
}

.option-check {
  font-size: 12px;
  color: #16d9c4;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
