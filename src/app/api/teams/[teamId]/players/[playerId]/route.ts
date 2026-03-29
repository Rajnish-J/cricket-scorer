import { aggregatePlayerStats } from "@/lib/scoring";
import { matchRepository } from "@/repositories/match-repository";
import { teamRepository } from "@/repositories/team-repository";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/teams/[teamId]/players/[playerId]">
): Promise<Response> {
  const { teamId, playerId } = await context.params;

  const team = await teamRepository.getTeamById(teamId);
  if (!team) {
    return Response.json({ error: "Team not found." }, { status: 404 });
  }

  const player = await teamRepository.getPlayer(teamId, playerId);
  if (!player) {
    return Response.json({ error: "Player not found." }, { status: 404 });
  }

  const matches = await matchRepository.listMatches();
  const stats = aggregatePlayerStats(team.id, player.id, matches);

  return Response.json({ player, stats });
}
