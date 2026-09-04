interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className = "" }: BrandMarkProps) {
  return (
    <div
      aria-hidden="true"
      className={`from-accent to-accent-hover inline-flex shrink-0 items-center justify-center bg-gradient-to-br text-white ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-[55%] w-[55%]">
        <path d="M12 2.5l2.35 7.15L21.5 12l-7.15 2.35L12 21.5l-2.35-7.15L2.5 12l7.15-2.35L12 2.5z" />
      </svg>
    </div>
  );
}
