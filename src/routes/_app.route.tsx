import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  );
}
