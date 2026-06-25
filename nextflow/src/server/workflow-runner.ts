import { Prisma } from "@prisma/client";
import { cropImageTask, geminiTask } from "@/trigger/tasks";
import type {
  CropImageData,
  GeminiData,
  NodeRunDetail,
  RequestInputsData,
  ResponseData,
  RunScope,
  WorkflowDocument,
  WorkflowNode,
  WorkflowRun,
} from "@/types/workflow";

type NodeOutput = {
  text?: string;
  image?: string;
  fields?: Record<string, string>;
};

type ExecutionResult = {
  run: WorkflowRun;
  nodeRuns: NodeRunDetail[];
  updatedNodes: WorkflowNode[];
};

const executableKinds = new Set(["cropImage", "gemini"]);

const nowIso = () => new Date().toISOString();

const getIncoming = (workflow: WorkflowDocument, nodeId: string) =>
  workflow.edges.filter((edge) => edge.target === nodeId);

const getRequestOutput = (data: RequestInputsData): NodeOutput => ({
  fields: Object.fromEntries(data.fields.map((field) => [field.id, field.value ?? ""])),
  text: data.fields.find((field) => field.type === "text_field")?.value ?? "",
  image: data.fields.find((field) => field.type === "image_field" && field.value && !field.value.startsWith("blob:"))?.value,
});

const outputFromHandle = (output: NodeOutput | undefined, handle?: string | null) => {
  if (!output) return "";
  if (handle?.includes("image")) return output.image ?? "";
  if (handle?.includes("response")) return output.text ?? "";
  if (handle?.startsWith("out-")) {
    const fieldId = handle.replace("out-", "");
    return output.fields?.[fieldId] ?? output.text ?? output.image ?? "";
  }
  return output.text ?? output.image ?? "";
};

const buildInputs = (
  workflow: WorkflowDocument,
  node: WorkflowNode,
  outputs: Map<string, NodeOutput>,
) => {
  const incoming = getIncoming(workflow, node.id);
  return incoming.map((edge) => ({
    edge,
    value: outputFromHandle(outputs.get(edge.source), edge.sourceHandle),
  }));
};

const runNode = async (
  workflow: WorkflowDocument,
  node: WorkflowNode,
  outputs: Map<string, NodeOutput>,
): Promise<{ detail: NodeRunDetail; output: NodeOutput; updatedNode: WorkflowNode }> => {
  const startedAt = performance.now();
  const inputs = buildInputs(workflow, node, outputs);

  try {
    if (node.data.kind === "requestInputs") {
      const output = getRequestOutput(node.data);
      return {
        output,
        updatedNode: node,
        detail: {
          nodeId: node.id,
          label: node.data.label,
          status: "success",
          durationMs: Math.max(1, Math.round(performance.now() - startedAt)),
          inputs: node.data.fields.map((field) => field.name),
          output: "request inputs resolved",
        },
      };
    }

    if (node.data.kind === "cropImage") {
      const data = node.data as CropImageData;
      const imageUrl =
        inputs.find((input) => input.edge.targetHandle === "in-inputImage")?.value ||
        data.params.inputImage ||
        "";
      const result = await cropImageTask({
        imageUrl,
        x: data.params.x,
        y: data.params.y,
        width: data.params.width,
        height: data.params.height,
      });
      const output = { image: result.outputImageUrl };
      return {
        output,
        updatedNode: {
          ...node,
          data: { ...node.data, lastOutput: result.outputImageUrl, lastError: undefined, running: false },
        },
        detail: {
          nodeId: node.id,
          label: node.data.label,
          status: "success",
          durationMs: Math.round(performance.now() - startedAt),
          inputs: [`image: ${imageUrl || "not provided"}`],
          output: result.outputImageUrl,
        },
      };
    }

    if (node.data.kind === "gemini") {
      const data = node.data as GeminiData;
      const prompt =
        inputs.find((input) => input.edge.targetHandle === "in-prompt")?.value ||
        data.inputs.prompt ||
        "";
      const imageUrls = inputs
        .filter((input) => input.edge.targetHandle === "in-image")
        .map((input) => input.value)
        .filter(Boolean);
      const result = await geminiTask({
        model: data.model,
        prompt,
        systemPrompt: data.inputs.systemPrompt,
        imageUrls,
      });
      const output = { text: result.response };
      return {
        output,
        updatedNode: {
          ...node,
          data: {
            ...node.data,
            response: result.response,
            lastOutput: result.response,
            lastError: undefined,
            running: false,
          },
        },
        detail: {
          nodeId: node.id,
          label: node.data.label,
          status: "success",
          durationMs: Math.round(performance.now() - startedAt),
          inputs: [`prompt: ${prompt.slice(0, 120)}`, `images: ${imageUrls.length}`],
          output: result.response,
        },
      };
    }

    const data = node.data as ResponseData;
    const captured = inputs.map((input) => input.value).filter(Boolean).join("\n\n");
    const output = { text: captured };
    return {
      output,
      updatedNode: { ...node, data: { ...data, captured: output.text, lastError: undefined, running: false } },
      detail: {
        nodeId: node.id,
        label: node.data.label,
        status: "success",
        durationMs: Math.max(1, Math.round(performance.now() - startedAt)),
        inputs: ["final result"],
        output: output.text || "final result captured",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Node execution failed";
    return {
      output: {},
      updatedNode: { ...node, data: { ...node.data, lastError: message, running: false } },
      detail: {
        nodeId: node.id,
        label: node.data.label,
        status: "failed",
        durationMs: Math.round(performance.now() - startedAt),
        inputs: inputs.map((input) => input.value).filter(Boolean),
        error: message,
      },
    };
  }
};

const isInExecutionScope = (node: WorkflowNode, targetIds: Set<string>, scope: RunScope) => {
  if (scope === "full") return true;
  if (!executableKinds.has(node.data.kind)) return node.data.kind === "requestInputs" || node.data.kind === "response";
  return targetIds.has(node.id);
};

export const executeWorkflowDocument = async (
  workflow: WorkflowDocument,
  scope: RunScope,
  nodeIds: string[] = [],
): Promise<ExecutionResult> => {
  const startedAt = performance.now();
  const targetIds = new Set(nodeIds);
  const scopedNodes = workflow.nodes.filter((node) => isInExecutionScope(node, targetIds, scope));
  const scopedNodeIds = new Set(scopedNodes.map((node) => node.id));
  const pending = new Set(scopedNodeIds);
  const running = new Set<string>();
  const complete = new Set<string>();
  const outputs = new Map<string, NodeOutput>();
  const details: NodeRunDetail[] = [];
  const updatedNodes = new Map(workflow.nodes.map((node) => [node.id, node]));

  const dependenciesMet = (node: WorkflowNode) =>
    getIncoming(workflow, node.id)
      .filter((edge) => scopedNodeIds.has(edge.source))
      .every((edge) => complete.has(edge.source));

  while (pending.size > 0 || running.size > 0) {
    const ready = scopedNodes.filter(
      (node) => pending.has(node.id) && !running.has(node.id) && dependenciesMet(node),
    );

    if (ready.length === 0 && running.size === 0) {
      throw new Error("Workflow contains unresolved dependencies or a cycle.");
    }

    const promises = ready.map(async (node) => {
      pending.delete(node.id);
      running.add(node.id);
      const result = await runNode(workflow, updatedNodes.get(node.id) ?? node, outputs);
      outputs.set(node.id, result.output);
      updatedNodes.set(node.id, result.updatedNode);
      details.push(result.detail);
      complete.add(node.id);
      running.delete(node.id);
      return result;
    });

    await Promise.race(promises.length ? promises : [new Promise((resolve) => setTimeout(resolve, 25))]);
  }

  const status = details.some((detail) => detail.status === "failed")
    ? details.some((detail) => detail.status === "success")
      ? "partial"
      : "failed"
    : "success";

  return {
    nodeRuns: details,
    updatedNodes: workflow.nodes.map((node) => updatedNodes.get(node.id) ?? node),
    run: {
      id: crypto.randomUUID(),
      workflowId: workflow.id,
      number: workflow.runs.length + 1,
      status,
      scope,
      startedAt: nowIso(),
      durationMs: Math.round(performance.now() - startedAt),
      nodes: details,
    },
  };
};

export const nodeRunToCreateInput = (detail: NodeRunDetail) => ({
  nodeId: detail.nodeId,
  label: detail.label,
  status: detail.status,
  durationMs: detail.durationMs,
  inputs: detail.inputs as Prisma.InputJsonValue,
  output: (detail.output ?? null) as Prisma.InputJsonValue,
  error: detail.error,
});
