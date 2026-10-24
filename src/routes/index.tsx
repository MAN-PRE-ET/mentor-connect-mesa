import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowUp, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { LogoMark } from "@/components/app-header";
import { ThemeMenu } from "@/components/theme-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createConversation, createStudent } from "@/lib/chat.functions";
import { useStudent } from "@/lib/student";
import { prepareStudentKey } from "@/lib/student-key";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mentor Connect — Get unstuck in your career" },
      {
        name: "description",
        content:
          "Describe your career problem and get matched with real mentors from Mesa School of Business, grounded in their actual profiles.",
      },
      { property: "og:title", content: "Mentor Connect — Get unstuck in your career" },
      {
        property: "og:description",
        content:
          "Describe your career problem and get matched with real Mesa School of Business mentors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const EXAMPLES = [
  "I want to move from data analytics into product management — where do I start?",
  "Should I specialize in AI product management?",
  "I'm a final-year student interested in marketing at a SaaS company",
];

function Landing() {
  const navigate = useNavigate();
  const { student, setStudent } = useStudent();
  const [text, setText] = useState("");
  const [nameOpen, setNameOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [starting, setStarting] = useState(false);

  const startMutation = useMutation({
    mutationFn: async (input: { studentId: string; content: string }) => {
      const conversation = await createConversation({ data: { studentId: input.studentId } });
      return conversation;
    },
    onSuccess: (conversation) => {
      navigate({
        to: "/chat/$conversationId",
        params: { conversationId: conversation.id },
        search: { q: text.trim() },
      });
    },
    onError: () => {
      setStarting(false);
      // surfaced inline below
    },
  });

  const start = async () => {
    const content = text.trim();
    if (!content || starting) return;
    if (!student) {
      setNameOpen(true);
      return;
    }
    setStarting(true);
    startMutation.mutate({ studentId: student.id, content });
  };

  const submitName = async () => {
    const name = firstName.trim();
    if (!name || !text.trim() || starting) return;
    setStarting(true);
    try {
      prepareStudentKey();
      const created = await createStudent({ data: { firstName: name } });
      setStudent(created);
      setNameOpen(false);
      startMutation.mutate({ studentId: created.id, content: text.trim() });
    } catch {
      setStarting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-125 bg-[radial-gradient(60%_60%_at_50%_0%,var(--hero-glow)_0%,transparent_70%)]"
      />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-10">
        <LogoMark />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg text-muted-foreground"
            onClick={() => navigate({ to: "/about" })}
          >
            About this prototype
          </Button>
          <ThemeMenu />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-4 pb-20">
        <div className="animate-message-in text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Get unstuck in your career
          </h1>
          <p className="mt-3 text-lg text-muted-foreground text-balance">
            Describe what you're stuck on and we'll match you with mentors who have actually been
            there.
          </p>
        </div>

        <div
          className="animate-message-in w-full rounded-2xl border bg-card p-2 shadow-lift"
          style={{ animationDelay: "0.08s" }}
        >
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void start();
              }
            }}
            placeholder="What are you stuck on?"
            className="min-h-20 resize-none border-0 bg-transparent px-3 py-2 text-base shadow-none focus-visible:ring-0"
          />
          <div className="flex justify-end p-1">
            <Button
              size="icon"
              className="rounded-xl"
              aria-label="Send"
              disabled={!text.trim() || starting}
              onClick={() => void start()}
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </div>

        <div
          className="animate-message-in flex flex-wrap justify-center gap-2"
          style={{ animationDelay: "0.16s" }}
        >
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setText(example)}
              className="rounded-full border bg-card px-4 py-2 text-sm text-muted-foreground shadow-card transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {example}
            </button>
          ))}
        </div>

        {startMutation.isError ? (
          <p className="text-sm text-destructive">Couldn't start your chat. Please try again.</p>
        ) : null}
      </main>

      <footer className="relative z-10 pb-6 text-center text-xs text-muted-foreground">
        Mentor Connect — Mesa School of Business ·{" "}
        <Link to="/admin" className="underline underline-offset-2 hover:text-foreground">Admin</Link>
      </footer>

      <Dialog open={nameOpen} onOpenChange={setNameOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>What's your first name?</DialogTitle>
            <DialogDescription>
              We'll use it in your chats. No passwords — this is a prototype.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submitName();
            }}
            placeholder="First name"
            autoFocus
          />
          <DialogFooter>
            <Button onClick={() => void submitName()} disabled={!firstName.trim() || starting}>
              {starting ? "Starting…" : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
