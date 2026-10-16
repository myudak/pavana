import type { ChatModelAdapter, ChatModelRunResult } from '@assistant-ui/react';
import type { Copy } from '@/lib/i18n';
import { matchIntent, scriptFor } from './demo-script';

type Part = NonNullable<ChatModelRunResult['content']>[number];

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const id = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

/**
 * DEMO model adapter for assistant-ui's LocalRuntime: plays the scripted reply for the
 * user's last message, streaming words and showing each tool call running → done.
 * Swap point for the real backend: replace this adapter (or the whole runtime) with
 * one that calls POST /api/chat — the UI and tool cards stay the same.
 */
export function createDemoAdapter(
  copy: Copy['chat'],
  { wordMs = 28, toolMs = 900 }: { wordMs?: number; toolMs?: number } = {},
): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      const last = messages.at(-1);
      const text =
        last?.content
          .map((p) => (p.type === 'text' ? p.text : ''))
          .join(' ')
          .trim() ?? '';
      const reply = scriptFor(matchIntent(text), copy);
      const metadata = { custom: { mood: reply.mood, intent: reply.intent, demo: true } };
      const content: Part[] = [];
      const emit = (): ChatModelRunResult => ({ content: [...content], metadata });

      await sleep(toolMs / 2, abortSignal);
      for (const [i, step] of reply.steps.entries()) {
        if (step.type === 'text') {
          // ~3 words per tick: smooth enough, and fewer timers when the tab is throttled.
          const chunks = step.text.match(/(?:\S+\s*){1,3}/g) ?? [step.text];
          const at = content.push({ type: 'text', text: '' }) - 1;
          let shown = '';
          for (const chunk of chunks) {
            shown += chunk;
            content[at] = { type: 'text', text: shown };
            yield emit();
            await sleep(wordMs * 3, abortSignal);
          }
        } else {
          const base = {
            type: 'tool-call' as const,
            toolCallId: `demo-${i}-${step.toolName}`,
            toolName: step.toolName,
            args: step.args,
            argsText: JSON.stringify(step.args),
          };
          const at = content.push(base) - 1;
          yield emit();
          await sleep(toolMs, abortSignal);
          content[at] = { ...base, result: step.result };
          yield emit();
        }
      }
    },
  };
}
