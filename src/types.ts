export type Quadrant = 1 | 2 | 3 | 4

export interface Task {
  id: string
  title: string
  note: string
  quadrant: Quadrant
  dueAt: number | null
  remindAt: number | null
  done: boolean
  doneAt: number | null
  createdAt: number
  updatedAt: number
  order: number
  notified: boolean
}

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  launchAtLogin: boolean
  closeToTray: boolean
  quickAddQuadrant: Quadrant
  reminderLeadMinutes: number
  hideDone: boolean
}

export interface WindowGeom {
  x: number
  y: number
  width: number
  height: number
}

export interface Db {
  version: number
  tasks: Task[]
  settings: Settings
  windowState?: WindowGeom | null
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  launchAtLogin: false,
  closeToTray: true,
  quickAddQuadrant: 1,
  reminderLeadMinutes: 0,
  hideDone: false
}

export const QUADRANT_META: Record<Quadrant, { name: string; hint: string }> = {
  1: { name: '马上做', hint: '重要且紧急' },
  2: { name: '计划做', hint: '重要不紧急' },
  3: { name: '委托他人', hint: '紧急不重要' },
  4: { name: '别做', hint: '不重要不紧急' }
}
