import { create } from 'zustand'
import { api, isTauri, listenEvent } from './api'
import { DEFAULT_SETTINGS, type Quadrant, type Settings, type Task } from './types'
import { endOfThisWeek, startOfToday } from './lib/time'

export type ViewKey = 'all' | 'today' | 'week' | 'overdue' | 'done'

export interface Toast {
  id: number
  text: string
  actionLabel?: string
  action?: () => void
}

interface QuadBoardStore {
  tasks: Task[]
  settings: Settings
  ready: boolean
  now: number
  view: ViewKey
  search: string
  editingId: string | null
  settingsOpen: boolean
  toast: Toast | null

  init(): Promise<void>
  reload(): Promise<void>
  setView(v: ViewKey): void
  setSearch(s: string): void
  openEditor(id: string | null): void
  setSettingsOpen(open: boolean): void

  addTask(title: string, quadrant: Quadrant): string
  updateTask(id: string, patch: Partial<Task>): void
  toggleDone(id: string): void
  removeTask(id: string): void
  moveTask(id: string, targetQuadrant: Quadrant, targetIndex: number): void
  updateSettings(patch: Partial<Settings>): void
  showToast(text: string, actionLabel?: string, action?: () => void): void
}

function blankTask(title: string, q: Quadrant, tasks: Task[]): Task {
  const now = Date.now()
  const order = tasks
    .filter((t) => t.quadrant === q)
    .reduce((m, t) => Math.max(m, t.order), -1) + 1
  return {
    id: crypto.randomUUID(),
    title,
    note: '',
    quadrant: q,
    dueAt: null,
    remindAt: null,
    done: false,
    doneAt: null,
    createdAt: now,
    updatedAt: now,
    order,
    notified: false
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined

export const useStore = create<QuadBoardStore>((set, get) => {
  const persistTasks = () => {
    const tasks = get().tasks
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      void api.saveTasks(tasks)
    }, 200)
  }

  return {
    tasks: [],
    settings: { ...DEFAULT_SETTINGS },
    ready: false,
    now: Date.now(),
    view: 'all',
    search: '',
    editingId: null,
    settingsOpen: false,
    toast: null,

    async init() {
      const db = await api.load()
      set({ tasks: db.tasks ?? [], settings: { ...DEFAULT_SETTINGS, ...db.settings }, ready: true })
      if (isTauri) {
        void listenEvent('tasks-changed', () => void get().reload())
        void listenEvent('tick', () => set({ now: Date.now() }))
        void listenEvent('quick-add-shown', () => set({ editingId: null }))
      }
    },

    async reload() {
      const db = await api.load()
      set({ tasks: db.tasks ?? [], settings: { ...DEFAULT_SETTINGS, ...db.settings } })
    },

    setView(view) {
      set({ view })
    },
    setSearch(search) {
      set({ search })
    },
    openEditor(editingId) {
      set({ editingId })
    },
    setSettingsOpen(settingsOpen) {
      set({ settingsOpen })
    },

    addTask(title, quadrant) {
      const t = blankTask(title, quadrant, get().tasks)
      set({ tasks: [...get().tasks, t] })
      persistTasks()
      return t.id
    },

    updateTask(id, patch) {
      set({
        tasks: get().tasks.map((t) =>
          t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t
        )
      })
      persistTasks()
    },

    toggleDone(id) {
      set({
        tasks: get().tasks.map((t) => {
          if (t.id !== id) return t
          const done = !t.done
          return { ...t, done, doneAt: done ? Date.now() : null, notified: done ? true : t.notified, updatedAt: Date.now() }
        })
      })
      persistTasks()
    },

    removeTask(id) {
      const removed = get().tasks.find((t) => t.id === id)
      set({ tasks: get().tasks.filter((t) => t.id !== id), editingId: null })
      persistTasks()
      if (removed) {
        get().showToast('任务已删除', '撤销', () => {
          const tasks = get().tasks
          const order = tasks
            .filter((t) => t.quadrant === removed.quadrant)
            .reduce((m, t) => Math.max(m, t.order), -1) + 1
          set({ tasks: [...tasks, { ...removed, order, updatedAt: Date.now() }] })
          persistTasks()
        })
      }
    },

    moveTask(id, targetQuadrant, targetIndex) {
      const tasks = get().tasks
      const dragged = tasks.find((t) => t.id === id)
      if (!dragged) return
      const byQ: Record<number, Task[]> = { 1: [], 2: [], 3: [], 4: [] }
      for (const q of [1, 2, 3, 4] as Quadrant[]) {
        byQ[q] = tasks
          .filter((t) => t.quadrant === q && t.id !== id && !t.done)
          .sort((a, b) => a.order - b.order)
      }
      const list = byQ[targetQuadrant]
      const idx = Math.max(0, Math.min(targetIndex, list.length))
      list.splice(idx, 0, { ...dragged, quadrant: targetQuadrant })
      const out: Task[] = []
      for (const q of [1, 2, 3, 4] as Quadrant[]) {
        byQ[q].forEach((t, i) =>
          out.push({ ...t, quadrant: q, order: i, updatedAt: Date.now() })
        )
      }
      for (const t of tasks) {
        if (t.done && t.id !== id) out.push(t)
      }
      set({ tasks: out })
      persistTasks()
    },

    updateSettings(patch) {
      const settings = { ...get().settings, ...patch }
      set({ settings })
      void api.saveSettings(settings)
      if (patch.launchAtLogin !== undefined && isTauri) {
        void api.setAutostart(patch.launchAtLogin)
      }
    },

    showToast(text, actionLabel, action) {
      const id = Date.now()
      set({ toast: { id, text, actionLabel, action } })
      setTimeout(() => {
        if (get().toast?.id === id) set({ toast: null })
      }, 5000)
    }
  }
})

const byDue = (a: Task, b: Task) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity)

export function filterTasks(tasks: Task[], view: ViewKey, search: string): Task[] {
  const now = Date.now()
  const q = search.trim().toLowerCase()
  let list = tasks
  if (q) {
    list = list.filter(
      (t) => t.title.toLowerCase().includes(q) || t.note.toLowerCase().includes(q)
    )
  }
  switch (view) {
    case 'done':
      return list.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
    case 'overdue':
      return list.filter((t) => !t.done && t.dueAt !== null && t.dueAt < now).sort(byDue)
    case 'today': {
      const s = startOfToday(now)
      return list.filter((t) => !t.done && t.dueAt !== null && t.dueAt >= s && t.dueAt < s + 86400000).sort(byDue)
    }
    case 'week':
      return list.filter((t) => !t.done && t.dueAt !== null && t.dueAt < endOfThisWeek(now)).sort(byDue)
    case 'all':
    default:
      return list.filter((t) => !t.done)
  }
}

export function viewCounts(tasks: Task[]): Record<ViewKey, number> {
  const now = Date.now()
  const eow = endOfThisWeek(now)
  return {
    all: tasks.filter((t) => !t.done).length,
    today: tasks.filter((t) => !t.done && t.dueAt !== null && t.dueAt >= startOfToday(now) && t.dueAt < startOfToday(now) + 86400000).length,
    week: tasks.filter((t) => !t.done && t.dueAt !== null && t.dueAt < eow).length,
    overdue: tasks.filter((t) => !t.done && t.dueAt !== null && t.dueAt < now).length,
    done: tasks.filter((t) => t.done).length
  }
}
