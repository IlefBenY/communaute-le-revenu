import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DiscussionCard } from '@/components/discussions/DiscussionCard';
import { ReplyList } from '@/components/discussions/ReplyList';
import type { Reply } from '@/lib/strapi/types';
import { makeDiscussion } from './fixtures';

// Les Server Actions ne s'exécutent que côté serveur : on les remplace dans ces tests de rendu.
vi.mock('@/app/actions/discussions', () => ({ toggleUseful: vi.fn(), chooseBestReply: vi.fn() }));

const reply = (id: string, username: string, usefulCount = 0): Reply => ({
  id: Number(id.replace(/\D/g, '')) || 1,
  documentId: id,
  content: `Réponse de ${username}`,
  usefulCount,
  createdAt: '2026-10-22T10:00:00.000Z',
  author: { id: 1, documentId: `u-${username}`, username },
});

const replies = [reply('r1', 'Claire', 2), reply('r2', 'Vincent', 7), reply('r3', 'Thomas', 0)];
const common = { replies, discussionId: 'd1', loginHref: '/connexion?next=%2Fdiscussions%2Fx' };

describe('DiscussionCard — discussion résolue et profil', () => {
  it('signale une discussion résolue et lie l’auteur à son profil', () => {
    render(<DiscussionCard discussion={makeDiscussion({ solved: true })} />);

    expect(screen.getByText('Résolue')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Thomas_PEA/ })).toHaveAttribute('href', '/membres/Thomas_PEA');
  });
});

describe('ReplyList — meilleure réponse et votes « Utile »', () => {
  it('affiche la meilleure réponse en premier avec un badge', () => {
    render(<ReplyList {...common} bestReply="r2" viewer={null} />);

    const items = screen.getAllByTestId('reply');
    expect(items[0]).toHaveAttribute('data-best', 'true');
    expect(within(items[0]).getByText('✓ Meilleure réponse')).toBeInTheDocument();
    expect(within(items[0]).getByText('Réponse de Vincent')).toBeInTheDocument();
  });

  it('invite un visiteur à se connecter pour voter, sans bouton de meilleure réponse', () => {
    render(<ReplyList {...common} bestReply={null} viewer={null} />);

    const vote = screen.getAllByRole('link', { name: /Utile/ })[0];
    expect(vote).toHaveAttribute('href', '/connexion?next=%2Fdiscussions%2Fx');
    expect(screen.queryByRole('button', { name: /meilleure réponse/ })).toBeNull();
  });

  it('empêche de voter pour sa propre réponse et indique ses votes', () => {
    render(<ReplyList {...common} bestReply={null} viewer={{ documentId: 'u-Thomas', isDiscussionAuthor: false, votes: ['r2'] }} />);

    const [claire, vincent, thomas] = screen.getAllByTestId('reply');
    expect(within(claire).getByRole('button', { name: /Utile/ })).toHaveAttribute('aria-pressed', 'false');
    expect(within(vincent).getByRole('button', { name: /Utile/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(thomas).queryByRole('button', { name: /Utile/ })).toBeNull();
    expect(within(thomas).getByTitle(/propre réponse/)).toBeInTheDocument();
  });

  it('propose à l’auteur de la discussion de choisir ou retirer la meilleure réponse', () => {
    render(<ReplyList {...common} bestReply="r1" viewer={{ documentId: 'u-Thomas', isDiscussionAuthor: true, votes: [] }} />);

    expect(screen.getByRole('button', { name: 'Retirer la meilleure réponse' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Choisir comme meilleure réponse' })).toHaveLength(2);
  });
});
