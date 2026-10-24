import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { TypingIndicator } from "@/components/app-header";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ErrorState } from "@/components/error-state";
import { MentorCard } from "@/components/mentor-card";
import { MessageSkeleton } from "@/components/message-skeleton";
import { SupportNote } from "@/components/support-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getConversation, getMentorsByIds, sendChatMessage } from "@/lib/chat.functions";
import { useStudent } from "@/lib/student";
import type { ChatMessage } from "@/lib/types";

export const Route = createFileRoute("/_app/chat/$conversationId")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? search["q"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Chat — Mentor Connect" },
      {
        name: "description",
        content:
          "Describe your career problem and get matched with Mesa School of Business mentors.",
      },
      { property: "og:title", content: "Chat — Mentor Connect" },
      {
        property: "og:description",
        content:
          "Describe your career problem and get matched with Mesa School of Business mentors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

const EXAMPLES = [
  "I want to move from data analytics into product management — where do I start?",
  "Should I specialize in AI product management?",
  "I've been passed over for a promotion twice. What am I missing?",
];

type ConversationData = Awaited<ReturnType<typeof getConversation>>;

function ChatPage() {
  const { conversationId } = Route.useParams();
  const search = Route.useSearch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { student, ready } = useStudent();
  const [sendError, setSendError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const lastSentRef = useRef("");
  const autoSentRef = useRef(false);

  const conversationKey = ["conversation", conversationId] as const;

  const conversationQuery = useQuery({
    queryKey: conversationKey,
    queryFn: () => getConversation({ data: { conversationId } }),
    enabled: ready,
  });

  const conversation = conversationQuery.data?.conversation;
  const messages = useMemo(() => conversationQuery.data?.messages ?? [], [conversationQuery.data]);

  const mentorIds = useMemo(
    () => [...new Set(messages.flatMap((m) => m.recommendedMentorIds))],
    [messages],
  );
  const mentorsQuery = useQuery({
    queryKey: ["mentors", mentorIds.join(",")],
    queryFn: () => getMentorsByIds({ data: { mentorIds } }),
    enabled: mentorIds.length > 0,
  });
  const mentorsById = useMemo(
    () => new Map((mentorsQuery.data ?? []).map((mentor) => [mentor.id, mentor])),
    [mentorsQuery.data],
  );

  const clearQ = () => {
    router.navigate({
      to: "/chat/$conversationId",
      params: { conversationId },
      search: { q: undefined },
      replace: true,
    });
  };

  const send = useMutation({
    mutationFn: (content: string) => sendChatMessage({ data: { conversationId, content } }),
    onMutate: async (content) => {
      lastSentRef.current = content;
      setSendError(null);
      await queryClient.cancelQueries({ queryKey: conversationKey });
      const previous = queryClient.getQueryData<ConversationData>(conversationKey);
      const optimistic: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content,
        responseType: null,
        recommendedMentorIds: [],
        recommendations: [],
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<ConversationData>(conversationKey, (old) =>
        old ? { ...old, messages: [...old.messages, optimistic] } : old,
      );
      return { previous };
    },
    onSuccess: (result, _content, context) => {
      if (result.ok) {
        queryClient.setQueryData<ConversationData>(conversationKey, (old) =>
          old
            ? {
                ...old,
                conversation: {
                  ...old.conversation,
                  title: result.conversation.title,
                  category: result.conversation.category,
                },
                messages: [
                  ...old.messages.filter((m) => !m.id.startsWith("temp-")),
                  result.userMessage,
                  result.assistantMessage,
                ],
              }
            : old,
        );
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      } else {
        queryClient.setQueryData(conversationKey, context?.previous);
        setSendError(result.error);
      }
    },
    onError: (_error, _content, context) => {
      queryClient.setQueryData(conversationKey, context?.previous);
      setSendError("send_failed");
    },
  });

  // Landing page hand-off: auto-send the prompt the student typed there.
  useEffect(() => {
    if (!ready || autoSentRef.current || !search.q) return;
    if (!conversationQuery.isSuccess) return;
    autoSentRef.current = true;
    const q = search.q;
    clearQ();
    if (messages.length === 0) send.mutate(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, conversationQuery.isSuccess, search.q]);

  const handleSubmit = ({ text }: { text?: string }) => {
    const content = text?.trim();
    if (content && !send.isPending) send.mutate(content);
  };

  const isEmpty = !conversationQuery.isPending && messages.length === 0 && !send.isPending;

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-1">
      <aside className="hidden w-72 shrink-0 border-r bg-sidebar lg:block">
        <ChatSidebar activeId={conversationId} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-3 lg:hidden">
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11" aria-label="Open conversations">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" aria-describedby={undefined} className="w-72 p-0 pt-16 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center">
              <SheetTitle className="sr-only">Conversations</SheetTitle>
              <ChatSidebar activeId={conversationId} drawer onNavigate={() => setHistoryOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="truncate text-sm font-medium">{conversation?.title ?? "Chat"}</span>
          {conversation?.category ? (
            <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
              {conversation.category}
            </Badge>
          ) : null}
        </div>

        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-6">
            {conversationQuery.isPending ? (
              <MessageSkeleton />
            ) : conversationQuery.isError ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="font-medium">This chat couldn't be loaded</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  It may have been deleted, or the link is out of date.
                </p>
                <Button variant="outline" className="rounded-xl" onClick={() => router.navigate({ to: "/" })}>
                  Start over
                </Button>
              </div>
            ) : isEmpty ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <h2 className="text-2xl font-semibold tracking-tight">What are you stuck on?</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Describe your problem and we'll match you with mentors from Mesa's network.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => send.mutate(example)}
                      className="inline-flex min-h-10 items-center rounded-full border bg-card px-4 py-2 text-sm text-muted-foreground shadow-card transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <Message key={message.id} from={message.role} className="animate-message-in">
                    <MessageContent
                      className={
                        message.role === "user"
                          ? "group-[.is-user]:rounded-2xl group-[.is-user]:bg-primary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-primary-foreground"
                          : undefined
                      }
                    >
                      {message.role === "user" ? (
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      ) : (
                        message.content && <MessageResponse>{message.content}</MessageResponse>
                      )}
                      {message.responseType === "support" ? <SupportNote /> : null}
                      {message.recommendations.map((rec) => {
                        const mentor = mentorsById.get(rec.mentorId);
                        if (!mentor) return null;
                        return (
                          <MentorCard
                            key={rec.mentorId}
                            mentor={mentor}
                            match={rec.match}
                            evidence={rec.evidence}
                            caveat={rec.caveat}
                            conversationId={conversationId}
                          />
                        );
                      })}
                    </MessageContent>
                  </Message>
                ))}
              </div>
            )}
            {send.isPending ? (
              <div className="animate-message-in mx-auto w-full max-w-3xl px-4">
                <TypingIndicator label="Matching mentors" />
              </div>
            ) : null}
            {sendError && !send.isPending ? (
              <div className="mx-auto w-full max-w-3xl px-4">
                <ErrorState error={sendError} onRetry={() => send.mutate(lastSentRef.current)} />
              </div>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="shrink-0 border-t bg-background/80 backdrop-blur">
          <div className="mx-auto w-full max-w-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputTextarea placeholder="What are you stuck on?" />
              <PromptInputFooter className="justify-end">
                <PromptInputSubmit
                  status={send.isPending ? "submitted" : "ready"}
                  disabled={!ready || send.isPending}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </div>
    </div>
  );
}
