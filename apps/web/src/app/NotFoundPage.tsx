import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="w-full px-[var(--page-gutter-x)] py-12">
      <div className="mx-auto w-full max-w-[84rem] space-y-4 text-center">
        <h1 className="font-display text-3xl font-bold">Halaman tidak ditemukan</h1>
        <Button asChild variant="secondary">
          <Link to="/">Kembali ke Home</Link>
        </Button>
      </div>
    </div>
  );
}
