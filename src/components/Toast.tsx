import { useStore } from '../store'

export function Toast() {
  const toast = useStore((s) => s.toast)
  if (!toast) return null
  return (
    <div className="toast" key={toast.id}>
      <span>{toast.text}</span>
      {toast.actionLabel && (
        <button
          onClick={() => {
            toast.action?.()
            useStore.setState({ toast: null })
          }}
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  )
}
