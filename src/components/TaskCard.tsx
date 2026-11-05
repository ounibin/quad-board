import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Task } from '../types'
import { fmtDue } from '../lib/time'
import { useStore } from '../store'

export function TaskCard({ task }: { task: Task }) {
  const toggleDone = useStore((s) => s.toggleDone)
  const openEditor = useStore((s) => s.openEditor)
  const removeTask = useStore((s) => s.removeTask)
  const active = useStore((s) => s.editingId === task.id)

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: task.id,
    disabled: task.done,
    data: { kind: 'task' }
  })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `t:${task.id}` })

  const due = fmtDue(task.dueAt)

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
    </div>
  )
}
