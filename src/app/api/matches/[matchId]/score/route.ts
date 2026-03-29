import { recordBall } from "@/lib/scoring";
import { ScoreEventSchema } from "@/lib/scorer-schema";
import { readStore, writeStore } from "@/lib/store";

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

  const store = await readStore();
  const matchIndex = store.matches.findIndex((candidate) => candidate.id === matchId);

  if (matchIndex < 0) {
    return Response.json({ error: "Match not found." }, { status: 404 });
  }

  const match = store.matches[matchIndex];
  const result = recordBall(match, parsed.data, store.teams);

  if (!result.ok) {
    return Response.json({ error: result.message }, { status: 400 });
  }

  const updatedMatches = [...store.matches];
  updatedMatches[matchIndex] = match;

  await writeStore({
    ...store,
    matches: updatedMatches,
  });

  return Response.json({ match });
}

