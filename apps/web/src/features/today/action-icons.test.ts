import { BellRing, HeartPulse, PersonStanding, ShieldCheck, Wind } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { actionIconFor } from './action-icons';

describe('actionIconFor', () => {
  it.each([
    ['Pantau pembaruan dari sumber resmi.', BellRing],
    ['Kurangi aktivitas luar ruangan.', PersonStanding],
    ['Anak dan lansia sebaiknya di dalam.', HeartPulse],
    ['Tutup ventilasi bila bau asap tercium.', Wind],
    ['Gunakan masker bila harus keluar.', ShieldCheck],
    ['Tetap tenang dan waspada.', ShieldCheck],
  ])('%s → %s', (text, icon) => {
    expect(actionIconFor(text)).toBe(icon);
  });

  it('first matching rule wins', () => {
    expect(actionIconFor('Kelompok sensitif disarankan membatasi aktivitas luar ruangan.')).toBe(
      PersonStanding,
    );
  });
});
