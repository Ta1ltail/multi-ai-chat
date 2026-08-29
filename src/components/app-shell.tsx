"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  children: React.ReactNode;
  conversations: Array<{ id: string; title: string; active?: boolean }>;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function AppShell({
  children,
  conversations,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  theme,
  onToggleTheme,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // On mobile, start sidebar closed to avoid overlay-on-load issue
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Sidebar */}
      <div
        className={`relative z-30 bg-surface flex shrink-0 flex-col overflow-hidden transition-[width] duration-200 ease-in-out ${
          sidebarOpen ? "w-64" : "w-0"
        }`}
      >
        <div className="h-full w-64">
          <Sidebar
            conversations={conversations}
            onNewChat={onNewChat}
            onSelectConversation={(id) => {
              onSelectConversation(id);
              if (window.innerWidth < 768) {
                setSidebarOpen(false);
              }
            }}
            onDeleteConversation={onDeleteConversation}
            onToggle={() => setSidebarOpen(false)}
            theme={theme}
            onToggleTheme={onToggleTheme}
          />
        </div>
      </div>

      {/* Sidebar separator */}
      {sidebarOpen && <div className="hidden w-px shrink-0 bg-border-separator md:block" />}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-[1px] md:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSidebarOpen(false);
          }}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      {/* Reopen button — visible when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          title="Open sidebar"
          className="focus-ring text-foreground-tertiary hover:text-foreground fixed left-3 top-3 z-40 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface shadow-sm transition-colors duration-150 hover:bg-hover active:bg-active"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      )}

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
