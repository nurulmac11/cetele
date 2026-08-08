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

    <!-- Defined Variables Inspector Box (Hidden on Desktop, Visible on Mobile) -->
    <div class="variables-card">
      <div class="var-header">
        <div class="var-title">
          <Variable class="icon-sm" />
          <span>Defined Variables</span>
        </div>
        <span class="var-badge">{{ declaredVariables.length }}</span>
      </div>

      <div v-if="declaredVariables.length > 0" class="var-list">
        <div
          v-for="v in declaredVariables"
          :key="v.name"
          class="var-item"
          @click="$emit('insert', v.name)"
          :title="'Click to insert variable ' + v.name"
        >
          <span class="var-name">{{ v.name }}</span>
          <span class="var-eq">=</span>
          <span class="var-val">{{ v.value }}</span>
        </div>
      </div>

      <div v-else class="var-empty">
        <span>No variables declared in active tab.</span>
        <code @click="$emit('insert', 'price = 149.99\ntax = 18%\nprice * (1 + tax)')">e.g. price = 149.99</code>
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
        <h3>Units & Multipliers</h3>
        <code @click="$emit('insert', '500k + 2m')">500k + 2m (500,000 + 2M)</code>
        <code @click="$emit('insert', '$1.5b')">$1.5b ($1,500,000,000)</code>
        <code @click="$emit('insert', '12 km to miles')">12 km to miles</code>
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
        <code @click="$emit('insert', '/* multi-line comment */')">/* block comment */</code>
        <code @click="$emit('insert', '&quot;&quot;&quot;\nPython multi-line comment\n&quot;&quot;&quot;')">&quot;&quot;&quot; Python multi-line &quot;&quot;&quot;</code>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { BookmarkPlus, Share2, Copy, Variable } from '@lucide/vue'

defineProps({
  declaredVariables: { type: Array, default: () => [] }
})

defineEmits(['insert', 'open-guide-page', 'save-tab', 'share-tab', 'copy-all'])
</script>

<style scoped>
.sidebar-column {
  width: 270px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Primary Action Box */
.save-card {
  background: var(--panel-solid);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 12px;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-save-main {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--accent);
  color: #080F1A;
  font-weight: 700;
  font-size: 13.5px;
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
  box-shadow: 0 4px 12px rgba(22, 217, 196, 0.2);
  letter-spacing: 0.01em;
}

.btn-save-main:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(22, 217, 196, 0.3);
}

.btn-save-main:active {
  transform: translateY(0);
}

.action-btn-row {
  display: flex;
  gap: 8px;
}

.btn-action {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted-light);
  background: var(--item-bg);
  border: 1px solid var(--line);
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
}

.btn-action:hover {
  color: var(--paper-bright);
  border-color: var(--line-hover);
  background: var(--panel-hover);
}

/* Defined Variables Card - Hidden on Desktop (since editor results panel shows variables), Visible on Mobile */
.variables-card {
  background: var(--card-bg);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 14px;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (min-width: 769px) {
  .variables-card {
    display: none !important;
  }
}

.var-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line-soft);
}

.var-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .08em;
  font-weight: 700;
  color: var(--accent);
}

.var-badge {
  font-size: 10.5px;
  background: rgba(22, 217, 196, 0.1);
  color: var(--accent);
  padding: 1px 7px;
  border-radius: 10px;
  border: 1px solid rgba(22, 217, 196, 0.2);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
}

.var-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 190px;
  overflow-y: auto;
}

.var-item {
  display: grid;
  grid-template-columns: minmax(60px, 1fr) 16px minmax(60px, 1fr);
  align-items: center;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--item-bg);
  border: 1px solid var(--line-soft);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.var-item:hover {
  border-color: rgba(22, 217, 196, 0.3);
  background: rgba(22, 217, 196, 0.06);
}

.var-name {
  color: var(--accent);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}

.var-eq {
  color: var(--muted);
  font-size: 12px;
  text-align: center;
  font-weight: 500;
  user-select: none;
  opacity: 0.7;
}

.var-val {
  color: var(--paper);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: right;
}

.var-empty {
  font-size: 11.5px;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}

.var-empty code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  color: var(--accent);
  background: var(--item-bg);
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px dashed rgba(22, 217, 196, 0.25);
  cursor: pointer;
}

/* Syntax Reference Sheet Box - Visually quieter */
.sheet {
  background: var(--panel-solid);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius);
  padding: 16px;
  font-size: 13px;
  color: var(--muted);
  box-shadow: none;
}

.sheet-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line-soft);
}

.sheet h2 {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--paper-bright);
  margin: 0;
  font-weight: 700;
}

.btn-guide-link {
  font-size: 11px;
  color: var(--accent);
  transition: all 0.15s;
  padding: 0;
  font-weight: 600;
}
.btn-guide-link:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}

.grp {
  margin-bottom: 14px;
}
.grp:last-child {
  margin-bottom: 0;
}

.grp h3 {
  font-size: 11px;
  color: var(--muted);
  margin: 0 0 6px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.grp code {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--paper);
  background: var(--item-bg);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 6px 10px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.45;
}

.grp code:hover {
  border-color: rgba(22, 217, 196, 0.3);
  background: rgba(22, 217, 196, 0.06);
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
