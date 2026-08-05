<template>
  <div class="sidebar-column">
    <!-- Action Box containing Save, Share & Copy All -->
    <div class="save-card">
      <button class="btn-save-main" @click="$emit('save-tab')" title="Save current active tab to your Saved Library">
        <BookmarkPlus class="icon" />
        <span>Save Tab to Library</span>
      </button>

      <div class="action-btn-row">
        <button class="btn-action" @click="$emit('share-tab')" title="Copy live shareable URL link for current tab to clipboard">
          <Share2 class="icon-sm" />
          <span>Share Tab</span>
        </button>

        <button class="btn-action" @click="$emit('copy-all')" title="Copy document with calculated results implicitly appended as = result (Ctrl+Shift+C)">
          <Copy class="icon-sm" />
          <span>Copy All (=)</span>
        </button>
      </div>
    </div>

    <!-- Syntax Reference Sheet Box -->
    <aside class="sheet">
      <div class="sheet-header">
        <h2>Syntax Reference</h2>
        <button class="btn-guide-link" @click="$emit('open-guide-page')" title="Open full syntax guide page">
          Full Guide →
        </button>
      </div>

      <div class="grp">
        <h3>Sections & Subtotals 📂</h3>
        <code @click="$emit('insert', '=== Income & Sales ===\nsalary = 4500\nsubtotal')">
          === Section Title ===<br>
          subtotal
        </code>
        <code @click="$emit('insert', '--- Monthly Expenses ---\nrent = 1650\nsubtotal')">
          --- Expenses ---
        </code>
      </div>

      <div class="grp">
        <h3>Line References</h3>
        <code @click="$emit('insert', '#1 + #2')">#1 + #2 (Line 1 + Line 2)</code>
        <code @click="$emit('insert', 'L1 * 2')">L1 * 2</code>
        <code @click="$emit('insert', 'prev * 2')">prev * 2</code>
        <code @click="$emit('insert', 'total')">total</code>
      </div>

      <div class="grp">
        <h3>Currency & Gold</h3>
        <code @click="$emit('insert', '10$ + 500 tl')">10$ + 500 tl</code>
        <code @click="$emit('insert', '1 gram gold to tl')">1 gram gold to tl</code>
        <code @click="$emit('insert', '5 gram altin + 100$')">5 gram altin + 100$</code>
        <code @click="$emit('insert', '1 ceyrek to tl')">1 ceyrek to tl</code>
      </div>

      <div class="grp">
        <h3>Crypto Math 🚀</h3>
        <code @click="$emit('insert', '1 btc to usd')">1 btc to usd</code>
        <code @click="$emit('insert', '0.5 eth to tl')">0.5 eth to tl</code>
        <code @click="$emit('insert', '100 sol + 50$')">100 sol + 50$</code>
      </div>

      <div class="grp">
        <h3>Variables & Math</h3>
        <code @click="$emit('insert', 'price = 149.99\ntax = 0.08\nprice * (1 + tax)')">
          price = 149.99<br>
          tax = 0.08<br>
          price * (1 + tax)
        </code>
      </div>

      <div class="grp">
        <h3>Units</h3>
        <code @click="$emit('insert', '12 km to miles')">12 km to miles</code>
        <code @click="$emit('insert', '3 cups + 2 tbsp to ml')">3 cups + 2 tbsp to ml</code>
      </div>

      <div class="grp">
        <h3>Percentages</h3>
        <code @click="$emit('insert', '15% of 240')">15% of 240</code>
        <code @click="$emit('insert', '20% off 89.99')">20% off 89.99</code>
        <code @click="$emit('insert', 'increase 500 by 12%')">increase 500 by 12%</code>
      </div>

      <div class="grp">
        <h3>Dates & Comments</h3>
        <code @click="$emit('insert', 'today + 14 days')">today + 14 days</code>
        <code @click="$emit('insert', '// inline comment')">// comment</code>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { BookmarkPlus, Share2, Copy } from '@lucide/vue'

defineEmits(['insert', 'open-guide-page', 'save-tab', 'share-tab', 'copy-all'])
</script>

<style scoped>
.sidebar-column {
  width: 270px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Action Box over Reference Box */
.save-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 10px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-save-main {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--accent);
  color: var(--bg);
  font-weight: 700;
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 8px;
  transition: all 0.15s ease;
  box-shadow: 0 4px 14px var(--accent-dim);
}

.btn-save-main:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px var(--accent-dim);
}

.action-btn-row {
  display: flex;
  gap: 6px;
}

.btn-action {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  background: var(--line-soft);
  border: 1px solid var(--line);
  padding: 7px 8px;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.btn-action:hover {
  color: var(--paper);
  border-color: var(--accent);
  background: var(--accent-glow);
}

.sheet {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 20px;
  font-size: 13px;
  color: var(--muted);
  box-shadow: var(--shadow-lg);
}

.sheet-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--line);
}

.sheet h2 {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: .09em;
  color: var(--paper);
  margin: 0;
  font-weight: 700;
}

.btn-guide-link {
  font-size: 11px;
  color: var(--accent);
  transition: all 0.15s;
  padding: 0;
}
.btn-guide-link:hover {
  text-decoration: underline;
}

.grp {
  margin-bottom: 14px;
}
.grp:last-child {
  margin-bottom: 0;
}

.grp h3 {
  font-size: 11.5px;
  color: var(--muted);
  margin: 0 0 6px;
  font-weight: 600;
}

.grp code {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--paper);
  background: var(--line-soft);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 5px 8px;
  margin-bottom: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.4;
}

.grp code:hover {
  border-color: var(--accent);
  background: var(--accent-glow);
  color: var(--accent);
  transform: translateX(2px);
}

.icon {
  width: 16px;
  height: 16px;
}

.icon-sm {
  width: 13px;
  height: 13px;
}
</style>
