import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { createBlankWorkflow } from "@/lib/sample-workflow";
import { prisma } from "@/server/db";
import { serializeWorkflow } from "@/server/workflow-serializer";
import { workflowDocumentSchema } from "@/validators/workflow";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflows = await prisma.workflow.findMany({
    where: { clerkId: userId },
    orderBy: { updatedAt: "desc" },
    include: { runs: { include: { nodeRuns: true }, orderBy: { startedAt: "desc" } } },
  });

  return NextResponse.json({ workflows: workflows.map(serializeWorkflow) });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = body?.workflow ? workflowDocumentSchema.safeParse(body.workflow) : null;
  const workflow = parsed?.success ? parsed.data : createBlankWorkflow();

  const created = await prisma.workflow.create({
    data: {
      clerkId: userId,
      name: workflow.name,
      status: workflow.status,
      canvas: {
        nodes: workflow.nodes,
        edges: workflow.edges,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ workflow: serializeWorkflow(created) }, { status: 201 });
}
