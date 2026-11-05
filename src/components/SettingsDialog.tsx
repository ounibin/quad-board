import { useEffect, useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import { QUADRANT_META, type Quadrant } from '../types'

export function SettingsDialog() {
  const open = useStore((s) => s.settingsOpen)
  const setOpen = useStore((s) => s.setSettingsOpen)
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const [dataDir, setDataDir] = useState('')
  const [autostart, setAutostart] = useState(false)

  useEffect(() => {
    if (!open) return
    void api.dataDir().then(setDataDir)
    void api.autostartEnabled().then(setAutostart)
  }, [open])

  if (!open) return null

  return (
    <div className="drawer-mask" onClick={() => setOpen(false)}>
      <div className="drawer settings" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <strong>设置</strong>
          <button className="icon-btn" onClick={() => setOpen(false)} title="关闭">
            ×
          </button>
        </div>

        <label className="field">
          <span className="field-label">外观主题</span>
          <select
            value={settings.theme}
            onChange={(e) => updateSettings({ theme: e.target.value as 'light' | 'dark' | 'system' })}
          >
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </label>

        <label className="check-row">
          <input
            type="checkbox"
            checked={autostart}
            onChange={(e) => {
              setAutostart(e.target.checked)
              updateSettings({ launchAtLogin: e.target.checked })
            }}
          />
          <span>开机自动启动</span>
        </label>

        <label className="check-row">
          <input
            type="checkbox"
            checked={settings.closeToTray}
            onChange={(e) => updateSettings({ closeToTray: e.target.checked })}
          />
          <span>关闭窗口时最小化到托盘</span>
        </label>

        <label className="field">
          <span className="field-label">快速添加默认象限</span>
          <select
            value={settings.quickAddQuadrant}
            onChange={(e) => updateSettings({ quickAddQuadrant: Number(e.target.value) as Quadrant })}
          >
            {([1, 2, 3, 4] as Quadrant[]).map((q) => (
              <option key={q} value={q}>
                {q} · {QUADRANT_META[q].name}（{QUADRANT_META[q].hint}）
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">提醒提前（分钟，0 为准点）</span>
          <input
            type="number"
            min={0}
            max={10080}
            value={settings.reminderLeadMinutes}
            onChange={(e) =>
              updateSettings({ reminderLeadMinutes: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
            }
          />
        </label>

        <div className="field">
          <span className="field-label">数据目录</span>
          <div className="path-row">
            <code>{dataDir}</code>
            <button className="btn" onClick={() => void api.revealDataDir()}>
              打开
            </button>
          </div>
          <span className="field-hint">quad-board-data.json，删除任务后 5 秒内可撤销；另有同名 .bak 备份</span>
        </div>

        <div className="drawer-foot">
          <button className="btn" onClick={() => void api.notifyTest()}>
            发送测试通知
          </button>
        </div>
      </div>
    </div>
  )
}
