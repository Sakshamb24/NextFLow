import type { Edge, Node } from "@xyflow/react";

export type NodeKind = "requestInputs" | "cropImage" | "gemini" | "response";

export type PortType = "text" | "image" | "video" | "audio" | "file" | "number";

export type WorkflowStatus = "draft" | "running" | "ready" | "failed";

export type RunStatus = "success" | "failed" | "partial" | "running";

export type RunScope = "full" | "partial" | "single";

export type RequestField = {
  id: string;
  name: string;
  type: "text_field" | "image_field";
  value?: string;
  previewUrl?: string;
};

export type BaseNodeData = {
  label: string;
  kind: NodeKind;
  locked?: boolean;
  running?: boolean;
  lastOutput?: unknown;
  lastError?: string;
};

export type RequestInputsData = BaseNodeData & {
  kind: "requestInputs";
  fields: RequestField[];
};

export type CropImageData = BaseNodeData & {
  kind: "cropImage";
  params: {
    inputImage?: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type GeminiData = BaseNodeData & {
  kind: "gemini";
  model: string;
  inputs: {
    prompt?: string;
    systemPrompt?: string;
    images?: string[];
    video?: string;
    audio?: string;
    file?: string;
  };
  settingsCollapsed: boolean;
  response?: string;
};

export type ResponseData = BaseNodeData & {
  kind: "response";
  captured?: string;
};

export type WorkflowNodeData =
  | RequestInputsData
  | CropImageData
  | GeminiData
  | ResponseData;

export type WorkflowNode = Node<WorkflowNodeData>;

export type WorkflowEdge = Edge<{
  sourceType: PortType;
  targetType: PortType;
}>;

export type WorkflowSummary = {
  id: string;
  name: string;
  status: WorkflowStatus;
  updatedAt: string;
  createdAt: string;
};

export type NodeRunDetail = {
  nodeId: string;
  label: string;
  status: RunStatus;
  durationMs: number;
  inputs: string[];
  output?: string;
  error?: string;
};

export type WorkflowRun = {
  id: string;
  workflowId: string;
  number: number;
  status: RunStatus;
  scope: RunScope;
  startedAt: string;
  durationMs: number;
  nodes: NodeRunDetail[];
};

export type WorkflowDocument = WorkflowSummary & {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  runs: WorkflowRun[];
};
