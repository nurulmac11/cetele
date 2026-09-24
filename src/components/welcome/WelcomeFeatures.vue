<template>
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
</template>

<script setup>
import { Folder, Bookmark, Zap } from '@lucide/vue'

defineProps({
  t: { type: Object, required: true } // translations for the chosen language
})
</script>

<style scoped>
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

@media (max-width: 860px) {
  .features-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
