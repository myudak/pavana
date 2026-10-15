import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="mx-auto w-full max-w-[84rem] space-y-4 px-4 py-12 text-center md:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold">Halaman tidak ditemukan</h1>
      <Button asChild variant="soft">
        <Link to="/">Kembali ke Home</Link>
      </Button>
    </div>
  );
}
