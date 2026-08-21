interface MessageProps {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

export function Message({ role, content, loading }: MessageProps) {
  const isUser = role === "user";

  if (loading) {
    return (
      <div className="flex justify-start">
        <div className="flex items-center gap-1.5 py-2">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-foreground-tertiary" />
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-foreground-tertiary [animation-delay:150ms]" />
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-foreground-tertiary [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-user-bubble text-user-bubble-text max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-shadow-sm md:max-w-[65%]">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] text-[15px] leading-relaxed text-foreground md:max-w-[70%]">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
