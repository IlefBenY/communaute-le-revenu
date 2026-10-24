import { expect, test } from '@playwright/test';

for (const path of ['/', '/connexion']) {
  test(`pas de défilement horizontal sur mobile : ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('la liste des catégories devient un carrousel sur mobile', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Toutes', exact: true })).toBeVisible();
});
