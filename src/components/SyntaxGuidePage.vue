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
            val = 1200<br>
            tax = 100<br>
            #1 + #2 <span class="comment">// 1300</span>
          </code>
          <code @click="$emit('insert-snippet', 'L1 * 2\nprev / 2')">
            L1 * 2 <span class="comment">// Line 1 * 2</span><br>
            prev / 2 <span class="comment">// Previous result / 2</span>
          </code>
          <code @click="$emit('insert-snippet', 'total')">
            total <span class="comment">// Sum of all numeric lines above</span>
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
          <code @click="$emit('insert-snippet', '=== Income & Sales ===\nsalary = 4,500\nfreelance = 1,200\nsubtotal\n\n=== Monthly Expenses ===\nrent = 1,650\ngroceries = 450\nsubtotal\n\ntotal')">
            === Income & Sales === <span class="comment">// Visual section header banner</span><br>
            salary = 4,500<br>
            freelance = 1,200<br>
            subtotal <span class="comment">// 5,700 (Sectional sum)</span><br><br>
            === Monthly Expenses ===<br>
            rent = 1,650<br>
            groceries = 450<br>
            subtotal <span class="comment">// 2,100 (Sectional sum)</span><br><br>
            total <span class="comment">// 7,800 (Grand total of all sections)</span>
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
            a = 100 sol + 50$ <span class="comment">// 100.27 SOL</span><br>
            a + 10$ <span class="comment">// 100.32 SOL (converts $10 to SOL)</span><br>
            a to usd <span class="comment">// $18,560.00</span>
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
            start = today <span class="comment">// Sun, Aug 02, 2026</span><br>
            deadline = start + 2 weeks - 1 day + 2 months
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
  background: var(--line-soft);
  color: var(--paper);
  border: 1px solid var(--line);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
  transition: all 0.15s ease;
}
.btn-back:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.guide-header h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--paper);
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
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: var(--shadow-lg);
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
  font-weight: 700;
  margin: 0;
  color: var(--paper);
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
  background: var(--line-soft);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--paper);
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.5;
}

.code-box code:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-glow);
}

.comment {
  color: var(--muted);
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
  background: var(--line-soft);
  border: 1px solid var(--line);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--paper);
}

.sync-title {
  color: var(--accent);
  font-weight: 700;
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
  background: var(--line-soft);
  border: 1px solid var(--line);
  border-radius: 6px;
}

.sc-key {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--accent);
  background: var(--bg);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--line);
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
