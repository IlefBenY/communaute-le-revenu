import Link from 'next/link';
import { EmptyState } from '@/components/ui/States';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState title="Page introuvable">
        <Link href="/" className="btn-secondary mt-4">
          Retour à l’accueil
        </Link>
      </EmptyState>
    </div>
  );
}
