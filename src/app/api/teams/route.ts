import { TeamCreateSchema } from "@/lib/scorer-schema";
import { teamRepository } from "@/repositories/team-repository";

export async function GET(): Promise<Response> {
  const teams = await teamRepository.listTeams();
  return Response.json({ teams });
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

  const team = await teamRepository.createTeam(parsed.data);

  if (!team) {
    return Response.json({ error: "Team already exists." }, { status: 409 });
  }

  return Response.json({ team }, { status: 201 });
}
