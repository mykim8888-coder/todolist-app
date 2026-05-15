import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const STATE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '.auth', 'category-user.json')

test.describe('카테고리 관리', () => {
  test.describe.configure({ mode: 'serial' })

  test.use({ storageState: STATE_FILE })

  test.afterEach(async ({ context }) => {
    await context.storageState({ path: STATE_FILE })
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[aria-label="카테고리 필터"]', { state: 'visible', timeout: 10000 })
  })

  test('카테고리 생성 후 목록에 표시된다', async ({ page }) => {
    await page.goto('/categories')

    await page.fill('#category-name', 'E2E 테스트 카테고리')
    await page.click('button[type="submit"]:has-text("추가")')

    await expect(page.locator('text=E2E 테스트 카테고리')).toBeVisible({ timeout: 5000 })
  })

  test('기본 카테고리 삭제 버튼이 비활성화된다', async ({ page }) => {
    await page.goto('/categories')

    const defaultCategoryItem = page.locator('li').filter({ has: page.locator('text=기본') }).first()
    await expect(defaultCategoryItem).toBeVisible()

    const deleteButton = defaultCategoryItem.locator('button')
    await expect(deleteButton).toBeDisabled()
  })

  test('카테고리 삭제 후 소속 할일은 기본 카테고리로 재배정된다', async ({ page }) => {
    const newCategoryName = `재배정테스트_${Date.now()}`

    await page.goto('/categories')
    await page.fill('#category-name', newCategoryName)
    await page.click('button[type="submit"]:has-text("추가")')
    await expect(page.locator(`text=${newCategoryName}`)).toBeVisible({ timeout: 5000 })

    await page.goto('/todos/new')
    await page.fill('#title', '재배정될 할일')

    const categorySelect = page.locator('#categoryId')
    await categorySelect.waitFor({ state: 'visible' })

    let targetCategoryId: string | null = null
    const options = await categorySelect.locator('option').all()
    for (const option of options) {
      const text = await option.innerText()
      if (text.trim() === newCategoryName) {
        targetCategoryId = await option.getAttribute('value')
        break
      }
    }

    if (targetCategoryId) {
      await categorySelect.selectOption(targetCategoryId)
      await page.click('button[type="submit"]')
      await page.waitForURL('/')
      await expect(page.locator('li').filter({ hasText: '재배정될 할일' })).toBeVisible()
    }

    await page.goto('/categories')

    const categoryItem = page.locator('li').filter({ hasText: newCategoryName })
    await expect(categoryItem).toBeVisible()

    const deleteButton = categoryItem.locator(`[aria-label="${newCategoryName} 삭제"]`)
    await deleteButton.click()

    const confirmModal = page.getByRole('dialog')
    await expect(confirmModal).toBeVisible()
    await expect(confirmModal.locator('text=소속 할일은 기본 카테고리로 이동됩니다')).toBeVisible()

    await confirmModal.getByRole('button', { name: '삭제' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })
    await expect(page.locator('li').filter({ hasText: newCategoryName })).not.toBeVisible({ timeout: 5000 })

    if (targetCategoryId) {
      await page.goto('/')
      const todoItem = page.locator('li').filter({ hasText: '재배정될 할일' })
      await expect(todoItem).toBeVisible()
    }
  })
})
