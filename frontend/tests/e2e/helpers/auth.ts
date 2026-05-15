import type { Page } from '@playwright/test'

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/')
  try {
    await page.waitForSelector('[aria-label="카테고리 필터"]', { state: 'visible', timeout: 8000 })
    return
  } catch {
    // session not valid, proceed to login
  }

  if (!page.url().includes('/login')) {
    await page.goto('/login')
  }
  await page.waitForSelector('#email', { state: 'visible', timeout: 10000 })

  for (let attempt = 0; attempt < 2; attempt++) {
    await page.fill('#email', email)
    await page.fill('#password', password)

    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/auth/login') && resp.request().method() === 'POST',
      { timeout: 16000 },
    )
    await page.click('button[type="submit"]')

    let response
    try {
      response = await responsePromise
    } catch {
      if (attempt === 1) throw new Error(`loginAs: no login response for ${email}`)
      await page.waitForTimeout(1000)
      continue
    }

    if (response.status() !== 200) {
      const body = await response.json().catch(() => ({}))
      if (attempt === 1)
        throw new Error(`loginAs: login failed ${response.status()} for ${email}: ${JSON.stringify(body)}`)
      await page.waitForTimeout(1000)
      continue
    }

    await page.waitForURL('/', { timeout: 10000 })
    break
  }

  await page.waitForSelector('[aria-label="카테고리 필터"]', { state: 'visible', timeout: 10000 })
}

export async function signupAndLogin(page: Page, name: string, email: string, password: string) {
  await page.goto('/signup')
  await page.waitForSelector('#name', { state: 'visible', timeout: 15000 })
  await page.fill('#name', name)
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.fill('#passwordConfirm', password)
  await page.click('button[type="submit"]')

  await page.waitForURL('/login', { timeout: 15000 })
  await page.waitForSelector('#email', { state: 'visible', timeout: 10000 })
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/', { timeout: 20000 })
  await page.waitForSelector('[aria-label="카테고리 필터"]', { state: 'visible', timeout: 10000 })
}

export function generateEmail() {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@e2e.test`
}
