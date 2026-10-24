import { api, getStrapi, loginAs, setupStrapi, teardownStrapi } from '../helpers/strapi';

const newDiscussion = (overrides: Record<string, unknown> = {}) => ({
  data: {
    title: 'Faut-il investir en une fois ou étaler ?',
    content: 'J’hésite entre un versement unique et des versements programmés.',
    type: 'question',
    category: 'bourse',
    ...overrides,
  },
});

beforeAll(setupStrapi);
afterAll(teardownStrapi);

describe('Affichage des discussions (GET /api/discussions)', () => {
  it('liste les discussions avec auteur, catégorie, nombre de réponses et pagination', async () => {
    const res = await api().get('/api/discussions?pageSize=5').expect(200);

    expect(res.body.data).toHaveLength(5);
    expect(res.body.meta.pagination).toMatchObject({ page: 1, pageSize: 5, total: 20, pageCount: 4 });
    const [first] = res.body.data;
    expect(first).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        slug: expect.any(String),
        repliesCount: expect.any(Number),
        publishedAt: expect.any(String),
        author: { id: expect.any(Number), documentId: expect.any(String), username: expect.any(String) },
        category: expect.objectContaining({ slug: expect.any(String), name: expect.any(String) }),
      })
    );
    // Aucune donnée sensible de l'utilisateur n'est exposée.
    expect(first.author).not.toHaveProperty('email');
  });

  it('filtre par catégorie et trie par date de publication', async () => {
    const recent = await api().get('/api/discussions?category=bourse&sort=recent').expect(200);
    const oldest = await api().get('/api/discussions?category=bourse&sort=oldest').expect(200);

    expect(recent.body.data.length).toBeGreaterThan(1);
    expect(recent.body.data.every((d: any) => d.category.slug === 'bourse')).toBe(true);
    const dates = recent.body.data.map((d: any) => d.publishedAt);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(oldest.body.data.map((d: any) => d.publishedAt)).toEqual([...dates].reverse());
  });

  it('renvoie 400 pour des paramètres de liste invalides', async () => {
    await api().get('/api/discussions?pageSize=500').expect(400);
  });

  it('renvoie le détail par slug avec les réponses, et 404 si inconnu', async () => {
    const list = await api().get('/api/discussions?sort=oldest&pageSize=1').expect(200);
    const res = await api().get(`/api/discussions/slug/${list.body.data[0].slug}`).expect(200);
    expect(res.body.data.content).toEqual(expect.any(String));
    expect(res.body.data.replies.length).toBe(res.body.data.repliesCount);

    await api().get('/api/discussions/slug/n-existe-pas').expect(404);
  });
});

describe('Création d’une discussion (POST /api/discussions)', () => {
  it('refuse la publication sans authentification', async () => {
    const res = await api().post('/api/discussions').send(newDiscussion());
    // Le rôle Public n'a pas la permission « create » : Strapi refuse avant même les policies.
    expect(res.status).toBe(403);
  });

  it('valide les données côté Strapi (titre ≥ 10 caractères, contenu obligatoire)', async () => {
    const { jwt } = await loginAs('Thomas_PEA');
    const res = await api()
      .post('/api/discussions')
      .set('Authorization', `Bearer ${jwt}`)
      .send(newDiscussion({ title: 'Court', content: '' }))
      .expect(400);

    const paths = res.body.error.details.errors.map((e: any) => e.path[0]).sort();
    expect(paths).toEqual(['content', 'title']);
  });

  it('refuse une catégorie inexistante', async () => {
    const { jwt } = await loginAs('Thomas_PEA');
    await api()
      .post('/api/discussions')
      .set('Authorization', `Bearer ${jwt}`)
      .send(newDiscussion({ category: 'inconnue' }))
      .expect(400);
  });

  it('empêche de publier au nom d’un autre utilisateur', async () => {
    const thomas = await loginAs('Thomas_PEA');
    const other = await loginAs('Vincent_ETF');

    for (const author of [other.user.id, other.user.documentId, { id: other.user.id }]) {
      const res = await api()
        .post('/api/discussions')
        .set('Authorization', `Bearer ${thomas.jwt}`)
        .send(newDiscussion({ author }))
        .expect(403);
      expect(res.body.error.message).toMatch(/au nom d'un autre/);
    }
  });

  it('crée la discussion avec l’utilisateur authentifié comme auteur', async () => {
    const { jwt, user } = await loginAs('Thomas_PEA');
    const res = await api()
      .post('/api/discussions')
      .set('Authorization', `Bearer ${jwt}`)
      .send(newDiscussion())
      .expect(201);

    expect(res.body.data).toMatchObject({
      title: 'Faut-il investir en une fois ou étaler ?',
      slug: 'faut-il-investir-en-une-fois-ou-etaler',
      repliesCount: 0,
      author: { username: user.username },
      category: { slug: 'bourse' },
    });

    // Un second titre identique obtient un slug unique.
    const again = await api().post('/api/discussions').set('Authorization', `Bearer ${jwt}`).send(newDiscussion()).expect(201);
    expect(again.body.data.slug).toBe('faut-il-investir-en-une-fois-ou-etaler-2');
  });
});

describe('Robustesse', () => {
  it("gère deux créations simultanées du même titre (slugs distincts, pas d'erreur 500)", async () => {
    const { jwt } = await loginAs('Vincent_ETF');
    const post = () =>
      api()
        .post('/api/discussions')
        .set('Authorization', `Bearer ${jwt}`)
        .send(newDiscussion({ title: 'Création simultanée du même titre' }));

    const results = await Promise.all([post(), post(), post()]);
    expect(results.map((r) => r.status)).toEqual([201, 201, 201]);
    expect(new Set(results.map((r) => r.body.data.slug)).size).toBe(3);
  });

  it("garde la date de publication si la discussion est modifiée (ex. depuis l'admin)", async () => {
    const before = (await api().get('/api/discussions?sort=oldest&pageSize=1').expect(200)).body.data[0];
    await getStrapi()
      .documents('api::discussion.discussion')
      .update({ documentId: before.documentId, data: { title: `${before.title} (modifié)` } });

    const after = (await api().get(`/api/discussions/${before.documentId}`).expect(200)).body.data;
    expect(after.title).toMatch(/\(modifié\)$/);
    expect(after.publishedAt).toBe(before.publishedAt);
  });

  it("n'expose que les champs publics des catégories, même avec populate", async () => {
    const res = await api().get('/api/categories?populate=*').expect(200);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(['color', 'description', 'documentId', 'id', 'name', 'slug']);
  });
});

describe('Réponses (POST /api/replies)', () => {
  it('empêche de répondre au nom d’un autre utilisateur', async () => {
    const claire = await loginAs('Claire_Nantes');
    const other = await loginAs('Vincent_ETF');
    const list = await api().get('/api/discussions?pageSize=1').expect(200);

    const res = await api()
      .post('/api/replies')
      .set('Authorization', `Bearer ${claire.jwt}`)
      .send({ data: { discussion: list.body.data[0].documentId, content: 'Usurpation', author: other.user.id } })
      .expect(403);
    expect(res.body.error.message).toMatch(/au nom d'un autre/);
  });

  it('refuse une réponse sans authentification', async () => {
    const list = await api().get('/api/discussions?pageSize=1').expect(200);
    const res = await api()
      .post('/api/replies')
      .send({ data: { discussion: list.body.data[0].documentId, content: 'Bonjour' } });
    // Le rôle Public n'a pas la permission « create » : Strapi refuse avant même les policies.
    expect(res.status).toBe(403);
  });

  it('renvoie 404 pour une discussion inexistante', async () => {
    const { jwt } = await loginAs('Thomas_PEA');
    await api()
      .post('/api/replies')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ data: { discussion: 'inexistant', content: 'Bonjour' } })
      .expect(404);
  });

  it('enregistre la réponse, force l’auteur et met à jour le compteur sans changer la date de publication', async () => {
    const { jwt, user } = await loginAs('Claire_Nantes');
    const before = (await api().get('/api/discussions?sort=oldest&pageSize=1').expect(200)).body.data[0];

    const res = await api()
      .post('/api/replies')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ data: { discussion: before.documentId, content: 'Merci pour ce partage !', author: user.id } })
      .expect(201);
    expect(res.body.data.author.username).toBe('Claire_Nantes');
    expect(res.body.data.discussion).toEqual({ documentId: before.documentId, slug: before.slug });

    const after = (await api().get(`/api/discussions/${before.documentId}`).expect(200)).body.data;
    expect(after.repliesCount).toBe(before.repliesCount + 1);
    expect(after.publishedAt).toBe(before.publishedAt);
    expect(after.replies.at(-1).content).toBe('Merci pour ce partage !');
  });
});
