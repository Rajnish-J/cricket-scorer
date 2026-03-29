import { recordBall } from "@/lib/scoring";
import { ScoreEventSchema } from "@/lib/scorer-schema";
import { matchRepository } from "@/repositories/match-repository";
import { teamRepository } from "@/repositories/team-repository";

export async function POST(
  request: Request,
  context: RouteContext<"/api/matches/[matchId]/score">
): Promise<Response> {
  const { matchId } = await context.params;
  const payload = await request.json();
  const parsed = ScoreEventSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const match = await matchRepository.getMatchById(matchId);

  if (!match) {
    return Response.json({ error: "Match not found." }, { status: 404 });
  }

  const teams = await teamRepository.listTeams();
  const result = recordBall(match, parsed.data, teams);

  if (!result.ok) {
    return Response.json({ error: result.message }, { status: 400 });
  }

  await matchRepository.updateMatch(match);

  return Response.json({ match });
}
