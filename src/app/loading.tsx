export default function Loading() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-foreground-tertiary">
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="opacity-25"
          />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="opacity-75"
          />
        </svg>
        Loading...
      </div>
    </div>
  );
}
