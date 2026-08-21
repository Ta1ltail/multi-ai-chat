export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center text-center">
        <h2 className="text-foreground mb-1 text-lg font-medium">Hi, how can I help you today?</h2>
        <p className="text-foreground-secondary mb-6 text-sm">Ask me anything.</p>
      </div>
    </div>
  );
}
