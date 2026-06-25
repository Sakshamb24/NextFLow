"use client";

import { ChevronDown, Clock3 } from "lucide-react";
import { useState } from "react";
import { formatDuration } from "@/lib/utils";
import type { WorkflowRun } from "@/types/workflow";

export function HistoryPanel({ runs }: { runs: WorkflowRun[] }) {
  const [openRunId, setOpenRunId] = useState<string | null>(runs[0]?.id ?? null);

  return (
    <aside className="h-full w-[340px] shrink-0 border-l border-[#e6e6eb] bg-white">
      <div className="flex h-14 items-center justify-between border-b border-[#eeeeF2] px-4">
        <div>
          <h2 className="text-sm font-semibold">History</h2>
          <p className="text-xs text-[#8b8e98]">Workflow execution runs</p>
        </div>
        <Clock3 size={16} className="text-[#8b8e98]" />
      </div>
      <div className="h-[calc(100%-56px)] overflow-y-auto p-3">
        {runs.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[#dedee7] p-6 text-center text-sm text-[#777a84]">
            Runs will appear here after you execute a node or workflow.
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => (
              <div key={run.id} className="overflow-hidden rounded-xl border border-[#e8e8ed] bg-[#fcfcfd]">
                <button
                  className="flex w-full items-center justify-between p-3 text-left"
                  onClick={() => setOpenRunId(openRunId === run.id ? null : run.id)}
                >
                  <span>
                    <span className="block text-sm font-semibold">
                      Run #{run.number} - {run.scope}
                    </span>
                    <span className="text-xs text-[#777a84]">
                      {new Date(run.startedAt).toLocaleString()} - {formatDuration(run.durationMs)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-[#ecfdf3] px-2 py-0.5 text-[11px] font-medium text-[#027a48]">
                      {run.status}
                    </span>
                    <ChevronDown size={14} />
                  </span>
                </button>
                {openRunId === run.id ? (
                  <div className="space-y-2 border-t border-[#eeeeF2] p-3">
                    {run.nodes.map((node) => (
                      <div key={`${run.id}-${node.nodeId}`} className="rounded-lg bg-white p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{node.label}</span>
                          <span className={node.status === "failed" ? "text-[#b42318]" : "text-[#777a84]"}>
                            {node.status} - {formatDuration(node.durationMs)}
                          </span>
                        </div>
                        <div className="mt-1 text-[#777a84]">{node.inputs.join(", ")}</div>
                        {node.output ? <div className="mt-1 truncate text-[#454851]">{node.output}</div> : null}
                        {node.error ? <div className="mt-1 text-[#b42318]">{node.error}</div> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
