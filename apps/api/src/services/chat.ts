/**
 * Tanya Pavi — LLM chat over Pavana's own data (OpenRouter, server-side key).
 *
 * The model never sees raw provider credentials and never answers from memory alone: every
 * request is grounded in a compact JSON snapshot of the selected location's conditions,
 * deterministic insights and the experimental model outputs. Missing data stays null so the
 * model can say "tidak tersedia" instead of guessing.
 */
import type { LatLon } from '@pavana/shared';
import { AppError, UpstreamError } from '../domain/errors';
import type { ModelInputs } from '../providers/model-inputs';
import type { ProviderBundle } from '../providers/types';
import { getConditions } from './conditions';
import { getInsights } from './insights';
import { getHaze, getHotspotRisk } from './models';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM = `Kamu Pavi, asisten Pavana untuk asap kebakaran hutan dan kualitas udara di Indonesia.
Jawab dalam Bahasa Indonesia yang sederhana, ramah, dan singkat (maksimal ~120 kata, boleh poin).

Aturan wajib:
- Gunakan HANYA data di blok KONTEKS. Jika data null/tidak ada, katakan "datanya tidak tersedia" — jangan menebak angka.
- Sebut asal data bila relevan (mis. "menurut prakiraan CAMS", "deteksi satelit FIRMS", "model eksperimental Pavana").
- Titik panas adalah deteksi satelit, BUKAN kebakaran yang terkonfirmasi. Tidak ada deteksi bukan berarti tidak ada api.
- Jangan pernah bilang kondisi "aman". Jangan beri instruksi evakuasi atau peringatan resmi; arahkan ke BMKG/BNPB/dinas setempat untuk itu.
- Saran kesehatan hanya umum (masker N95/KN95, kurangi aktivitas luar, kelompok rentan), bukan saran medis.
- Arah angin meteorologis = arah DATANGNYA angin.
- Model Pavana bersifat eksperimental; sebut itu jika memakai angkanya.
- Tolak pertanyaan di luar topik udara/asap/cuaca/titik panas dengan sopan.`;

async function context(p: ProviderBundle, models: ModelInputs | null, point: LatLon, now: Date) {
  const safe = async <T>(f: () => Promise<T>) => {
    try {
      return await f();
    } catch {
      return null;
    }
  };
  const [cond, ins, risk, haze] = await Promise.all([
    safe(() => getConditions(p, point)),
    safe(() => getInsights(p, point)),
    safe(() => getHotspotRisk(models, point, now)),
    safe(() => getHaze(models, point, now)),
  ]);
  const station = haze?.stations.find((s) => s.p6h !== null) ?? haze?.stations[0];
  return {
    waktuUTC: now.toISOString(),
    mode: p.isDemo ? 'demo (data contoh sintetis)' : 'live',
    lokasi: cond?.location ?? point,
    kondisi: cond
      ? {
          pm25_ug_m3: cond.airQuality.pm25UgM3,
          aqi: cond.airQuality.aqi ?? null,
          sumber_pm25: cond.airQuality.provenance.provider,
          jenis_pm25: cond.airQuality.provenance.kind,
          angin_dari_derajat: cond.weather?.windDirectionFromDeg ?? null,
          angin_m_s: cond.weather?.windSpeedMs ?? null,
          kelembapan_pct: cond.weather?.relativeHumidityPct ?? null,
          tren: cond.trend,
          stasiun: cond.station ?? null,
        }
      : null,
    insight: ins ? { model: ins.model, faktor: ins.factors } : null,
    model_titik_panas_eksperimental: risk?.focus
      ? {
          peluang_deteksi_besok: risk.focus.cell.probability,
          hari_target_utc: risk.targetDay,
          faktor_shap_teratas: risk.focus.factors.slice(0, 3),
        }
      : null,
    model_kabut_asap_bandara_eksperimental: station
      ? {
          bandara: station.name,
          jarak_km: station.distanceKm,
          jarak_pandang_km: station.visibilityKm,
          peluang_jarak_pandang_kurang_3km_asap_6jam: station.p6h,
          peluang_24jam: station.p24h,
        }
      : null,
  };
}

export async function chat(
  opts: { apiKey: string | undefined; model: string; fetch?: typeof fetch },
  p: ProviderBundle,
  models: ModelInputs | null,
  point: LatLon,
  messages: ChatMessage[],
  now: Date,
): Promise<{ reply: string; model: string; isDemo: boolean }> {
  if (!opts.apiKey) throw new AppError(503, 'chat_unavailable', 'Chat is not configured');
  const ctx = await context(p, models, point, now);
  const doFetch = opts.fetch ?? fetch;
  let res: Response;
  try {
    res = await doFetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${opts.apiKey}`,
        'content-type': 'application/json',
        'http-referer': 'https://app.pavana.myudak.com',
        'x-title': 'Pavana',
      },
      body: JSON.stringify({
        model: opts.model,
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'system', content: `KONTEKS (JSON):\n${JSON.stringify(ctx)}` },
          ...messages.slice(-12),
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new UpstreamError('openrouter', 'request failed');
  }
  if (!res.ok) throw new UpstreamError('openrouter', `HTTP ${res.status}`);
  const body = (await res.json().catch(() => null)) as {
    model?: string;
    choices?: { message?: { content?: string } }[];
  } | null;
  const reply = body?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new UpstreamError('openrouter', 'empty reply');
  return { reply, model: body?.model ?? opts.model, isDemo: p.isDemo };
}
