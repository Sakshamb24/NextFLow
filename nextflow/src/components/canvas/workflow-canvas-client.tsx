"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { Download, Play, Redo2, Save, Trash2, Undo2, Upload } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { HistoryPanel } from "@/components/canvas/history-panel";
import { NodePicker } from "@/components/canvas/node-picker";
import { nodeTypes } from "@/components/nodes";
import { useWorkflowStore } from "@/store/workflow-store";

function CanvasInner() {
  const params = useParams<{ workflowId: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { fitView } = useReactFlow();
  const workflow = useWorkflowStore((state) => state.getActiveWorkflow());
  const loading = useWorkflowStore((state) => state.loading);
  const saving = useWorkflowStore((state) => state.saving);
  const executing = useWorkflowStore((state) => state.executing);
  const error = useWorkflowStore((state) => state.error);
  const openWorkflow = useWorkflowStore((state) => state.openWorkflow);
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow);
  const saveActiveWorkflow = useWorkflowStore((state) => state.saveActiveWorkflow);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange);
  const connect = useWorkflowStore((state) => state.connect);
  const deleteSelected = useWorkflowStore((state) => state.deleteSelected);
  const setSelectedNodeIds = useWorkflowStore((state) => state.setSelectedNodeIds);
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const runWorkflow = useWorkflowStore((state) => state.runWorkflow);
  const importWorkflow = useWorkflowStore((state) => state.importWorkflow);

  useEffect(() => {
    if (params.workflowId) {
      openWorkflow(params.workflowId);
      void loadWorkflow(params.workflowId);
    }
  }, [loadWorkflow, openWorkflow, params.workflowId]);

  useEffect(() => {
    if (workflow) window.setTimeout(() => fitView({ padding: 0.28, duration: 500 }), 80);
  }, [fitView, workflow?.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") deleteSelected();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") undo();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") redo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, redo, undo]);

  const selectedIds = useMemo(
    () => workflow?.nodes.filter((node) => node.selected).map((node) => node.id) ?? [],
    [workflow?.nodes],
  );
  const selectedExecutableIds = useMemo(
    () =>
      workflow?.nodes
        .filter((node) => node.selected && (node.data.kind === "gemini" || node.data.kind === "cropImage"))
        .map((node) => node.id) ?? [],
    [workflow?.nodes],
  );

  if (!workflow || loading) {
    return (
      <AppShell>
        <div className="flex h-screen items-center justify-center">
          <div className="text-sm text-[#747782]">{loading ? "Loading workflow..." : "Workflow not found"}</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex h-screen min-w-0">
        <section className="relative min-w-0 flex-1">
          <header className="absolute left-5 top-5 z-20 flex items-center gap-3 rounded-xl border border-[#e7e7ec] bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
            <button className="text-sm text-[#777a84]" onClick={() => router.push("/dashboard")}>
              Back
            </button>
            <div>
              <h1 className="text-sm font-semibold">{workflow.name}</h1>
              <p className="text-[11px] text-[#8b8e98]">ILM workflow builder</p>
            </div>
          </header>

          <div className="absolute right-5 top-5 z-20 flex items-center gap-2 rounded-xl border border-[#e7e7ec] bg-white/95 p-2 shadow-sm backdrop-blur">
            <button className="toolbar-button" onClick={undo} title="Undo">
              <Undo2 size={15} />
            </button>
            <button className="toolbar-button" onClick={redo} title="Redo">
              <Redo2 size={15} />
            </button>
            <button className="toolbar-button" onClick={deleteSelected} title="Delete">
              <Trash2 size={15} />
            </button>
            <button
              className="toolbar-button"
              onClick={() => {
                const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `${workflow.name}.json`;
                anchor.click();
                URL.revokeObjectURL(url);
              }}
              title="Export JSON"
            >
              <Download size={15} />
            </button>
            <button className="toolbar-button" onClick={() => fileInputRef.current?.click()} title="Import JSON">
              <Upload size={15} />
            </button>
            <button className="toolbar-button" title="Saved">
              <Save size={15} />
            </button>
            <button
              className="inline-flex h-9 items-center rounded-lg border border-[#e2e2e8] px-3 text-xs font-semibold text-[#595c66] hover:bg-[#f7f7fa]"
              onClick={() => void saveActiveWorkflow()}
            >
              {saving ? "Saving" : "Save"}
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#2563eb] px-3 text-xs font-semibold text-white hover:bg-[#1d4ed8]"
              disabled={executing}
              onClick={() =>
                void runWorkflow(
                  selectedExecutableIds.length ? "partial" : "full",
                  selectedExecutableIds.length ? selectedExecutableIds : undefined,
                )
              }
            >
              <Play size={14} />
              {executing ? "Running" : "Run"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              hidden
              onChange={async (event) => {
                const file = event.currentTarget.files?.[0];
                if (!file) return;
                const imported = JSON.parse(await file.text());
                await importWorkflow(imported);
                router.push("/dashboard");
              }}
            />
          </div>

          {error ? (
            <div className="absolute left-1/2 top-20 z-20 -translate-x-1/2 rounded-lg border border-[#ffd6d6] bg-white px-3 py-2 text-xs text-[#b42318] shadow-sm">
              {error}
            </div>
          ) : null}

          <ReactFlow
            nodes={workflow.nodes}
            edges={workflow.edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={connect}
            onSelectionChange={({ nodes }) => setSelectedNodeIds(nodes.map((node) => node.id))}
            fitView
            proOptions={{ hideAttribution: true }}
            minZoom={0.25}
            maxZoom={1.8}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="#d8d8e2" />
            <Controls position="bottom-left" />
            <MiniMap
              position="bottom-right"
              pannable
              zoomable
              nodeColor="#8b5cf6"
              maskColor="rgba(246,247,248,0.72)"
              className="!rounded-xl !border !border-[#e4e4ea] !bg-white"
            />
          </ReactFlow>
          <NodePicker />
        </section>
        <HistoryPanel runs={workflow.runs} />
      </div>
    </AppShell>
  );
}

export function WorkflowCanvasClient() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
