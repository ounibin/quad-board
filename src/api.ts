import type { Db, Settings, Task } from './types'
import { DEFAULT_SETTINGS } from './types'

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

async function inv<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(cmd, args)
}

const LS_KEY = 'quad-board-dev-db'

function loadLocal(): Db {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as Db
  } catch {
    /* ignore */
  }
  return { version: 1, tasks: [], settings: { ...DEFAULT_SETTINGS } }
}

function saveLocal(db: Db) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db))
  } catch {
    /* ignore */
  }
}

export const api = {
  load(): Promise<Db> {
    if (!isTauri) return Promise.resolve(loadLocal())
    return inv<Db>('load_db')
  },
  saveTasks(tasks: Task[]): Promise<void> {
    if (!isTauri) {
      const db = loadLocal()
      saveLocal({ ...db, tasks })
      return Promise.resolve()
    }
    return inv('save_tasks', { tasks })
  },
  saveSettings(settings: Settings): Promise<void> {
    if (!isTauri) {
      const db = loadLocal()
      saveLocal({ ...db, settings })
      return Promise.resolve()
    }
    return inv('save_settings', { settings })
  },
  createTask(title: string, quadrant: number): Promise<Task> {
    return inv<Task>('create_task', { title, quadrant })
  },
  dataDir(): Promise<string> {
    if (!isTauri) return Promise.resolve('(浏览器模式下数据存于 localStorage)')
    return inv<string>('data_dir')
  },
  revealDataDir(): Promise<void> {
    return inv('reveal_data_dir')
  },
  hideQuickAdd(): Promise<void> {
    return inv('hide_quick_add')
  },
  showMain(): Promise<void> {
    return inv('show_main')
  },
  setAutostart(enabled: boolean): Promise<void> {
    if (!isTauri) return Promise.resolve()
    return inv('set_autostart', { enabled })
  },
  autostartEnabled(): Promise<boolean> {
    if (!isTauri) return Promise.resolve(false)
    return inv<boolean>('autostart_enabled')
  },
  notifyTest(): Promise<void> {
    if (!isTauri) return Promise.resolve()
    return inv('notify_test')
  }
}

export async function listenEvent(name: string, cb: () => void): Promise<() => void> {
  if (!isTauri) return () => {}
  const { listen } = await import('@tauri-apps/api/event')
  const un = await listen(name, cb)
  return () => un()
}
