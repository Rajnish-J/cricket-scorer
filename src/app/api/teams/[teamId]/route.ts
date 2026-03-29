import { aggregatePlayerStats } from "@/lib/scoring";
import { readStore } from "@/lib/store";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/teams/[teamId]">
): Promise<Response> {
  const { teamId } = await context.params;
  const store = await readStore();
  const team = store.teams.find((candidate) => candidate.id === teamId);

  if (!team) {
    return Response.json({ error: "Team not found." }, { status: 404 });
  }

  const players = team.players.map((player) => ({
    ...player,
    stats: aggregatePlayerStats(team.id, player.id, store.matches),
  }));

  return Response.json({ team: { ...team, players } });
}

