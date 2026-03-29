import { buildMatch } from "@/lib/scoring";
import { MatchCreateSchema } from "@/lib/scorer-schema";
import { matchRepository } from "@/repositories/match-repository";
import { teamRepository } from "@/repositories/team-repository";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");

  const isKnownStatus =
    statusFilter === "scheduled" || statusFilter === "live" || statusFilter === "completed";

  const matches = await matchRepository.listMatches(isKnownStatus ? statusFilter : undefined);
  return Response.json({ matches });
}

export async function POST(request: Request): Promise<Response> {
  const payload = await request.json();
  const parsed = MatchCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const teams = await teamRepository.listTeams();
  const teamA = teams.find((team) => team.id === parsed.data.teamAId);
  const teamB = teams.find((team) => team.id === parsed.data.teamBId);

  if (!teamA || !teamB) {
    return Response.json({ error: "Teams are invalid." }, { status: 400 });
  }

  if (teamA.id === teamB.id) {
    return Response.json(
      { error: "Choose two different teams." },
      { status: 400 }
    );
  }

  const match = buildMatch(parsed.data, teams);
  await matchRepository.createMatch(match);

  return Response.json({ match }, { status: 201 });
}
