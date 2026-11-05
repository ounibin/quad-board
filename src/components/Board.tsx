import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { filterTasks, useStore, type ViewKey } from '../store'
import { QUADRANT_META, type Quadrant, type Task } from '../types'
import { TaskCard } from './TaskCard'

const ORDER: Quadrant[] = [1, 2, 3, 4]

function QuadrantColumn({
  quadrant,
  tasks,
  canDrag
}: {
  quadrant: Quadrant
  tasks: Task[]
  canDrag: boolean
}) {
  const addTask = useStore((s) => s.addTask)
  const [text, setText] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const { setNodeRef, isOver } = useDroppable({ id: `q:${quadrant}` })
  const meta = QUADRANT_META[quadrant]

  const submit = (value: string) => {
    const t = value.trim()
    if (!t) return
    addTask(t, quadrant)
    setText('')
  }

  const startAdding = (target: EventTarget, currentTarget: EventTarget) => {
    if (
      target === currentTarget ||
      (target instanceof Element && target.closest('.q-empty'))
    ) {
      setIsAdding(true)
    }
  }

  return (
    <section className={`quadrant q${quadrant}`} ref={setNodeRef}>
      <header className="q-head">
        <div>
          <div className="q-name">{meta.name}</div>
          <div className="q-hint">{meta.hint}</div>
        </div>
        <span className="q-count">{tasks.length}</span>
      </header>
      <div className="q-list" onClick={(e) => startAdding(e.target, e.currentTarget)}>
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
        {tasks.length === 0 && !isAdding && (
          <div className="q-empty">{canDrag ? '点击这里快速添加任务，也可以拖动任务到此处' : '点击这里快速添加任务'}</div>
        )}
        {isAdding && (
          <div className="q-add">
            <input
              autoFocus
              value={text}
              placeholder="＋ 点击此处，添加任务"
              onChange={(e) => setText(e.target.value)}
              onBlur={(e) => submit(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submit(e.currentTarget.value)
                }
                if (e.key === 'Escape') {
                  setText('')
                  setIsAdding(false)
                }
              }}
            />
          </div>
        )}
      </div>
      {isOver && <div className="q-over-ring" />}
    </section>
  )
}

export function Board() {
  const tasks = useStore((s) => s.tasks)
  const view = useStore((s) => s.view)
  const search = useStore((s) => s.search)
  const moveTask = useStore((s) => s.moveTask)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const visible = filterTasks(tasks, view as ViewKey, search)
  const canDrag = view === 'all' && !search.trim()

  const ordered: Record<number, Task[]> = {}
  for (const q of ORDER) {
    ordered[q] = visible.filter((t) => t.quadrant === q).sort((a, b) => a.order - b.order)
  }

  const onDragStart = (e: DragStartEvent) => {
    if (!canDrag) return
    setActiveId(String(e.active.id))
  }

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    if (!canDrag) return
    const activeId = String(e.active.id)
    const overId = e.over ? String(e.over.id) : null
    if (!overId || overId === activeId) return

    let targetQ: Quadrant | null = null
    let targetIndex = 0
    if (overId.startsWith('q:')) {
      targetQ = Number(overId.slice(2)) as Quadrant
      targetIndex = ordered[targetQ].length
    } else if (overId.startsWith('t:')) {
      const tid = overId.slice(2)
      const target = tasks.find((t) => t.id === tid)
      if (!target || target.done) return
      targetQ = target.quadrant
      const list = ordered[targetQ]
      const i = list.findIndex((t) => t.id === tid)
      targetIndex = i === -1 ? list.length : i
    }
    if (targetQ !== null) moveTask(activeId, targetQ, targetIndex)
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className={`board ${canDrag ? '' : 'no-drag'}`}>
        {ORDER.map((q) => (
          <QuadrantColumn key={q} quadrant={q} tasks={ordered[q]} canDrag={canDrag} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? <div className="task drag-ghost">{activeTask.title}</div> : null}
      </DragOverlay>
    </DndContext>
  )
}
