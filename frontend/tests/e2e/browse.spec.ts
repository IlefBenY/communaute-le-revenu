import { expect, test } from '@playwright/test';

test.describe('Accueil de la communauté', () => {
  test('affiche les discussions issues de Strapi avec leurs métadonnées', async ({ page }) => {
    await page.goto('/');
    const cards = page.getByTestId('discussion-card');
    await expect(cards).toHaveCount(10);
    await expect(page.getByText(/\d+ discussions/)).toBeVisible();
    await expect(cards.first().locator('time')).toBeVisible();
  });

  test('filtre par catégorie et trie par date', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Catégories' }).getByRole('link', { name: 'Bourse & actions' }).click();
    await expect(page).toHaveURL(/category=bourse/);
    await expect(page.getByRole('heading', { name: 'Bourse & actions', level: 2 })).toBeVisible();

    const categories = page.getByTestId('discussion-card').getByRole('link', { name: 'Bourse & actions' });
    expect(await categories.count()).toBe(await page.getByTestId('discussion-card').count());

    const recent = await page.locator('[data-testid="discussion-card"] time').evaluateAll((els) => els.map((e) => e.getAttribute('datetime')));
    await page.getByRole('link', { name: 'Plus anciennes' }).click();
    await expect(page).toHaveURL(/sort=oldest/);
    await expect(page.getByRole('link', { name: 'Plus anciennes' })).toHaveAttribute('aria-current', 'page');
    const oldest = await page.locator('[data-testid="discussion-card"] time').evaluateAll((els) => els.map((e) => e.getAttribute('datetime')));
    // On vérifie l'ordre, pas le contenu exact : la catégorie peut contenir plus d'une page.
    expect(recent).toEqual([...recent].sort().reverse());
    expect(oldest).toEqual([...oldest].sort());
    expect(oldest[0]! <= recent[recent.length - 1]!).toBe(true);
  });

  test('navigue vers le détail d’une discussion', async ({ page }) => {
    await page.goto('/?sort=oldest');
    const first = page.getByTestId('discussion-card').first().getByRole('heading').getByRole('link');
    const title = await first.textContent();
    await first.click();

    await expect(page).toHaveURL(/\/discussions\/[a-z0-9-]+$/);
    await expect(page.getByRole('heading', { level: 1, name: title! })).toBeVisible();
    await expect(page.getByRole('heading', { name: /réponses?$/ })).toBeVisible();
  });

  test('affiche « Aucun résultat » pour une recherche sans correspondance', async ({ page }) => {
    await page.goto('/?q=zzzz-introuvable');
    await expect(page.getByText('Aucun résultat')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Pagination' })).toHaveCount(0);
  });

  test('affiche une page dédiée pour une discussion inconnue', async ({ page }) => {
    await page.goto('/discussions/cette-discussion-n-existe-pas');
    await expect(page.getByText('Discussion introuvable', { exact: true })).toBeVisible();
  });
});
