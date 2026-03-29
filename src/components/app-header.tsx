"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const pageTitleByRoute: Record<string, string> = {
  "/": "Schedule Match",
  "/teams": "Teams",
  "/history": "Match History",
};

export function AppHeader(): React.JSX.Element {
  const pathname = usePathname();

  const title = useMemo(() => {
    if (pathname.startsWith("/match/")) {
      return "Live Scoreboard";
    }

    if (pathname.startsWith("/teams/")) {
      return "Team Details";
    }

    return pageTitleByRoute[pathname] ?? "Cricket Scorer";
  }, [pathname]);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger />
      <Separator
        orientation="vertical"
        className="data-vertical:h-5 data-vertical:self-auto"
      />
      <div className="flex min-w-0 flex-1 items-center justify-between">
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
        <p className="text-xs text-muted-foreground">ICT-aligned scoring workflow</p>
      </div>
    </header>
  );
}

