import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { fromLocalInput, toLocalInput } from '../lib/time'
import { QUADRANT_META, type Quadrant } from '../types'

export function TaskDrawer() {
  const editingId = useStore((s) => s.editingId)
  const tasks = useStore((s) => s.tasks)
  const openEditor = useStore((s) => s.openEditor)
  const updateTask = useStore((s) => s.updateTask)
  const removeTask = useStore((s) => s.removeTask)
  const settings = useStore((s) => s.settings)

  const task = tasks.find((t) => t.id === editingId) ?? null
  const [due, setDue] = useState({ date: '', time: '' })

  useEffect(() => {
    if (task) {
      setDue(toLocalInput(task.dueAt))
    }
  }, [task?.id])

  if (!task) return null

  const applyDue = (nextDate: string, nextTime: string) => {
    setDue({ date: nextDate, time: nextTime })
    const ms = fromLocalInput(nextDate, nextTime)
    const remindAt =
      ms !== null && settings.reminderLeadMinutes > 0
        ? ms - settings.reminderLeadMinutes * 60000
        : ms
    updateTask(task.id, {
      dueAt: ms,
      remindAt: task.remindAt !== null && ms !== null ? Math.min(task.remindAt, ms) : remindAt,
      notified: false
    })
  }

  const close = () => {
    if (task.title.trim() === '') {
      removeTask(task.id)
    } else {
      openEditor(null)
    }
  }

  return (
    <div className="drawer-mask" onClick={close}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <span className={`q-badge q${task.quadrant}`}>{QUADRANT_META[task.quadrant].name}</span>
          <button className="icon-btn" onClick={close} title="关闭">
            ×
          </button>
        </div>

        <label className="field">
          <span className="field-label">标题</span>
          <textarea
            autoFocus
            rows={2}
            value={task.title}
            placeholder="要做什么？"
            onChange={(e) => updateTask(task.id, { title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                close()
              }
            }}
          />
        </label>

        <label className="field">
          <span className="field-label">备注</span>
          <textarea
            rows={3}
            value={task.note}
            placeholder="补充信息、链接、下一步…"
            onChange={(e) => updateTask(task.id, { note: e.target.value })}
          />
        </label>

        <div className="field">
          <span className="field-label">象限</span>
          <div className="q-picker">
            {([1, 2, 3, 4] as Quadrant[]).map((q) => (
              <button
                key={q}
                className={`q-opt q${q} ${task.quadrant === q ? 'is-active' : ''}`}
                onClick={() => updateTask(task.id, { quadrant: q })}
              >
                {q} · {QUADRANT_META[q].name}
              </button>
            ))}
          </div>
        </div>

        <div className="field-row">
          <label className="field">
            <span className="field-label">截止日期</span>
            <input
              type="date"
              value={due.date}
              onChange={(e) => applyDue(e.target.value, due.time)}
            />
          </label>
          <label className="field">
            <span className="field-label">时间</span>
            <input
              type="time"
              value={due.time}
              onChange={(e) => applyDue(due.date, e.target.value)}
            />
          </label>
        </div>

        {task.dueAt !== null && (
          <label className="check-row">
            <input
              type="checkbox"
              checked={task.remindAt !== null}
              onChange={(e) =>
                updateTask(task.id, {
                  remindAt: e.target.checked
                    ? Math.max(Date.now() + 60000, task.dueAt! - settings.reminderLeadMinutes * 60000)
                    : null,
                  notified: false
                })
              }
            />
            <span>到期提醒</span>
            {task.remindAt !== null && (
              <span className="field-hint">{toLocalInput(task.remindAt).date} {toLocalInput(task.remindAt).time} 提醒</span>
            )}
          </label>
        )}

        <div className="drawer-foot">
          <button className="btn danger" onClick={() => removeTask(task.id)}>
            删除任务
          </button>
          <span className="field-hint">修改即时保存 · Esc 关闭</span>
        </div>
      </div>
    </div>
  )
}
