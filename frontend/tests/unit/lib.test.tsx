import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { listHref } from '@/components/discussions/ListControls';
import { RichText } from '@/components/ui/RichText';
import { parseListParams } from '@/lib/params';
import { validateDiscussionInput } from '@/lib/validation';

describe('validateDiscussionInput', () => {
  const valid = { title: 'Ouvrir un PEA ?', content: 'Contexte', category: 'bourse', type: 'question' };

  it('accepte une saisie valide', () => {
    expect(validateDiscussionInput(valid)).toEqual({});
  });

  it('exige un titre de 10 caractères minimum (hors espaces) et les autres champs', () => {
    expect(validateDiscussionInput({ title: '  court   ', content: ' ', category: '', type: 'sondage' })).toEqual({
      title: 'Le titre doit contenir au moins 10 caractères.',
      content: 'Le contenu est obligatoire.',
      category: 'Choisissez une catégorie.',
      type: 'Choisissez un type.',
    });
  });
});

describe('paramètres de liste', () => {
  it('normalise les searchParams et ignore les valeurs invalides', () => {
    expect(parseListParams({ category: 'bourse', sort: 'random', page: '-2' })).toEqual({
      category: 'bourse',
      q: undefined,
      sort: 'recent',
      page: 1,
    });
  });

  it('construit des URL conservant les filtres', () => {
    expect(listHref({ category: 'bourse', sort: 'recent', page: 3 }, { sort: 'oldest', page: 1 })).toBe(
      '/?category=bourse&sort=oldest'
    );
    expect(listHref({}, {})).toBe('/');
  });
});

describe('RichText', () => {
  it('rend paragraphes, listes et gras sans interpréter le HTML', () => {
    const { container } = render(<RichText text={'**Pour bien démarrer :**\n- Présentez-vous\n- Lisez la charte\n\n<script>alert(1)</script>'} />);

    expect(screen.getByText('Pour bien démarrer :').tagName).toBe('STRONG');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
  });
});
