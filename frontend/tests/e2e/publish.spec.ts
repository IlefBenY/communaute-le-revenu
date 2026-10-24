import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('Visiteur non connecté', () => {
  test('est redirigé vers la connexion pour créer une discussion', async ({ page }) => {
    await page.goto('/nouvelle-discussion');
    await expect(page).toHaveURL(/\/connexion\?next=%2Fnouvelle-discussion|\/connexion\?next=\/nouvelle-discussion/);
  });

  test('est invité à se connecter pour répondre', async ({ page }) => {
    await page.goto('/?sort=oldest');
    await page.getByTestId('discussion-card').first().getByRole('heading').getByRole('link').click();
    await expect(page.getByRole('link', { name: 'Se connecter pour répondre' })).toBeVisible();
    await expect(page.getByLabel(/Votre réponse/)).toHaveCount(0);
  });

  test('voit une erreur avec de mauvais identifiants', async ({ page }) => {
    await page.goto('/connexion');
    await page.getByLabel('Pseudo ou e-mail').fill('Thomas_PEA');
    await page.getByLabel('Mot de passe').fill('mauvais');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByText('Identifiant ou mot de passe incorrect.')).toBeVisible();
  });
});

test('un membre crée une discussion puis y répond', async ({ page }) => {
  const title = `Test E2E ${Date.now()} : investir chaque mois ?`;
  await login(page, 'Thomas_PEA', '/nouvelle-discussion');
  await expect(page).toHaveURL(/\/nouvelle-discussion$/);

  // Erreurs de validation affichées et saisie conservée.
  await page.getByLabel('Titre').fill('Court');
  await page.getByRole('button', { name: 'Publier' }).click();
  await expect(page.getByText('Le titre doit contenir au moins 10 caractères.')).toBeVisible();
  await expect(page.getByText('Choisissez une catégorie.')).toBeVisible();
  await expect(page.getByText('Le contenu est obligatoire.')).toBeVisible();
  await expect(page.getByLabel('Titre')).toHaveValue('Court');

  await page.getByLabel('Titre').fill(title);
  await page.getByLabel('Catégorie').selectOption('bourse');
  await page.getByLabel('Contenu').fill('Je souhaite **programmer** un versement mensuel.\n\n- Montant : 200 €\n- Support : ETF monde');
  await page.getByRole('button', { name: 'Publier' }).click();

  // Redirection vers la nouvelle discussion.
  await expect(page).toHaveURL(/\/discussions\/test-e2e-\d+-investir-chaque-mois$/);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByText('Thomas_PEA').first()).toBeVisible();
  await expect(page.getByText('0 réponse')).toBeVisible();

  // Réponse enregistrée via Strapi et visible immédiatement.
  await page.getByLabel(/Votre réponse/).fill('Je fais pareil depuis deux ans, ça marche bien.');
  await page.getByRole('button', { name: 'Publier ma réponse' }).click();
  await expect(page.getByTestId('reply').filter({ hasText: 'Je fais pareil depuis deux ans' })).toBeVisible();
  await expect(page.getByText('1 réponse', { exact: true })).toBeVisible();
  await expect(page.getByLabel(/Votre réponse/)).toHaveValue('');

  // La nouvelle discussion apparaît en tête de l'accueil.
  await page.goto('/');
  await expect(page.getByTestId('discussion-card').first()).toContainText(title);
});
