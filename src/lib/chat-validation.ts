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

/** True when the mentor's DB row truly contains `value` in `field`. */
export function mentorFieldContains(
  mentor: Record<string, unknown>,
  field: string,
  value: string,
): boolean {
  if (!Object.prototype.hasOwnProperty.call(mentor, field)) return false;
  const needle = normalize(value);
  if (!needle) return false;
  const rowValue = mentor[field];
  if (Array.isArray(rowValue)) {
    return rowValue.some((entry) => typeof entry === "string" && normalize(entry) === needle);
  }
  if (typeof rowValue === "string") return normalize(rowValue) === needle;
  return false;
}

export function validEvidence(mentor: Record<string, unknown>, evidence: Evidence[]): Evidence[] {
  return evidence.filter((entry) => mentorFieldContains(mentor, entry.field, entry.value));
}

/**
 * Validates and clamps a raw LLM turn:
 * - unknown mentor ids are dropped;
 * - only evidence the DB row truly contains is kept;
 * - recommendations left without any valid evidence are dropped;
 * - at most 3 recommendations;
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
