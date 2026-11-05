import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Task } from '../types'
import { fmtDue } from '../lib/time'
import { useStore } from '../store'

interface ContextMenuPosition {
  x: number
  y: number
}

export function TaskCard({ task }: { task: Task }) {
  const toggleDone = useStore((s) => s.toggleDone)
  const openEditor = useStore((s) => s.openEditor)
  const removeTask = useStore((s) => s.removeTask)
  const active = useStore((s) => s.editingId === task.id)
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: task.id,
    disabled: task.done,
    data: { kind: 'task' }
  })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `t:${task.id}` })

  const due = fmtDue(task.dueAt)

  useEffect(() => {
    if (!contextMenu) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!contextMenuRef.current?.contains(event.target as Node)) {
        setContextMenu(null)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContextMenu(null)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [contextMenu])

  const openContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    setContextMenu({
      x: Math.min(event.clientX, window.innerWidth - 160),
      y: Math.min(event.clientY, window.innerHeight - 48)
    })
  }

  return (
    <div
      ref={(el) => {
        setDragRef(el)
        setDropRef(el)
      }}
      {...listeners}
      {...attributes}
      className={[
        'task',
        task.done ? 'is-done' : '',
        isDragging ? 'is-dragging' : '',
        isOver ? 'is-over' : '',
        active ? 'is-active' : ''
      ].join(' ')}
      onClick={() => openEditor(task.id)}
      onContextMenu={openContextMenu}
    >
      <button
        className="task-check"
        aria-label={task.done ? '标记为未完成' : '完成任务'}
        onClick={(e) => {
          e.stopPropagation()
          toggleDone(task.id)
        }}
      />
      <div className="task-body">
        <div className="task-title">{task.title}</div>
        {(due.text || task.note.trim()) && (
          <div className="task-meta">
            {due.text && <span className={`due due-${due.level}`}>{due.text}</span>}
            {task.note.trim() && <span className="note-dot" title={task.note}>备注</span>}
          </div>
        )}
      </div>
      <button
        className="task-del"
        title="删除"
        onClick={(e) => {
          e.stopPropagation()
          removeTask(task.id)
        }}
      >
        ×
      </button>
      {contextMenu &&
        createPortal(
          <div
            ref={contextMenuRef}
            className="task-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              className="task-context-menu-item"
              onClick={() => {
                setContextMenu(null)
                removeTask(task.id)
              }}
            >
              删除任务
            </button>
          </div>,
          document.body
        )}
    </div>
  )
}
