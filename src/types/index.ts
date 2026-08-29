export interface MessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: MessageData[];
  createdAt: number;
}

export interface ToastState {
  id: number;
  message: string;
  type: "error" | "success" | "info";
}
