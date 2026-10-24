import { expect, test } from '@playwright/test';
import { login } from './helpers';

const PEA = '/discussions/ouvrir-un-pea-avec-5-000-par-ou-commencer';

test('un membre marque une réponse « Utile » puis retire son vote', async ({ page }) => {
  await login(page, 'Claire_Nantes', PEA);
  await expect(page).toHaveURL(PEA);

  const reply = page.getByTestId('reply').filter({ hasText: 'PapyBoursier' });
  const button = reply.getByRole('button', { name: /Utile/ });
  const initiallyPressed = (await button.getAttribute('aria-pressed')) === 'true';
  const count = Number((await button.textContent())!.replace(/\D/g, ''));

  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', String(!initiallyPressed));
  await expect(button).toContainText(String(initiallyPressed ? count - 1 : count + 1));

  // L'état est persisté côté Strapi.
  await page.reload();
  await expect(reply.getByRole('button', { name: /Utile/ })).toHaveAttribute('aria-pressed', String(!initiallyPressed));

  await reply.getByRole('button', { name: /Utile/ }).click();
  await expect(reply.getByRole('button', { name: /Utile/ })).toHaveAttribute('aria-pressed', String(initiallyPressed));
});

test('l’auteur choisit la meilleure réponse, qui passe en tête', async ({ page }) => {
  await login(page, 'Thomas_PEA', PEA);
  await expect(page).toHaveURL(PEA);

  const first = page.getByTestId('reply').first();
  const previousBest = (await first.getAttribute('data-best')) ? await first.textContent() : null;

  const candidate = page.getByTestId('reply').filter({ hasText: 'LaRedaction' });
  await candidate.getByRole('button', { name: 'Choisir comme meilleure réponse' }).click();

  await expect(page.getByTestId('reply').first()).toContainText('LaRedaction');
  await expect(page.getByTestId('reply').first()).toContainText('Meilleure réponse');

  // Remise en état : on rétablit la meilleure réponse d'origine (données de démo).
  if (previousBest?.includes('Vincent_ETF')) {
    await page.getByTestId('reply').filter({ hasText: 'Vincent_ETF' }).getByRole('button', { name: 'Choisir comme meilleure réponse' }).click();
    await expect(page.getByTestId('reply').first()).toContainText('Vincent_ETF');
  }
});

test('un visiteur ne peut ni voter ni choisir la meilleure réponse', async ({ page }) => {
  await page.goto(PEA);
  await expect(page.getByRole('link', { name: /Utile/ }).first()).toHaveAttribute('href', /\/connexion\?next=/);
  await expect(page.getByRole('button', { name: /meilleure réponse/ })).toHaveCount(0);
});

test('le profil d’un membre est accessible depuis une discussion', async ({ page }) => {
  await page.goto(PEA);
  await page.getByRole('article').getByRole('link', { name: 'Thomas_PEA' }).click();

  await expect(page).toHaveURL('/membres/Thomas_PEA');
  await expect(page.getByRole('heading', { level: 1, name: 'Thomas_PEA' })).toBeVisible();
  await expect(page.getByText('meilleures réponses')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Discussions récentes' }).getByRole('link', { name: /Ouvrir un PEA/ })).toBeVisible();
});
