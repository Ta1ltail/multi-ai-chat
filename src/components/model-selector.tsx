"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { providerConfigs, AUTO_MODEL_ID, type ModelConfig } from "@/lib/ai/models";

const allModels = providerConfigs.flatMap((p) => p.models);

const AUTO_LABEL = "Auto";

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ selectedModel, onSelectModel, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAuto = selectedModel === AUTO_MODEL_ID;
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

  const label = isAuto ? AUTO_LABEL : (currentModel?.name ?? "Select model");

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`focus-ring flex h-8 items-center gap-2 rounded-full pr-2 pl-1.5 text-[13px] font-medium transition-colors duration-150 disabled:opacity-50 ${
          isOpen
            ? "bg-hover text-foreground"
            : "text-foreground-secondary hover:bg-hover hover:text-foreground"
        }`}
        title="Select model"
      >
        <span
          aria-hidden="true"
          className="bg-accent/10 text-accent flex h-5 w-5 items-center justify-center rounded-md"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.5l2.35 7.15L21.5 12l-7.15 2.35L12 21.5l-2.35-7.15L2.5 12l7.15-2.35L12 2.5z" />
          </svg>
        </span>
        <span className="max-w-[160px] truncate md:max-w-[220px]">{label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 opacity-60 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-border-separator bg-surface absolute top-full left-1/2 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-2xl border shadow-xl shadow-black/5">
          <div className="custom-scrollbar max-h-[min(24rem,70vh)] overflow-y-auto p-1.5">
            {/* Auto option */}
            <button
              type="button"
              role="option"
              aria-selected={isAuto}
              onClick={() => {
                onSelectModel(AUTO_MODEL_ID);
                setIsOpen(false);
              }}
              className={`focus-ring flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13px] transition-colors duration-100 ${
                isAuto
                  ? "bg-accent-light text-foreground font-medium"
                  : "text-foreground-secondary hover:bg-hover hover:text-foreground"
              }`}
            >
              <span className="from-accent to-accent-hover grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.5l2.35 7.15L21.5 12l-7.15 2.35L12 21.5l-2.35-7.15L2.5 12l7.15-2.35L12 2.5z" />
                </svg>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{AUTO_LABEL}</span>
                <span className="text-foreground-tertiary truncate text-[11px] font-normal">
                  best available
                </span>
              </span>
              {isAuto && (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-accent shrink-0"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>

            <div className="bg-border-separator mx-2 my-1.5 h-px" aria-hidden="true" />

            {providerConfigs.map((provider) => (
              <div key={provider.id}>
                <div className="text-foreground-tertiary px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-wider uppercase">
                  {provider.name}
                </div>
                {provider.models.map((model: ModelConfig) => {
                  const selected = model.id === selectedModel;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onSelectModel(model.id);
                        setIsOpen(false);
                      }}
                      className={`focus-ring flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors duration-100 ${
                        selected
                          ? "bg-accent-light text-foreground font-medium"
                          : "text-foreground-secondary hover:bg-hover hover:text-foreground"
                      }`}
                    >
                      <span className="text-foreground-tertiary w-7 shrink-0 text-center text-[10px] font-semibold tracking-wide uppercase">
                        {provider.id === "groq" ? "GQ" : "OR"}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{model.name}</span>
                      {selected && (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-accent shrink-0"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
