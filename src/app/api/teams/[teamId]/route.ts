import { aggregatePlayerStats } from "@/lib/scoring";
import { matchRepository } from "@/repositories/match-repository";
import { teamRepository } from "@/repositories/team-repository";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/teams/[teamId]">
): Promise<Response> {
  const { teamId } = await context.params;
  const team = await teamRepository.getTeamById(teamId);

  if (!team) {
    return Response.json({ error: "Team not found." }, { status: 404 });
  }

  const matches = await matchRepository.listMatches();
  const players = team.players.map((player) => ({
    ...player,
    stats: aggregatePlayerStats(team.id, player.id, matches),
  }));

  return Response.json({ team: { ...team, players } });
}
