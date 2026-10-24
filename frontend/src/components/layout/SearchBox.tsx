'use client';

import { useId } from 'react';
import { useSearchParams } from 'next/navigation';

/** Formulaire GET natif : fonctionne sans JavaScript, l'état reste dans l'URL. */
export function SearchBox() {
  const params = useSearchParams();
  const id = useId();
  return (
    <form action="/" role="search" className="max-w-md">
      {params.get('category') && <input type="hidden" name="category" value={params.get('category') ?? ''} />}
      <label htmlFor={id} className="sr-only">
        Rechercher une discussion
      </label>
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={params.get('q') ?? ''}
        placeholder="Rechercher une discussion, un sujet…"
        className="w-full rounded-xl border border-white/10 bg-white/10 px-3.5 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/30 focus:outline-none"
      />
    </form>
  );
}
