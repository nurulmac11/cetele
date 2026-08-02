// Local IndexedDB database service with localStorage fallback for Çetele

const DB_NAME = 'CeteleLocalDB'
const DB_VERSION = 2
const STORE_TABS = 'tabs'
const STORE_SAVED_TABS = 'saved_tabs'
const STORE_SETTINGS = 'settings'

const LOCAL_STORAGE_TABS_KEY = 'cetele_local_tabs'
const LOCAL_STORAGE_SAVED_TABS_KEY = 'cetele_saved_tabs'
const LOCAL_STORAGE_SETTINGS_KEY = 'cetele_local_settings'

let dbInstance = null

function openDatabase() {
  if (dbInstance && dbInstance.objectStoreNames.contains(STORE_SAVED_TABS)) {
    return Promise.resolve(dbInstance)
  }
  if (dbInstance) {
    try { dbInstance.close() } catch(e){}
    dbInstance = null
  }

  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported'))
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_TABS)) {
        const tabsStore = db.createObjectStore(STORE_TABS, { keyPath: 'id' })
        tabsStore.createIndex('position', 'position', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_SAVED_TABS)) {
        const savedStore = db.createObjectStore(STORE_SAVED_TABS, { keyPath: 'id' })
        savedStore.createIndex('savedAt', 'savedAt', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' })
      }
    }

    request.onsuccess = (event) => {
      dbInstance = event.target.result
      resolve(dbInstance)
    }

    request.onerror = (event) => {
      console.warn('IndexedDB failed to open, falling back to localStorage:', event.target.error)
      reject(event.target.error)
    }
  })
}

// ----------------------------------------------------
// TABS CRUD (Active Notepad Tabs)
// ----------------------------------------------------

export async function getLocalTabs() {
  let fallbackTabs = []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TABS_KEY)
    if (raw) fallbackTabs = JSON.parse(raw)
  } catch (e) {}

  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_TABS, 'readonly')
      const store = tx.objectStore(STORE_TABS)
      const request = store.getAll()

      request.onsuccess = () => {
        const tabs = request.result || []
        if (tabs.length > 0) {
          tabs.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          resolve(tabs)
        } else {
          resolve(fallbackTabs)
        }
      }
      request.onerror = () => resolve(fallbackTabs)
    })
  } catch (err) {
    return fallbackTabs
  }
}

export async function saveLocalTabs(tabsArray) {
  try {
    localStorage.setItem(LOCAL_STORAGE_TABS_KEY, JSON.stringify(tabsArray))
  } catch (e) {
    console.error('LocalStorage write failed:', e)
  }

  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TABS, 'readwrite')
      const store = tx.objectStore(STORE_TABS)
      
      store.clear().onsuccess = () => {
        tabsArray.forEach((tab, idx) => {
          store.put({
            ...tab,
            position: idx,
            updatedAt: new Date().toISOString()
          })
        })
      }

      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    return true
  }
}

export async function deleteLocalTab(tabId) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TABS_KEY)
    if (raw) {
      const current = JSON.parse(raw)
      const filtered = current.filter(t => t.id !== tabId)
      localStorage.setItem(LOCAL_STORAGE_TABS_KEY, JSON.stringify(filtered))
    }
  } catch (e) {}

  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_TABS, 'readwrite')
      const store = tx.objectStore(STORE_TABS)
      store.delete(tabId)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(true)
    })
  } catch (err) {
    return true
  }
}

// ----------------------------------------------------
// SAVED TABS LIBRARY CRUD
// ----------------------------------------------------

export async function getSavedLibraryTabs() {
  let fallbackData = []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SAVED_TABS_KEY)
    fallbackData = raw ? JSON.parse(raw) : []
  } catch (e) {}

  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SAVED_TABS, 'readonly')
      const store = tx.objectStore(STORE_SAVED_TABS)
      const request = store.getAll()

      request.onsuccess = () => {
        const saved = request.result || []
        saved.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0))
        resolve(saved.length > 0 ? saved : fallbackData)
      }
      request.onerror = () => resolve(fallbackData)
    })
  } catch (err) {
    return fallbackData
  }
}

export async function saveTabToLibrary(savedItem) {
  // Reuse existing ID if item already exists by ID or title+content
  let existingId = savedItem.id
  try {
    const currentRaw = localStorage.getItem(LOCAL_STORAGE_SAVED_TABS_KEY)
    const current = currentRaw ? JSON.parse(currentRaw) : []
    const existing = current.find(i => 
      (savedItem.id && String(i.id) === String(savedItem.id)) ||
      (i.title === savedItem.title && i.content === savedItem.content)
    )
    if (existing) {
      existingId = existing.id
    }
  } catch (e) {}

  const finalId = existingId || ('saved-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4))
  const itemToSave = {
    id: String(finalId),
    title: savedItem.title || 'Saved Tab',
    content: savedItem.content || '',
    savedAt: new Date().toISOString(),
    lineCount: (savedItem.content || '').split('\n').length
  }

  try {
    const currentRaw = localStorage.getItem(LOCAL_STORAGE_SAVED_TABS_KEY)
    const current = currentRaw ? JSON.parse(currentRaw) : []
    const idx = current.findIndex(i => String(i.id) === String(itemToSave.id))
    if (idx >= 0) {
      current[idx] = itemToSave
    } else {
      current.unshift(itemToSave)
    }
    localStorage.setItem(LOCAL_STORAGE_SAVED_TABS_KEY, JSON.stringify(current))
  } catch (e) {
    console.error('LocalStorage saved tab error:', e)
  }

  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SAVED_TABS, 'readwrite')
      const store = tx.objectStore(STORE_SAVED_TABS)
      store.put(itemToSave)
      tx.oncomplete = () => resolve(itemToSave)
      tx.onerror = () => resolve(itemToSave)
    })
  } catch (err) {
    return itemToSave
  }
}

export async function saveAllSavedLibrary(libraryArray) {
  try {
    localStorage.setItem(LOCAL_STORAGE_SAVED_TABS_KEY, JSON.stringify(libraryArray))
  } catch (e) {}

  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SAVED_TABS, 'readwrite')
      const store = tx.objectStore(STORE_SAVED_TABS)
      store.clear().onsuccess = () => {
        libraryArray.forEach(item => store.put(item))
      }
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(true)
    })
  } catch (err) {
    return true
  }
}

export async function deleteSavedTabFromLibrary(id) {
  try {
    const currentRaw = localStorage.getItem(LOCAL_STORAGE_SAVED_TABS_KEY)
    const current = currentRaw ? JSON.parse(currentRaw) : []
    const filtered = current.filter(i => String(i.id) !== String(id))
    localStorage.setItem(LOCAL_STORAGE_SAVED_TABS_KEY, JSON.stringify(filtered))
  } catch (e) {}

  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SAVED_TABS, 'readwrite')
      const store = tx.objectStore(STORE_SAVED_TABS)
      store.delete(String(id))
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(true)
    })
  } catch (err) {
    return true
  }
}

// ----------------------------------------------------
// SETTINGS / PROFILE CRUD
// ----------------------------------------------------

export async function getLocalSettings() {
  let fallbackData = null
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY)
    if (raw) fallbackData = JSON.parse(raw)
  } catch (e) {}

  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly')
      const store = tx.objectStore(STORE_SETTINGS)
      const request = store.get('user_settings')

      request.onsuccess = () => {
        const idbVal = request.result?.value
        resolve(idbVal || fallbackData)
      }
      request.onerror = () => resolve(fallbackData)
    })
  } catch (err) {
    return fallbackData
  }
}

export async function saveLocalSettings(settingsObj) {
  try {
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settingsObj))
  } catch (e) {
    console.error('LocalStorage settings write failed:', e)
  }

  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite')
      const store = tx.objectStore(STORE_SETTINGS)
      store.put({ key: 'user_settings', value: settingsObj })
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(true)
    })
  } catch (err) {
    return true
  }
}

export async function clearLocalDatabase() {
  localStorage.removeItem(LOCAL_STORAGE_TABS_KEY)
  localStorage.removeItem(LOCAL_STORAGE_SAVED_TABS_KEY)
  localStorage.removeItem(LOCAL_STORAGE_SETTINGS_KEY)

  try {
    const db = await openDatabase()
    const tx = db.transaction([STORE_TABS, STORE_SAVED_TABS, STORE_SETTINGS], 'readwrite')
    tx.objectStore(STORE_TABS).clear()
    tx.objectStore(STORE_SAVED_TABS).clear()
    tx.objectStore(STORE_SETTINGS).clear()
  } catch (e) {
    // ignore
  }
}
