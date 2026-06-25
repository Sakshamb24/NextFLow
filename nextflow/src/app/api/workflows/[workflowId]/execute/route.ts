import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { executeWorkflowDocument, nodeRunToCreateInput } from "@/server/workflow-runner";
import { serializeWorkflow } from "@/server/workflow-serializer";
import { executeWorkflowSchema } from "@/validators/workflow";

type RouteContext = {
  params: Promise<{ workflowId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workflowId } = await context.params;
    const body = await request.json();
    const parsed = executeWorkflowSchema.safeParse({ ...body, workflowId });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, clerkId: userId },
      include: { runs: { include: { nodeRuns: true }, orderBy: { startedAt: "desc" } } },
    });

    if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const document = serializeWorkflow(workflow);
    const result = await executeWorkflowDocument(document, parsed.data.scope, parsed.data.nodeIds);

    await prisma.workflow.update({
      where: { id: workflow.id },
      data: {
        status: result.run.status === "failed" ? "failed" : "ready",
        canvas: {
          nodes: result.updatedNodes,
          edges: document.edges,
        } as unknown as Prisma.InputJsonValue,
        runs: {
          create: {
            status: result.run.status,
            scope: result.run.scope,
            durationMs: result.run.durationMs,
            startedAt: new Date(result.run.startedAt),
            nodeRuns: {
              create: result.nodeRuns.map(nodeRunToCreateInput),
            },
          },
        },
      },
    });

    const updatedWorkflow = await prisma.workflow.findFirst({
      where: { id: workflowId, clerkId: userId },
      include: { runs: { include: { nodeRuns: true }, orderBy: { startedAt: "desc" } } },
    });

    if (!updatedWorkflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ workflow: serializeWorkflow(updatedWorkflow) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Workflow execution failed" },
      { status: 500 },
    );
  }
}
