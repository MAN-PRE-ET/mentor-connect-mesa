import { describe, expect, it } from "vitest";
import { mentorFieldContains, validateChatTurn } from "@/lib/chat-validation";
import type { MentorRow } from "@/lib/types";

function mentor(overrides: Partial<MentorRow> = {}): MentorRow {
  return {
    id: "m1",
    name: "Asha Menon",
    city: "Bengaluru",
    domains: ["Product", "AI"],
    company: "Ripple Labs",
    masterSector: "Edtech",
    sectors: ["Edtech", "SaaS"],
    roles: ["Product Management"],
    seniority: "Director",
    aiNative: "yes",
    builtAiProduct: "yes",
    aiExperience: "8 years",
    aiSubDomain: null,
    aiTools: ["LangChain"],
    analyticsTools: ["Amplitude"],
    qualityOfMentorship: "high",
    activitiesParticipated: "Bootcamps",
    dataCompleteness: "high",
    ...overrides,
  };
}

describe("mentorFieldContains", () => {
  it("matches values inside array fields", () => {
    expect(mentorFieldContains(mentor(), "sectors", "Edtech")).toBe(true);
    expect(mentorFieldContains(mentor(), "sectors", "  edtech ")).toBe(true);
  });

  it("matches scalar fields case-insensitively", () => {
    expect(mentorFieldContains(mentor(), "company", "ripple labs")).toBe(true);
  });

  it("rejects values that are not in the row", () => {
    expect(mentorFieldContains(mentor(), "sectors", "Fintech")).toBe(false);
    expect(mentorFieldContains(mentor(), "company", "Google")).toBe(false);
    expect(mentorFieldContains(mentor(), "salary", "1cr")).toBe(false);
  });

  it("rejects empty fields treated as unknown", () => {
    const m = mentor({ aiSubDomain: null });
    expect(mentorFieldContains(m, "aiSubDomain", "anything")).toBe(false);
  });
});

describe("validateChatTurn", () => {
  const roster = new Map([
    ["m1", mentor()],
    ["m2", mentor({ id: "m2", name: "Vikram Rao", sectors: ["Fintech"], masterSector: "Fintech" })],
    ["m3", mentor({ id: "m3", name: "Neha Gupta", roles: ["Data Science"] })],
  ]);

  it("keeps evidence the mentor row truly contains", () => {
    const turn = validateChatTurn(
      {
        type: "recommend",
        message: "Consider Asha.",
        category: "Product",
        recommendations: [
          {
            mentor_id: "m1",
            match: "strong",
            evidence: [
              { field: "sectors", value: "Edtech" },
              { field: "company", value: "Google" },
            ],
            caveat: null,
          },
        ],
      },
      roster,
    );
    expect(turn.type).toBe("recommend");
    expect(turn.recommendations).toHaveLength(1);
    expect(turn.recommendations[0]!.evidence).toEqual([{ field: "sectors", value: "Edtech" }]);
  });

  it("drops recommendations with unknown mentor ids", () => {
    const turn = validateChatTurn(
      {
        type: "recommend",
        message: "x",
        category: "",
        recommendations: [{ mentor_id: "ghost", match: "strong", evidence: [{ field: "name", value: "Ghost" }], caveat: null }],
      },
      roster,
    );
    expect(turn.recommendations).toHaveLength(0);
    expect(turn.type).toBe("no_match");
  });

  it("turns a recommend into no_match when all evidence is invalid", () => {
    const turn = validateChatTurn(
      {
        type: "recommend",
        message: "x",
        category: "",
        recommendations: [{ mentor_id: "m1", match: "strong", evidence: [{ field: "company", value: "Fake Co" }], caveat: null }],
      },
      roster,
    );
    expect(turn.type).toBe("no_match");
    expect(turn.recommendations).toHaveLength(0);
  });

  it("caps recommendations at 3", () => {
    const roster5 = new Map([
      ["a", mentor({ id: "a" })],
      ["b", mentor({ id: "b" })],
      ["c", mentor({ id: "c" })],
      ["d", mentor({ id: "d" })],
      ["e", mentor({ id: "e" })],
    ]);
    const recs = ["a", "b", "c", "d", "e"].map((id) => ({
      mentor_id: id,
      match: "strong" as const,
      evidence: [{ field: "name", value: "Asha Menon" }],
      caveat: null,
    }));
    const turn = validateChatTurn({ type: "recommend", message: "x", category: "", recommendations: recs }, roster5);
    expect(turn.recommendations).toHaveLength(3);
  });

  it("clears recommendations for non-recommend types", () => {
    const turn = validateChatTurn(
      {
        type: "support",
        message: "Take care.",
        category: "",
        recommendations: [{ mentor_id: "m1", match: "strong", evidence: [{ field: "name", value: "Asha Menon" }], caveat: null }],
      },
      roster,
    );
    expect(turn.type).toBe("support");
    expect(turn.recommendations).toHaveLength(0);
  });

  it("falls back to no_match on an unknown type", () => {
    const turn = validateChatTurn({ type: "explode", message: "x", category: "", recommendations: [] } as never, roster);
    expect(turn.type).toBe("no_match");
    expect(turn.recommendations).toHaveLength(0);
  });
});
