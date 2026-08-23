import { Button } from "./button";

interface SidebarProps {
  conversations: Array<{ id: string; title: string; active?: boolean }>;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onToggle: () => void;
}

export function Sidebar({
  conversations,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onToggle,
}: SidebarProps) {
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
              <li key={conv.id} className="group relative">
                <button
                  onClick={() => onSelectConversation(conv.id)}
                  className={`focus-ring flex w-full items-center gap-2.5 truncate rounded-lg px-3 py-2 pr-8 text-left text-[14px] transition-colors ${
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  aria-label={`Delete ${conv.title}`}
                  title="Delete conversation"
                  className={`focus-ring text-foreground-tertiary hover:text-error absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md transition-opacity hover:bg-error-bg ${
                    conv.active
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
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
