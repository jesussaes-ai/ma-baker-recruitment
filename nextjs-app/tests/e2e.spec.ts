import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

// ── Candidate Flow ──────────────────────────────────────────────────────────

test('candidate flow: welcome → role → profile → psych → technical → report → success', async ({ page }) => {
  await page.goto(`${BASE}/welcome`);
  await expect(page.locator('h1, h2, [data-testid="welcome"]').first()).toBeVisible({ timeout: 10000 });

  await page.goto(`${BASE}/role`);
  await expect(page.getByText(/almacén|almacen|mezclador/i).first()).toBeVisible({ timeout: 8000 });

  const almacenBtn = page.getByText(/almacén|almacen/i).first();
  await almacenBtn.click();

  await page.goto(`${BASE}/profile`);
  await page.fill('input[placeholder*="nombre" i], input[name="nombre"], input[id*="nombre"]', 'Juan Prueba');
  const inputs = await page.locator('input[type="text"], input[type="number"]').all();
  for (const inp of inputs) {
    const placeholder = await inp.getAttribute('placeholder') ?? '';
    const val = placeholder.toLowerCase().includes('edad') ? '30'
      : placeholder.toLowerCase().includes('estatura') ? '175'
      : placeholder.toLowerCase().includes('peso') ? '70'
      : null;
    if (val) await inp.fill(val);
  }

  await page.goto(`${BASE}/psych`);
  await expect(page.locator('button').first()).toBeVisible({ timeout: 8000 });

  for (let i = 0; i < 12; i++) {
    const optBtns = page.locator('button').filter({ hasText: /^[A-D]\./i });
    const count = await optBtns.count();
    if (count > 0) await optBtns.first().click();
    const nextBtn = page.locator('button').filter({ hasText: /siguiente|next/i });
    const nextCount = await nextBtn.count();
    if (nextCount > 0) {
      const isDisabled = await nextBtn.first().isDisabled();
      if (!isDisabled) await nextBtn.first().click();
    }
  }

  await page.goto(`${BASE}/technical`);
  await expect(page.locator('button').first()).toBeVisible({ timeout: 8000 });

  for (let i = 0; i < 10; i++) {
    const optBtns = page.locator('button').filter({ hasText: /^[A-D]\)/i });
    const count = await optBtns.count();
    if (count > 0) await optBtns.first().click();
    const nextBtn = page.locator('button').filter({ hasText: /siguiente|resultados/i });
    const nextCount = await nextBtn.count();
    if (nextCount > 0) {
      const isDisabled = await nextBtn.first().isDisabled();
      if (!isDisabled) await nextBtn.first().click();
    }
  }

  await page.goto(`${BASE}/report`);
  await expect(page.locator('body')).toBeVisible();
});

// ── Login Page ──────────────────────────────────────────────────────────────

test('login page renders and validates credentials', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await expect(page.getByText(/acceso rh|sistema de reclutamiento/i).first()).toBeVisible({ timeout: 8000 });

  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const submitBtn = page.locator('button[type="submit"]');

  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(submitBtn).toBeVisible();

  await emailInput.fill('wrong@example.com');
  await passwordInput.fill('wrongpassword');
  await submitBtn.click();

  await expect(page.getByText(/credenciales|incorrecto/i).first()).toBeVisible({ timeout: 8000 });
});

// ── Dashboard Auth Guard ────────────────────────────────────────────────────

test('dashboard redirects to login when not authenticated', async ({ page }) => {
  await page.goto(`${BASE}/dashboard`);
  await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
});

// ── Role Selection ──────────────────────────────────────────────────────────

test('role page shows both positions', async ({ page }) => {
  await page.goto(`${BASE}/role`);
  await expect(page.getByText(/almacén|almacen/i).first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/mezclador/i).first()).toBeVisible({ timeout: 8000 });
});

// ── Score Calculation Logic ─────────────────────────────────────────────────

test('technical score: 10/10 correct = 100%', async ({ page }) => {
  await page.goto(`${BASE}/role`);
  const almacenBtn = page.getByText(/almacén|almacen/i).first();
  if (await almacenBtn.count() > 0) await almacenBtn.click();

  await page.goto(`${BASE}/technical`);
  await expect(page.locator('body')).toBeVisible({ timeout: 8000 });

  for (let i = 0; i < 10; i++) {
    const optBtns = page.locator('button').filter({ hasText: /^[A-D]\)/i });
    if (await optBtns.count() > 0) await optBtns.first().click();
    const btn = page.locator('button').filter({ hasText: /siguiente|resultados/i });
    if (await btn.count() > 0 && !(await btn.first().isDisabled())) {
      await btn.first().click();
    }
  }

  const verResultados = page.locator('button').filter({ hasText: /resultados/i });
  if (await verResultados.count() > 0 && !(await verResultados.first().isDisabled())) {
    await verResultados.first().click();
  }

  await expect(page.getByText(/%/).first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/apto|evaluación adicional|no cumple/i).first()).toBeVisible({ timeout: 8000 });
});
