"use client";

import { Plus, Upload } from "lucide-react";
import { useState } from "react";
import { NodeShell, OutputHandle, PortLabel, type FlowNodeProps } from "@/components/nodes/node-shell";
import { useWorkflowStore } from "@/store/workflow-store";
import type { RequestInputsData } from "@/types/workflow";

export function RequestInputsNode({ id, data }: FlowNodeProps<RequestInputsData>) {
  const updateRequestField = useWorkflowStore((state) => state.updateRequestField);
  const addRequestField = useWorkflowStore((state) => state.addRequestField);
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  const uploadImage = async (fieldId: string, file: File) => {
    const localPreviewUrl = URL.createObjectURL(file);
    updateRequestField(id, fieldId, "", localPreviewUrl);
    setUploadingFieldId(fieldId);
    setUploadErrors((errors) => ({ ...errors, [fieldId]: "" }));
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/uploads/transloadit", { method: "POST", body: form });
      const json = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !json.url) throw new Error(json.error ?? "Upload failed");
      updateRequestField(id, fieldId, json.url, json.url);
    } catch (error) {
      setUploadErrors((errors) => ({
        ...errors,
        [fieldId]: error instanceof Error ? error.message : "Upload failed",
      }));
    } finally {
      setUploadingFieldId(null);
    }
  };

  return (
    <NodeShell data={data} accent="slate">
      <div className="space-y-2">
        {data.fields.map((field) => (
          <div key={field.id} className="relative rounded-lg border border-[#ececf1] bg-[#fbfbfd] p-2">
            <OutputHandle id={`out-${field.id}`} />
            <div className="mb-1 flex items-center justify-between">
              <PortLabel>{field.name}</PortLabel>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[#7a7d87]">
                {field.type === "image_field" ? "image" : "text"}
              </span>
            </div>
            {field.type === "image_field" ? (
              <>
                <label className="flex h-20 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-[#d8d8e0] bg-white text-[#8b8e98]">
                  {field.previewUrl ? (
                    <div className="relative h-full w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={field.previewUrl} alt={field.name} className="h-full w-full object-cover" />
                      {uploadingFieldId === field.id ? (
                        <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[10px] font-medium text-white">
                          Uploading
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs">
                      <Upload size={14} />
                      {uploadingFieldId === field.id ? "Uploading" : "Upload preview"}
                    </div>
                  )}
                  <input
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (file) void uploadImage(field.id, file);
                    }}
                  />
                </label>
                {uploadErrors[field.id] ? (
                  <div className="mt-1 rounded-md bg-[#fff0f0] px-2 py-1 text-[10px] text-[#b42318]">
                    {uploadErrors[field.id]}
                  </div>
                ) : field.previewUrl?.startsWith("blob:") ? (
                  <div className="mt-1 rounded-md bg-[#fff8e6] px-2 py-1 text-[10px] text-[#8a5a00]">
                    Local preview only. Wait for upload before running Crop Image.
                  </div>
                ) : null}
              </>
            ) : (
              <textarea
                className="h-20 w-full resize-none rounded-md border border-[#e1e1e8] bg-white p-2 text-xs leading-5 outline-none"
                value={field.value ?? ""}
                onChange={(event) => updateRequestField(id, field.id, event.currentTarget.value)}
              />
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#e2e2e8] text-xs font-medium text-[#595c66] hover:bg-[#f7f7fa]"
          onClick={() => addRequestField(id, "text_field")}
        >
          <Plus size={13} />
          Text
        </button>
        <button
          className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#e2e2e8] text-xs font-medium text-[#595c66] hover:bg-[#f7f7fa]"
          onClick={() => addRequestField(id, "image_field")}
        >
          <Plus size={13} />
          Image
        </button>
      </div>
    </NodeShell>
  );
}
