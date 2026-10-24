import Link from 'next/link';
import { Suspense } from 'react';
import { UserMenu } from '@/components/auth/UserMenu';
import { SearchBox } from './SearchBox';

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-hero text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Communauté Le Revenu, accueil">
          <span className="rounded-sm border-2 border-brand bg-white px-1.5 py-0.5 text-sm font-black tracking-tight text-black">
            LE <span className="text-brand">REVENU</span>
          </span>
          <span className="hidden border-l border-white/20 pl-3 text-sm font-medium text-white/80 sm:inline">Communauté</span>
        </Link>
        <div className="hidden flex-1 md:block">
          <Suspense>
            <SearchBox />
          </Suspense>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Suspense fallback={<div className="h-9 w-28 animate-pulse rounded-xl bg-white/10" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <Suspense>
          <SearchBox />
        </Suspense>
      </div>
    </header>
  );
}
