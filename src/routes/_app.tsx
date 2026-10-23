import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { refreshDemoAvailability } from "@/lib/booking.functions";

export const Route = createFileRoute("/_app")({
  loader: () => refreshDemoAvailability(),
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
