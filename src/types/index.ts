/** Message role in a conversation */
export type MessageRole = "user" | "assistant";

/** A single message in a conversation */
export interface MessageData {
  id: string;
  role: MessageRole;
  content: string;
}

/** A conversation with messages and metadata */
export interface Conversation {
  id: string;
  title: string;
  messages: MessageData[];
  createdAt: number;
}

/** Toast notification state */
export interface ToastState {
  id: number;
  message: string;
  type: "error" | "success" | "info";
}
