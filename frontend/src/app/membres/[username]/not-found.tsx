import Link from 'next/link';
import { EmptyState } from '@/components/ui/States';

export default function MemberNotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState title="Membre introuvable">
        <Link href="/" className="btn-secondary mt-4">
          Retour aux discussions
        </Link>
      </EmptyState>
    </div>
  );
}
