import { api, loginAs, setupStrapi, teardownStrapi } from '../helpers/strapi';

type Reply = { documentId: string; usefulCount: number; author: { username: string } };

beforeAll(setupStrapi);
afterAll(teardownStrapi);

/** Discussion de Thomas_PEA, avec des réponses d'autres membres (données de démo). */
const thomasDiscussion = async () => {
  const res = await api().get('/api/discussions/slug/ouvrir-un-pea-avec-5-000-par-ou-commencer').expect(200);
  return res.body.data as { documentId: string; slug: string; bestReply: string | null; publishedAt: string; replies: Reply[] };
};

describe('Votes « Utile » (POST /api/replies/:id/useful)', () => {
  it('ajoute puis retire le vote, et met à jour le compteur', async () => {
    const { jwt } = await loginAs('Claire_Nantes');
    const discussion = await thomasDiscussion();
    const reply = discussion.replies.find((r) => r.author.username !== 'Claire_Nantes')!;

    const first = await api().post(`/api/replies/${reply.documentId}/useful`).set('Authorization', `Bearer ${jwt}`).expect(200);
    const second = await api().post(`/api/replies/${reply.documentId}/useful`).set('Authorization', `Bearer ${jwt}`).expect(200);

    expect(first.body.data.voted).not.toBe(second.body.data.voted);
    expect(Math.abs(first.body.data.usefulCount - second.body.data.usefulCount)).toBe(1);
    expect(first.body.data.discussion.slug).toBe(discussion.slug);
  });

  it('ne compte qu’un vote par membre, même avec des clics simultanés', async () => {
    const { jwt } = await loginAs('Odile.Retraite');
    const reply = (await thomasDiscussion()).replies.find((r) => r.author.username !== 'Odile.Retraite')!;
    const before = reply.usefulCount;

    await Promise.all([1, 2, 3].map(() => api().post(`/api/replies/${reply.documentId}/useful`).set('Authorization', `Bearer ${jwt}`)));

    const after = (await thomasDiscussion()).replies.find((r) => r.documentId === reply.documentId)!;
    expect(Math.abs(after.usefulCount - before)).toBeLessThanOrEqual(1);
  });

  it('interdit de voter pour sa propre réponse', async () => {
    const { jwt } = await loginAs('Thomas_PEA');
    const own = (await thomasDiscussion()).replies.find((r) => r.author.username === 'Thomas_PEA')!;

    const res = await api().post(`/api/replies/${own.documentId}/useful`).set('Authorization', `Bearer ${jwt}`).expect(403);
    expect(res.body.error.message).toMatch(/propre réponse/);
  });

  it('refuse les visiteurs et renvoie 404 pour une réponse inconnue', async () => {
    const reply = (await thomasDiscussion()).replies[0];
    await api().post(`/api/replies/${reply.documentId}/useful`).expect(403);

    const { jwt } = await loginAs('Claire_Nantes');
    await api().post('/api/replies/inconnue/useful').set('Authorization', `Bearer ${jwt}`).expect(404);
  });

  it('liste les réponses que j’ai marquées « Utile » dans une discussion', async () => {
    const { jwt } = await loginAs('Sophie.Invest');
    const discussion = await thomasDiscussion();
    const reply = discussion.replies.find((r) => r.author.username !== 'Sophie.Invest')!;

    const before = await api().get(`/api/replies/useful/mine?discussion=${discussion.documentId}`).set('Authorization', `Bearer ${jwt}`).expect(200);
    await api().post(`/api/replies/${reply.documentId}/useful`).set('Authorization', `Bearer ${jwt}`).expect(200);
    const after = await api().get(`/api/replies/useful/mine?discussion=${discussion.documentId}`).set('Authorization', `Bearer ${jwt}`).expect(200);

    expect(before.body.data.includes(reply.documentId)).not.toBe(after.body.data.includes(reply.documentId));
  });
});

describe('Meilleure réponse (PUT /api/discussions/:id/best-reply)', () => {
  it('est réservée à l’auteur de la discussion', async () => {
    const { jwt } = await loginAs('Vincent_ETF');
    const discussion = await thomasDiscussion();

    const res = await api()
      .put(`/api/discussions/${discussion.documentId}/best-reply`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ data: { reply: discussion.replies[0].documentId } })
      .expect(403);
    expect(res.body.error.message).toMatch(/Seul l'auteur/);
  });

  it('refuse une réponse d’une autre discussion', async () => {
    const { jwt } = await loginAs('Thomas_PEA');
    const discussion = await thomasDiscussion();
    await api()
      .put(`/api/discussions/${discussion.documentId}/best-reply`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ data: { reply: 'reponse-d-une-autre-discussion' } })
      .expect(400);
  });

  it('permet à l’auteur de choisir, changer et retirer la meilleure réponse sans changer la date', async () => {
    const { jwt } = await loginAs('Thomas_PEA');
    const discussion = await thomasDiscussion();
    const target = discussion.replies[0].documentId;
    const put = (reply: string | null) =>
      api().put(`/api/discussions/${discussion.documentId}/best-reply`).set('Authorization', `Bearer ${jwt}`).send({ data: { reply } }).expect(200);

    await put(target);
    let current = await thomasDiscussion();
    expect(current.bestReply).toBe(target);
    expect(current.publishedAt).toBe(discussion.publishedAt);

    await put(null);
    current = await thomasDiscussion();
    expect(current.bestReply).toBeNull();
    const list = await api().get('/api/discussions?q=Ouvrir un PEA').expect(200);
    expect(list.body.data[0].solved).toBe(false);

    await put(discussion.bestReply);
  });
});

describe('Profil membre (GET /api/members/:username)', () => {
  it('renvoie un profil public, sans données de compte', async () => {
    const res = await api().get('/api/members/thomas_pea').expect(200);

    expect(res.body.data).toMatchObject({
      username: 'Thomas_PEA',
      stats: { discussions: expect.any(Number), replies: expect.any(Number), bestAnswers: expect.any(Number), usefulReceived: expect.any(Number) },
    });
    expect(res.body.data.discussions.length).toBeGreaterThan(0);
    expect(JSON.stringify(res.body)).not.toMatch(/email|password|provider/);
  });

  it('renvoie 404 pour un membre inconnu', async () => {
    await api().get('/api/members/personne').expect(404);
  });
});
