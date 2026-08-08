<template>
  <div class="guide-page">
    <!-- Header Back Navigation -->
    <header class="guide-header">
      <button class="btn-back" @click="$emit('switch-to-notepad')">
        <ArrowLeft class="icon-sm" /> Back to Notepad
      </button>
      <h1>çetele Syntax & Feature Guide</h1>
      <p class="subtitle">Learn how to write math, currency conversions, gold/crypto calculations, date math, line references, and cloud sync.</p>
    </header>

    <!-- Guide Content Grid -->
    <div class="guide-grid">
      <!-- Section 1: Line References & Totals -->
      <section class="card">
        <div class="card-title">
          <Hash class="card-icon" />
          <h2>Line References & Totals</h2>
        </div>
        <p class="card-desc">Refer to previous lines by number (`#1`, `L1`, `line1`) or use `prev` and `total`.</p>
        <div class="code-box">
          <code @click="$emit('insert-snippet', 'val = 1200\ntax = 100\n#1 + #2')">
            <span class="var">val</span> = 1200<br>
            <span class="var">tax</span> = 100<br>
            <span class="var">#1</span> + <span class="var">#2</span> <span class="comment">// 1300</span>
          </code>
          <code @click="$emit('insert-snippet', 'L1 * 2\nprev / 2')">
            <span class="var">L1</span> * 2 <span class="comment">// Line 1 * 2</span><br>
            <span class="var">prev</span> / 2 <span class="comment">// Previous result / 2</span>
          </code>
          <code @click="$emit('insert-snippet', 'total')">
            <span class="var">total</span> <span class="comment">// Sum of all numeric lines above</span>
          </code>
        </div>
      </section>

      <!-- Section 1B: Sections, Subtotals & Collapsible Blocks -->
      <section class="card">
        <div class="card-title">
          <FolderTree class="card-icon" />
          <h2>Sections, Subtotals & Collapsible Blocks 📂</h2>
        </div>
        <p class="card-desc">Organize long documents into styled visual sections, compute section subtotals, and collapse/expand blocks.</p>
        <div class="code-box">
          <code @click="$emit('insert-snippet', '=== Income & Multipliers ===\nsalary = 5.5k\nfreelance = 1.8k\nsubtotal\n\n=== Monthly Expenses ===\nrent = 1.65k\ngroceries = 450\nsubtotal\n\ntotal')">
            === Income & Multipliers === <span class="comment">// Visual section header banner</span><br>
            <span class="var">salary</span> = 5.5k <span class="comment">// 5,500</span><br>
            <span class="var">freelance</span> = 1.8k <span class="comment">// 1,800</span><br>
            <span class="var">subtotal</span> <span class="comment">// 7,300 (Sectional sum)</span><br><br>
            === Monthly Expenses ===<br>
            <span class="var">rent</span> = 1.65k <span class="comment">// 1,650</span><br>
            <span class="var">groceries</span> = 450<br>
            <span class="var">subtotal</span> <span class="comment">// 2,100 (Sectional sum)</span><br><br>
            <span class="var">total</span> <span class="comment">// 9,400 (Grand total of all sections)</span>
          </code>
        </div>
      </section>

      <!-- Section 2: Crypto & Multi-Currency Math -->
      <section class="card">
        <div class="card-title">
          <Coins class="card-icon" />
          <h2>Crypto & Multi-Currency Math</h2>
        </div>
        <p class="card-desc">Live rates for USD, EUR, GBP, TRY, BTC, ETH, SOL, USDT, BNB, XRP, DOGE, ADA, AVAX.</p>
        <div class="code-box">
          <code @click="$emit('insert-snippet', 'a = 100 sol + 50$\na + 10$\na to usd')">
            <span class="var">a</span> = 100 sol + 50$ <span class="comment">// 100.27 SOL</span><br>
            <span class="var">a</span> + 10$ <span class="comment">// 100.32 SOL (converts $10 to SOL)</span><br>
            <span class="var">a</span> to usd <span class="comment">// $18,560.00</span>
          </code>
          <code @click="$emit('insert-snippet', '10$ + 500 tl')">
            10$ + 500 tl
          </code>
          <code @click="$emit('insert-snippet', '0.5 btc + 2 eth to tl')">
            0.5 btc + 2 eth to tl
          </code>
        </div>
      </section>

      <!-- Section 3: Gold & Precious Metals -->
      <section class="card">
        <div class="card-title">
          <Sparkles class="card-icon" />
          <h2>Gold & Precious Metals</h2>
        </div>
        <p class="card-desc">Live spot prices for Gram Altın, Çeyrek Altın, and Troy Ounces (XAU).</p>
        <div class="code-box">
          <code @click="$emit('insert-snippet', '1 gram altin to tl')">
            1 gram altin to tl <span class="comment">// Live Gram Gold in TRY (~6,175 TL)</span>
          </code>
          <code @click="$emit('insert-snippet', '5 gram altin + 100$')">
            5 gram altin + 100$ <span class="comment">// Adds $100 worth of gold to 5g</span>
          </code>
          <code @click="$emit('insert-snippet', '1 ceyrek to tl')">
            1 ceyrek to tl <span class="comment">// Quarter gold (1.75g) in TL</span>
          </code>
        </div>
      </section>

      <!-- Section 4: Date Variables & Chained Math -->
      <section class="card">
        <div class="card-title">
          <Calendar class="card-icon" />
          <h2>Date Variables & Chained Date Math</h2>
        </div>
        <p class="card-desc">Assign dates to variables and chain multiple date operations together.</p>
        <div class="code-box">
          <code @click="$emit('insert-snippet', 'start = today\ndeadline = start + 2 weeks - 1 day + 2 months')">
            <span class="var">start</span> = today <span class="comment">// Sun, Aug 02, 2026</span><br>
            <span class="var">deadline</span> = <span class="var">start</span> + 2 weeks - 1 day + 2 months
          </code>
          <code @click="$emit('insert-snippet', 'now + 3 hours - 30 mins')">
            now + 3 hours - 30 mins <span class="comment">// Date with time</span>
          </code>
        </div>
      </section>

      <!-- Section 5: Percentages, Units & Multipliers -->
      <section class="card">
        <div class="card-title">
          <Percent class="card-icon" />
          <h2>Percentages, Units & Magnitude Multipliers</h2>
        </div>
        <p class="card-desc">Calculate discounts, use magnitude suffixes (`k`, `m`, `b`, `t`), and convert units.</p>
        <div class="code-box">
          <code @click="$emit('insert-snippet', '500k + 2m\n1.5b to usd')">
            500k + 2m <span class="comment">// 2,500,000 (500K + 2 Million)</span><br>
            $1.5b <span class="comment">// $1,500,000,000 (1.5 Billion)</span>
          </code>
          <code @click="$emit('insert-snippet', '20% off 89.99')">
            20% off 89.99 <span class="comment">// 71.99</span>
          </code>
          <code @click="$emit('insert-snippet', '12 km to miles')">
            12 km to miles
          </code>
        </div>
      </section>

      <!-- Section 6: Keyboard Shortcuts & URL Sharing -->
      <section class="card">
        <div class="card-title">
          <Command class="card-icon" />
          <h2>Keyboard Shortcuts & URL Sharing</h2>
        </div>
        <p class="card-desc">Fast shortcuts for undo, redo, copying results, and tab sharing.</p>
        <div class="shortcuts-list">
          <div class="shortcut-item">
            <span class="sc-key">Ctrl + Z</span>
            <span class="sc-desc">Undo last typing/insertion action</span>
          </div>
          <div class="shortcut-item">
            <span class="sc-key">Ctrl + Shift + Z</span>
            <span class="sc-desc">Redo last undone action</span>
          </div>
          <div class="shortcut-item">
            <span class="sc-key">Ctrl + Shift + C</span>
            <span class="sc-desc">Copy All text with implicit results (= result)</span>
          </div>
          <div class="shortcut-item">
            <span class="sc-key">Share Tab</span>
            <span class="sc-desc">Copy live URL hash link (`cetele.online/#doc=...`)</span>
          </div>
        </div>
      </section>

      <!-- Section 7: Cloud Sync & Data Privacy (Placed Last) -->
      <section class="card">
        <div class="card-title">
          <Cloud class="card-icon" />
          <h2>Cloud Sync & Data Privacy</h2>
        </div>
        <p class="card-desc">Local-first browser database with optional Google Multi-Device Cloud Sync.</p>
        <div class="sync-info-list">
          <div class="sync-info-item">
            <strong class="sync-title">100% Offline Local-First:</strong>
            <span>All calculations and open tabs save instantly to your browser's local database (`IndexedDB`). No account needed!</span>
          </div>
          <div class="sync-info-item">
            <strong class="sync-title">Google Cloud Sync:</strong>
            <span>Sign in with Google to sync your active open tabs (`user_tabs`) and Saved Library (`saved_library`) across all devices.</span>
          </div>
          <div class="sync-info-item">
            <strong class="sync-title">Saved Tabs Library:</strong>
            <span>Click <strong>Save Tab to Library</strong> to store reusable templates. Deduplicates entries automatically so no copies are populated.</span>
          </div>
          <div class="sync-info-item">
            <strong class="sync-title">Rate-Limited Throttling:</strong>
            <span>Typing saves instantly locally, while cloud sync is throttled to max 1 request per 2 seconds to prevent network spam.</span>
          </div>
          <div class="sync-info-item">
            <strong class="sync-title">Row Level Security (RLS):</strong>
            <span>Guarded by PostgreSQL RLS. Nobody can ever view, read, or modify another user's notes.</span>
          </div>
          <div class="sync-info-item">
            <strong class="sync-title">Clean Sign Out:</strong>
            <span>Signing out resets active tabs back to default guest templates and clears user saved templates locally.</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ArrowLeft, Hash, Coins, Sparkles, Calendar, Percent, Command, Cloud, FolderTree } from '@lucide/vue'

defineEmits(['switch-to-notepad', 'insert-snippet'])
</script>

<style scoped>
.guide-page {
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
  padding: 24px;
}

.guide-header {
  margin-bottom: 28px;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--item-bg);
  color: var(--paper);
  border: 1px solid var(--line);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
  transition: all 0.15s ease;
}
.btn-back:hover {
  border-color: rgba(22, 217, 196, 0.3);
  color: var(--accent);
}

.guide-header h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--paper-bright);
}

.subtitle {
  font-size: 14px;
  color: var(--muted);
  margin: 0;
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(480px, 1fr));
  gap: 20px;
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.card-icon {
  width: 18px;
  height: 18px;
  color: var(--accent);
}

.card h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--paper-bright);
}

.card-desc {
  font-size: 13px;
  color: var(--muted);
  margin: 0 0 14px;
}

.code-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.code-box code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  background: var(--editor-bg);
  border: 1px solid var(--line-soft);
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--paper);
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.5;
}

.code-box code:hover {
  border-color: rgba(22, 217, 196, 0.3);
  color: var(--paper-bright);
  background: rgba(22, 217, 196, 0.06);
}

.var {
  color: var(--syn-variable);
  font-weight: 600;
}

.comment {
  color: var(--syn-comment);
  font-style: italic;
}

.sync-info-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sync-info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--item-bg);
  border: 1px solid var(--line-soft);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--paper);
}

.sync-title {
  color: var(--accent);
  font-weight: 600;
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--item-bg);
  border: 1px solid var(--line-soft);
  border-radius: 6px;
}

.sc-key {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--accent);
  background: var(--editor-bg);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--line-soft);
}

.sc-desc {
  font-size: 12.5px;
  color: var(--paper);
}

@media (max-width: 600px) {
  .guide-grid {
    grid-template-columns: 1fr;
  }
}
</style>
