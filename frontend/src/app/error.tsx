'use client';

import { ErrorState } from '@/components/ui/States';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl">
      <ErrorState
        message="Impossible de charger la communauté pour le moment. Vérifiez votre connexion ou réessayez dans un instant."
        action={
          <button type="button" className="btn-primary" onClick={reset}>
            Réessayer
          </button>
        }
      />
    </div>
  );
}
