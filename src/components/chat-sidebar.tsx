import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createConversation, deleteConversation, listConversations } from "@/lib/chat.functions";
import { useStudent } from "@/lib/student";
import { cn } from "@/lib/utils";

export function ChatSidebar({ activeId }: { activeId?: string }) {
  const { student } = useStudent();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const conversationsQuery = useQuery({
    queryKey: ["conversations", student?.id],
    queryFn: () => listConversations({ data: { studentId: student!.id } }),
    enabled: Boolean(student),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!student) throw new Error("no_student");
      return createConversation({ data: { studentId: student.id } });
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", student?.id] });
      navigate({ to: "/chat/$conversationId", params: { conversationId: conversation.id } });
    },
    onError: () => toast.error("Couldn't start a new chat. Please try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: (conversationId: string) => deleteConversation({ data: { conversationId } }),
    onSuccess: (_result, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", student?.id] });
      if (conversationId === activeId) navigate({ to: "/" });
    },
    onError: () => toast.error("Couldn't delete that chat. Please try again."),
  });

  const conversations = conversationsQuery.data ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 rounded-xl"
          disabled={!student || creating || createMutation.isPending}
          onClick={() => {
            setCreating(true);
            createMutation.mutate(undefined, { onSettled: () => setCreating(false) });
          }}
        >
          <MessageSquarePlus className="size-4" />
          New chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {conversationsQuery.isPending ? (
          <div className="space-y-2 px-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No conversations yet. Start your first one.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((conversation) => (
              <li key={conversation.id} className="group relative">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate({ to: "/chat/$conversationId", params: { conversationId: conversation.id } })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate({ to: "/chat/$conversationId", params: { conversationId: conversation.id } });
                    }
                  }}
                  className={cn(
                    "flex h-9 cursor-pointer items-center overflow-hidden rounded-lg pr-9 pl-3 text-sm transition-colors",
                    conversation.id === activeId
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                  )}
                >
                  <span className="truncate">{conversation.title || "New chat"}</span>
                </div>
                <button
                  type="button"
                  aria-label={`Delete chat: ${conversation.title || "New chat"}`}
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                  disabled={deleteMutation.isPending}
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteMutation.mutate(conversation.id);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
