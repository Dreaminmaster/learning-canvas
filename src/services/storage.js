/**
 * IndexedDB persistence layer for Learning Canvas
 * Stores outline, answers, chat messages, and session state
 */

const DB_NAME = 'learning-canvas'
const DB_VERSION = 1
const STORE = 'state'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveState(state) {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    store.put(state.outline, 'outline')
    store.put(state.studentAnswers, 'studentAnswers')
    store.put(state.chatMessages, 'chatMessages')
    store.put(state.currentSectionIndex, 'currentSectionIndex')
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch (e) {
    console.warn('Failed to save state:', e)
  }
}

export async function loadState() {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)

    const get = (key) => new Promise((resolve) => {
      const req = store.get(key)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    })

    const [outline, studentAnswers, chatMessages, currentSectionIndex] = await Promise.all([
      get('outline'),
      get('studentAnswers'),
      get('chatMessages'),
      get('currentSectionIndex'),
    ])

    db.close()
    return { outline, studentAnswers, chatMessages, currentSectionIndex }
  } catch (e) {
    console.warn('Failed to load state:', e)
    return { outline: null, studentAnswers: null, chatMessages: null, currentSectionIndex: null }
  }
}

export async function clearState() {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    await new Promise((resolve) => { tx.oncomplete = resolve })
    db.close()
  } catch (e) {
    console.warn('Failed to clear state:', e)
  }
}
