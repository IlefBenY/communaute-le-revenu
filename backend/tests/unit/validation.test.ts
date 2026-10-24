import { validateCreateDiscussion, validateListQuery } from '../../src/api/discussion/validation';
import { validateCreateReply } from '../../src/api/reply/validation';
import { slugify } from '../../src/utils/slugify';

const valid = { title: 'Ouvrir un PEA avec 5 000 €', content: 'Par où commencer ?', type: 'question', category: 'bourse' };

const errorPaths = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (e: any) {
    return e.details.errors.map((err: { path: string[] }) => err.path.join('.'));
  }
  throw new Error('La validation aurait dû échouer');
};

describe('validateCreateDiscussion', () => {
  it('accepte une discussion valide et retire les champs inconnus (dont author)', async () => {
    const result = await validateCreateDiscussion({ ...valid, author: 42, repliesCount: 999 });
    expect(result).toEqual(valid);
  });

  it('refuse un titre de moins de 10 caractères', async () => {
    expect(await errorPaths(validateCreateDiscussion({ ...valid, title: 'Trop cour' }))).toEqual(['title']);
  });

  it('compte les caractères après suppression des espaces', async () => {
    expect(await errorPaths(validateCreateDiscussion({ ...valid, title: '   PEA ?     ' }))).toEqual(['title']);
  });

  it('exige un contenu, une catégorie et un type valide', async () => {
    const paths = await errorPaths(validateCreateDiscussion({ title: valid.title, content: '  ', type: 'sondage' }));
    expect(paths.sort()).toEqual(['category', 'content', 'type']);
  });
});

describe('validateListQuery', () => {
  it('applique les valeurs par défaut', async () => {
    expect(await validateListQuery({})).toMatchObject({ sort: 'recent', page: 1, pageSize: 10 });
  });

  it('refuse un tri inconnu ou une taille de page excessive', async () => {
    expect((await errorPaths(validateListQuery({ sort: 'random', pageSize: '500' }))).sort()).toEqual(['pageSize', 'sort']);
  });
});

describe('validateCreateReply', () => {
  it('refuse une réponse vide', async () => {
    expect(await errorPaths(validateCreateReply({ content: '   ', discussion: 'abc' }))).toEqual(['content']);
  });
});

describe('slugify', () => {
  it('produit un slug URL-safe sans accents', () => {
    expect(slugify("Assurance-vie après 70 ans : est-ce encore intéressant ?")).toBe(
      'assurance-vie-apres-70-ans-est-ce-encore-interessant'
    );
  });
});
