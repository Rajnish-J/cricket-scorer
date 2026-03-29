import { TeamCreateSchema } from "@/lib/scorer-schema";
import { createId, readStore, updateStore } from "@/lib/store";
import type { Player, Team } from "@/types/scorer";

export async function GET(): Promise<Response> {
  const store = await readStore();
  return Response.json({ teams: store.teams });
}

export async function POST(request: Request): Promise<Response> {
  const payload = await request.json();
  const parsed = TeamCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const createdTeam: Team = {
    id: createId("team"),
    name: parsed.data.name,
    shortName: parsed.data.shortName.toUpperCase(),
    players: parsed.data.players.map<Player>((player) => ({
      id: createId("player"),
      name: player.name,
      role: player.role,
    })),
    createdAt: new Date().toISOString(),
  };

  const store = await updateStore((current) => {
    const duplicate = current.teams.find(
      (team) => team.name.toLowerCase() === createdTeam.name.toLowerCase()
    );

    if (duplicate) {
      return current;
    }

    return {
      ...current,
      teams: [...current.teams, createdTeam],
    };
  });

  const duplicateExists = !store.teams.some((team) => team.id === createdTeam.id);
  if (duplicateExists) {
    return Response.json({ error: "Team already exists." }, { status: 409 });
  }

  return Response.json({ team: createdTeam }, { status: 201 });
}

