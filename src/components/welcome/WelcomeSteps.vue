<template>
  <!-- Three-step walkthrough: write, calculate, see results -->
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
        <path d="M31 6L37 8L35 14" stroke="#16D9C4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
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
        <path d="M31 6L37 8L35 14" stroke="#16D9C4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
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
</template>

<script setup>
defineProps({
  t: { type: Object, required: true } // translations for the chosen language
})
</script>

<style scoped>
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

.flow-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.85;
  margin: 0 -2px;
}

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

@media (max-width: 860px) {
  .steps-container {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .flow-arrow {
    transform: rotate(90deg);
    margin: -6px 0;
  }
}
</style>
