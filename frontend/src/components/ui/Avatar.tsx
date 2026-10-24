const PALETTE = ['#5856d6', '#0a7f99', '#6e6e73', '#c93400', '#d30f45', '#1a8a4a'];

const colorFor = (name: string) => PALETTE[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % PALETTE.length];

export function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const dims = size === 'md' ? 'size-10 text-sm' : 'size-6 text-[11px]';
  return (
    <span
      aria-hidden
      className={`${dims} inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
      style={{ backgroundColor: colorFor(name) }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
