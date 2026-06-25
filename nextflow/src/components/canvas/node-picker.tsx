"use client";

import { ImageIcon, Plus, Search, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useWorkflowStore } from "@/store/workflow-store";

export function NodePicker() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const addNode = useWorkflowStore((state) => state.addNode);

  const items = [
    { kind: "cropImage" as const, label: "Crop Image", category: "Image", icon: ImageIcon },
    { kind: "gemini" as const, label: "Gemini 3.1 Pro", category: "Others", icon: Sparkles },
  ].filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
      {open ? (
        <div className="mb-3 w-[420px] overflow-hidden rounded-2xl border border-[#e4e4ea] bg-white shadow-[0_22px_70px_rgba(31,35,50,0.18)]">
          <div className="flex h-12 items-center gap-2 border-b border-[#eeeeF2] px-3">
            <Search size={16} className="text-[#8b8e98]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search nodes"
              className="h-full flex-1 text-sm outline-none"
            />
            <button onClick={() => setOpen(false)} className="flex size-8 items-center justify-center rounded-lg hover:bg-[#f5f5f8]">
              <X size={15} />
            </button>
          </div>
          <div className="flex gap-1 border-b border-[#eeeeF2] px-3 py-2 text-xs font-medium text-[#777a84]">
            {["Recent", "Image", "Video", "Audio", "Others"].map((category) => (
              <span key={category} className="rounded-full px-3 py-1 hover:bg-[#f5f5f8]">
                {category}
              </span>
            ))}
          </div>
          <div className="grid gap-2 p-3">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl border border-[#eeeeF2] p-3 text-left transition hover:border-[#c9c3ff] hover:bg-[#fbfaff]"
                  onClick={() => {
                    addNode(item.kind);
                    setOpen(false);
                  }}
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#f1efff] text-[#6d5df6]">
                    <Icon size={17} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="text-xs text-[#777a84]">{item.category}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="flex h-12 items-center gap-2 rounded-2xl border border-[#e4e4ea] bg-white/95 px-2 shadow-[0_12px_35px_rgba(31,35,50,0.12)] backdrop-blur">
        <button
          className="flex size-9 items-center justify-center rounded-xl bg-[#17171a] text-white transition hover:bg-black"
          onClick={() => setOpen((value) => !value)}
          title="Add node"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
