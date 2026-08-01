<template>
  <div class="guide-page">
    <div class="guide-container">
      <header class="guide-header">
        <div class="guide-title-block">
          <div class="brand-badge">
            <BookOpen class="icon" />
          </div>
          <div>
            <h1>çetele Syntax & Grounded Rules Guide</h1>
            <p>Click any snippet to insert it into your active notepad tab immediately.</p>
          </div>
        </div>
        <button class="btn-back" @click="$emit('switch-to-notepad')">
          <ArrowLeft class="icon-sm" /> Back to Calculator
        </button>
      </header>

      <!-- Category Tabs -->
      <nav class="guide-tabs">
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="guide-tab"
          :class="{ active: activeCategory === cat.id }"
          @click="activeCategory = cat.id"
        >
          <component :is="cat.icon" class="icon-sm" />
          <span>{{ cat.label }}</span>
        </button>
      </nav>

      <!-- Search Bar -->
      <div class="search-bar-wrap">
        <Search class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Search syntax rules, currency codes, crypto math, gold rates, unit conversions..."
        />
        <button v-if="searchQuery" class="btn-clear-search" @click="searchQuery = ''">
          <X class="icon-xs" />
        </button>
      </div>

      <!-- Main Content Area -->
      <div class="guide-body">
        <!-- 1. Currency, Gold & Crypto Math -->
        <div v-if="activeCategory === 'currency' && !searchQuery" class="section-pane">
          <div class="rule-box accent">
            <h3>Grounded Rule: Mixed Currency, Gold & Crypto Math</h3>
            <p>
              Expressions can combine currencies, precious metals, and cryptocurrencies (e.g. <code>10$ + 500 tl</code>, <code>1 gram gold to tl</code>, <code>1 btc to usd</code>, <code>0.5 eth to tl</code>).
              The currency/unit of the <b>first item</b> dictates the target output currency unless overridden with <code>to target_currency</code>.
            </p>
          </div>

          <div class="examples-grid">
            <div
              v-for="(item, idx) in currencyExamples"
              :key="idx"
              class="example-card"
            >
              <div class="ex-header">
                <span class="ex-label">{{ item.title }}</span>
                <button class="btn-copy" @click="handleSnippetClick(item.code)" title="Insert into active notepad">
                  <Plus class="icon-xs" /> Insert
                </button>
              </div>
              <code class="ex-code" @click="handleSnippetClick(item.code)" title="Click to insert into notepad">{{ item.code }}</code>
              <p class="ex-desc">{{ item.desc }}</p>
            </div>
          </div>

          <div class="info-card">
            <h4>Supported Currencies, Gold & Cryptos:</h4>
            <div class="tags-wrap">
              <span v-for="c in currencyTags" :key="c" class="tag">{{ c }}</span>
            </div>
            <p class="info-note">
              Live exchange rates, gold prices (XAU), and crypto prices (BTC, ETH, SOL) update automatically with offline fallback.
            </p>
          </div>
        </div>

        <!-- 2. Math & Variables -->
        <div v-else-if="activeCategory === 'math' && !searchQuery" class="section-pane">
          <div class="rule-box">
            <h3>Grounded Rule: Variable Scoping & Autocomplete</h3>
            <p>Variables are scoped <b>per tab</b>. Typing 3 characters or more automatically triggers an inline autocomplete dropdown for declared variables.</p>
          </div>

          <div class="examples-grid">
            <div
              v-for="(item, idx) in mathExamples"
              :key="idx"
              class="example-card"
            >
              <div class="ex-header">
                <span class="ex-label">{{ item.title }}</span>
                <button class="btn-copy" @click="handleSnippetClick(item.code)">
                  <Plus class="icon-xs" /> Insert
                </button>
              </div>
              <code class="ex-code" @click="handleSnippetClick(item.code)" title="Click to insert into notepad">{{ item.code }}</code>
              <p class="ex-desc">{{ item.desc }}</p>
            </div>
          </div>
        </div>

        <!-- 3. Unit Conversions -->
        <div v-else-if="activeCategory === 'units' && !searchQuery" class="section-pane">
          <div class="rule-box">
            <h3>Grounded Rule: Numeric Output Formatting</h3>
            <p>Unit conversions output pure numeric values in the right-hand results column so answers can be summed and copied easily.</p>
          </div>

          <div class="examples-grid">
            <div
              v-for="(item, idx) in unitExamples"
              :key="idx"
              class="example-card"
            >
              <div class="ex-header">
                <span class="ex-label">{{ item.title }}</span>
                <button class="btn-copy" @click="handleSnippetClick(item.code)">
                  <Plus class="icon-xs" /> Insert
                </button>
              </div>
              <code class="ex-code" @click="handleSnippetClick(item.code)" title="Click to insert into notepad">{{ item.code }}</code>
              <p class="ex-desc">{{ item.desc }}</p>
            </div>
          </div>
        </div>

        <!-- 4. Percentages -->
        <div v-else-if="activeCategory === 'percentages' && !searchQuery" class="section-pane">
          <div class="examples-grid">
            <div
              v-for="(item, idx) in percentageExamples"
              :key="idx"
              class="example-card"
            >
              <div class="ex-header">
                <span class="ex-label">{{ item.title }}</span>
                <button class="btn-copy" @click="handleSnippetClick(item.code)">
                  <Plus class="icon-xs" /> Insert
                </button>
              </div>
              <code class="ex-code" @click="handleSnippetClick(item.code)" title="Click to insert into notepad">{{ item.code }}</code>
              <p class="ex-desc">{{ item.desc }}</p>
            </div>
          </div>
        </div>

        <!-- 5. Dates & Time -->
        <div v-else-if="activeCategory === 'dates' && !searchQuery" class="section-pane">
          <div class="rule-box amber">
            <h3>Grounded Rule: Date Preservation</h3>
            <p>Unlike numeric expressions, date evaluations preserve human-friendly text formatting (e.g. <code>Sun, Aug 16, 2026</code>).</p>
          </div>

          <div class="examples-grid">
            <div
              v-for="(item, idx) in dateExamples"
              :key="idx"
              class="example-card"
            >
              <div class="ex-header">
                <span class="ex-label">{{ item.title }}</span>
                <button class="btn-copy" @click="handleSnippetClick(item.code)">
                  <Plus class="icon-xs" /> Insert
                </button>
              </div>
              <code class="ex-code" @click="handleSnippetClick(item.code)" title="Click to insert into notepad">{{ item.code }}</code>
              <p class="ex-desc">{{ item.desc }}</p>
            </div>
          </div>
        </div>

        <!-- 6. Line References -->
        <div v-else-if="activeCategory === 'references' && !searchQuery" class="section-pane">
          <div class="rule-box accent">
            <h3>Direct Line References & Copy All</h3>
            <p>
              Use <code>#1</code>, <code>#2</code>, <code>L1</code>, or <code>line1</code> to reference the evaluated answer of any line in your document.
              Clicking <b>Copy All</b> or pressing <code>Ctrl+Shift+C</code> copies all inputs with calculated answers appended implicitly as <code>= result</code>.
            </p>
          </div>

          <div class="examples-grid">
            <div
              v-for="(item, idx) in referenceExamples"
              :key="idx"
              class="example-card"
            >
              <div class="ex-header">
                <span class="ex-label">{{ item.title }}</span>
                <button class="btn-copy" @click="handleSnippetClick(item.code)">
                  <Plus class="icon-xs" /> Insert
                </button>
              </div>
              <code class="ex-code" @click="handleSnippetClick(item.code)" title="Click to insert into notepad">{{ item.code }}</code>
              <p class="ex-desc">{{ item.desc }}</p>
            </div>
          </div>
        </div>

        <!-- Search Mode Results -->
        <div v-else-if="searchQuery" class="section-pane">
          <div v-if="filteredSearchExamples.length === 0" class="empty-search">
            No syntax rules found matching "{{ searchQuery }}"
          </div>
          <div v-else class="examples-grid">
            <div
              v-for="(item, idx) in filteredSearchExamples"
              :key="idx"
              class="example-card"
            >
              <div class="ex-header">
                <span class="ex-label">{{ item.title }}</span>
                <button class="btn-copy" @click="handleSnippetClick(item.code)">
                  <Plus class="icon-xs" /> Insert
                </button>
              </div>
              <code class="ex-code" @click="handleSnippetClick(item.code)" title="Click to insert into notepad">{{ item.code }}</code>
              <p class="ex-desc">{{ item.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  BookOpen,
  ArrowLeft,
  Search,
  X,
  Plus,
  DollarSign,
  Calculator,
  Scale,
  Percent,
  Calendar,
  Layers
} from '@lucide/vue'

const emit = defineEmits(['switch-to-notepad', 'insert-snippet'])

const activeCategory = ref('currency')
const searchQuery = ref('')

const categories = [
  { id: 'currency', label: 'Currency, Gold & Crypto', icon: DollarSign },
  { id: 'math', label: 'Math & Variables', icon: Calculator },
  { id: 'units', label: 'Unit Conversions', icon: Scale },
  { id: 'percentages', label: 'Percentages', icon: Percent },
  { id: 'dates', label: 'Date Math', icon: Calendar },
  { id: 'references', label: 'Line References', icon: Layers }
]

const currencyTags = [
  '$ USD', '€ EUR', '£ GBP', '₺ TRY/TL', '¥ JPY', '₹ INR',
  '1 Gram Gold', '1 Troy Oz (XAU)', '1 Çeyrek Altın',
  'BTC (Bitcoin)', 'ETH (Ethereum)', 'SOL (Solana)', 'USDT', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX'
]

const currencyExamples = [
  { title: 'Bitcoin to USD', code: '1 btc to usd', desc: 'Converts 1 Bitcoin to USD using live spot rates' },
  { title: 'Ethereum to TRY', code: '0.5 eth to tl', desc: 'Converts 0.5 Ethereum directly to Turkish Lira' },
  { title: 'Solana + Fiat Math', code: '100 sol + 50$', desc: 'Adds 100 Solana value to $50 USD' },
  { title: 'Crypto to Gold', code: '1 btc to gram gold', desc: 'Converts 1 Bitcoin to equivalent grams of gold' },
  { title: 'Gram Gold to TRY', code: '1 gram gold to tl', desc: 'Converts 1 gram of gold directly into Turkish Lira' },
  { title: 'Gold + Currency Math', code: '5 gram altin + 100$', desc: 'Adds the value of 5g gold to $100 USD' },
  { title: 'Çeyrek Altın to TRY', code: '1 ceyrek to tl', desc: 'Calculates the value of 1 Çeyrek Altın in TRY' },
  { title: 'Mixed Currency Math', code: '10$ + 500 tl', desc: 'Converts 500 TL to USD and adds $10 = $20.52' }
]

const mathExamples = [
  { title: 'Variable Assignment', code: 'subtotal = 128.50', desc: 'Assigns 128.50 to variable subtotal' },
  { title: 'Variable Math', code: 'tax = 0.0825\nsubtotal * (1 + tax)', desc: 'Calculates total with tax variable' },
  { title: 'Built-in Functions', code: 'sqrt(144) + round(4.56)', desc: 'Evaluates to 17' },
  { title: 'Exponents', code: '2 ^ 8', desc: 'Evaluates 2 to the power of 8 = 256' }
]

const unitExamples = [
  { title: 'Distance', code: '5 miles to km', desc: 'Converts 5 miles to km = 8.04672' },
  { title: 'Volume & Cooking', code: '3 cups + 2 tbsp to ml', desc: 'Adds cups and tbsp converted to ml = 739.338' },
  { title: 'Mass / Weight', code: '10 lbs to kg', desc: 'Converts 10 pounds to kilograms = 4.53592' },
  { title: 'Temperature', code: '75 degF to degC', desc: 'Converts Fahrenheit to Celsius = 23.8889' }
]

const percentageExamples = [
  { title: 'Percentage Of', code: '15% of 240', desc: 'Calculates 15% of 240 = 36' },
  { title: 'Discount (Off)', code: '20% off 89.99', desc: 'Subtracts 20% discount = 51.992' },
  { title: 'Increase By', code: 'increase 1200 by 7%', desc: 'Adds 7% to 1200 = 1284' },
  { title: 'Decrease By', code: 'decrease 1200 by 15%', desc: 'Subtracts 15% from 1200 = 1020' }
]

const dateExamples = [
  { title: 'Current Date', code: 'today', desc: 'Outputs today\'s formatted date' },
  { title: 'Date Addition', code: 'today + 14 days', desc: 'Calculates date 14 days in the future' },
  { title: 'Weeks Ahead', code: 'today + 2 weeks', desc: 'Calculates date 2 weeks from today' },
  { title: 'Current Timestamp', code: 'now', desc: 'Outputs today\'s date and current time' }
]

const referenceExamples = [
  { title: 'Direct Line #1, #2', code: '#1 + #2', desc: 'Adds evaluated result of Line 1 and Line 2' },
  { title: 'Direct Line L1', code: 'L1 * 3', desc: 'Multiplies Line 1 result by 3' },
  { title: 'Previous Answer', code: 'prev / 2', desc: 'Divides the numeric result of the line above by 2' },
  { title: 'Running Total', code: 'total', desc: 'Sums all numeric lines above it in the current tab' },
  { title: 'Line Comments', code: '// Monthly household budget', desc: 'Comments produce no output on the right' }
]

const allExamples = [
  ...currencyExamples,
  ...mathExamples,
  ...unitExamples,
  ...percentageExamples,
  ...dateExamples,
  ...referenceExamples
]

const filteredSearchExamples = computed(() => {
  if (!searchQuery.value.trim()) return []
  const q = searchQuery.value.toLowerCase()
  return allExamples.filter((ex) =>
    ex.title.toLowerCase().includes(q) ||
    ex.code.toLowerCase().includes(q) ||
    ex.desc.toLowerCase().includes(q)
  )
})

function handleSnippetClick(text) {
  emit('insert-snippet', text)
}
</script>

<style scoped>
.guide-page {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 24px;
}

.guide-container {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.guide-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: var(--line-soft);
}

.guide-title-block {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--accent);
  color: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 16px var(--accent-dim);
}

.guide-title-block h1 {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 2px;
  color: var(--paper);
}

.guide-title-block p {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--accent);
  background: var(--accent-glow);
  border: 1px solid var(--accent-dim);
  padding: 8px 14px;
  border-radius: 8px;
  transition: all 0.15s;
}
.btn-back:hover {
  background: var(--accent-dim);
}

.guide-tabs {
  display: flex;
  border-bottom: 1px solid var(--line);
  background: var(--line-soft);
  padding: 0 20px;
  overflow-x: auto;
}

.guide-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 14px 18px;
  font-size: 13px;
  color: var(--muted);
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  white-space: nowrap;
}

.guide-tab:hover {
  color: var(--paper);
}

.guide-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 600;
}

.search-bar-wrap {
  padding: 16px 24px 0;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 38px;
  width: 16px;
  height: 16px;
  color: var(--muted);
}

.search-input {
  width: 100%;
  background: var(--line-soft);
  border: 1px solid var(--line);
  color: var(--paper);
  padding: 10px 14px 10px 38px;
  border-radius: 8px;
  font-size: 13.5px;
  outline: none;
}
.search-input:focus {
  border-color: var(--accent);
}

.btn-clear-search {
  position: absolute;
  right: 36px;
  color: var(--muted);
  padding: 4px;
}

.guide-body {
  padding: 20px 24px 28px;
  min-height: 480px;
}

.rule-box {
  background: var(--line-soft);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 20px;
}

.rule-box.accent {
  background: var(--accent-glow);
  border-color: var(--accent-dim);
}

.rule-box.amber {
  background: rgba(245, 185, 113, 0.08);
  border-color: rgba(245, 185, 113, 0.3);
}

.rule-box h3 {
  margin: 0 0 6px;
  font-size: 14px;
  color: var(--paper);
}

.rule-box p {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
}

.rule-box code {
  color: var(--accent);
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.example-card {
  background: var(--line-soft);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ex-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ex-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.btn-copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--accent);
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid var(--accent-dim);
  background: var(--accent-glow);
  transition: all 0.15s;
}
.btn-copy:hover {
  color: var(--bg);
  background: var(--accent);
}

.ex-code {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  color: var(--paper);
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  white-space: pre-wrap;
  transition: all 0.15s;
}
.ex-code:hover {
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-1px);
}

.ex-desc {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
}

.info-card {
  margin-top: 20px;
  background: var(--line-soft);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 16px;
}

.info-card h4 {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--paper);
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.tag {
  font-size: 11.5px;
  font-family: 'JetBrains Mono', monospace;
  background: var(--panel);
  color: var(--paper);
  border: 1px solid var(--line);
  padding: 3px 8px;
  border-radius: 4px;
}

.info-note {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.empty-search {
  text-align: center;
  padding: 60px 20px;
  color: var(--muted);
  font-size: 14px;
}

.icon-sm { width: 15px; height: 15px; }
.icon-xs { width: 12px; height: 12px; }
.icon { width: 20px; height: 20px; }
</style>
