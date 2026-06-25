"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Loader2, Lock, MoreHorizontal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowNodeData } from "@/types/workflow";

export function NodeShell({
  children,
  data,
  accent = "violet",
}: {
  children: React.ReactNode;
  data: WorkflowNodeData;
  accent?: "violet" | "blue" | "amber" | "slate";
}) {
  return (
    <div
      className={cn(
        "w-[292px] rounded-xl border border-[#e3e3e8] bg-white shadow-[0_16px_38px_rgba(31,35,50,0.08)] transition",
        data.running && "animate-pulse border-[#8b5cf6] shadow-[0_0_0_6px_rgba(139,92,246,0.12),0_18px_42px_rgba(91,65,180,0.18)]",
      )}
    >
      <div className="flex h-12 items-center justify-between border-b border-[#ededf2] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg text-white",
              accent === "violet" && "bg-[#7c3aed]",
              accent === "blue" && "bg-[#2563eb]",
              accent === "amber" && "bg-[#d97706]",
              accent === "slate" && "bg-[#475569]",
            )}
          >
            {data.running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          </span>
          <span className="truncate text-sm font-semibold">{data.label}</span>
          {data.locked ? <Lock size={12} className="text-[#9a9da8]" /> : null}
        </div>
        <MoreHorizontal size={15} className="text-[#9a9da8]" />
      </div>
      <div className="space-y-3 p-3">{children}</div>
    </div>
  );
}

export function PortLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-medium text-[#777a84]">{children}</span>;
}

export function OutputHandle({ id, type = "source" }: { id: string; type?: "source" | "target" }) {
  return (
    <Handle
      id={id}
      type={type}
      position={type === "source" ? Position.Right : Position.Left}
      className="!size-3.5 !border-2 !border-white !bg-[#8b5cf6]"
    />
  );
}

export type FlowNodeProps<T extends WorkflowNodeData> = NodeProps & {
  data: T;
};
