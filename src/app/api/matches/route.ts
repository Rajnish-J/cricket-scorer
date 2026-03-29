import { buildMatch } from "@/lib/scoring";
import { MatchCreateSchema } from "@/lib/scorer-schema";
import { readStore, updateStore } from "@/lib/store";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");

  const store = await readStore();
  const matches =
    statusFilter && ["scheduled", "live", "completed"].includes(statusFilter)
      ? store.matches.filter((match) => match.status === statusFilter)
      : store.matches;

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

  const store = await readStore();
  const teamA = store.teams.find((team) => team.id === parsed.data.teamAId);
  const teamB = store.teams.find((team) => team.id === parsed.data.teamBId);

  if (!teamA || !teamB) {
    return Response.json({ error: "Teams are invalid." }, { status: 400 });
  }

  if (teamA.id === teamB.id) {
    return Response.json(
      { error: "Choose two different teams." },
      { status: 400 }
    );
  }

  const match = buildMatch(parsed.data, store.teams);

  await updateStore((current) => ({
    ...current,
    matches: [match, ...current.matches],
  }));

  return Response.json({ match }, { status: 201 });
}

