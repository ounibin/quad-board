import { useEffect } from 'react'
import { useStore } from './store'
import { Sidebar } from './components/Sidebar'
import { Board } from './components/Board'
import { TaskDrawer } from './components/TaskDrawer'
import { SettingsDialog } from './components/SettingsDialog'
import { Toast } from './components/Toast'

function useTheme() {
  const theme = useStore((s) => s.settings.theme)
  useEffect(() => {
    const apply = () => {
      const prefersDark =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      const t = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
      document.documentElement.dataset.theme = t
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [theme])
}

export function App() {
  const init = useStore((s) => s.init)
  const ready = useStore((s) => s.ready)
  const search = useStore((s) => s.search)
  const setSearch = useStore((s) => s.setSearch)
  const addTask = useStore((s) => s.addTask)
  const openEditor = useStore((s) => s.openEditor)
  const editingId = useStore((s) => s.editingId)
  const settingsOpen = useStore((s) => s.settingsOpen)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)

  useEffect(() => {
    void init()
  }, [])

  useTheme()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (settingsOpen) setSettingsOpen(false)
        else if (editingId) openEditor(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen, editingId])

  if (!ready) {
    return <div className="boot">正在加载…</div>
  }

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <div className="toolbar">
          <input
            className="search"
            value={search}
            placeholder="搜索任务或备注…"
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className="btn primary"
            onClick={() => {
              const id = addTask('', 1)
              openEditor(id)
            }}
          >
            ＋ 新任务
          </button>
        </div>
        <Board />
      </main>
      <TaskDrawer />
      <SettingsDialog />
      <Toast />
    </div>
  )
}
