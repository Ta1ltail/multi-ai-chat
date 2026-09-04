"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { ModelSelector } from "./model-selector";

interface AppShellProps {
  children: React.ReactNode;
  conversations: Array<{ id: string; title: string; active?: boolean }>;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  modelDisabled?: boolean;
}

function isMobileWidth(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

export function AppShell({
  children, conversations, onNewChat, onSelectConversation,
  onDeleteConversation, theme, onToggleTheme, selectedModel, onSelectModel, modelDisabled,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobileWidth());
  const [isMobile, setIsMobile] = useState(false);

  // Track viewport; auto-open on desktop, auto-close on mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Escape closes the mobile drawer
  useEffect(() => {
    if (!sidebarOpen || !isMobile) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSidebarOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [sidebarOpen, isMobile]);

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      {/* Sidebar: slide-in drawer on mobile, static rail on desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 max-w-[85vw] flex-col overflow-hidden bg-surface shadow-xl transition-transform duration-200 ease-in-out md:static md:z-auto md:translate-x-0 md:border-r md:border-border-separator md:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          conversations={conversations}
          onNewChat={onNewChat}
          onSelectConversation={(id) => {
            onSelectConversation(id);
            if (isMobile) setSidebarOpen(false);
          }}
          onDeleteConversation={onDeleteConversation}
          onToggle={() => setSidebarOpen(false)}
        />
      </aside>

      {sidebarOpen && isMobile && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px] md:hidden"
        />
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="z-10 flex h-12 shrink-0 items-center gap-1 border-b border-border-separator/60 bg-surface/60 px-2 backdrop-blur-sm md:h-14 md:gap-2 md:px-4">
          <div className="flex w-9 shrink-0 items-center">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              title="Open sidebar"
              className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground-tertiary transition-colors duration-150 hover:bg-hover hover:text-foreground md:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <div className="flex min-w-0 flex-1 justify-center">
            <ModelSelector selectedModel={selectedModel} onSelectModel={onSelectModel} disabled={modelDisabled} />
          </div>

          <div className="flex w-9 shrink-0 items-center justify-end">
            <button
              onClick={onToggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground-tertiary transition-colors duration-150 hover:bg-hover hover:text-foreground"
            >
              {theme === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}