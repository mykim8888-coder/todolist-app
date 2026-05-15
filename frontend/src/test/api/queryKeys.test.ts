import { describe, it, expect } from 'vitest'
import { todoKeys, categoryKeys } from '@/api/queryKeys'
import type { TodoFilter } from '@/types/todo.types'

describe('todoKeys', () => {
  it('all은 ["todos"]를 반환한다', () => {
    expect(todoKeys.all).toEqual(['todos'])
  })

  it('list(filter)는 ["todos", "list", filter]를 반환한다', () => {
    const filter: TodoFilter = { isCompleted: false }
    expect(todoKeys.list(filter)).toEqual(['todos', 'list', filter])
  })

  it('list()는 빈 필터에 대해서도 올바른 키를 반환한다', () => {
    const filter: TodoFilter = {}
    expect(todoKeys.list(filter)).toEqual(['todos', 'list', {}])
  })

  it('list()는 다른 필터에 대해 다른 키를 반환한다', () => {
    const filter1: TodoFilter = { isCompleted: true }
    const filter2: TodoFilter = { isCompleted: false }
    expect(todoKeys.list(filter1)).not.toEqual(todoKeys.list(filter2))
  })

  it('list()에서 반환된 키는 all 키를 prefix로 포함한다', () => {
    const filter: TodoFilter = { overdue: true }
    const listKey = todoKeys.list(filter)
    expect(listKey[0]).toBe(todoKeys.all[0])
  })

  it('categoryId 필터가 포함된 키는 해당 필터를 그대로 담는다', () => {
    const filter: TodoFilter = { categoryId: 'cat-uuid', isCompleted: false }
    const key = todoKeys.list(filter)
    expect(key[2]).toEqual(filter)
  })

  it('all 키는 as const로 고정되어 있다', () => {
    expect(todoKeys.all).toStrictEqual(['todos'])
  })
})

describe('categoryKeys', () => {
  it('list()는 ["categories", "list"]를 반환한다', () => {
    expect(categoryKeys.list()).toEqual(['categories', 'list'])
  })

  it('list()를 여러 번 호출해도 동일한 구조를 반환한다', () => {
    expect(categoryKeys.list()).toEqual(categoryKeys.list())
  })
})

describe('QueryClient invalidation 범위', () => {
  it('todoKeys.all은 todoKeys.list 쿼리를 포함하는 prefix이다', () => {
    const filter: TodoFilter = { isCompleted: true }
    const allKey = todoKeys.all
    const listKey = todoKeys.list(filter)
    expect(listKey.slice(0, allKey.length)).toEqual(allKey)
  })

  it('categoryKeys.list와 todoKeys.list는 서로 다른 최상위 key를 가진다', () => {
    const filter: TodoFilter = {}
    expect(categoryKeys.list()[0]).not.toBe(todoKeys.list(filter)[0])
  })
})
