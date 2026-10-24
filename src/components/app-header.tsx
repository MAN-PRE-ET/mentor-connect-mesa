import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Info, Menu, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createConversation, listConversations } from "@/lib/chat.functions";
import { useStudent } from "@/lib/student";
import { Button } from "@/components/ui/button";
import { ThemeMenu } from "@/components/theme-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
      const latestConversation = conversations[0];
      if (latestConversation) {
        navigate({
          to: "/chat/$conversationId",
          params: { conversationId: latestConversation.id },
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
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const openLatestChat = useOpenLatestChat();
  const { student } = useStudent();

  return (
    <header className="sticky top-0 z-40 h-16 shrink-0 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 md:flex md:justify-between md:gap-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="h-auto min-h-11 min-w-0 rounded-lg p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0"
          >
            <LogoMark className="min-w-0 [&>span:last-child]:min-w-0 [&>span:last-child]:truncate" />
          </Button>
          <span className="hidden rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground md:inline">Free to use in this prototype</span>
        </div>
        <nav aria-label="Main navigation" className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11 shrink-0 rounded-lg md:hidden" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" aria-describedby={undefined} className="w-[min(20rem,calc(100vw-2rem))] md:hidden [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center">
              <SheetTitle>Navigation</SheetTitle>
              <nav aria-label="Mobile navigation" className="mt-6 grid gap-2">
                <Button variant={pathname.startsWith("/chat/") ? "secondary" : "ghost"} className="min-h-12 justify-start text-base" aria-current={pathname.startsWith("/chat/") ? "page" : undefined} onClick={() => { setMenuOpen(false); void openLatestChat(); }}>
                  <MessageSquare /> Chat
                </Button>
                {NAV_LINKS.map((link) => (
                  <Button key={link.to} asChild variant={pathname === link.to ? "secondary" : "ghost"} className="min-h-12 justify-start whitespace-normal text-left text-base">
                    <Link to={link.to} aria-current={pathname === link.to ? "page" : undefined} onClick={() => setMenuOpen(false)}>
                      {link.to === "/my-calls" ? <CalendarDays /> : <Info />} {link.label}
                    </Link>
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <Button
            variant="ghost"
            size="sm"
            className="hidden rounded-lg md:inline-flex"
            onClick={() => void openLatestChat()}
          >
            Chat
          </Button>
          {NAV_LINKS.map((link) => (
            <Button
              key={link.to}
              variant="ghost"
              size="sm"
              className="hidden rounded-lg md:inline-flex"
              onClick={() => navigate({ to: link.to })}
            >
              {link.label}
            </Button>
          ))}
          <ThemeMenu className="size-11 shrink-0 md:size-9" />
          {student ? (
            <span aria-label={student.firstName} className="ml-1 flex shrink-0 items-center gap-2 rounded-full bg-secondary p-1 text-sm font-medium text-secondary-foreground md:pr-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {student.firstName.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden md:inline">{student.firstName}</span>
            </span>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
