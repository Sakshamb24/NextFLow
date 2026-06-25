import crypto from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const getUploadedFileUrl = (json: unknown) => {
  const data = json as {
    results?: Record<string, Array<{ ssl_url?: string; url?: string }>>;
    uploads?: Array<{ ssl_url?: string; url?: string }>;
  };
  const resultFile = Object.values(data.results ?? {})
    .flat()
    .find((file) => file.ssl_url || file.url);
  const uploadFile = data.uploads?.find((file) => file.ssl_url || file.url);
  return resultFile?.ssl_url ?? resultFile?.url ?? uploadFile?.ssl_url ?? uploadFile?.url ?? null;
};

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authKey = process.env.TRANSLOADIT_AUTH_KEY;
  const authSecret = process.env.TRANSLOADIT_AUTH_SECRET;
  if (!authKey || !authSecret) {
    return NextResponse.json({ error: "Transloadit keys are missing" }, { status: 500 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }
  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }

  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const params = JSON.stringify({
    auth: { key: authKey, expires },
    steps: {
      ":original": {
        robot: "/upload/handle",
      },
    },
  });
  const signature = `sha384:${crypto.createHmac("sha384", authSecret).update(params).digest("hex")}`;
  const uploadForm = new FormData();
  uploadForm.append("params", params);
  uploadForm.append("signature", signature);
  uploadForm.append("file", file, file.name);

  const response = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: uploadForm,
  });
  const json = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: json?.message ?? "Transloadit upload failed" },
      { status: response.status },
    );
  }

  const uploadedFileUrl = getUploadedFileUrl(json);
  if (!uploadedFileUrl) {
    return NextResponse.json(
      { error: "Transloadit did not return an uploaded file URL yet. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    url: uploadedFileUrl,
    assemblyId: json?.assembly_id,
    mime: file.type,
    name: file.name,
  });
}
