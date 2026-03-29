import { readStore } from "@/lib/store";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/matches/[matchId]">
): Promise<Response> {
  const { matchId } = await context.params;
  const store = await readStore();
  const match = store.matches.find((candidate) => candidate.id === matchId);

  if (!match) {
    return Response.json({ error: "Match not found." }, { status: 404 });
  }

  const teamA = store.teams.find((team) => team.id === match.teamAId) ?? null;
  const teamB = store.teams.find((team) => team.id === match.teamBId) ?? null;

  return Response.json({ match, teams: { teamA, teamB } });
}

