"use client";

import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/utils";
import { useWorkflowStore } from "@/store/workflow-store";

export function DashboardClient() {
  const router = useRouter();
  const workflows = useWorkflowStore((state) => state.workflows);
  const loading = useWorkflowStore((state) => state.loading);
  const error = useWorkflowStore((state) => state.error);
  const loadWorkflows = useWorkflowStore((state) => state.loadWorkflows);
  const createWorkflow = useWorkflowStore((state) => state.createWorkflow);
  const renameWorkflow = useWorkflowStore((state) => state.renameWorkflow);
  const deleteWorkflow = useWorkflowStore((state) => state.deleteWorkflow);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  useEffect(() => {
    void loadWorkflows();
  }, [loadWorkflows]);

  return (
    <AppShell>
      <section className="mx-auto flex max-w-6xl flex-col gap-7 px-8 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#747782]">NextFlow</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Workflows</h1>
          </div>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17171a] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-black"
            onClick={async () => {
              const id = await createWorkflow();
              router.push(`/workflow/${id}`);
            }}
          >
            <Plus size={16} />
            Create New Workflow
          </button>
        </header>

        <div className="overflow-hidden rounded-xl border border-[#e8e8ed] bg-white shadow-[0_1px_2px_rgba(20,20,25,0.04)]">
          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-[#747782]">
              Loading workflows...
            </div>
          ) : error ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-[#b42318]">
              {error}
            </div>
          ) : workflows.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-[#f1efff] text-[#6d5df6]">
                <Plus size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold">No workflows yet</h2>
                <p className="mt-1 text-sm text-[#747782]">Create your first ILM workflow canvas.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#eeeeF2]">
              <div className="grid grid-cols-[1fr_190px_150px_220px] px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-[#8b8e98]">
                <span>Name</span>
                <span>Last edited</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="grid grid-cols-[1fr_190px_150px_220px] items-center px-5 py-4 transition hover:bg-[#fafafe]"
                >
                  <div className="min-w-0">
                    {renamingId === workflow.id ? (
                      <input
                        autoFocus
                        defaultValue={workflow.name}
                        className="h-9 w-full rounded-lg border border-[#d7d7df] px-3 text-sm outline-none focus:border-[#8b5cf6]"
                        onBlur={(event) => {
                          void renameWorkflow(workflow.id, event.currentTarget.value || "Untitled workflow");
                          setRenamingId(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                        }}
                      />
                    ) : (
                      <button
                        className="block truncate text-left text-sm font-medium"
                        onClick={() => router.push(`/workflow/${workflow.id}`)}
                      >
                        {workflow.name}
                      </button>
                    )}
                  </div>
                  <span className="text-sm text-[#747782]">
                    {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
                  </span>
                  <span
                    className={cn(
                      "w-fit rounded-full px-2.5 py-1 text-xs font-medium",
                      workflow.status === "running"
                        ? "bg-[#fff6db] text-[#9a6500]"
                        : workflow.status === "failed"
                          ? "bg-[#fff0f0] text-[#b42318]"
                          : "bg-[#ecfdf3] text-[#027a48]",
                    )}
                  >
                    {workflow.status}
                  </span>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e2e2e8] px-3 text-xs font-medium hover:bg-[#f7f7fa]"
                      onClick={() => router.push(`/workflow/${workflow.id}`)}
                    >
                      <Play size={13} />
                      Open
                    </button>
                    <button
                      className="flex size-8 items-center justify-center rounded-lg border border-[#e2e2e8] hover:bg-[#f7f7fa]"
                      onClick={() => setRenamingId(workflow.id)}
                      title="Rename"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="flex size-8 items-center justify-center rounded-lg border border-[#e2e2e8] text-[#b42318] hover:bg-[#fff0f0]"
                      onClick={() => void deleteWorkflow(workflow.id)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                    <MoreHorizontal size={16} className="text-[#9a9da8]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
