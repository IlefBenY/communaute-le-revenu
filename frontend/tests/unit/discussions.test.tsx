import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DiscussionCard } from '@/components/discussions/DiscussionCard';
import { DiscussionList } from '@/components/discussions/DiscussionList';
import { makeDiscussion } from './fixtures';

describe('DiscussionCard', () => {
  it('affiche titre, auteur, catégorie, type, nombre de réponses et date', () => {
    render(<DiscussionCard discussion={makeDiscussion()} />);

    const title = screen.getByRole('link', { name: 'Ouvrir un PEA avec 5 000 € : par où commencer ?' });
    expect(title).toHaveAttribute('href', '/discussions/ouvrir-un-pea-avec-5-000-eur-par-ou-commencer');
    expect(screen.getByText('Thomas_PEA')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bourse & actions' })).toHaveAttribute('href', '/?category=bourse');
    expect(screen.getByText('Question')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('réponses')).toBeInTheDocument();
    expect(screen.getByText('22 oct. 2026')).toHaveAttribute('datetime', '2026-10-22T09:03:01.028Z');
  });

  it('accorde « réponse » au singulier', () => {
    render(<DiscussionCard discussion={makeDiscussion({ repliesCount: 1 })} />);
    expect(screen.getByText('réponse')).toBeInTheDocument();
  });

  it('reste lisible sans auteur ni catégorie (relations supprimées)', () => {
    render(<DiscussionCard discussion={makeDiscussion({ author: null, category: null })} />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });
});

describe('DiscussionList', () => {
  it('affiche une carte par discussion', () => {
    const discussions = [makeDiscussion(), makeDiscussion({ documentId: 'doc-2', slug: 'autre', title: 'Une autre discussion' })];
    render(<DiscussionList discussions={discussions} />);

    expect(screen.getAllByTestId('discussion-card')).toHaveLength(2);
    expect(within(screen.getAllByTestId('discussion-card')[1]).getByText('Une autre discussion')).toBeInTheDocument();
  });

  it('affiche un état vide avec un appel à l’action', () => {
    render(<DiscussionList discussions={[]} />);

    expect(screen.getByText('Aucune discussion pour le moment')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lancer une discussion' })).toHaveAttribute('href', '/nouvelle-discussion');
  });

  it('distingue une liste vide due à un filtre ou une recherche', () => {
    render(<DiscussionList discussions={[]} filtered />);

    expect(screen.getByText('Aucun résultat')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir toutes les discussions' })).toHaveAttribute('href', '/');
  });
});
