"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getJson } from "@/lib/api-client";
import type { TeamsResponse } from "@/types/api";
import type { Team } from "@/types/scorer";

export function TeamsContainer(): React.JSX.Element {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run(): Promise<void> {
      try {
        const response = await getJson<TeamsResponse>("/api/teams");
        setTeams(response.teams);
      } finally {
        setLoading(false);
      }
    }

    void run();
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading teams...</p>;
  }

  if (teams.length === 0) {
    return (
      <div className="rounded-xl border p-6">
        <p className="text-sm text-muted-foreground">
          No teams yet. Create teams from New Match page.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <Link
          key={team.id}
          href={`/teams/${team.id}`}
          className="rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-xs"
        >
          <p className="text-xs text-muted-foreground">{team.shortName}</p>
          <h2 className="mt-1 text-lg font-semibold">{team.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">Players: {team.players.length}</p>
        </Link>
      ))}
    </div>
  );
}

