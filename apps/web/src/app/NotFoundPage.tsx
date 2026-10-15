import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="space-y-4 py-12 text-center">
      <h1 className="font-display text-3xl font-medium">Halaman tidak ditemukan</h1>
      <Button asChild variant="default">
        <Link to="/">Kembali ke Beranda</Link>
      </Button>
    </div>
  );
}
