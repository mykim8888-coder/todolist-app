import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUTH_DIR = path.join(__dirname, '.auth')
const BASE_URL = 'http://localhost:5173'
const PASSWORD = 'Password1'

async function setupUser(name: string, email: string, stateFile: string) {
  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL: BASE_URL })
  const page = await context.newPage()

  await page.goto('/signup')
  await page.waitForSelector('#name', { state: 'visible', timeout: 15000 })
  await page.fill('#name', name)
  await page.fill('#email', email)
  await page.fill('#password', PASSWORD)
  await page.fill('#passwordConfirm', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('/login', { timeout: 15000 })

  await page.waitForSelector('#email', { state: 'visible', timeout: 10000 })
  await page.fill('#email', email)
  await page.fill('#password', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('/', { timeout: 20000 })
  await page.waitForSelector('[aria-label="카테고리 필터"]', { state: 'visible', timeout: 10000 })

  await context.storageState({ path: stateFile })
  await browser.close()
}

export default async function globalSetup() {
  fs.mkdirSync(AUTH_DIR, { recursive: true })

  const ts = Date.now()
  await setupUser(
    '카테고리테스트유저',
    `e2e.category.${ts}@test.local`,
    path.join(AUTH_DIR, 'category-user.json'),
  )
  await setupUser(
    '할일테스트유저',
    `e2e.todo.${ts}@test.local`,
    path.join(AUTH_DIR, 'todo-user.json'),
  )
}
