import { differenceInCalendarDays, endOfWeek, format, isToday, startOfDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function fmtDue(dueAt: number | null, now = Date.now()): { text: string; level: 'over' | 'today' | 'soon' | 'none' } {
  if (!dueAt) return { text: '', level: 'none' }
  const d = new Date(dueAt)
  const days = differenceInCalendarDays(d, now)
  if (dueAt < now) {
    if (isToday(d)) return { text: `今天 ${format(d, 'HH:mm')}`, level: 'over' }
    return { text: `逾期 ${Math.abs(days)} 天`, level: 'over' }
  }
  if (isToday(d)) return { text: `今天 ${format(d, 'HH:mm')}`, level: 'today' }
  if (days === 1) return { text: '明天', level: 'soon' }
  if (days <= 7) return { text: format(d, 'eeee', { locale: zhCN }), level: 'soon' }
  return { text: format(d, 'M月d日', { locale: zhCN }), level: 'none' }
}

export function endOfThisWeek(now = Date.now()): number {
  return endOfWeek(new Date(now), { weekStartsOn: 1 }).getTime()
}

export function startOfToday(now = Date.now()): number {
  return startOfDay(new Date(now)).getTime()
}

/** 毫秒时间戳 -> datetime-local 输入值（本地时区） */
export function toLocalInput(ms: number | null): { date: string; time: string } {
  if (!ms) return { date: '', time: '' }
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`
  }
}

export function fromLocalInput(date: string, time: string): number | null {
  if (!date) return null
  const [y, m, dd] = date.split('-').map(Number)
  const [hh = 18, mm = 0] = (time || '18:00').split(':').map(Number)
  return new Date(y, m - 1, dd, hh, mm).getTime()
}
