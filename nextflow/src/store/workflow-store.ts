"use client";

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import { create } from "zustand";
import { createRequiredSampleWorkflow } from "@/lib/sample-workflow";
import { workflowApi } from "@/lib/workflow-api";
import type {
  NodeKind,
  PortType,
  RunScope,
  WorkflowDocument,
  WorkflowEdge,
  WorkflowNode,
} from "@/types/workflow";

type Snapshot = Pick<WorkflowDocument, "nodes" | "edges">;

type WorkflowStore = {
  workflows: WorkflowDocument[];
  activeWorkflowId: string | null;
  selectedNodeIds: string[];
  loading: boolean;
  saving: boolean;
  executing: boolean;
  error: string | null;
  undoStack: Snapshot[];
  redoStack: Snapshot[];
  getActiveWorkflow: () => WorkflowDocument | null;
  loadWorkflows: () => Promise<void>;
  loadWorkflow: (id: string) => Promise<void>;
  createWorkflow: () => Promise<string>;
  createSampleWorkflow: () => Promise<string>;
  openWorkflow: (id: string) => void;
  renameWorkflow: (id: string, name: string) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  importWorkflow: (workflow: WorkflowDocument) => Promise<void>;
  saveActiveWorkflow: () => Promise<void>;
  updateRequestField: (nodeId: string, fieldId: string, value: string, previewUrl?: string) => void;
  addRequestField: (nodeId: string, type: "text_field" | "image_field") => void;
  updateGeminiInput: (nodeId: string, key: "prompt" | "systemPrompt", value: string) => void;
  updateCropParam: (nodeId: string, key: "x" | "y" | "width" | "height", value: number) => void;
  addNode: (kind: Exclude<NodeKind, "requestInputs" | "response">) => void;
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
  connect: (connection: Connection) => void;
  isValidConnection: (connection: Connection | WorkflowEdge) => boolean;
  deleteSelected: () => void;
  setSelectedNodeIds: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  runWorkflow: (scope: RunScope, nodeIds?: string[]) => Promise<void>;
};

const lockedNodeIds = new Set(["request-inputs", "response"]);

const nowIso = () => new Date().toISOString();

const connectionTypes = (handle?: string | null): PortType => {
  if (!handle) return "text";
  const normalized = handle.toLowerCase();
  if (normalized.includes("image")) return "image";
  if (normalized.includes("video")) return "video";
  if (normalized.includes("audio")) return "audio";
  if (normalized.includes("file")) return "file";
  if (
    normalized.includes("x") ||
    normalized.includes("y") ||
    normalized.includes("width") ||
    normalized.includes("height")
  ) {
    return "number";
  }
  return "text";
};

const wouldCreateCycle = (edges: WorkflowEdge[], source: string, target: string) => {
  const graph = new Map<string, string[]>();
  [...edges, { source, target } as WorkflowEdge].forEach((edge) => {
    graph.set(edge.source, [...(graph.get(edge.source) ?? []), edge.target]);
  });

  const seen = new Set<string>();
  const visit = (nodeId: string): boolean => {
    if (nodeId === source && seen.size > 0) return true;
    if (seen.has(nodeId)) return false;
    seen.add(nodeId);
    return (graph.get(nodeId) ?? []).some(visit);
  };

  return visit(target);
};

const isConnectionAllowed = (workflow: WorkflowDocument, connection: Connection | WorkflowEdge) => {
  if (!connection.source || !connection.target) return false;
  if (connection.source === connection.target) return false;

  const sourceType = connectionTypes(connection.sourceHandle);
  const targetType = connectionTypes(connection.targetHandle);
  if (sourceType !== targetType) return false;
  if (wouldCreateCycle(workflow.edges, connection.source, connection.target)) return false;

  return true;
};

const makeNode = (kind: Exclude<NodeKind, "requestInputs" | "response">, index: number): WorkflowNode => {
  if (kind === "cropImage") {
    return {
      id: `crop-${crypto.randomUUID()}`,
      type: "cropImage",
      position: { x: 20 + index * 42, y: 150 + index * 32 },
      data: {
        kind: "cropImage",
        label: `Crop Image #${index}`,
        params: { x: 0, y: 0, width: 100, height: 100 },
      },
    };
  }

  return {
    id: `gemini-${crypto.randomUUID()}`,
    type: "gemini",
    position: { x: 280 + index * 42, y: 150 + index * 32 },
    data: {
      kind: "gemini",
      label: `Gemini 3.1 Pro #${index}`,
      model: "gemini-3.1-pro",
      inputs: {},
      settingsCollapsed: true,
    },
  };
};

const replaceWorkflow = (
  workflows: WorkflowDocument[],
  workflow: WorkflowDocument,
) => {
  const exists = workflows.some((item) => item.id === workflow.id);
  if (!exists) return [workflow, ...workflows];
  return workflows.map((item) => (item.id === workflow.id ? workflow : item));
};

export const useWorkflowStore = create<WorkflowStore>()((set, get) => ({
  workflows: [],
  activeWorkflowId: null,
  selectedNodeIds: [],
  loading: false,
  saving: false,
  executing: false,
  error: null,
  undoStack: [],
  redoStack: [],

  getActiveWorkflow: () => {
    const { workflows, activeWorkflowId } = get();
    return workflows.find((workflow) => workflow.id === activeWorkflowId) ?? null;
  },

  loadWorkflows: async () => {
    set({ loading: true, error: null });
    try {
      const { workflows } = await workflowApi.list();
      set((state) => ({
        workflows,
        activeWorkflowId: state.activeWorkflowId ?? workflows[0]?.id ?? null,
        loading: false,
      }));
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "Failed to load workflows" });
    }
  },

  loadWorkflow: async (id) => {
    set({ loading: true, error: null, activeWorkflowId: id });
    try {
      const { workflow } = await workflowApi.get(id);
      set((state) => ({
        workflows: replaceWorkflow(state.workflows, workflow),
        activeWorkflowId: workflow.id,
        loading: false,
      }));
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "Failed to load workflow" });
    }
  },

  createWorkflow: async () => {
    set({ saving: true, error: null });
    const { workflow } = await workflowApi.create();
    set((state) => ({
      workflows: [workflow, ...state.workflows],
      activeWorkflowId: workflow.id,
      saving: false,
    }));
    return workflow.id;
  },

  createSampleWorkflow: async () => {
    set({ saving: true, error: null });
    const sample = createRequiredSampleWorkflow();
    const { workflow } = await workflowApi.create({
      ...sample,
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    set((state) => ({
      workflows: [workflow, ...state.workflows],
      activeWorkflowId: workflow.id,
      saving: false,
    }));
    return workflow.id;
  },

  openWorkflow: (id) => set({ activeWorkflowId: id }),

  renameWorkflow: async (id, name) => {
    const previous = get().workflows;
    set((state) => ({
      workflows: state.workflows.map((workflow) =>
        workflow.id === id ? { ...workflow, name, updatedAt: nowIso() } : workflow,
      ),
      error: null,
    }));

    try {
      const { workflow } = await workflowApi.rename(id, name);
      set((state) => ({ workflows: replaceWorkflow(state.workflows, workflow) }));
    } catch (error) {
      set({ workflows: previous, error: error instanceof Error ? error.message : "Failed to rename workflow" });
    }
  },

  deleteWorkflow: async (id) => {
    const previous = get().workflows;
    set((state) => {
      const workflows = state.workflows.filter((workflow) => workflow.id !== id);
      return {
        workflows,
        activeWorkflowId: state.activeWorkflowId === id ? workflows[0]?.id ?? null : state.activeWorkflowId,
        error: null,
      };
    });

    try {
      await workflowApi.delete(id);
    } catch (error) {
      set({ workflows: previous, error: error instanceof Error ? error.message : "Failed to delete workflow" });
    }
  },

  importWorkflow: async (workflow) => {
    set({ saving: true, error: null });
    try {
      const { workflow: created } = await workflowApi.create({
        ...workflow,
        id: crypto.randomUUID(),
        updatedAt: nowIso(),
      });
      set((state) => ({ workflows: [created, ...state.workflows], saving: false }));
    } catch (error) {
      set({ saving: false, error: error instanceof Error ? error.message : "Failed to import workflow" });
    }
  },

  saveActiveWorkflow: async () => {
    const workflow = get().getActiveWorkflow();
    if (!workflow) return;
    set({ saving: true, error: null });
    try {
      const { workflow: saved } = await workflowApi.save(workflow);
      set((state) => ({
        workflows: replaceWorkflow(state.workflows, saved),
        saving: false,
      }));
    } catch (error) {
      set({ saving: false, error: error instanceof Error ? error.message : "Failed to save workflow" });
    }
  },

  updateRequestField: (nodeId, fieldId, value, previewUrl) =>
    set((state) => ({
      workflows: state.workflows.map((workflow) =>
        workflow.id === state.activeWorkflowId
          ? {
              ...workflow,
              nodes: workflow.nodes.map((node) =>
                node.id === nodeId && node.data.kind === "requestInputs"
                  ? {
                      ...node,
                      data: {
                        ...node.data,
                        fields: node.data.fields.map((field) =>
                          field.id === fieldId
                            ? { ...field, value, previewUrl: previewUrl ?? field.previewUrl }
                            : field,
                        ),
                      },
                    }
                  : node,
              ),
              updatedAt: nowIso(),
            }
          : workflow,
      ),
    })),

  addRequestField: (nodeId, type) =>
    set((state) => ({
      workflows: state.workflows.map((workflow) =>
        workflow.id === state.activeWorkflowId
          ? {
              ...workflow,
              nodes: workflow.nodes.map((node) => {
                if (node.id !== nodeId || node.data.kind !== "requestInputs") return node;
                const count = node.data.fields.filter((field) => field.type === type).length + 1;
                const base = type === "text_field" ? "text_field" : "image_field";
                return {
                  ...node,
                  data: {
                    ...node.data,
                    fields: [
                      ...node.data.fields,
                      {
                        id: `${base}_${count}`,
                        name: `${base}_${count}`,
                        type,
                        value: "",
                      },
                    ],
                  },
                };
              }),
              updatedAt: nowIso(),
            }
          : workflow,
      ),
    })),

  updateGeminiInput: (nodeId, key, value) =>
    set((state) => ({
      workflows: state.workflows.map((workflow) =>
        workflow.id === state.activeWorkflowId
          ? {
              ...workflow,
              nodes: workflow.nodes.map((node) =>
                node.id === nodeId && node.data.kind === "gemini"
                  ? {
                      ...node,
                      data: {
                        ...node.data,
                        inputs: {
                          ...node.data.inputs,
                          [key]: value,
                        },
                      },
                    }
                  : node,
              ),
              updatedAt: nowIso(),
            }
          : workflow,
      ),
    })),

  updateCropParam: (nodeId, key, value) =>
    set((state) => ({
      workflows: state.workflows.map((workflow) =>
        workflow.id === state.activeWorkflowId
          ? {
              ...workflow,
              nodes: workflow.nodes.map((node) =>
                node.id === nodeId && node.data.kind === "cropImage"
                  ? {
                      ...node,
                      data: {
                        ...node.data,
                        params: {
                          ...node.data.params,
                          [key]: Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)),
                        },
                      },
                    }
                  : node,
              ),
              updatedAt: nowIso(),
            }
          : workflow,
      ),
    })),

  addNode: (kind) =>
    set((state) => {
      const active = state.workflows.find((workflow) => workflow.id === state.activeWorkflowId);
      const snapshot = active ? { nodes: active.nodes, edges: active.edges } : null;

      return {
        workflows: state.workflows.map((workflow) => {
          if (workflow.id !== state.activeWorkflowId) return workflow;
          const count = workflow.nodes.filter((node) => node.data.kind === kind).length + 1;
          return {
            ...workflow,
            nodes: [...workflow.nodes, makeNode(kind, count)],
            updatedAt: nowIso(),
          };
        }),
        undoStack: snapshot ? [...state.undoStack, snapshot] : state.undoStack,
        redoStack: [],
      };
    }),

  onNodesChange: (changes) =>
    set((state) => ({
      workflows: state.workflows.map((workflow) =>
        workflow.id === state.activeWorkflowId
          ? {
              ...workflow,
              nodes: applyNodeChanges(changes, workflow.nodes),
              updatedAt: nowIso(),
            }
          : workflow,
      ),
    })),

  onEdgesChange: (changes) =>
    set((state) => ({
      workflows: state.workflows.map((workflow) =>
        workflow.id === state.activeWorkflowId
          ? {
              ...workflow,
              edges: applyEdgeChanges(changes, workflow.edges),
              updatedAt: nowIso(),
            }
          : workflow,
      ),
    })),

  connect: (connection) =>
    set((state) => ({
      workflows: state.workflows.map((workflow) => {
        if (workflow.id !== state.activeWorkflowId || !connection.source || !connection.target) return workflow;

        const sourceType = connectionTypes(connection.sourceHandle);
        const targetType = connectionTypes(connection.targetHandle);
        if (!isConnectionAllowed(workflow, connection)) return workflow;

        const edge: WorkflowEdge = {
          ...connection,
          id: `edge-${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`,
          source: connection.source,
          target: connection.target,
          animated: true,
          data: { sourceType, targetType },
          style: { stroke: "#8b5cf6", strokeWidth: 1.6 },
        };

        return {
          ...workflow,
          edges: addEdge(edge, workflow.edges),
          updatedAt: nowIso(),
        };
      }),
    })),

  isValidConnection: (connection) => {
    const workflow = get().getActiveWorkflow();
    if (!workflow) return false;
    return isConnectionAllowed(workflow, connection);
  },

  deleteSelected: () =>
    set((state) => ({
      workflows: state.workflows.map((workflow) =>
        workflow.id === state.activeWorkflowId
          ? {
              ...workflow,
              nodes: workflow.nodes.filter(
                (node) => !state.selectedNodeIds.includes(node.id) || lockedNodeIds.has(node.id),
              ),
              edges: workflow.edges.filter(
                (edge) =>
                  !state.selectedNodeIds.includes(edge.source) &&
                  !state.selectedNodeIds.includes(edge.target),
              ),
              updatedAt: nowIso(),
            }
          : workflow,
      ),
      selectedNodeIds: [],
    })),

  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),

  undo: () =>
    set((state) => {
      const current = state.workflows.find((workflow) => workflow.id === state.activeWorkflowId);
      const snapshot = state.undoStack.at(-1);
      if (!current || !snapshot) return state;
      return {
        workflows: state.workflows.map((workflow) =>
          workflow.id === state.activeWorkflowId ? { ...workflow, ...snapshot } : workflow,
        ),
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, { nodes: current.nodes, edges: current.edges }],
      };
    }),

  redo: () =>
    set((state) => {
      const current = state.workflows.find((workflow) => workflow.id === state.activeWorkflowId);
      const snapshot = state.redoStack.at(-1);
      if (!current || !snapshot) return state;
      return {
        workflows: state.workflows.map((workflow) =>
          workflow.id === state.activeWorkflowId ? { ...workflow, ...snapshot } : workflow,
        ),
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, { nodes: current.nodes, edges: current.edges }],
      };
    }),

  runWorkflow: async (scope, nodeIds) => {
    const workflow = get().getActiveWorkflow();
    if (!workflow) return;

    const runnableIds =
      nodeIds?.length
        ? nodeIds
        : workflow.nodes.filter((node) => !lockedNodeIds.has(node.id)).map((node) => node.id);

    set((state) => ({
      executing: true,
      error: null,
      workflows: state.workflows.map((item) =>
        item.id === workflow.id
          ? {
              ...item,
              status: "running",
              nodes: item.nodes.map((node) =>
                runnableIds.includes(node.id)
                  ? { ...node, data: { ...node.data, running: true, lastError: undefined } }
                  : node,
              ),
            }
          : item,
      ),
    }));

    try {
      await workflowApi.save({ ...workflow, status: "running" });
      const { workflow: executed } = await workflowApi.execute(workflow.id, scope, nodeIds);
      set((state) => ({
        workflows: replaceWorkflow(state.workflows, executed),
        executing: false,
      }));
    } catch (error) {
      set((state) => ({
        executing: false,
        error: error instanceof Error ? error.message : "Failed to execute workflow",
        workflows: state.workflows.map((item) =>
          item.id === workflow.id
            ? {
                ...item,
                status: "failed",
                nodes: item.nodes.map((node) => ({ ...node, data: { ...node.data, running: false } })),
              }
            : item,
        ),
      }));
    }
  },
}));
