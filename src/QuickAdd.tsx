import { useEffect, useState } from 'react'
import { api, isTauri, listenEvent } from './api'
import { useStore } from './store'
import { QUADRANT_META, type Quadrant } from './types'

export function QuickAdd() {
  const [text, setText] = useState('')
  const [q, setQ] = useState<Quadrant>(1)
  const settings = useStore((s) => s.settings)

  useEffect(() => {
    void useStore.getState().init()
  }, [])

  useEffect(() => {
    setQ(settings.quickAddQuadrant)
  }, [settings.quickAddQuadrant])

  useEffect(() => {
    if (!isTauri) return
    let cleanup: (() => void) | undefined
    void listenEvent('quick-add-shown', () => {
      setText('')
    }).then((fn) => {
      cleanup = fn
    })
    return () => cleanup?.()
  }, [])

  const submit = async () => {
    const t = text.trim()
    if (!t) return
    try {
      await api.createTask(t, q)
      setText('')
      await api.hideQuickAdd()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="quick">
      <div className="quick-drag" data-tauri-drag-region>
        快速添加
      </div>
      <div className="quick-row">
        <input
          autoFocus
          value={text}
          placeholder="想到什么就写下来，回车保存…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
            if (e.key === 'Escape') void api.hideQuickAdd()
            if (e.key >= '1' && e.key <= '4' && e.altKey) setQ(Number(e.key) as Quadrant)
          }}
        />
      </div>
      <div className="quick-foot">
        <div className="q-picker">
          {([1, 2, 3, 4] as Quadrant[]).map((n) => (
            <button
              key={n}
              className={`q-opt q${n} ${q === n ? 'is-active' : ''}`}
              onClick={() => setQ(n)}
              title={`Alt+${n}`}
            >
              {QUADRANT_META[n].name}
            </button>
          ))}
        </div>
        <span className="field-hint">Enter 保存 · Esc 关闭 · Alt+1~4 换象限</span>
      </div>
    </div>
  )
}
