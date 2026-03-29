import { teamRepository } from "@/repositories/team-repository";
import { matchRepository } from "@/repositories/match-repository";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/matches/[matchId]">
): Promise<Response> {
  const { matchId } = await context.params;
  const match = await matchRepository.getMatchById(matchId);

  if (!match) {
    return Response.json({ error: "Match not found." }, { status: 404 });
  }

  const teamA = await teamRepository.getTeamById(match.teamAId);
  const teamB = await teamRepository.getTeamById(match.teamBId);

  return Response.json({ match, teams: { teamA, teamB } });
}
