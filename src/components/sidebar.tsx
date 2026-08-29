import { useEffect, useRef, useState } from "react";
import { Button } from "./button";

interface SidebarProps {
  conversations: Array<{ id: string; title: string; active?: boolean }>;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onToggle: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function Sidebar({
  conversations,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onToggle,
  theme,
  onToggleTheme,
}: SidebarProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Focus the Delete button when confirm popover opens
  useEffect(() => {
    if (confirmDeleteId) {
      // Small delay to let the popover render
      const timer = setTimeout(() => deleteButtonRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [confirmDeleteId]);

  // Escape key to dismiss confirm popover
  useEffect(() => {
    if (!confirmDeleteId) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setConfirmDeleteId(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmDeleteId]);

  // Outside-click to dismiss confirm popover
  useEffect(() => {
    if (!confirmDeleteId) return;

    function handleMouseDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setConfirmDeleteId(null);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [confirmDeleteId]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <span className="text-sm font-semibold tracking-tight text-foreground">Multi AI Chat</span>
        <button
          onClick={onToggle}
          aria-label="Close sidebar"
          title="Close sidebar"
          className="focus-ring text-foreground-tertiary hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-hover active:bg-active"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      </div>

      {/* New chat button */}
      <div className="px-3 pb-3">
        <Button variant="secondary" size="md" className="w-full justify-start" onClick={onNewChat}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          New chat
        </Button>
      </div>

      {/* Conversation list */}
      <div className="custom-scrollbar flex-1 overflow-y-auto px-2 py-1">
        {conversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-foreground-tertiary">No conversations yet</p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((conv) => (
              <li key={conv.id} className="group relative">
                <button
                  onClick={() => {
                    setConfirmDeleteId(null);
                    onSelectConversation(conv.id);
                  }}
                  className={`focus-ring flex w-full items-center gap-2.5 truncate rounded-lg px-3 py-2 pr-8 text-left text-[13px] transition-colors duration-100 ${
                    conv.active
                      ? "bg-accent-light font-medium text-foreground"
                      : "text-foreground-secondary hover:bg-hover hover:text-foreground"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0 opacity-40">
                    <path d="M2 4h12M2 8h8M2 12h10" />
                  </svg>
                  <span className="truncate">{conv.title}</span>
                </button>

                {/* Delete button or inline confirm */}
                {confirmDeleteId === conv.id ? (
                  <div
                    ref={popoverRef}
                    className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded-md bg-surface shadow-sm border border-border-separator"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setConfirmDeleteId(null);
                    }}
                  >
                    <button
                      ref={deleteButtonRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                        setConfirmDeleteId(null);
                      }}
                      aria-label={`Confirm delete ${conv.title}`}
                      className="focus-ring text-error hover:bg-error-bg inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium transition-colors duration-100"
                    >
                      Delete
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(null);
                      }}
                      aria-label="Cancel delete"
                      className="focus-ring text-foreground-tertiary hover:text-foreground hover:bg-hover inline-flex h-6 items-center rounded-md px-1.5 text-[11px] transition-colors duration-100"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(conv.id);
                    }}
                    aria-label={`Delete ${conv.title}`}
                    title="Delete conversation"
                    className={`focus-ring text-foreground-tertiary hover:text-error absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md transition-all duration-100 hover:bg-error-bg ${
                      conv.active
                        ? "opacity-60 hover:opacity-100 focus-visible:opacity-100"
                        : "opacity-0 group-hover:opacity-60 group-focus-within:opacity-60 hover:!opacity-100 focus-visible:opacity-100"
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                      <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-[11px] text-foreground-tertiary/60">v0.3.0</p>
        <button
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="focus-ring text-foreground-tertiary hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150 hover:bg-hover active:bg-active"
        >
          {theme === "dark" ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
