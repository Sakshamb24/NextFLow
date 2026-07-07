"use client";

import { Handle, Position } from "@xyflow/react";
import { ImageIcon } from "lucide-react";
import { useMemo } from "react";
import { NodeShell, OutputHandle, PortLabel, type FlowNodeProps } from "@/components/nodes/node-shell";
import { useWorkflowStore } from "@/store/workflow-store";
import type { CropImageData } from "@/types/workflow";

export function CropImageNode({ id, data }: FlowNodeProps<CropImageData>) {
  const updateCropParam = useWorkflowStore((state) => state.updateCropParam);
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
  const fields = [
    { label: "X Position", key: "x" as const, handle: "in-x", value: data.params.x },
    { label: "Y Position", key: "y" as const, handle: "in-y", value: data.params.y },
    { label: "Width", key: "width" as const, handle: "in-width", value: data.params.width },
    { label: "Height", key: "height" as const, handle: "in-height", value: data.params.height },
  ];

  return (
    <NodeShell data={data} accent="blue">
      <OutputHandle id="out-image" />
      <div className="relative rounded-lg border border-[#ececf1] bg-[#fbfbfd] p-2">
        <Handle
          id="in-inputImage"
          type="target"
          position={Position.Left}
          className="!-left-[15px] !size-3.5 !border-2 !border-white !bg-[#2f80ed]"
        />
        <div className="flex items-center gap-2">
          <ImageIcon size={14} className="text-[#2f80ed]" />
          <PortLabel>Input Image</PortLabel>
          <span className="ml-auto rounded-full bg-[#eef5ff] px-2 py-0.5 text-[10px] text-[#2f5da8]">required</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {fields.map((field) => (
          <label key={field.key} className="relative space-y-1 rounded-lg border border-[#ececf1] bg-[#fbfbfd] p-2">
            <Handle
              id={field.handle}
              type="target"
              position={Position.Left}
              className="!-left-[15px] !size-3 !border-2 !border-white !bg-[#10b981]"
            />
            <PortLabel>{field.label} %</PortLabel>
            <input
              type="number"
              min={0}
              max={100}
              disabled={connectedHandles.has(field.handle)}
              className="h-8 w-full rounded-md border border-[#e1e1e8] bg-white px-2 text-xs outline-none disabled:bg-[#f1f2f5] disabled:text-[#9a9da8]"
              value={field.value}
              onChange={(event) => updateCropParam(id, field.key, Number(event.currentTarget.value))}
            />
          </label>
        ))}
      </div>
      <div className="rounded-lg bg-[#f8f8fb] px-2 py-1.5 text-[11px] text-[#777a84]">
        Trigger.dev FFmpeg task waits 30+ seconds before returning.
      </div>
    </NodeShell>
  );
}
