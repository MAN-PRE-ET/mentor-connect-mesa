import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Dashboard } from "@/routes/admin";
import type { AdminDashboard } from "@/lib/admin.functions";

// The dashboard only renders aggregates; these fixtures mirror the shape the
// server function returns. Recharts needs a sized parent, so stub it out.
vi.mock("recharts", () => ({
  BarChart: ({ children }: { children?: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
}));

vi.mock("@/lib/admin.functions", () => ({
  getAdminDashboard: vi.fn(),
  lockAdmin: vi.fn(),
  verifyAdminPasscode: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  useServerFn: () => vi.fn(async () => ({ ok: true })),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ children, ...rest }: { children?: React.ReactNode }) => <a {...rest}>{children}</a>,
    useRouter: () => ({ invalidate: vi.fn() }),
  };
});

const data: AdminDashboard = {
  students: 5,
  chats: 14,
  bookings: 7,
  writeups: 1,
  completedCalls: 3,
  chatsWithRecommendations: 6,
  topCategories: [{ category: "Career Switch", count: 4 }],
  topMentors: [{ id: "M035", name: "Mentor 035", count: 4 }],
  unmatchedByCategory: [{ category: "Marine Biology", count: 1 }],
  unmatchedChats: 4,
  needsAttention: [],
};

describe("Admin dashboard", () => {
  it("shows KPI counts and computed rates from aggregates only", () => {
    render(<Dashboard data={data} />);
    expect(screen.getByText("Students").closest(".rounded-2xl")?.textContent).toContain("5");
    expect(screen.getByText("Chats").closest(".rounded-2xl")?.textContent).toContain("14");
    expect(screen.getByText("Bookings").closest(".rounded-2xl")?.textContent).toContain("7");
    // booking rate 7/6 -> 117%, write-up completion 1/3 -> 33%
    expect(screen.getByText("117%")).toBeTruthy();
    expect(screen.getByText("33%")).toBeTruthy();
  });

  it("shows supply gap share and category counts without query text", () => {
    render(<Dashboard data={data} />);
    expect(screen.getByText("29% of chats had no good mentor match.")).toBeTruthy();
    expect(screen.getByText("Marine Biology")).toBeTruthy();
    expect(screen.queryByText(/query text/i)).toBeNull();
  });

  it("shows empty states when there is no data", () => {
    render(
      <Dashboard
        data={{ ...data, topCategories: [], topMentors: [], unmatchedByCategory: [], unmatchedChats: 0, chats: 0, needsAttention: [] }}
      />,
    );
    expect(screen.getByText("No categorized chats yet.")).toBeTruthy();
    expect(screen.getByText("No mentor recommendations yet.")).toBeTruthy();
    expect(screen.getByText("No unmatched queries yet.")).toBeTruthy();
    expect(screen.getByText("Nothing flagged right now.")).toBeTruthy();
    expect(screen.getByText("No chats yet.")).toBeTruthy();
  });
});
