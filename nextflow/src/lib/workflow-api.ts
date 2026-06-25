import type { RunScope, WorkflowDocument } from "@/types/workflow";

const readJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  let json: (T & { error?: unknown }) | null = null;

  if (text) {
    try {
      json = JSON.parse(text) as T & { error?: unknown };
    } catch {
      throw new Error(text.slice(0, 220) || `Request failed with status ${response.status}`);
    }
  }

  if (!response.ok) {
    throw new Error(
      typeof json?.error === "string"
        ? json.error
        : text || `Request failed with status ${response.status}`,
    );
  }

  if (!json) throw new Error(`Empty response from server with status ${response.status}`);
  return json;
};

export const workflowApi = {
  async list() {
    const response = await fetch("/api/workflows", { cache: "no-store" });
    return readJson<{ workflows: WorkflowDocument[] }>(response);
  },

  async create(workflow?: WorkflowDocument) {
    const response = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workflow ? { workflow } : {}),
    });
    return readJson<{ workflow: WorkflowDocument }>(response);
  },

  async get(id: string) {
    const response = await fetch(`/api/workflows/${id}`, { cache: "no-store" });
    return readJson<{ workflow: WorkflowDocument }>(response);
  },

  async save(workflow: WorkflowDocument) {
    const response = await fetch(`/api/workflows/${workflow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow }),
    });
    return readJson<{ workflow: WorkflowDocument }>(response);
  },

  async rename(id: string, name: string) {
    const response = await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return readJson<{ workflow: WorkflowDocument }>(response);
  },

  async delete(id: string) {
    const response = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    return readJson<{ ok: true }>(response);
  },

  async execute(workflowId: string, scope: RunScope, nodeIds?: string[]) {
    const response = await fetch(`/api/workflows/${workflowId}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, nodeIds }),
    });
    return readJson<{ workflow: WorkflowDocument }>(response);
  },
};
