import type { Workflow, WorkflowRun as DbRun, WorkflowRunNodeResult } from "@prisma/client";
import type { WorkflowDocument, WorkflowEdge, WorkflowNode, WorkflowRun } from "@/types/workflow";

type WorkflowWithRuns = Workflow & {
  runs?: Array<DbRun & { nodeRuns?: WorkflowRunNodeResult[] }>;
};

type CanvasJson = {
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
};

const asCanvas = (canvas: unknown): CanvasJson => {
  if (canvas && typeof canvas === "object") return canvas as CanvasJson;
  return {};
};

export const serializeWorkflow = (workflow: WorkflowWithRuns): WorkflowDocument => {
  const canvas = asCanvas(workflow.canvas);

  return {
    id: workflow.id,
    name: workflow.name,
    status: workflow.status as WorkflowDocument["status"],
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
    nodes: canvas.nodes ?? [],
    edges: canvas.edges ?? [],
    runs:
      workflow.runs?.map<WorkflowRun>((run, index) => ({
        id: run.id,
        workflowId: run.workflowId,
        number: workflow.runs ? workflow.runs.length - index : index + 1,
        status: run.status as WorkflowRun["status"],
        scope: run.scope as WorkflowRun["scope"],
        startedAt: run.startedAt.toISOString(),
        durationMs: run.durationMs,
        nodes:
          run.nodeRuns?.map((nodeRun) => ({
            nodeId: nodeRun.nodeId,
            label: nodeRun.label,
            status: nodeRun.status as WorkflowRun["status"],
            durationMs: nodeRun.durationMs,
            inputs: Array.isArray(nodeRun.inputs) ? nodeRun.inputs.map(String) : ["connected inputs"],
            output: typeof nodeRun.output === "string" ? nodeRun.output : JSON.stringify(nodeRun.output ?? ""),
            error: nodeRun.error ?? undefined,
          })) ?? [],
      })) ?? [],
  };
};
