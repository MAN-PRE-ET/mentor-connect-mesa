import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fieldLabel, type Evidence, type MentorRow } from "@/lib/types";

type MentorCardProps = {
  mentor: MentorRow;
  match: "strong" | "partial";
  evidence: Evidence[];
  caveat: string | null;
};

/** "M021" → "21"; falls back to initials when the id carries no number. */
function mentorNumber(id: string): string {
  const found = /(\d+)/.exec(id);
  return found ? String(Number(found[1])) : "";
}

function initials(name: string | null): string {
  if (!name?.trim()) return "M";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

const OTHER_CHIP_LIMIT = 6;

export function MentorCard({ mentor, match, evidence, caveat }: MentorCardProps) {
  const [expanded, setExpanded] = useState(false);
  const limited = (mentor.dataCompleteness ?? "").toLowerCase() === "low";
  const number = mentorNumber(mentor.id);

  // Verified evidence first and highlighted; every "why" item is a chip here.
  const evidenceValues = new Set(evidence.map((entry) => entry.value.trim().toLowerCase()));
  const otherChips = [
    ...new Set(
      [...(mentor.sectors ?? []), ...(mentor.roles ?? []), ...(mentor.domains ?? [])]
        .filter((value) => value.trim() && !evidenceValues.has(value.trim().toLowerCase()))
        .map((value) => value.trim()),
    ),
  ];
  const visibleCount = expanded ? otherChips.length : Math.min(otherChips.length, OTHER_CHIP_LIMIT);
  const hiddenCount = otherChips.length - visibleCount;

  return (
    <Card className="animate-message-in gap-3 rounded-2xl p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {number || initials(mentor.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{mentor.name ?? "Mentor"}</span>
            {mentor.seniority ? <Badge variant="outline">{mentor.seniority}</Badge> : null}
            <Badge
              className={
                match === "strong"
                  ? "border-transparent bg-success/15 text-success"
                  : "border-transparent bg-caution/20 text-caution-foreground"
              }
            >
              {match === "strong" ? "Strong match" : "Partial match"}
            </Badge>
            {limited ? (
              <Badge className="border-transparent bg-caution/20 text-caution-foreground">
                Limited profile
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {[mentor.company, mentor.city].filter(Boolean).join(" · ") ||
              "Profile details unavailable"}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Why this mentor
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {evidence.map((entry, index) => (
            <Badge
              key={`${entry.field}-${index}`}
              className="border-transparent bg-accent text-accent-foreground"
            >
              {fieldLabel(entry.field)}: {entry.value}
            </Badge>
          ))}
          {otherChips.slice(0, visibleCount).map((value) => (
            <Badge key={value} variant="secondary">
              {value}
            </Badge>
          ))}
          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex items-center rounded-full border border-input bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              +{hiddenCount} more
            </button>
          ) : otherChips.length > OTHER_CHIP_LIMIT ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex items-center rounded-full border border-input bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Show less
            </button>
          ) : null}
        </div>
      </div>

      {caveat ? <p className="text-xs italic text-muted-foreground">Note: {caveat}</p> : null}

      <Button
        size="sm"
        className="w-fit"
        onClick={() =>
          toast("Call booking is coming soon — mentors can't be booked in this prototype yet.")
        }
      >
        Book a call
      </Button>
    </Card>
  );
}
