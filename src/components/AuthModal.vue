<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="modal-title">
          <Cloud class="icon-accent" />
          <h3>Cloud Sync & Accounts</h3>
        </div>
        <button class="btn-close" @click="$emit('close')">
          <X class="icon-sm" />
        </button>
      </div>

      <!-- Content Section -->
      <div class="modal-body">
        <!-- Case 1: Supabase Environment Not Configured -->
        <div v-if="!isConfigured" class="unconfigured-box">
          <div class="unconf-header">
            <AlertTriangle class="icon-amber" />
            <span>Supabase Credentials Unconfigured</span>
          </div>
          <p>
            To enable cloud sync, add your Supabase project credentials to your Vercel or local <code>.env</code> file:
          </p>
          <div class="code-block">
            <code>VITE_SUPABASE_URL=https://your-project.supabase.co</code>
            <code>VITE_SUPABASE_ANON_KEY=your-anon-key</code>
          </div>
          <p class="sub-tip">Your data continues to save 100% locally in your browser offline!</p>
        </div>

        <!-- Case 2: Logged In User -->
        <div v-else-if="user" class="account-active-box">
          <div class="user-badge">
            <UserCheck class="icon-accent" />
            <div class="user-info">
              <span class="user-label">Signed in as</span>
              <span class="user-email">{{ user.email }}</span>
            </div>
          </div>

          <div class="sync-status-card">
            <div class="sync-row">
              <CloudCheck class="icon-accent" />
              <span>Multi-device Cloud Sync is <strong>ACTIVE</strong></span>
            </div>
            <p class="sync-desc">Your tabs are automatically backed up to Supabase when modified.</p>
          </div>

          <button class="btn-danger" @click="handleSignOut" :disabled="loading">
            <LogOut class="icon-xs" /> Sign Out
          </button>
        </div>

        <!-- Case 3: Logged Out (Google Only Login) -->
        <div v-else class="google-auth-box">
          <p class="auth-intro">
            Sign in with Google to sync your notepad tabs across all your devices. Zero password hassle!
          </p>

          <div v-if="errorMsg" class="error-banner">
            {{ errorMsg }}
          </div>

          <button class="btn-google" @click="handleGoogleLogin" :disabled="loading">
            <svg class="google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <Loader2 v-if="loading" class="icon-sm spin" />
            <span v-else>Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { checkIsSupabaseConfigured } from '../services/supabaseClient.js'
import { signInWithGoogle, signOut } from '../services/syncService.js'
import { Cloud, X, AlertTriangle, UserCheck, CloudCheck, LogOut, Loader2 } from '@lucide/vue'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  user: { type: Object, default: null }
})

const emit = defineEmits(['close', 'user-updated', 'toast'])

const isConfigured = computed(() => checkIsSupabaseConfigured())
const loading = ref(false)
const errorMsg = ref('')

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    errorMsg.value = ''
  }
})

async function handleGoogleLogin() {
  errorMsg.value = ''
  loading.value = true
  try {
    await signInWithGoogle()
  } catch (err) {
    errorMsg.value = err.message || 'Google sign in failed'
    loading.value = false
  }
}

async function handleSignOut() {
  loading.value = true
  try {
    await signOut()
    emit('user-updated', null)
    emit('toast', 'Signed out of Cloud Sync')
    emit('close')
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-card {
  background: var(--panel-solid);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 420px;
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-title h3 {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  color: var(--paper);
}

.btn-close {
  color: var(--muted);
  padding: 4px;
  border-radius: 6px;
  transition: color 0.15s;
}
.btn-close:hover {
  color: var(--paper);
  background: var(--line-soft);
}

.modal-body {
  padding: 24px;
}

.unconfigured-box {
  background: rgba(245, 185, 113, 0.08);
  border: 1px solid rgba(245, 185, 113, 0.25);
  border-radius: 8px;
  padding: 14px;
  font-size: 13px;
  color: var(--paper);
}

.unconf-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--amber);
  margin-bottom: 8px;
}

.code-block {
  background: var(--bg);
  padding: 8px 12px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 10px 0;
  border: 1px solid var(--line);
}

.sub-tip {
  font-size: 12px;
  color: var(--muted);
  margin: 6px 0 0;
}

.account-active-box {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--line-soft);
  border-radius: 8px;
  border: 1px solid var(--line);
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-label {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .04em;
}

.user-email {
  font-size: 14px;
  font-weight: 600;
  color: var(--paper);
  font-family: 'JetBrains Mono', monospace;
}

.sync-status-card {
  padding: 12px;
  background: rgba(94, 234, 212, 0.08);
  border: 1px solid rgba(94, 234, 212, 0.25);
  border-radius: 8px;
  font-size: 12.5px;
}

.sync-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--paper);
}

.sync-desc {
  margin: 6px 0 0 24px;
  color: var(--muted);
  font-size: 11.5px;
}

.google-auth-box {
  display: flex;
  flex-direction: column;
  gap: 18px;
  text-align: center;
}

.auth-intro {
  font-size: 13.5px;
  color: var(--muted);
  margin: 0;
  line-height: 1.45;
}

.btn-google {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #ffffff;
  color: #1f2937;
  font-weight: 600;
  font-size: 14px;
  padding: 11px 20px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.15s ease;
  cursor: pointer;
  width: 100%;
}

.btn-google:hover:not(:disabled) {
  background: #f9fafb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.google-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.error-banner {
  background: rgba(242, 112, 122, 0.12);
  border: 1px solid rgba(242, 112, 122, 0.3);
  color: var(--err);
  font-size: 12.5px;
  padding: 8px 12px;
  border-radius: 6px;
  text-align: left;
}

.btn-danger {
  background: rgba(242, 112, 122, 0.12);
  color: var(--err);
  border: 1px solid rgba(242, 112, 122, 0.3);
  padding: 8px 14px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.15s;
}
.btn-danger:hover {
  background: rgba(242, 112, 122, 0.2);
}

.icon-accent { color: var(--accent); width: 18px; height: 18px; }
.icon-amber { color: var(--amber); width: 18px; height: 18px; }
.icon-sm { width: 15px; height: 15px; }
.icon-xs { width: 13px; height: 13px; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
