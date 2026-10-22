/**
 * Shared, client-safe types for Mentor Connect.
 * DTOs are camelCase; the database stores snake_case and the server maps them.
 */

export type MentorRow = {
  id: string;
  name: string | null;
  city: string | null;
  domains: string[] | null;
  company: string | null;
  masterSector: string | null;
  sectors: string[] | null;
  roles: string[] | null;
  seniority: string | null;
  aiNative: string | null;
  builtAiProduct: string | null;
  aiExperience: string | null;
  aiSubDomain: string | null;
  aiTools: string[] | null;
  analyticsTools: string[] | null;
  qualityOfMentorship: string | null;
  activitiesParticipated: string | null;
  dataCompleteness: string | null;
};

export type Evidence = { field: string; value: string };

export type MatchQuality = "strong" | "partial";

export type Recommendation = {
  mentorId: string;
  match: MatchQuality;
  evidence: Evidence[];
  caveat: string | null;
};

export type ChatResponseType = "clarify" | "recommend" | "no_match" | "support" | "off_topic";

export type ChatTurn = {
  type: ChatResponseType;
  message: string;
  category: string;
  recommendations: Recommendation[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  responseType: ChatResponseType | null;
  recommendedMentorIds: string[];
  recommendations: Recommendation[];
  createdAt: string;
};

export type ConversationSummary = {
  id: string;
  title: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Student = {
  id: string;
  firstName: string;
};

export type SendChatSuccess = {
  ok: true;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  mentors: MentorRow[];
  conversation: { id: string; title: string | null; category: string | null };
};

export type SendChatFailure = {
  ok: false;
  error: "mentors_unavailable" | "ai_unavailable" | "send_failed";
};

export type SendChatResult = SendChatSuccess | SendChatFailure;

/** Human labels for mentor fields, used on evidence chips. */
export const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  city: "City",
  domains: "Domain",
  company: "Company",
  master_sector: "Sector",
  masterSector: "Sector",
  sectors: "Sector",
  roles: "Role",
  seniority: "Seniority",
  ai_native: "AI-native",
  aiNative: "AI-native",
  built_ai_product: "Built AI product",
  builtAiProduct: "Built AI product",
  ai_experience: "AI experience",
  aiExperience: "AI experience",
  ai_sub_domain: "AI sub-domain",
  aiSubDomain: "AI sub-domain",
  ai_tools: "AI tool",
  aiTools: "AI tool",
  analytics_tools: "Analytics tool",
  analyticsTools: "Analytics tool",
  quality_of_mentorship: "Mentorship quality",
  qualityOfMentorship: "Mentorship quality",
  activities_participated: "Activity",
  activitiesParticipated: "Activity",
  data_completeness: "Data completeness",
  dataCompleteness: "Data completeness",
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Fields of a mentor row the LLM may cite as evidence. */
export const MENTOR_FIELDS = [
  "name",
  "city",
  "domains",
  "company",
  "master_sector",
  "sectors",
  "roles",
  "seniority",
  "ai_native",
  "built_ai_product",
  "ai_experience",
  "ai_sub_domain",
  "ai_tools",
  "analytics_tools",
  "quality_of_mentorship",
  "activities_participated",
  "data_completeness",
] as const;
