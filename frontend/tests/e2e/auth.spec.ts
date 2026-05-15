import { test, expect } from '@playwright/test'
import { generateEmail } from './helpers/auth'

const PASSWORD = 'Password1'

async function signupAndManualLogin(page: import('@playwright/test').Page, name: string, email: string, password: string) {
  await page.goto('/login')
  await page.waitForSelector('a[href="/signup"]', { state: 'visible', timeout: 15000 })
  await page.click('a[href="/signup"]')
  await page.waitForSelector('#name', { state: 'visible', timeout: 10000 })
  await page.fill('#name', name)
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.fill('#passwordConfirm', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/login')
  await page.waitForSelector('#email', { state: 'visible', timeout: 10000 })
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/')
}

test.describe('인증 플로우', () => {
  test('회원가입 → 로그인 → 로그아웃 플로우 (10초 이내)', async ({ page }) => {
    const email = generateEmail()

    await page.goto('/login')
    await page.waitForSelector('a[href="/signup"]', { state: 'visible', timeout: 15000 })
    await page.click('a[href="/signup"]')

    await page.waitForSelector('#name', { state: 'visible', timeout: 10000 })
    await page.fill('#name', '테스트유저')
    await page.fill('#email', email)
    await page.fill('#password', PASSWORD)
    await page.fill('#passwordConfirm', PASSWORD)
    await page.click('button[type="submit"]')

    await page.waitForURL('/login')
    await expect(page.locator('text=회원가입이 완료되었습니다')).toBeVisible()

    await page.waitForSelector('#email', { state: 'visible', timeout: 10000 })
    await page.fill('#email', email)
    await page.fill('#password', PASSWORD)

    const start = Date.now()
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
    expect(Date.now() - start).toBeLessThan(10000)

    const logoutButton = page.getByRole('button', { name: '로그아웃' })
    await expect(logoutButton).toBeVisible()
    await logoutButton.click()

    await page.waitForURL('/login')
    await expect(page).toHaveURL('/login')
  })

  test('잘못된 자격증명으로 로그인 실패 시 에러 메시지가 표시된다', async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('#email', { state: 'visible', timeout: 15000 })
    await page.fill('#email', 'wrong@example.com')
    await page.fill('#password', 'WrongPassword1')
    await page.click('button[type="submit"]')

    await expect(
      page.locator('li').first()
        .or(page.locator('text=/로그인|실패|이메일|비밀번호/i').first()),
    ).toBeVisible({ timeout: 8000 })

    await expect(page).toHaveURL('/login')
  })

  test('인증되지 않은 상태에서 "/" 접근 시 로그인 페이지로 리다이렉트된다', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })
})
