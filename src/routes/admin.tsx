import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AlertTriangle, BarChart3, BookOpen, CalendarCheck, KeyRound, Lock, MessageSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAdminDashboard, lockAdmin, verifyAdminPasscode, type AdminDashboard } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  loader: async (): Promise<{ dashboard: AdminDashboard | null }> => {
    try {
      return { dashboard: await getAdminDashboard() };
    } catch {
      return { dashboard: null };
    }
  },
  head: () => ({
    meta: [
      { title: "Mesa team dashboard — Mentor Connect" },
      { name: "description", content: "Aggregate usage stats for the Mentor Connect prototype: students, chats, bookings, write-ups, and supply gaps." },
      { property: "og:title", content: "Mesa team dashboard — Mentor Connect" },
      { property: "og:description", content: "Aggregate usage stats for the Mentor Connect prototype: students, chats, bookings, write-ups, and supply gaps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const pct = (n: number, d: number) => (d === 0 ? "—" : `${Math.round((n / d) * 100)}%`);

function AdminPage() {
  const { dashboard } = Route.useLoaderData();
  return dashboard ? <Dashboard data={dashboard} /> : <PasscodeGate />;
}

function PasscodeGate() {
  const router = useRouter();
  const verify = useServerFn(verifyAdminPasscode);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const password = new FormData(event.currentTarget).get("passcode") as string;
      const { ok } = await verify({ data: { passcode: password } });
      if (ok) await router.invalidate();
      else setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm rounded-2xl shadow-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            <CardTitle className="text-lg">Mesa team access</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">Enter the team passcode to view the dashboard.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input name="passcode" type="password" autoComplete="current-password" placeholder="Passcode" autoFocus />
            {error ? <p className="text-sm text-destructive">Incorrect passcode.</p> : null}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Checking…" : "Unlock"}</Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="underline underline-offset-2 hover:text-foreground">Back to Mentor Connect</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub?: string }) {
  return (
    <Card className="rounded-2xl shadow-card">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" />
          <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
        </div>
        <p className="mt-2 text-3xl font-semibold">{value}</p>
        {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

function BarPanel({ title, rows, empty }: { title: string; rows: { name: string; count: number }[]; empty: string }) {
  return (
    <Card className="rounded-2xl shadow-card">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <BarChart data={rows} layout="vertical" width={480} height={Math.max(120, rows.length * 44)} margin={{ left: 8, right: 24, top: 4, bottom: 4 }} className="w-full">
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: "var(--foreground)" }} stroke="var(--border)" />
            <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
          </BarChart>
        )}
      </CardContent>
    </Card>
  );
}

function Dashboard({ data }: { data: AdminDashboard }) {
  const router = useRouter();
  const lock = useServerFn(lockAdmin);
  const unmatchedShare = data.chats === 0 ? "—" : `${Math.round((data.unmatchedChats / data.chats) * 100)}%`;

  async function onLock() {
    await lock();
    await router.invalidate();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">Mesa team dashboard</h1>
            <span className="text-xs text-muted-foreground">Mentor Connect prototype</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">Back to app</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void onLock()}>
              <Lock /> Lock
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard icon={Users} label="Students" value={String(data.students)} />
          <KpiCard icon={MessageSquare} label="Chats" value={String(data.chats)} />
          <KpiCard icon={CalendarCheck} label="Bookings" value={String(data.bookings)} />
          <KpiCard icon={BookOpen} label="Write-ups" value={String(data.writeups)} />
          <KpiCard icon={CalendarCheck} label="Booking rate" value={pct(data.bookings, data.chatsWithRecommendations)} sub="bookings / chats with recommendations" />
          <KpiCard icon={BookOpen} label="Write-up completion" value={pct(data.writeups, data.completedCalls)} sub="write-ups / completed calls" />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <BarPanel
            title="Top problem categories"
            rows={data.topCategories.map((row) => ({ name: row.category, count: row.count }))}
            empty="No categorized chats yet."
          />
          <BarPanel
            title="Most recommended mentors"
            rows={data.topMentors.map((row) => ({ name: `${row.id} · ${row.name}`, count: row.count }))}
            empty="No mentor recommendations yet."
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Supply gaps</CardTitle>
              <p className="text-sm text-muted-foreground">
                {data.chats === 0
                  ? "No chats yet."
                  : `${unmatchedShare} of chats had no good mentor match.`}
              </p>
            </CardHeader>
            <CardContent>
              {data.unmatchedByCategory.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No unmatched queries yet.</p>
              ) : (
                <ul className="divide-y">
                  {data.unmatchedByCategory.map((row) => (
                    <li key={row.category} className="flex items-center justify-between py-2 text-sm">
                      <span>{row.category}</span>
                      <span className="font-medium text-muted-foreground">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4 text-primary" /> Needs attention
              </CardTitle>
              <p className="text-sm text-muted-foreground">Low-completeness mentors who are recommended often — worth enriching their profiles.</p>
            </CardHeader>
            <CardContent>
              {data.needsAttention.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing flagged right now.</p>
              ) : (
                <ul className="divide-y">
                  {data.needsAttention.map((row) => (
                    <li key={row.id} className="flex items-center justify-between py-2 text-sm">
                      <span>{row.id} · {row.name}</span>
                      <span className="font-medium text-muted-foreground">recommended {row.count}×</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
