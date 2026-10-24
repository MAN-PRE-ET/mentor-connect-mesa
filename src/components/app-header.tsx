import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { createConversation, listConversations } from "@/lib/chat.functions";
import { useStudent } from "@/lib/student";
import { Button } from "@/components/ui/button";
import { ThemeMenu } from "@/components/theme-menu";

/** Domain wordmark: a monogram tile plus the product name. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-card">
        MC
      </span>
      <span className="whitespace-nowrap text-base font-semibold tracking-tight">
        Mentor Connect
      </span>
    </span>
  );
}

export function TypingIndicator({ label = "Thinking" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
      <span className="flex gap-1">
        <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
        <span
          className="typing-dot size-1.5 rounded-full bg-muted-foreground"
          style={{ animationDelay: "0.15s" }}
        />
        <span
          className="typing-dot size-1.5 rounded-full bg-muted-foreground"
          style={{ animationDelay: "0.3s" }}
        />
      </span>
      {label}…
    </div>
  );
}

/** Navigates to the student's most recent chat, creating one when none exists. */
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
        navigate({
          to: "/chat/$conversationId",
          params: { conversationId: conversations[0]!.id },
          search: { q: undefined },
        });
        return;
      }
      const created = await createConversation({ data: { studentId: student.id } });
      navigate({
        to: "/chat/$conversationId",
        params: { conversationId: created.id },
        search: { q: undefined },
      });
    } catch {
      toast.error("Couldn't open your chats. Please try again.");
    }
  };
}

const NAV_LINKS = [
  { label: "My Calls", to: "/my-calls" },
  { label: "About this prototype", to: "/about" },
] as const;

export function AppHeader() {
  const navigate = useNavigate();
  const openLatestChat = useOpenLatestChat();
  const { student } = useStudent();

  return (
    <header className="sticky top-0 z-40 h-16 shrink-0 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-full items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogoMark />
          </button>
          <span className="hidden rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground md:inline">Free to use in this prototype</span>
        </div>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg"
            onClick={() => void openLatestChat()}
          >
            Chat
          </Button>
          {NAV_LINKS.map((link) => (
            <Button
              key={link.to}
              variant="ghost"
              size="sm"
              className="hidden rounded-lg sm:inline-flex"
              onClick={() => navigate({ to: link.to })}
            >
              {link.label}
            </Button>
          ))}
          <ThemeMenu />
          {student ? (
            <span className="ml-1 flex items-center gap-2 rounded-full bg-secondary py-1 pr-3 pl-1 text-sm font-medium text-secondary-foreground">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {student.firstName.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden xs:inline sm:inline">{student.firstName}</span>
            </span>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
