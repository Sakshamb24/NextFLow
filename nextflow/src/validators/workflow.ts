import { z } from "zod";

export const portTypeSchema = z.enum(["text", "image", "video", "audio", "file", "number"]);

export const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()),
});

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional().nullable(),
  targetHandle: z.string().optional().nullable(),
  animated: z.boolean().optional(),
  data: z
    .object({
      sourceType: portTypeSchema,
      targetType: portTypeSchema,
    })
    .optional(),
});

export const workflowDocumentSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  status: z.enum(["draft", "running", "ready", "failed"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
  runs: z.array(z.unknown()).default([]),
});

export const renameWorkflowSchema = z.object({
  name: z.string().min(1).max(80),
});

export const executeWorkflowSchema = z.object({
  workflowId: z.string(),
  scope: z.enum(["full", "partial", "single"]),
  nodeIds: z.array(z.string()).optional(),
});
