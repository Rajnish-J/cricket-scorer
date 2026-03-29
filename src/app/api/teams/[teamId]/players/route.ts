import { TeamPlayerCreateSchema } from "@/lib/scorer-schema";
import { teamRepository } from "@/repositories/team-repository";

export async function POST(
  request: Request,
  context: RouteContext<"/api/teams/[teamId]/players">
): Promise<Response> {
  const { teamId } = await context.params;
  const payload = await request.json();
  const parsed = TeamPlayerCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const result = await teamRepository.addPlayerToTeam(teamId, parsed.data);

  if ("error" in result) {
    if (result.error === "TEAM_NOT_FOUND") {
      return Response.json({ error: "Team not found." }, { status: 404 });
    }

    return Response.json(
      { error: "Team already has maximum 11 players." },
      { status: 400 }
    );
  }

  return Response.json({ player: result.player }, { status: 201 });
}
