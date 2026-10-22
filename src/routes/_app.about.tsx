import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_app/about")({
  head: () => ({
    meta: [
      { title: "About this prototype — Mentor Connect" },
      {
        name: "description",
        content:
          "How Mentor Connect grounds every mentor recommendation in real, verified mentor profiles.",
      },
      { property: "og:title", content: "About this prototype — Mentor Connect" },
      {
        property: "og:description",
        content:
          "How Mentor Connect grounds every mentor recommendation in real, verified mentor profiles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <Card className="animate-message-in max-w-2xl gap-4 rounded-2xl p-8 shadow-card">
        <h1 className="text-2xl font-semibold tracking-tight">About this prototype</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Mentor Connect matches you with mentors from Mesa School of Business by grounding every
          answer in the real mentor database. Here's how that works:
        </p>
        <ul className="space-y-3 text-sm leading-relaxed">
          <li className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>
              <strong className="text-foreground">Real profiles only.</strong> The assistant sees
              the same mentor profiles you'd see — nothing else. It can only recommend mentors that
              actually exist in Mesa's roster.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>
              <strong className="text-foreground">Verified evidence.</strong> Every "Why this
              mentor" chip is checked against the mentor's actual profile before it's shown. If the
              assistant claims something the data doesn't support, that claim is dropped, not
              displayed.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>
              <strong className="text-foreground">Honest about gaps.</strong> If no mentor fits, it
              says so and explains why. If something isn't in a mentor's profile (salary,
              availability, personal life), it replies "I don't have that information." rather than
              guessing.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>
              <strong className="text-foreground">Learning from gaps.</strong> Questions that
              couldn't be matched are logged, so Mesa knows where the mentor roster needs to grow.
            </span>
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">
          This is a first version: mentor calls and write-ups aren't bookable yet.
        </p>
      </Card>
    </div>
  );
}
