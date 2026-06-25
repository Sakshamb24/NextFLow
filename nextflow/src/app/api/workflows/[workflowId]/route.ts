import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { serializeWorkflow } from "@/server/workflow-serializer";
import { renameWorkflowSchema, workflowDocumentSchema } from "@/validators/workflow";

type RouteContext = {
  params: Promise<{ workflowId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workflowId } = await context.params;
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, clerkId: userId },
    include: { runs: { include: { nodeRuns: true }, orderBy: { startedAt: "desc" } } },
  });

  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ workflow: serializeWorkflow(workflow) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workflowId } = await context.params;
  const body = await request.json();
  const rename = renameWorkflowSchema.safeParse(body);
  const document = workflowDocumentSchema.safeParse(body.workflow);

  const update = await prisma.workflow.updateMany({
    where: { id: workflowId, clerkId: userId },
    data: {
      ...(rename.success ? { name: rename.data.name } : {}),
      ...(document.success
        ? {
            name: document.data.name,
            status: document.data.status,
            canvas: { nodes: document.data.nodes, edges: document.data.edges } as unknown as Prisma.InputJsonValue,
          }
        : {}),
    },
  });

  if (update.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, clerkId: userId },
    include: { runs: { include: { nodeRuns: true }, orderBy: { startedAt: "desc" } } },
  });

  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ workflow: serializeWorkflow(workflow) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workflowId } = await context.params;
  await prisma.workflow.deleteMany({ where: { id: workflowId, clerkId: userId } });

  return NextResponse.json({ ok: true });
}
