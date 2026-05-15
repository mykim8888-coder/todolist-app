import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import dayjs from 'dayjs'
import { isOverdue } from '@/utils/dateUtils'

describe('isOverdue', () => {
  const TODAY = '2026-05-14'

  beforeEach(() => {
    vi.setSystemTime(new Date(`${TODAY}T12:00:00`))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('null 이면 false를 반환한다', () => {
    expect(isOverdue(null)).toBe(false)
  })

  it('오늘 날짜이면 false를 반환한다', () => {
    expect(isOverdue(TODAY)).toBe(false)
  })

  it('어제 날짜이면 true를 반환한다', () => {
    const yesterday = dayjs(TODAY).subtract(1, 'day').format('YYYY-MM-DD')
    expect(isOverdue(yesterday)).toBe(true)
  })

  it('내일 날짜이면 false를 반환한다', () => {
    const tomorrow = dayjs(TODAY).add(1, 'day').format('YYYY-MM-DD')
    expect(isOverdue(tomorrow)).toBe(false)
  })

  it('먼 과거 날짜이면 true를 반환한다', () => {
    expect(isOverdue('2020-01-01')).toBe(true)
  })

  it('먼 미래 날짜이면 false를 반환한다', () => {
    expect(isOverdue('2030-12-31')).toBe(false)
  })
})
