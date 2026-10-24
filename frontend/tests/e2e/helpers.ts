import { expect, type Page } from '@playwright/test';

export const DEMO_PASSWORD = 'Demo1234!';

export async function login(page: Page, username = 'Thomas_PEA', next = '/') {
  await page.goto(`/connexion?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Pseudo ou e-mail').fill(username);
  await page.getByLabel('Mot de passe').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('button', { name: 'Déconnexion' })).toBeVisible();
}
