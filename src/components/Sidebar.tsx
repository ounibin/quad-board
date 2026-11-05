import { useStore, viewCounts, type ViewKey } from '../store'

const ITEMS: { key: ViewKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'today', label: '今天' },
  { key: 'week', label: '本周' },
  { key: 'overdue', label: '已逾期' },
  { key: 'done', label: '已完成' }
]

export function Sidebar() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  const counts = viewCounts(useStore((s) => s.tasks))

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" />
        Quad Board
      </div>
      <nav className="nav">
        {ITEMS.map((it) => (
          <button
            key={it.key}
            className={`nav-item ${view === it.key ? 'is-active' : ''}`}
            onClick={() => setView(it.key)}
          >
            <span>{it.label}</span>
            {counts[it.key] > 0 && <span className="nav-count">{counts[it.key]}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <button className="nav-item" onClick={() => setSettingsOpen(true)}>
          <span>设置</span>
        </button>
      </div>
    </aside>
  )
}
