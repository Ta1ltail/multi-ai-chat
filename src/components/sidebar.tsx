"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark } from "./brand-mark";

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Focus the Delete button when confirm popover opens
  useEffect(() => {
    if (confirmDeleteId) {
      const timer = setTimeout(() => deleteButtonRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [confirmDeleteId]);

  // Escape key to dismiss confirm popover
  useEffect(() => {
    if (!confirmDeleteId) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirmDeleteId(null);
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
      {/* App / logo area */}
      <div className="flex h-14 shrink-0 items-center justify-between px-3 md:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandMark className="h-7 w-7 rounded-lg" />
          <span className="truncate text-[13.5px] font-semibold tracking-tight text-foreground">Multi AI Chat</span>
        </div>
        <button
          onClick={onToggle}
          aria-label="Close sidebar"
          title="Close sidebar"
          className="focus-ring inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-foreground-tertiary transition-colors duration-150 hover:bg-hover hover:text-foreground md:hidden"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* New chat — clearly separated primary action */}
      <div className="px-3 pb-3 md:px-4">
        <button
          type="button"
          onClick={() => {
            setConfirmDeleteId(null);
            onNewChat();
          }}
          className="focus-ring flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[13px] font-medium text-white shadow-sm transition-all duration-150 hover:bg-accent-hover active:scale-[0.98]"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          New chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="mx-3 h-px shrink-0 bg-border-separator/70 md:mx-4" aria-hidden="true" />

      <div className="flex shrink-0 items-center px-3 pt-3 pb-1 md:px-4">
        <span className="text-[11px] font-medium tracking-wide text-foreground-tertiary uppercase">Conversations</span>
      </div>

      <nav className="custom-scrollbar flex-1 overflow-y-auto px-1.5 pb-2 md:px-2" aria-label="Conversations">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="text-foreground-tertiary/60"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <p className="text-xs leading-relaxed text-foreground-tertiary">No conversations yet.<br />Start a new chat to begin.</p>
          </div>
        ) : (
          <ul className="space-y-0.5" role="list">
            {conversations.map((conv) => (
              <li key={conv.id} className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteId(null);
                    onSelectConversation(conv.id);
                  }}
                  aria-current={conv.active ? "page" : undefined}
                  className={`focus-ring flex h-9 w-full items-center gap-2.5 rounded-lg pr-10 pl-2.5 text-left text-[13px] transition-colors duration-100 ${
                    conv.active
                      ? "bg-accent-light font-medium text-foreground"
                      : "text-foreground-secondary hover:bg-hover hover:text-foreground"
                  }`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className={`shrink-0 ${conv.active ? "text-accent" : "opacity-40"}`}
                  >
                    <path d="M2 4h12M2 8h8M2 12h10" />
                  </svg>
                  <span className="truncate" title={conv.title}>
                    {conv.title}
                  </span>
                </button>

                {/* Delete button or inline confirm */}
                {confirmDeleteId === conv.id ? (
                  <div
                    ref={popoverRef}
                    className="absolute top-1/2 right-1.5 z-10 flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-border-separator bg-surface p-0.5 shadow-lg"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setConfirmDeleteId(null);
                    }}
                  >
                    <button
                      ref={deleteButtonRef}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                        setConfirmDeleteId(null);
                      }}
                      aria-label={`Confirm delete ${conv.title}`}
                      className="focus-ring inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-error transition-colors duration-100 hover:bg-error-bg"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(null);
                      }}
                      aria-label="Cancel delete"
                      className="focus-ring inline-flex h-7 items-center rounded-md px-2 text-[11px] text-foreground-secondary transition-colors duration-100 hover:bg-hover hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(conv.id);
                    }}
                    aria-label={`Delete ${conv.title}`}
                    title="Delete conversation"
                    className={`focus-ring text-foreground-tertiary hover:text-error absolute top-1/2 right-1.5 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md transition-all duration-100 hover:bg-error-bg ${
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
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-border-separator/70 px-3 py-2.5 md:px-4">
        <p className="text-center text-[11px] text-foreground-tertiary">Multi AI Chat · v0.4.1</p>
      </div>
    </div>
  );
}
