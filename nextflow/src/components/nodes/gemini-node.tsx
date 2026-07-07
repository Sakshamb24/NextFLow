"use client";

import { Handle, Position } from "@xyflow/react";
import { ChevronDown } from "lucide-react";
import { useMemo } from "react";
import { NodeShell, OutputHandle, PortLabel, type FlowNodeProps } from "@/components/nodes/node-shell";
import { useWorkflowStore } from "@/store/workflow-store";
import type { GeminiData } from "@/types/workflow";

export function GeminiNode({ id, data }: FlowNodeProps<GeminiData>) {
  const updateGeminiInput = useWorkflowStore((state) => state.updateGeminiInput);
  const workflow = useWorkflowStore((state) => state.getActiveWorkflow());
  const connectedHandles = useMemo(
    () =>
      new Set(
        workflow?.edges
          .filter((edge) => edge.target === id)
          .map((edge) => edge.targetHandle)
          .filter(Boolean) ?? [],
      ),
    [id, workflow?.edges],
  );

  return (
    <NodeShell data={data} accent="violet">
      <OutputHandle id="out-response" />
      <div className="flex h-8 items-center justify-between rounded-lg border border-[#e7e7ed] bg-[#fbfbfd] px-2 text-xs">
        <span className="font-medium">{data.model}</span>
        <ChevronDown size={13} className="text-[#8b8e98]" />
      </div>
      <div className="space-y-2">
        <label className="relative block rounded-lg border border-[#ececf1] bg-[#fbfbfd] p-2">
          <Handle
            id="in-prompt"
            type="target"
            position={Position.Left}
            className="!-left-[15px] !top-1/2 !size-3.5 !border-2 !border-white !bg-[#f59e0b]"
          />
          <PortLabel>Prompt</PortLabel>
          <textarea
            disabled={connectedHandles.has("in-prompt")}
            className="mt-1 h-14 w-full resize-none rounded-md border border-[#e1e1e8] bg-white p-2 text-xs outline-none disabled:bg-[#f1f2f5] disabled:text-[#9a9da8]"
            value={data.inputs.prompt ?? ""}
            placeholder="Connect or type a prompt"
            onChange={(event) => updateGeminiInput(id, "prompt", event.currentTarget.value)}
          />
        </label>
        <label className="block rounded-lg border border-[#ececf1] bg-[#fbfbfd] p-2">
          <PortLabel>System Prompt</PortLabel>
          <textarea
            className="mt-1 h-16 w-full resize-none rounded-md border border-[#e1e1e8] bg-white p-2 text-xs outline-none"
            value={data.inputs.systemPrompt ?? ""}
            onChange={(event) => updateGeminiInput(id, "systemPrompt", event.currentTarget.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-[#777a84]">
          <div className="relative rounded-lg border border-[#ececf1] bg-[#fbfbfd] p-2">
            <Handle
              id="in-image"
              type="target"
              position={Position.Left}
              className="!-left-[15px] !top-1/2 !size-3.5 !border-2 !border-white !bg-[#2f80ed]"
            />
            Image (Vision)
          </div>
          <div className="rounded-lg border border-[#ececf1] bg-[#fbfbfd] p-2">Video</div>
          <div className="rounded-lg border border-[#ececf1] bg-[#fbfbfd] p-2">Audio</div>
          <div className="rounded-lg border border-[#ececf1] bg-[#fbfbfd] p-2">File</div>
        </div>
      </div>
      <details className="rounded-lg border border-[#ececf1] bg-[#fbfbfd] px-2 py-1.5 text-xs text-[#777a84]">
        <summary>Settings</summary>
        <div className="pt-2">Temperature, max tokens, and safety settings.</div>
      </details>
      <div className="rounded-lg border border-[#ececf1] bg-white p-2">
        <PortLabel>Response</PortLabel>
        <p className={`mt-1 min-h-10 text-xs leading-5 ${data.lastError ? "text-[#b42318]" : "text-[#454851]"}`}>
          {data.lastError ?? data.response ?? "Run this node to render Gemini output inline."}
        </p>
      </div>
    </NodeShell>
  );
}
