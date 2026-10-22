import { createServerFn } from "@tanstack/react-start";
import { createServerDb } from "./db.server";
import { callMentorMatch } from "./chat.server";
import { validateChatTurn } from "./chat-validation";
import type {
  ChatMessage,
  ChatResponseType,
  ConversationSummary,
  MentorRow,
  SendChatResult,
  Student,
} from "./types";

/* Row -> DTO mapping helpers (DB rows are snake_case). */

type DbMentor = Record<string, unknown>;

function toMentorDto(row: DbMentor): MentorRow {
  return {
    id: String(row["id"]),
    name: (row["name"] as string | null) ?? null,
    city: (row["city"] as string | null) ?? null,
    domains: (row["domains"] as string[] | null) ?? null,
    company: (row["company"] as string | null) ?? null,
    masterSector: (row["master_sector"] as string | null) ?? null,
    sectors: (row["sectors"] as string[] | null) ?? null,
    roles: (row["roles"] as string[] | null) ?? null,
    seniority: (row["seniority"] as string | null) ?? null,
    aiNative: (row["ai_native"] as string | null) ?? null,
    builtAiProduct: (row["built_ai_product"] as string | null) ?? null,
    aiExperience: (row["ai_experience"] as string | null) ?? null,
    aiSubDomain: (row["ai_sub_domain"] as string | null) ?? null,
    aiTools: (row["ai_tools"] as string[] | null) ?? null,
    analyticsTools: (row["analytics_tools"] as string[] | null) ?? null,
    qualityOfMentorship: (row["quality_of_mentorship"] as string | null) ?? null,
    activitiesParticipated: (row["activities_participated"] as string | null) ?? null,
    dataCompleteness: (row["data_completeness"] as string | null) ?? null,
  };
}

function toMessageDto(row: DbMentor): ChatMessage {
  return {
    id: String(row["id"]),
    role: row["role"] === "assistant" ? "assistant" : "user",
    content: String(row["content"] ?? ""),
    responseType: (row["response_type"] as ChatResponseType | null) ?? null,
    recommendedMentorIds: (row["recommended_mentor_ids"] as string[] | null) ?? [],
    createdAt: String(row["created_at"]),
  };
}

function toConversationDto(row: DbMentor): ConversationSummary {
  return {
    id: String(row["id"]),
    title: (row["title"] as string | null) ?? null,
    category: (row["category"] as string | null) ?? null,
    createdAt: String(row["created_at"]),
    updatedAt: String(row["updated_at"]),
  };
}

/* Public server functions (this prototype has no passwords). */

export const createStudent = createServerFn({ method: "POST" })
  .inputValidator((input: { firstName: string }) => input)
  .handler(async ({ data }): Promise<Student> => {
    const db = createServerDb();
    const { data: row, error } = await db
      .from("students")
      .insert({ first_name: data.firstName.trim() })
      .select()
      .single();
    if (error || !row) throw new Error("student_create_failed");
    return { id: row.id, firstName: row.first_name };
  });

export const listConversations = createServerFn({ method: "POST" })
  .inputValidator((input: { studentId: string }) => input)
  .handler(async ({ data }): Promise<ConversationSummary[]> => {
    const db = createServerDb();
    const { data: rows, error } = await db
      .from("conversations")
      .select("*")
      .eq("student_id", data.studentId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("conversation_list_failed");
    return (rows ?? []).map(toConversationDto);
  });

export const createConversation = createServerFn({ method: "POST" })
  .inputValidator((input: { studentId: string }) => input)
  .handler(async ({ data }): Promise<ConversationSummary> => {
    const db = createServerDb();
    const { data: row, error } = await db
      .from("conversations")
      .insert({ student_id: data.studentId, title: "New chat" })
      .select()
      .single();
    if (error || !row) throw new Error("conversation_create_failed");
    return toConversationDto(row);
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .inputValidator((input: { conversationId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const db = createServerDb();
    const { error } = await db.from("conversations").delete().eq("id", data.conversationId);
    if (error) throw new Error("conversation_delete_failed");
    return { ok: true };
  });

export const getConversation = createServerFn({ method: "GET" })
  .inputValidator((input: { conversationId: string }) => input)
  .handler(async ({ data }): Promise<{ conversation: ConversationSummary; messages: ChatMessage[] }> => {
    const db = createServerDb();
    const [conversationResult, messagesResult] = await Promise.all([
      db.from("conversations").select("*").eq("id", data.conversationId).single(),
      db.from("messages").select("*").eq("conversation_id", data.conversationId).order("created_at", { ascending: true }),
    ]);
    if (conversationResult.error || !conversationResult.data) throw new Error("conversation_not_found");
    return {
      conversation: toConversationDto(conversationResult.data as DbMentor),
      messages: (messagesResult.data ?? []).map(toMessageDto),
    };
  });

export const getMentorsByIds = createServerFn({ method: "POST" })
  .inputValidator((input: { mentorIds: string[] }) => input)
  .handler(async ({ data }): Promise<MentorRow[]> => {
    if (data.mentorIds.length === 0) return [];
    const db = createServerDb();
    const { data: rows, error } = await db.from("mentors").select("*").in("id", data.mentorIds);
    if (error) throw new Error("mentors_unavailable");
    return (rows ?? []).map(toMentorDto);
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { conversationId: string; content: string }) => input)
  .handler(async ({ data }): Promise<SendChatResult> => {
    const db = createServerDb();
    const content = data.content.trim();
    if (!content) return { ok: false, error: "send_failed" };

    // 1. Load the conversation and prior messages.
    const { data: conversationRow, error: conversationError } = await db
      .from("conversations")
      .select("*")
      .eq("id", data.conversationId)
      .single();
    if (conversationError || !conversationRow) return { ok: false, error: "send_failed" };
    const conversation = toConversationDto(conversationRow as DbMentor);

    const { data: priorRows } = await db
      .from("messages")
      .select("*")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    const priorMessages = (priorRows ?? []).map(toMessageDto);

    // 2. Save the user's message; auto-title the thread from the first message.
    const isFirstMessage = priorMessages.length === 0;
    const title = isFirstMessage ? (content.length > 60 ? `${content.slice(0, 60)}…` : content) : conversation.title;
    const { data: userRow, error: userError } = await db
      .from("messages")
      .insert({ conversation_id: data.conversationId, role: "user", content })
      .select()
      .single();
    if (userError || !userRow) return { ok: false, error: "send_failed" };

    // 3. Load the real mentor roster from the database.
    const { data: mentorRows, error: mentorError } = await db.from("mentors").select("*");
    if (mentorError) return { ok: false, error: "mentors_unavailable" };
    const mentors: MentorRow[] = (mentorRows ?? []).map(toMentorDto);
    if (mentors.length === 0) return { ok: false, error: "mentors_unavailable" };

    // 4. Ask the model, grounded on the real roster.
    const history = [...priorMessages, { role: "user" as const, content }].slice(-12).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const studentRow = await db
      .from("students")
      .select("first_name")
      .eq("id", conversationRow.student_id as string)
      .single();

    let raw;
    try {
      raw = await callMentorMatch({
        mentors,
        history,
        studentName: studentRow.data?.first_name ?? "",
      });
    } catch {
      return { ok: false, error: "ai_unavailable" };
    }

    // 5. Validate every claim against the database rows.
    const mentorsById = new Map(mentors.map((m) => [m.id, m]));
    const turn = validateChatTurn(raw, mentorsById);

    if (turn.type === "no_match") {
      await db.from("unmatched_queries").insert({ conversation_id: data.conversationId, query: content });
    }

    // 6. Save the assistant's reply.
    const { data: assistantRow, error: assistantError } = await db
      .from("messages")
      .insert({
        conversation_id: data.conversationId,
        role: "assistant",
        content: turn.message,
        response_type: turn.type,
        recommended_mentor_ids: turn.recommendations.map((rec) => rec.mentorId),
      })
      .select()
      .single();
    if (assistantError || !assistantRow) return { ok: false, error: "send_failed" };

    // 7. Update conversation metadata.
    await db
      .from("conversations")
      .update({
        title,
        category: turn.category || conversation.category,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.conversationId);

    return {
      ok: true,
      userMessage: toMessageDto(userRow as DbMentor),
      assistantMessage: toMessageDto(assistantRow as DbMentor),
      mentors: turn.recommendations
        .map((rec) => mentorsById.get(rec.mentorId))
        .filter((m): m is MentorRow => Boolean(m)),
      conversation: { id: conversation.id, title, category: turn.category || conversation.category },
    };
  });
