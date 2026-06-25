"use client";

import { Handle, Position } from "@xyflow/react";
import { ImageIcon } from "lucide-react";
import { NodeShell, OutputHandle, PortLabel, type FlowNodeProps } from "@/components/nodes/node-shell";
import { useWorkflowStore } from "@/store/workflow-store";
import type { CropImageData } from "@/types/workflow";

export function CropImageNode({ id, data }: FlowNodeProps<CropImageData>) {
  const updateCropParam = useWorkflowStore((state) => state.updateCropParam);
  const fields = [
    { label: "X Position", key: "x" as const, value: data.params.x },
    { label: "Y Position", key: "y" as const, value: data.params.y },
    { label: "Width", key: "width" as const, value: data.params.width },
    { label: "Height", key: "height" as const, value: data.params.height },
  ];

  return (
    <NodeShell data={data} accent="blue">
      <Handle id="in-inputImage" type="target" position={Position.Left} className="!size-3.5 !border-2 !border-white !bg-[#2f80ed]" />
      <OutputHandle id="out-image" />
      <div className="rounded-lg border border-[#ececf1] bg-[#fbfbfd] p-2">
        <div className="flex items-center gap-2">
          <ImageIcon size={14} className="text-[#2f80ed]" />
          <PortLabel>Input Image</PortLabel>
          <span className="ml-auto rounded-full bg-[#eef5ff] px-2 py-0.5 text-[10px] text-[#2f5da8]">required</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {fields.map((field) => (
          <label key={field.key} className="space-y-1 rounded-lg border border-[#ececf1] bg-[#fbfbfd] p-2">
            <PortLabel>{field.label} %</PortLabel>
            <input
              type="number"
              min={0}
              max={100}
              className="h-8 w-full rounded-md border border-[#e1e1e8] bg-white px-2 text-xs outline-none"
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
