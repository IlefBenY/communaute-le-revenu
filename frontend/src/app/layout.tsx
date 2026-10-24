import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const playfair = Playfair_Display({ variable: '--font-playfair', subsets: ['latin'], weight: ['700', '900'] });

export const metadata: Metadata = {
  title: { default: 'Communauté Le Revenu', template: '%s · Communauté Le Revenu' },
  description: 'Posez vos questions d’argent, partagez vos expériences et échangez avec la rédaction du Revenu.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
        <footer className="border-t border-line py-6 text-center text-xs text-ink-3">
          Communauté Le Revenu · Partage d’expériences, pas de conseil personnalisé.
        </footer>
      </body>
    </html>
  );
}
