import { aggregatePlayerStats } from "@/lib/scoring";
import { readStore } from "@/lib/store";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/teams/[teamId]/players/[playerId]">
): Promise<Response> {
  const { teamId, playerId } = await context.params;
  const store = await readStore();

  const team = store.teams.find((candidate) => candidate.id === teamId);
  if (!team) {
    return Response.json({ error: "Team not found." }, { status: 404 });
  }

  const player = team.players.find((candidate) => candidate.id === playerId);
  if (!player) {
    return Response.json({ error: "Player not found." }, { status: 404 });
  }

  const stats = aggregatePlayerStats(team.id, player.id, store.matches);
  return Response.json({ player, stats });
}

