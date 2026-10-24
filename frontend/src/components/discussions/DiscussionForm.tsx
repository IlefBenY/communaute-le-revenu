'use client';

import { useActionState, useState } from 'react';
import { createDiscussion } from '@/app/actions/discussions';
import { initialFormState } from '@/app/actions/types';
import { FieldError, FormMessage, SubmitButton } from '@/components/ui/Form';
import { CONTENT_MAX, DISCUSSION_TYPES, TITLE_MAX, TITLE_MIN } from '@/lib/validation';

type Option = { slug: string; name: string };

export function DiscussionForm({ categories }: { categories: Option[] }) {
  const [state, action] = useActionState(createDiscussion, initialFormState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  const [titleLength, setTitleLength] = useState(values.title?.trim().length ?? 0);

  return (
    <form action={action} className="card space-y-5 p-5 sm:p-7" noValidate>
      <fieldset>
        <legend className="label">Type de publication</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {DISCUSSION_TYPES.map((t) => (
            <label
              key={t.value}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 has-checked:border-brand has-checked:bg-brand-soft"
            >
              <input
                type="radio"
                name="type"
                value={t.value}
                defaultChecked={(values.type || 'question') === t.value}
                className="mt-1 accent-brand"
              />
              <span>
                <span className="block text-sm font-semibold">{t.label}</span>
                <span className="block text-xs text-ink-3">{t.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError id="type-error" message={errors.type} />
      </fieldset>

      <div>
        <label htmlFor="title" className="label">
          Titre
        </label>
        <input
          id="title"
          name="title"
          className="input"
          maxLength={TITLE_MAX}
          defaultValue={values.title}
          onChange={(e) => setTitleLength(e.target.value.trim().length)}
          aria-invalid={Boolean(errors.title)}
          aria-describedby="title-hint title-error"
          placeholder="Ex. : Ouvrir un PEA avec 5 000 € : par où commencer ?"
        />
        <p id="title-hint" className={`mt-1 text-xs ${titleLength > 0 && titleLength < TITLE_MIN ? 'text-brand-text' : 'text-ink-3'}`}>
          {titleLength < TITLE_MIN ? `Encore ${TITLE_MIN - titleLength} caractère(s) minimum` : `${titleLength}/${TITLE_MAX}`}
        </p>
        <FieldError id="title-error" message={errors.title} />
      </div>

      <div>
        <label htmlFor="category" className="label">
          Catégorie
        </label>
        <select
          id="category"
          name="category"
          className="input"
          defaultValue={values.category ?? ''}
          aria-invalid={Boolean(errors.category)}
          aria-describedby="category-error"
        >
          <option value="">Choisissez un espace…</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <FieldError id="category-error" message={errors.category} />
      </div>

      <div>
        <label htmlFor="content" className="label">
          Contenu
        </label>
        <textarea
          id="content"
          name="content"
          rows={8}
          maxLength={CONTENT_MAX}
          className="input"
          defaultValue={values.content}
          aria-invalid={Boolean(errors.content)}
          aria-describedby="content-error"
          placeholder="Donnez le contexte utile : situation, horizon, ce que vous avez déjà envisagé…"
        />
        <FieldError id="content-error" message={errors.content} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Publication…">Publier</SubmitButton>
      </div>
    </form>
  );
}
