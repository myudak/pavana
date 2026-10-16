import {
  AssistantRuntimeProvider,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
  useLocalRuntime,
  type TextMessagePartComponent,
} from '@assistant-ui/react';
import { ArrowUp02Icon, RefreshIcon, StopIcon } from '@hugeicons/core-free-icons';
import { Fragment, useEffect, useMemo, useRef } from 'react';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useSelectedLocation } from '@/features/location/location-context';
import { useDemoMode } from '@/lib/demo-mode';
import { createDemoAdapter } from './demo-adapter';
import { createLiveAdapter } from './live-adapter';
import { isMood, moodPose } from './mascot-mood';
import { TOOL_UIS } from './ToolCards';

/**
 * Tanya Pavi — chat assistant. Live: an OpenRouter LLM grounded server-side in the selected
 * location's data (live-adapter.ts → POST /api/chat). Demo: scripted replies over the demo
 * scenario (demo-adapter.ts).
 */
export default function ChatPage() {
  const t = useCopy();
  const { demo } = useDemoMode();
  const { location } = useSelectedLocation();
  const point = useRef({ lat: location.lat, lon: location.lon });
  useEffect(() => {
    point.current = { lat: location.lat, lon: location.lon };
  }, [location.lat, location.lon]);
  // Demo mode keeps the scripted replies; live mode asks the server-side LLM over real data.
  const adapter = useMemo(
    () => (demo ? createDemoAdapter(t.chat) : createLiveAdapter(t.chat, () => point.current)),
    [t, demo],
  );
  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatLayout />
    </AssistantRuntimeProvider>
  );
}

/** Thread column sized to the viewport; empty state never scrolls on desktop. */
function ChatLayout() {
  const empty = useAuiState((s) => s.thread.isEmpty);
  return (
    <div className="flex h-[calc(var(--app-vh)-7.5rem-env(safe-area-inset-bottom))] flex-col px-[var(--page-gutter-x)] pt-[max(env(safe-area-inset-top),0.75rem)] lg:h-[calc(var(--app-vh)-5rem)] lg:pt-2">
      <div className="mx-auto flex min-h-0 w-full max-w-[84rem] flex-1 flex-col">
        <ChatHeader />
        <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
          <ThreadPrimitive.Viewport
            className={cn(
              'pv-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain py-3',
              // Empty on desktop: fixed area, no scroll (content is sized to
              // fit). Mobile keeps scroll; running threads always scroll.
              empty && 'lg:overflow-hidden',
            )}
          >
            <AuiIf condition={(s) => s.thread.isEmpty}>
              <Welcome />
            </AuiIf>
            <ThreadPrimitive.Messages>
              {({ message }) => (message.role === 'user' ? <UserMessage /> : <AssistantMessage />)}
            </ThreadPrimitive.Messages>
          </ThreadPrimitive.Viewport>
          <Composer />
        </ThreadPrimitive.Root>
      </div>
    </div>
  );
}

function ChatHeader() {
  const t = useCopy();
  const { demo } = useDemoMode();
  const aui = useAui();
  const empty = useAuiState((s) => s.thread.isEmpty);
  return (
    <header className="glass hidden items-center gap-3 rounded-3xl p-2 pr-3 sm:flex">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-200/70 to-emerald-200/60 dark:from-sky-400/20 dark:to-emerald-400/15">
        <Mascot pose="idle" size={40} decorative />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-lg font-semibold leading-tight">{t.chat.name}</h1>
          <span className="rounded-full bg-state-demo/15 px-2 py-0.5 text-[11px] font-semibold text-state-demo ring-1 ring-state-demo/30">
            {demo ? t.chat.status : t.chat.liveStatus}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{t.chat.role}</p>
      </div>
      <button
        type="button"
        disabled={empty}
        onClick={() => aui.thread().reset()}
        aria-label={t.chat.reset}
        className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground disabled:opacity-30"
      >
        <Icon icon={RefreshIcon} className="size-4" />
      </button>
    </header>
  );
}

function SuggestionChips({ compact = false }: { compact?: boolean }) {
  const t = useCopy();
  return (
    <div className={cn('flex flex-wrap gap-2', !compact && 'justify-center')}>
      {t.chat.suggestions.map((s) => (
        <ThreadPrimitive.Suggestion
          key={s}
          prompt={s}
          send
          className={cn(
            'rounded-full bg-foreground/5 text-left ring-1 ring-foreground/10 transition-colors hover:bg-primary/15 hover:ring-primary/40',
            compact ? 'px-3 py-1.5 text-xs' : 'px-3 py-1.5 text-[13px]',
          )}
        >
          {s}
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
}

function Welcome() {
  const t = useCopy();
  const { demo } = useDemoMode();
  return (
    <div className="mx-auto my-auto flex w-full max-w-md flex-col items-center gap-2 px-2 py-4 text-center lg:h-full lg:justify-center lg:py-2">
      <Mascot pose="wave" size={104} float />
      <h2 className="font-heading text-2xl font-semibold">{t.chat.greeting}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{t.chat.intro}</p>
      <span className="rounded-full bg-state-demo/10 px-3 py-1 text-[11px] font-medium text-state-demo">
        {demo ? t.chat.demoBadge : t.chat.liveBadge}
      </span>
      <div className="mt-1">
        <SuggestionChips />
      </div>
    </div>
  );
}

function UserMessage() {
  return (
    <div className="flex justify-end py-1.5">
      <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-primary-foreground shadow-sm">
        <MessagePrimitive.Parts />
      </div>
    </div>
  );
}

/** Plain text with **bold** support (scripted replies use it for the key word). */
const PaviText: TextMessagePartComponent = ({ text }) => (
  <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
    {text.split(/\*\*(.+?)\*\*/g).map((chunk, i) => (
      <Fragment key={i}>
        {i % 2 ? <strong className="font-semibold">{chunk}</strong> : chunk}
      </Fragment>
    ))}
  </p>
);

function Typing() {
  const t = useCopy();
  return (
    <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground" role="status">
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block size-2.5 rounded-[60%_0] bg-emerald-500/80 motion-safe:animate-[pv-leaf_1.2s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </span>
      {t.chat.thinking}
    </div>
  );
}

function AssistantMessage() {
  const t = useCopy();
  const running = useAuiState((s) => s.message.status?.type === 'running');
  const mood = useAuiState((s) => s.message.metadata?.custom?.mood);
  const empty = useAuiState((s) => s.message.content.length === 0);
  const pose = running ? 'calm' : moodPose(isMood(mood) ? mood : 'done');

  return (
    <div className="flex gap-2 py-2">
      <div className="flex size-11 shrink-0 items-start justify-center pt-0.5">
        <Mascot
          pose={pose}
          size={44}
          decorative
          className={cn(
            'transition-transform',
            running && 'motion-safe:animate-[pv-float_2s_ease-in-out_infinite]',
          )}
        />
      </div>
      <div className="glass min-w-0 max-w-[90%] flex-1 rounded-3xl rounded-tl-lg px-4 py-3">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t.chat.name}
        </p>
        {empty && <Typing />}
        <MessagePrimitive.Parts components={{ Text: PaviText, tools: { by_name: TOOL_UIS } }} />
        <AuiIf condition={(s) => s.message.isLast && s.message.status?.type !== 'running'}>
          <div className="mt-3 border-t border-foreground/10 pt-3">
            <SuggestionChips compact />
          </div>
        </AuiIf>
      </div>
    </div>
  );
}

function Composer() {
  const t = useCopy();
  const { demo } = useDemoMode();
  return (
    <div className="space-y-1.5 pb-1 pt-2">
      <ComposerPrimitive.Root className="glass flex items-end gap-2 rounded-[1.75rem] p-1.5 pl-4 focus-within:ring-2 focus-within:ring-primary/40">
        <ComposerPrimitive.Input
          rows={1}
          placeholder={t.chat.placeholder}
          aria-label={t.chat.placeholder}
          className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-[15px] outline-none placeholder:text-muted-foreground"
        />
        <AuiIf condition={(s) => !s.thread.isRunning}>
          <ComposerPrimitive.Send
            aria-label={t.chat.send}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          >
            <Icon icon={ArrowUp02Icon} className="size-5" />
          </ComposerPrimitive.Send>
        </AuiIf>
        <AuiIf condition={(s) => s.thread.isRunning}>
          <ComposerPrimitive.Cancel
            aria-label={t.chat.stop}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground/10"
          >
            <Icon icon={StopIcon} className="size-4" />
          </ComposerPrimitive.Cancel>
        </AuiIf>
      </ComposerPrimitive.Root>
      <p className="px-3 text-center text-[10px] leading-snug text-muted-foreground">
        {demo ? t.chat.footer : t.chat.liveFooter}
      </p>
    </div>
  );
}
