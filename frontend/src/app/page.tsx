import Link from 'next/link';
import { Suspense } from 'react';
import { CategoryNav } from '@/components/layout/CategoryNav';
import { DiscussionList, DiscussionListSkeleton } from '@/components/discussions/DiscussionList';
import { listHref, Pagination, SortTabs } from '@/components/discussions/ListControls';
import { parseListParams } from '@/lib/params';
import { getCategories, getDiscussions } from '@/lib/strapi/queries';

export default function HomePage({ searchParams }: PageProps<'/'>) {
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <Suspense>
            <Categories variant="sidebar" />
          </Suspense>
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        <section className="rounded-3xl bg-hero bg-[radial-gradient(ellipse_at_top_right,rgba(235,15,15,.55),transparent_60%)] p-6 text-white sm:p-8">
          <h1 className="max-w-md font-serif text-3xl font-bold leading-tight sm:text-4xl">
            La communauté des lecteurs du Revenu
          </h1>
          <p className="mt-3 max-w-lg text-sm text-white/80 sm:text-base">
            Posez vos questions d’argent, partagez vos expériences et échangez avec la rédaction. Bourse, épargne,
            impôts, retraite, transmission.
          </p>
          <Link href="/nouvelle-discussion" className="btn-primary mt-5">
            Lancer une discussion
          </Link>
        </section>

        <Suspense>
          <Categories variant="pills" />
        </Suspense>

        {/* Seule la liste dépend des searchParams : elle est streamée, le reste est prérendu. */}
        <Suspense fallback={<DiscussionListSkeleton />}>
          <DiscussionFeed searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Categories({ variant }: { variant: 'sidebar' | 'pills' }) {
  const categories = await getCategories();
  return <CategoryNav categories={categories} variant={variant} />;
}

async function DiscussionFeed({ searchParams }: { searchParams: PageProps<'/'>['searchParams'] }) {
  const params = parseListParams(await searchParams);
  const [{ data, meta }, categories] = await Promise.all([getDiscussions(params), getCategories()]);
  const category = categories.find((c) => c.slug === params.category);

  return (
    <section aria-labelledby="feed-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="feed-title" className="font-serif text-2xl font-bold">
            {category ? category.name : params.q ? `Résultats pour « ${params.q} »` : 'Discussions'}
          </h2>
          <p className="text-sm text-ink-3">
            {category?.description ?? `${meta.pagination.total} discussion${meta.pagination.total > 1 ? 's' : ''}`}
            {params.q && (
              <>
                {' · '}
                <Link className="text-brand-text hover:underline" href={listHref({ ...params, q: undefined }, { page: 1 })}>
                  Effacer la recherche
                </Link>
              </>
            )}
          </p>
        </div>
        <SortTabs params={params} />
      </div>
      <DiscussionList discussions={data} filtered={Boolean(params.category || params.q || (params.page ?? 1) > 1)} />
      {data.length > 0 && <Pagination params={params} pagination={meta.pagination} />}
    </section>
  );
}
