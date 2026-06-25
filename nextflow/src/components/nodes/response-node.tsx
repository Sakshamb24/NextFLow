"use client";

import { Handle, Position } from "@xyflow/react";
import { NodeShell, PortLabel, type FlowNodeProps } from "@/components/nodes/node-shell";
import type { ResponseData } from "@/types/workflow";

export function ResponseNode({ data }: FlowNodeProps<ResponseData>) {
  return (
    <NodeShell data={data} accent="amber">
      <Handle id="in-result" type="target" position={Position.Left} className="!size-3.5 !border-2 !border-white !bg-[#f59e0b]" />
      <div className="rounded-lg border border-[#ececf1] bg-[#fbfbfd] p-2">
        <PortLabel>result</PortLabel>
        <p className="mt-1 min-h-12 text-xs leading-5 text-[#454851]">{data.captured ?? "Waiting for final output."}</p>
      </div>
    </NodeShell>
  );
}
