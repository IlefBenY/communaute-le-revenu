import Link from 'next/link';
import { EmptyState } from '@/components/ui/States';

export default function DiscussionNotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState title="Discussion introuvable">
        <p>Elle a peut-être été supprimée, ou l’adresse est incorrecte.</p>
        <Link href="/" className="btn-secondary mt-4">
          Retour aux discussions
        </Link>
      </EmptyState>
    </div>
  );
}
