"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { providerConfigs, type ModelConfig } from "@/lib/ai";

const allModels = providerConfigs.flatMap((p) => p.models);

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ selectedModel, onSelectModel, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentModel = allModels.find((m) => m.id === selectedModel);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, handleClose]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="focus-ring text-foreground-tertiary hover:text-foreground hover:bg-hover flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] transition-colors duration-100 disabled:opacity-50"
        title="Select model"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
        </svg>
        <span className="max-w-[120px] truncate">{currentModel?.name ?? "Select model"}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 overflow-hidden rounded-xl border border-border-separator bg-surface shadow-lg">
          <div className="max-h-80 overflow-y-auto custom-scrollbar p-1">
            {providerConfigs.map((provider) => (
              <div key={provider.id}>
                <div className="px-2.5 pt-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-foreground-tertiary">
                  {provider.name}
                </div>
                {provider.models.map((model: ModelConfig) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      onSelectModel(model.id);
                      setIsOpen(false);
                    }}
                    className={`focus-ring flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors duration-100 ${
                      model.id === selectedModel
                        ? "bg-accent-light font-medium text-foreground"
                        : "text-foreground-secondary hover:bg-hover hover:text-foreground"
                    }`}
                  >
                    <span className="flex-1 truncate">{model.name}</span>
                    {model.id === selectedModel && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-accent">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
