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
            <div ref="langDropdownRef" class="lang-selector-wrapper">
              <button
                class="btn-lang-toggle"
                :aria-expanded="isLangMenuOpen"
                aria-haspopup="true"
                title="Change language"
                @click="toggleLangMenu"
              >
                <Globe class="icon-globe" />
                <span class="lang-flag">{{ activeLangMeta.flag }}</span>
                <span class="lang-code">{{ activeLangMeta.code.toUpperCase() }}</span>
                <ChevronDown class="icon-chevron" :class="{ 'is-open': isLangMenuOpen }" />
              </button>

              <Transition name="dropdown-fade">
                <div v-if="isLangMenuOpen" class="lang-dropdown-menu" role="menu">
                  <button
                    v-for="lang in SUPPORTED_LANGUAGES"
                    :key="lang.code"
                    class="lang-option"
                    :class="{ 'is-selected': lang.code === currentLang }"
                    role="menuitem"
                    @click="selectLanguage(lang.code)"
                  >
                    <span class="option-flag">{{ lang.flag }}</span>
                    <span class="option-name">{{ lang.nativeName }}</span>
                    <span v-if="lang.code === currentLang" class="option-check">✓</span>
                  </button>
                </div>
              </Transition>
            </div>

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
          <div class="steps-container">
            <!-- Step 1: Write -->
            <div class="step-card">
              <div class="step-card-header">
                <span class="step-badge">1</span>
                <span class="step-title">{{ t.steps.step1Title }}</span>
              </div>
              <p class="step-desc">{{ t.steps.step1Desc }}</p>

              <div class="code-box">
                <div class="code-line">
                  <span class="line-num">1</span> <span class="syn-comment">{{ t.codeExample.comment }}</span>
                </div>
                <div class="code-line">
                  <span class="line-num">2</span> <span class="syn-var">{{ t.codeExample.hotelVar }}</span>
                  <span class="syn-op">=</span> <span class="syn-num">5,000</span>
                </div>
                <div class="code-line">
                  <span class="line-num">3</span> <span class="syn-var">{{ t.codeExample.foodVar }}</span>
                  <span class="syn-op">=</span> <span class="syn-num">2,000</span>
                </div>
                <div class="code-line">
                  <span class="line-num">4</span> <span class="syn-var">{{ t.codeExample.fuelVar }}</span>
                  <span class="syn-op">=</span> <span class="syn-num">1,500</span>
                </div>
                <div class="code-line">
                  <span class="line-num">5</span> <span class="syn-var">{{ t.codeExample.activitiesVar }}</span>
                  <span class="syn-op">=</span> <span class="syn-num">4,000</span>
                </div>
                <div class="code-line"><span class="line-num">6</span></div>
              </div>
            </div>

            <!-- Curved Flow Arrow 1 -> 2 -->
            <div class="flow-arrow" aria-hidden="true">
              <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M3 5C14 20 28 20 35 9"
                  stroke="#16D9C4"
                  stroke-width="1.8"
                  stroke-dasharray="3 3"
                  stroke-linecap="round"
                />
                <path
                  d="M31 6L37 8L35 14"
                  stroke="#16D9C4"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>

            <!-- Step 2: Calculate -->
            <div class="step-card">
              <div class="step-card-header">
                <span class="step-badge">2</span>
                <span class="step-title">{{ t.steps.step2Title }}</span>
              </div>
              <p class="step-desc">{{ t.steps.step2Desc }}</p>

              <div class="code-box">
                <div class="code-line">
                  <span class="line-num">1</span> <span class="syn-comment">{{ t.codeExample.comment }}</span>
                </div>
                <div class="code-line">
                  <span class="line-num">2</span> <span class="syn-var">{{ t.codeExample.hotelVar }}</span>
                  <span class="syn-op">=</span> <span class="syn-num">5,000</span>
                </div>
                <div class="code-line">
                  <span class="line-num">3</span> <span class="syn-var">{{ t.codeExample.foodVar }}</span>
                  <span class="syn-op">=</span> <span class="syn-num">2,000</span>
                </div>
                <div class="code-line">
                  <span class="line-num">4</span> <span class="syn-var">{{ t.codeExample.fuelVar }}</span>
                  <span class="syn-op">=</span> <span class="syn-num">1,500</span>
                </div>
                <div class="code-line">
                  <span class="line-num">5</span> <span class="syn-var">{{ t.codeExample.activitiesVar }}</span>
                  <span class="syn-op">=</span> <span class="syn-num">4,000</span>
                </div>
                <div class="code-line"><span class="line-num">6</span></div>
                <div class="code-line active-formula">
                  <span class="line-num">7</span> <span class="syn-total">{{ t.codeExample.totalVar }}</span>
                  <span class="syn-op">=</span> <span class="syn-var">{{ t.codeExample.hotelVar }}</span>
                  <span class="syn-op">+</span> <span class="syn-var">{{ t.codeExample.foodVar }}</span>
                  <span class="syn-op">+</span> <span class="syn-var">{{ t.codeExample.fuelVar }}</span>
                  <span class="syn-op">+</span> <span class="syn-var">{{ t.codeExample.activitiesVar }}</span>
                </div>
              </div>
            </div>

            <!-- Curved Flow Arrow 2 -> 3 -->
            <div class="flow-arrow" aria-hidden="true">
              <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M3 5C14 20 28 20 35 9"
                  stroke="#16D9C4"
                  stroke-width="1.8"
                  stroke-dasharray="3 3"
                  stroke-linecap="round"
                />
                <path
                  d="M31 6L37 8L35 14"
                  stroke="#16D9C4"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>

            <!-- Step 3: See Results Instantly -->
            <div class="step-card">
              <div class="step-card-header">
                <span class="step-badge">3</span>
                <span class="step-title">{{ t.steps.step3Title }}</span>
              </div>
              <p class="step-desc">{{ t.steps.step3Desc }}</p>

              <div class="results-box">
                <div class="results-box-header">
                  <span class="results-title">{{ t.results.title }}</span>
                  <span class="live-pill">{{ t.results.live }} <span class="live-dot"></span></span>
                </div>

                <div class="results-body">
                  <div class="res-row">
                    <span class="res-label">{{ t.codeExample.hotelVar }}</span>
                    <span class="res-val">5,000</span>
                  </div>
                  <div class="res-row">
                    <span class="res-label">{{ t.codeExample.foodVar }}</span>
                    <span class="res-val">2,000</span>
                  </div>
                  <div class="res-row">
                    <span class="res-label">{{ t.codeExample.fuelVar }}</span>
                    <span class="res-val">1,500</span>
                  </div>
                  <div class="res-row">
                    <span class="res-label">{{ t.codeExample.activitiesVar }}</span>
                    <span class="res-val">4,000</span>
                  </div>

                  <div class="res-divider"></div>

                  <div class="res-row res-total-row">
                    <span class="res-label-total">{{ t.codeExample.totalVar }}</span>
                    <span class="res-val-total">12,500</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Feature Highlights Grid -->
          <div class="features-grid">
            <div class="feature-item">
              <div class="feature-icon-wrapper">
                <Folder class="feature-icon" />
              </div>
              <div class="feature-info">
                <h4>{{ t.features.sectionsTitle }}</h4>
                <p>{{ t.features.sectionsDesc }}</p>
              </div>
            </div>

            <div class="feature-item">
              <div class="feature-icon-wrapper">
                <Bookmark class="feature-icon" />
              </div>
              <div class="feature-info">
                <h4>{{ t.features.tabsTitle }}</h4>
                <p>{{ t.features.tabsDesc }}</p>
              </div>
            </div>

            <div class="feature-item">
              <div class="feature-icon-wrapper">
                <Zap class="feature-icon" />
              </div>
              <div class="feature-info">
                <h4>{{ t.features.changeTitle }}</h4>
                <p>{{ t.features.changeDesc }}</p>
              </div>
            </div>
          </div>

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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useModalA11y } from '../composables/useModalA11y.js'
import { X, Folder, Bookmark, Zap, ArrowRight, Globe, ChevronDown } from '@lucide/vue'
import { SUPPORTED_LANGUAGES, detectBrowserLanguage, getWelcomeTranslation } from '../i18n/welcomeTranslations.js'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'try-yourself'])

// i18n State
const currentLang = ref(detectBrowserLanguage())
const isLangMenuOpen = ref(false)
const langDropdownRef = ref(null)

const activeLangMeta = computed(() => {
  return SUPPORTED_LANGUAGES.find((l) => l.code === currentLang.value) || SUPPORTED_LANGUAGES[0]
})

const t = computed(() => {
  return getWelcomeTranslation(currentLang.value)
})

function selectLanguage(code) {
  currentLang.value = code
  isLangMenuOpen.value = false
  try {
    localStorage.setItem('cetele_welcome_lang', code)
  } catch (e) {
    // Ignore localStorage write error
  }
}

function toggleLangMenu() {
  isLangMenuOpen.value = !isLangMenuOpen.value
}

function handleClose() {
  isLangMenuOpen.value = false
  emit('close')
}

function handleTryYourself() {
  isLangMenuOpen.value = false
  emit('try-yourself')
}

// Escape closes the language menu first, then the dialog
const dialogRef = ref(null)
useModalA11y(
  () => props.isOpen,
  dialogRef,
  () => {
    if (isLangMenuOpen.value) {
      isLangMenuOpen.value = false
    } else {
      handleClose()
    }
  }
)

function handleClickOutside(e) {
  if (langDropdownRef.value && !langDropdownRef.value.contains(e.target)) {
    isLangMenuOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* Modal Transition Fade & Scale */
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

/* Backdrop Overlay */
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

/* Main Dialog Card */
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

/* Header Top Actions Bar */
.header-top-actions {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10;
}

/* Language Selector */
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

/* Dropdown Menu */
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

/* Dropdown transition */
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

/* Top Close Button */
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

/* Header Section */
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

/* 3 Steps Row Grid - Equal 1:1:1 sizing */
.steps-container {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: stretch;
  gap: 12px;
  width: 100%;
}

.step-card {
  min-width: 0; /* CRITICAL: prevents grid columns from blowing out */
  background: #080f1a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.04);
  transition:
    border-color 0.25s ease,
    transform 0.25s ease;
}

.step-card:hover {
  border-color: rgba(22, 217, 196, 0.25);
  transform: translateY(-2px);
}

.step-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #16d9c4;
  color: #080f1a;
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-title {
  font-size: 14.5px;
  font-weight: 700;
  color: #16d9c4;
  white-space: nowrap;
}

.step-desc {
  font-size: 12px;
  color: #94a3b8;
  margin: 0 0 4px;
  line-height: 1.4;
  height: 32px;
}

/* Curved Flow Arrows */
.flow-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.85;
  margin: 0 -2px;
}

/* Code Editor Boxes */
.code-box {
  flex: 1;
  min-width: 0;
  background: #0c1523;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  line-height: 1.7;
  display: flex;
  flex-direction: column;
}

.code-line {
  white-space: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

.code-line::-webkit-scrollbar {
  display: none;
}

.line-num {
  color: rgba(255, 255, 255, 0.3);
  user-select: none;
  width: 12px;
  text-align: right;
  flex-shrink: 0;
}

/* Syntax Highlighting */
.syn-comment {
  color: #9b8afb;
  font-weight: 500;
}

.syn-var {
  color: #38bdf8;
}

.syn-op {
  color: #fb923c;
}

.syn-num {
  color: #f59e0b;
  font-weight: 600;
}

.syn-total {
  color: #16d9c4;
  font-weight: 600;
}

.active-formula {
  background: rgba(22, 217, 196, 0.08);
  border-radius: 4px;
  padding: 0 4px;
  margin: 0 -4px;
}

/* Results Box (Step 3) */
.results-box {
  flex: 1;
  min-width: 0;
  background: #0c1523;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.results-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.results-title {
  font-size: 11.5px;
  font-weight: 700;
  color: #ffffff;
}

.live-pill {
  font-size: 9.5px;
  font-weight: 600;
  color: #16d9c4;
  background: rgba(22, 217, 196, 0.12);
  border: 1px solid rgba(22, 217, 196, 0.25);
  padding: 1px 7px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.live-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #16d9c4;
  box-shadow: 0 0 6px #16d9c4;
  animation: pulse-dot 1.8s infinite;
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

.results-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
}

.res-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #94a3b8;
  line-height: 1.6;
}

.res-label {
  color: #94a3b8;
  white-space: nowrap;
}

.res-val {
  color: #16d9c4;
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.res-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 6px 0;
}

.res-total-row {
  font-size: 11.5px;
}

.res-label-total {
  color: #ffffff;
  font-weight: 700;
  white-space: nowrap;
}

.res-val-total {
  color: #16d9c4;
  font-weight: 800;
  font-size: 12.5px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* Feature Highlights Grid */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 16px 4px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.feature-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(22, 217, 196, 0.08);
  border: 1px solid rgba(22, 217, 196, 0.2);
  color: #16d9c4;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feature-icon {
  width: 17px;
  height: 17px;
}

.feature-info h4 {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 2px;
}

.feature-info p {
  font-size: 11.5px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.35;
}

/* Actions Section */
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

/* Responsive Layout */
@media (max-width: 860px) {
  .welcome-modal {
    padding: 28px 20px 24px;
    gap: 20px;
  }

  .welcome-headline {
    font-size: 24px;
  }

  .steps-container {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .flow-arrow {
    transform: rotate(90deg);
    margin: -6px 0;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
