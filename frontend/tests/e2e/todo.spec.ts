import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const STATE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '.auth', 'todo-user.json')

test.describe('할일 관리', () => {
  test.describe.configure({ mode: 'serial' })

  test.use({ storageState: STATE_FILE })

  test.afterEach(async ({ context }) => {
    await context.storageState({ path: STATE_FILE })
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[aria-label="카테고리 필터"]', { state: 'visible', timeout: 10000 })
  })

  test('할일 등록 성공 후 목록에 표시된다', async ({ page }) => {
    await page.click('a[href="/todos/new"]')
    await page.waitForURL('/todos/new')

    await page.fill('#title', 'E2E 테스트 할일')

    const categorySelect = page.locator('#categoryId')
    await categorySelect.waitFor({ state: 'visible' })
    const options = await categorySelect.locator('option:not([value=""])').all()
    if (options.length > 0) {
      const value = await options[0].getAttribute('value')
      await categorySelect.selectOption(value!)
    }

    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    await expect(page.locator('text=E2E 테스트 할일')).toBeVisible()
  })

  test('할일 완료 토글', async ({ page }) => {
    await page.click('a[href="/todos/new"]')
    await page.waitForURL('/todos/new')
    await page.fill('#title', '완료토글 테스트')

    const categorySelect = page.locator('#categoryId')
    await categorySelect.waitFor({ state: 'visible' })
    const options = await categorySelect.locator('option:not([value=""])').all()
    if (options.length > 0) {
      const value = await options[0].getAttribute('value')
      await categorySelect.selectOption(value!)
    }

    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    const todoItem = page.locator('li').filter({ hasText: '완료토글 테스트' })
    await expect(todoItem).toBeVisible()

    const toggleButton = todoItem.locator('[role="checkbox"][aria-label="할일 완료 토글"]')
    await expect(toggleButton).toHaveAttribute('aria-checked', 'false')

    await toggleButton.click()
    await expect(toggleButton).toHaveAttribute('aria-checked', 'true', { timeout: 5000 })
  })

  test('카테고리 필터 적용 시 URL에 categoryId 파라미터가 설정된다', async ({ page }) => {
    await page.goto('/')

    const filterSelect = page.locator('[aria-label="카테고리 필터"]')
    await filterSelect.waitFor({ state: 'visible' })

    const options = await filterSelect.locator('option').all()
    if (options.length > 1) {
      const secondOption = await options[1].getAttribute('value')
      await filterSelect.selectOption(secondOption!)
      await expect(page).toHaveURL(/categoryId=/)
    }
  })

  test('할일 삭제', async ({ page }) => {
    await page.click('a[href="/todos/new"]')
    await page.waitForURL('/todos/new')
    await page.fill('#title', '삭제할 할일')

    const categorySelect = page.locator('#categoryId')
    await categorySelect.waitFor({ state: 'visible' })
    const options = await categorySelect.locator('option:not([value=""])').all()
    if (options.length > 0) {
      const value = await options[0].getAttribute('value')
      await categorySelect.selectOption(value!)
    }

    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    const todoItem = page.locator('li').filter({ hasText: '삭제할 할일' })
    await expect(todoItem).toBeVisible()

    await todoItem.hover()
    const deleteButton = todoItem.locator('[aria-label="삭제할 할일 삭제"]')
    await deleteButton.click()

    const confirmButton = page.getByRole('button', { name: '삭제', exact: true })
    await confirmButton.click()

    await expect(page.locator('li').filter({ hasText: '삭제할 할일' })).not.toBeVisible({ timeout: 5000 })
  })

  test('dueDate < startDate 시 에러 메시지가 표시된다', async ({ page }) => {
    await page.click('a[href="/todos/new"]')
    await page.waitForURL('/todos/new')
    await page.fill('#title', '날짜 검증 할일')

    const categorySelect = page.locator('#categoryId')
    await categorySelect.waitFor({ state: 'visible' })
    const options = await categorySelect.locator('option:not([value=""])').all()
    if (options.length > 0) {
      const value = await options[0].getAttribute('value')
      await categorySelect.selectOption(value!)
    }

    await page.fill('#startDate', '2026-05-20')
    await page.fill('#dueDate', '2026-05-10')

    await page.click('button[type="submit"]')

    await expect(page.locator('text=/종료 예정일.*이후여야/i')).toBeVisible()
    await expect(page).toHaveURL('/todos/new')
  })
})
