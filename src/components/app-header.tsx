import { useNavigate } from "@tanstack/react-router";
import { createConversation, listConversations } from "@/lib/chat.functions";
import { useStudent } from "@/lib/student";
import { toast } from "sonner";

/** Domain wordmark: a monogram tile plus the product name. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-card">
        MC
      </span>
      <span className="text-base font-semibold tracking-tight">Mentor Connect</span>
    </span>
  );
}

export function TypingIndicator({ label = "Thinking" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
      <span className="flex gap-1">
        <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
        <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "0.15s" }} />
        <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "0.3s" }} />
      </span>
      {label}…
    </div>
  );
}

/** Navigates to the student's most recent chat, creating one when none exists. */
export async function openLatestChat(studentId: string): Promise<void> {
  const navigate = (window as unknown as { __mcNavigate?: unknown }).__mcNavigate;
  void navigate;
  const conversations = await listConversations({ data: { studentId } });
  const router = (await import("@tanstack/react-router")).useRouter;
  void router;
}

export function useOpenLatestChat() {
  const navigate = useNavigate();
  const { student } = useStudent();
  return async () => {
    if (!student) {
      navigate({ to: "/" });
      return;
    }
    try {
      const conversations = await listConversations({ data: { studentId: student.id } });
      if (conversations.length > 0) {
        navigate({ to: "/chat/$conversationId", params: { conversationId: conversations[0]!.id } });
        return;
      }
      const created = await createConversation({ data: { studentId: student.id } });
      navigate({ to: "/chat/$conversationId", params: { conversationId: created.id } });
    } catch {
      toast.error("Couldn't open your chats. Please try again.");
    }
  };
}
