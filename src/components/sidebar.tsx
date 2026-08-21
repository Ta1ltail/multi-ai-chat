import { Button } from "./button";

interface SidebarProps {
  conversations: Array<{ id: string; title: string; active?: boolean }>;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onToggle: () => void;
}

export function Sidebar({ conversations, onNewChat, onSelectConversation, onToggle }: SidebarProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header with toggle inside */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[15px] font-semibold tracking-tight text-foreground">Multi AI Chat</span>
        <button
          onClick={onToggle}
          aria-label="Close sidebar"
          title="Close sidebar"
          className="focus-ring text-foreground-secondary hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-hover active:bg-active"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      </div>

      {/* New chat button */}
      <div className="px-3 pb-2">
        <Button variant="secondary" size="md" className="w-full justify-start" onClick={onNewChat}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          New chat
        </Button>
      </div>

      {/* Conversation list */}
      <div className="custom-scrollbar flex-1 overflow-y-auto px-2 py-1">
        {conversations.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-foreground-tertiary">No conversations yet</p>
        ) : (
          <ul className="space-y-px">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  onClick={() => onSelectConversation(conv.id)}
                  className={`focus-ring flex w-full items-center gap-2.5 truncate rounded-lg px-3 py-2 text-left text-[14px] transition-colors ${
                    conv.active
                      ? "bg-accent-light font-medium text-foreground"
                      : "text-foreground-secondary hover:bg-hover hover:text-foreground"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0 opacity-50">
                    <path d="M2 4h12M2 8h8M2 12h10" />
                  </svg>
                  <span className="truncate">{conv.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3">
        <p className="text-[11px] text-foreground-tertiary">v0.1.0</p>
      </div>
    </div>
  );
}
