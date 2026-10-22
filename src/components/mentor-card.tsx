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

function initials(name: string | null): string {
  if (!name?.trim()) return "M";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function MentorCard({ mentor, match, evidence, caveat }: MentorCardProps) {
  const limited = (mentor.dataCompleteness ?? "").toLowerCase() === "low";
  const sectors = (mentor.sectors ?? []).slice(0, 3);
  const roles = (mentor.roles ?? []).slice(0, 3);

  return (
    <Card className="animate-message-in gap-3 rounded-2xl p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials(mentor.name)}
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

      {(sectors.length > 0 || roles.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {sectors.map((sector) => (
            <Badge key={`s-${sector}`} variant="secondary">
              {sector}
            </Badge>
          ))}
          {roles.map((role) => (
            <Badge key={`r-${role}`} variant="secondary">
              {role}
            </Badge>
          ))}
        </div>
      )}

      {evidence.length > 0 && (
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
          </div>
        </div>
      )}

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
