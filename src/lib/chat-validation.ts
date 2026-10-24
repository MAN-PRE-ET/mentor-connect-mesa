import type { ChatTurn, Evidence, MatchQuality } from "./types";

/**
 * Pure, client-safe validation of the LLM's chat turn against the real
 * database rows. Nothing the model claims about a mentor survives unless the
 * mentor's row truly contains that value in that field.
 */

/** The raw shape the model is asked to return (snake_case mentor ids). */
export type RawEvidence = { field: string; value: string };

export type RawRecommendation = {
  mentor_id: string;
  match: string;
  evidence: RawEvidence[];
  caveat: string | null;
};

export type RawTurn = {
  type?: string;
  message?: string;
  category?: string;
  recommendations?: RawRecommendation[];
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Accepts "master_sector" as well as "masterSector" for the same field. */
function fieldVariants(field: string): string[] {
  const camel = field.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
  return field === camel ? [field] : [field, camel];
}

/** True when the mentor's DB row truly contains `value` in `field`. */
export function mentorFieldContains(
  mentor: Record<string, unknown>,
  field: string,
  value: string,
): boolean {
  const needle = normalize(value);
  if (!needle) return false;
  return fieldVariants(field).some((variant) => {
    if (!Object.prototype.hasOwnProperty.call(mentor, variant)) return false;
    const rowValue = mentor[variant];
    if (Array.isArray(rowValue)) {
      return rowValue.some((entry) => typeof entry === "string" && normalize(entry) === needle);
    }
    if (typeof rowValue === "string") return normalize(rowValue) === needle;
    return false;
  });
}

export function validEvidence(mentor: Record<string, unknown>, evidence: Evidence[]): Evidence[] {
  return evidence.filter((entry) => mentorFieldContains(mentor, entry.field, entry.value));
}

/**
 * Validates and clamps a raw LLM turn:
 * - unknown mentor ids are dropped;
 * - only evidence the DB row truly contains is kept;
 * - recommendations left without any valid evidence are dropped;
 * - at most 3 recommendations, ordered by verified evidence count;
 * - a `recommend` turn with nothing left becomes `no_match`.
 */
export function validateChatTurn(
  raw: RawTurn | null | undefined,
  mentorsById: Map<string, Record<string, unknown>>,
): ChatTurn {
  const allowedTypes = new Set(["clarify", "recommend", "no_match", "support", "off_topic"]);
  const type = typeof raw?.type === "string" && allowedTypes.has(raw.type) ? raw.type : "no_match";
  const message = typeof raw?.message === "string" && raw.message.trim() ? raw.message : "";
  const category = typeof raw?.category === "string" ? raw.category : "";

  let recommendations = (Array.isArray(raw?.recommendations) ? raw.recommendations : [])
    .filter((rec) => rec && typeof rec.mentor_id === "string")
    .map((rec) => {
      const mentor = mentorsById.get(rec.mentor_id);
      if (!mentor) return null;
      const match: MatchQuality = rec.match === "partial" ? "partial" : "strong";
      const evidence = validEvidence(mentor, Array.isArray(rec.evidence) ? rec.evidence : []);
      if (evidence.length === 0) return null;
      return {
        mentorId: rec.mentor_id,
        match,
        evidence,
        caveat: typeof rec.caveat === "string" && rec.caveat.trim() ? rec.caveat : null,
      };
    })
    .filter((rec): rec is NonNullable<typeof rec> => rec !== null)
    // Mentors with more verified evidence are the better matches: show them first.
    .sort((a, b) => b.evidence.length - a.evidence.length)
    .slice(0, 3);

  let finalType = type;
  if (finalType === "recommend" && recommendations.length === 0) {
    finalType = "no_match";
  }
  if (finalType !== "recommend") {
    recommendations = [];
  }

  return { type: finalType as ChatTurn["type"], message, category, recommendations };
}

/* ------------------------------------------------------------------ */
/* Message-level grounding helpers. These extend claim validation by   */
/* policing the reply TEXT; they never relax the checks above.         */
/* ------------------------------------------------------------------ */

export const UNKNOWN_MENTOR_REPLY = "I can't find a mentor with that ID in our list.";
export const UNKNOWN_DETAIL_REPLY = "That detail isn't in our mentor data, so I can't say.";
export const INJECTION_REFUSAL_REPLY =
  "I can't change how I work, but I'm happy to help you find a mentor. What are you working toward?";
export const NO_MENTOR_FALLBACK_REPLY =
  "I couldn't verify that against our mentor list, so I'd rather not name anyone. Could you tell me a bit more about what you're working toward?";
const SUPPORT_FALLBACK_REPLY =
  "I'm really glad you shared that with me. There's no rush here — we can pick the career chat back up whenever you're ready.";
const NO_MATCH_LABEL = "General guidance (not from our mentors):";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitSentences(text: string): string[] {
  const parts = text.trim().match(/[^.!?…]+[.!?…]+["')\]]*|.+/g);
  return (parts ?? []).map((part) => part.trim()).filter(Boolean);
}

function canonicalMentorId(numeral: string): string {
  return `M${numeral.padStart(3, "0")}`;
}

/** Mentor ids the text names, via "M033" or "Mentor 33"; canonical form M033. */
export function findMentorMentions(text: string): string[] {
  const ids = new Set<string>();
  for (const match of text.matchAll(/\bM\s?(\d{1,3})\b/gi)) {
    ids.add(canonicalMentorId(match[1]!));
  }
  for (const match of text.matchAll(/\bmentor\s+(\d{1,3})\b/gi)) {
    ids.add(canonicalMentorId(match[1]!));
  }
  return [...ids];
}

function mentionPatternFor(id: string): string {
  const numeral = id.slice(1).replace(/^0+/, "") || "0";
  return `(?:\\bM\\s?0*${numeral}\\b)|(?:\\bmentor\\s+0*${numeral}\\b)`;
}

/**
 * Removes the sentences that name any of the given mentors.
 * Returns null when nothing (or nothing meaningful) is left.
 */
export function stripMentorMentionSentences(text: string, mentionedIds: string[]): string | null {
  if (mentionedIds.length === 0) return text.trim() || null;
  const pattern = new RegExp(mentionedIds.map(mentionPatternFor).join("|"), "i");
  const cleaned = splitSentences(text)
    .filter((sentence) => !pattern.test(sentence))
    .join(" ")
    .trim();
  return cleaned || null;
}

export type UserQueryClass = "unknown_mentor" | "unknown_detail" | "injection";

/** Detects questions the mentor roster structurally cannot answer. */
export function classifyUserQuery(text: string, rosterIds: Set<string>): UserQueryClass | null {
  if (
    /ignore\s+(?:all\s+|your\s+|previous\s+|the\s+|these\s+)*(?:your\s+)?(?:instructions|rules|prompts?)/i.test(
      text,
    ) ||
    /\bdisregard\s+your\b|\byou\s+are\s+now\b|\bact\s+as\s+if\b|\bforget\s+(?:your|all|these)\b/i.test(text)
  ) {
    return "injection";
  }
  if (findMentorMentions(text).some((id) => !rosterIds.has(id))) {
    return "unknown_mentor";
  }
  if (
    /\b(?:salary|salaries|ctc|package|compensation|income|wages?)\b/i.test(text) ||
    /\b(?:married|marriage|girlfriend|boyfriend|personal\s+life|family)\b/i.test(text) ||
    /\bhow\s+old\b/i.test(text)
  ) {
    return "unknown_detail";
  }
  return null;
}

/**
 * No-match replies have exactly two short parts, built deterministically:
 * (a) the labeled guidance — no mentor with documented expertise in the
 *     student's goal, plus the kind of expertise that would fit;
 * (b) one short line on what the roster can still help with.
 * Never a plan, roadmap, course, tool, link or step. The model's own
 * message is ignored so the wording can't drift.
 */
export const NO_MATCH_HELP_LINE =
  "I can still match you with mentors in product, marketing, growth or business roles if that's useful.";

export function clampNoMatchMessage(_message: string, category: string): string {
  const goal = category.trim().toLowerCase() || "this area";
  const gap =
    goal === "this area"
      ? "Our list has no mentor with documented expertise in this area, so someone with hands-on experience here would fit best."
      : `Our list has no mentor with documented expertise in ${goal}, so someone with hands-on ${goal} experience would fit best.`;
  return `${NO_MATCH_LABEL} ${gap} ${NO_MATCH_HELP_LINE}`;
}

/** The support card renders the helpline once; keep it out of the text. */
export function stripSupportHelpline(message: string): string {
  const cleaned = splitSentences(message)
    .filter((sentence) => !/tele-?manas|14416/i.test(sentence))
    .join(" ")
    .trim();
  return cleaned || SUPPORT_FALLBACK_REPLY;
}

/** Later replies never address the student by first name. */
export function stripFirstNameGreeting(message: string, firstName: string): string {
  const name = firstName.trim();
  if (!name) return message;
  return message
    .replace(new RegExp(`^\\s*${escapeRegExp(name)}\\s*,?\\s*`, "i"), "")
    .replace(new RegExp(`\\b${escapeRegExp(name)}\\b,?\\s*`, "gi"), "")
    .trim();
}
