interface MessageProps {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

export function Message({ role, content, loading }: MessageProps) {
  const isUser = role === "user";

  if (loading) {
    return (
      <div className="message-animate-in flex justify-start">
        <div className="flex items-center gap-1.5 py-2">
          <span className="bg-foreground-tertiary inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
          <span className="bg-foreground-tertiary inline-block h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
          <span className="bg-foreground-tertiary inline-block h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="message-animate-in flex justify-end">
        <div className="bg-user-bubble text-user-bubble-text shadow-shadow-sm max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed md:max-w-[65%]">
          <p className="wrap-break-word whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-animate-in flex justify-start">
      <div className="text-foreground max-w-[80%] text-[15px] leading-relaxed md:max-w-[70%]">
        <p className="wrap-break-word whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
