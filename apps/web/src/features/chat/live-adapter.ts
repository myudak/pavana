import type { ChatModelAdapter } from '@assistant-ui/react';
import type { LatLon } from '@pavana/shared';
import { ApiRequestError, api } from '@/lib/api';
import type { Copy } from '@/lib/i18n';

/**
 * LIVE adapter: sends the conversation plus the selected location to POST /api/chat, where the
 * server grounds an OpenRouter model in Pavana's own data (the key never reaches the browser).
 */
export function createLiveAdapter(copy: Copy['chat'], getPoint: () => LatLon): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      const turns = messages
        .map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.content
            .map((p) => (p.type === 'text' ? p.text : ''))
            .join(' ')
            .trim()
            .slice(0, 2000),
        }))
        .filter((m) => m.content)
        .slice(-20);
      try {
        const res = await api.chat({ ...getPoint(), messages: turns }, abortSignal);
        yield {
          content: [{ type: 'text', text: res.reply }],
          metadata: { custom: { mood: 'calm', live: true } },
        };
      } catch (err) {
        if (abortSignal.aborted) throw err;
        const text =
          err instanceof ApiRequestError && err.status === 429 ? copy.liveBusy : copy.liveError;
        yield { content: [{ type: 'text', text }], metadata: { custom: { mood: 'curious' } } };
      }
    },
  };
}
