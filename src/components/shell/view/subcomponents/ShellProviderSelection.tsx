import type { SessionProvider } from '../../../../types/app';
import SessionProviderLogo from '../../../llm-logo-provider/SessionProviderLogo';

const SHELL_PROVIDERS: { id: SessionProvider | 'system'; name: string; description: string }[] = [
  { id: 'claude', name: 'Claude Shell', description: 'Use Claude CLI with full code tools' },
  { id: 'codex', name: 'Codex Shell', description: 'Use Codex CLI for code generation' },
  { id: 'system', name: 'System Shell', description: 'Plain system terminal in project directory' },
];

export type ShellProviderSelectionProps = {
  onSelect: (mode: 'claude' | 'codex' | 'system') => void;
};

export default function ShellProviderSelection({ onSelect }: ShellProviderSelectionProps) {
  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Choose shell type
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Start a new Claude, Codex, or plain system shell in this project.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {SHELL_PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id as 'claude' | 'codex' | 'system')}
              className="relative flex flex-col items-center gap-2.5 rounded-xl border-[1.5px] border-border bg-card/60 px-2 pb-4 pt-5 text-center transition-all duration-150 hover:border-border/80 hover:bg-card active:scale-[0.97]"
            >
              <div className="mb-1 flex h-9 w-9 items-center justify-center">
                {p.id === 'system' ? (
                  <span className="text-base font-mono text-foreground">$</span>
                ) : (
                  <SessionProviderLogo provider={p.id as SessionProvider} className="h-7 w-7" />
                )}
              </div>
              <div className="text-center">
                <p className="text-[12px] font-semibold leading-none text-foreground">{p.name}</p>
                <p className="mt-1 text-[10px] leading-tight text-muted-foreground">{p.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
