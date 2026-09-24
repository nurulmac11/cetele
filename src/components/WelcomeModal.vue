<template>
  <Teleport to="body">
    <Transition name="welcome-fade">
      <div v-if="isOpen" class="welcome-overlay" @click.self="handleClose">
        <div
          ref="dialogRef"
          class="welcome-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabindex="-1"
        >
          <!-- Top Right Controls (Language Selector + Close Button) -->
          <div class="header-top-actions">
            <!-- Language Selector Dropdown -->
            <WelcomeLanguagePicker ref="languagePickerRef" v-model="currentLang" />

            <!-- Close Button -->
            <button
              class="btn-close"
              :title="t.actions.closeTooltip"
              :aria-label="t.actions.closeAria"
              @click="handleClose"
            >
              <X class="icon-close" />
            </button>
          </div>

          <!-- Top Brand Header -->
          <div class="welcome-header">
            <div class="brand-badge">
              <div class="mark-box">
                <span class="mark">Σ=</span>
              </div>
              <span class="brand-name">çetele</span>
            </div>

            <h2 id="modal-title" class="welcome-headline">
              <template v-for="(fragment, index) in t.headlineFragments" :key="index">
                <span v-if="fragment.type === 'teal'" class="highlight-teal">{{ fragment.value }}</span>
                <span v-else-if="fragment.type === 'purple'" class="highlight-purple">{{ fragment.value }}</span>
                <template v-else>{{ fragment.value }}</template>
              </template>
            </h2>

            <p class="welcome-subheadline">
              {{ t.subheadline }}
            </p>
          </div>

          <!-- 3-Step Walkthrough Flow Grid -->
          <WelcomeSteps :t="t" />

          <!-- Bottom Feature Highlights Grid -->
          <WelcomeFeatures :t="t" />

          <!-- Footer Action CTA Buttons -->
          <div class="welcome-actions">
            <button class="btn-primary-cta" @click="handleTryYourself">
              <span>{{ t.actions.tryYourself }}</span>
              <ArrowRight class="btn-cta-icon" />
            </button>

            <button class="btn-skip-tour" @click="handleClose">
              {{ t.actions.skipTour }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useModalA11y } from '../composables/useModalA11y.js'
import { X, ArrowRight } from '@lucide/vue'
import { detectBrowserLanguage, getWelcomeTranslation } from '../i18n/welcomeTranslations.js'
import WelcomeLanguagePicker from './welcome/WelcomeLanguagePicker.vue'
import WelcomeSteps from './welcome/WelcomeSteps.vue'
import WelcomeFeatures from './welcome/WelcomeFeatures.vue'

const props = defineProps({
  isOpen: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'try-yourself'])

const currentLang = ref(detectBrowserLanguage())
const t = computed(() => getWelcomeTranslation(currentLang.value))
const languagePickerRef = ref(null)

function handleClose() {
  languagePickerRef.value?.close()
  emit('close')
}

function handleTryYourself() {
  languagePickerRef.value?.close()
  emit('try-yourself')
}

// Escape closes the language menu first, then the dialog
const dialogRef = ref(null)
useModalA11y(
  () => props.isOpen,
  dialogRef,
  () => {
    if (languagePickerRef.value?.isOpen) languagePickerRef.value.close()
    else handleClose()
  }
)
</script>

<style scoped>
.welcome-fade-enter-active,
.welcome-fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.welcome-fade-enter-from,
.welcome-fade-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

.welcome-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(4, 8, 15, 0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow-y: auto;
}

.welcome-modal {
  position: relative;
  width: 100%;
  max-width: 980px;
  background: #0b1320;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 38px 40px 32px;
  box-shadow:
    0 30px 60px -12px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(22, 217, 196, 0.08),
    inset 0 1px 1px rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 28px;
  margin: auto;
}

.header-top-actions {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10;
}

.btn-close {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.icon-close {
  width: 16px;
  height: 16px;
}

.welcome-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
}

.brand-badge {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mark-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 9px;
  border-radius: 8px;
  border: 1.5px solid #16d9c4;
  background: rgba(22, 217, 196, 0.08);
  box-shadow: 0 0 12px rgba(22, 217, 196, 0.18);
}

.mark {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 15px;
  color: #16d9c4;
  letter-spacing: -0.5px;
}

.brand-name {
  font-size: 25px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.5px;
}

.welcome-headline {
  font-size: 32px;
  font-weight: 700;
  color: #ffffff;
  margin: 2px 0 0;
  letter-spacing: -0.5px;
  line-height: 1.25;
}

.highlight-teal {
  color: #16d9c4;
}

.highlight-purple {
  color: #9b8afb;
}

.welcome-subheadline {
  font-size: 14.5px;
  color: #94a3b8;
  max-width: 560px;
  margin: 0;
  line-height: 1.5;
  font-weight: 400;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.85);
  }
}

.welcome-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}

.btn-primary-cta {
  width: 100%;
  max-width: 300px;
  height: 46px;
  border-radius: 12px;
  border: none;
  background: #16d9c4;
  color: #080f1a;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 8px 24px -4px rgba(22, 217, 196, 0.4);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-primary-cta:hover {
  background: #21e6d0;
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -4px rgba(22, 217, 196, 0.55);
}

.btn-primary-cta:active {
  transform: translateY(0);
}

.btn-cta-icon {
  width: 18px;
  height: 18px;
  transition: transform 0.2s ease;
}

.btn-primary-cta:hover .btn-cta-icon {
  transform: translateX(3px);
}

.btn-skip-tour {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.2s ease;
}

.btn-skip-tour:hover {
  color: #ffffff;
  text-decoration: underline;
}

@media (max-width: 860px) {
  .welcome-modal {
    padding: 28px 20px 24px;
    gap: 20px;
  }

  .welcome-headline {
    font-size: 24px;
  }
}
</style>
