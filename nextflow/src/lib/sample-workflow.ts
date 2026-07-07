import type { PortType, WorkflowDocument, WorkflowEdge, WorkflowNode } from "@/types/workflow";

export const candidateLinkedIn =
  process.env.NEXT_PUBLIC_CANDIDATE_LINKEDIN ??
  "https://www.linkedin.com/in/your-linkedin-profile";

export const createBlankWorkflow = (id = crypto.randomUUID()): WorkflowDocument => {
  const now = new Date().toISOString();

  return {
    id,
    name: "Untitled ILM workflow",
    status: "draft",
    createdAt: now,
    updatedAt: now,
    nodes: [
      {
        id: "request-inputs",
        type: "requestInputs",
        position: { x: -420, y: 80 },
        deletable: false,
        data: {
          kind: "requestInputs",
          label: "Request-Inputs",
          locked: true,
          fields: [
            {
              id: "text_field",
              name: "text_field",
              type: "text_field",
              value: "",
            },
            {
              id: "image_field",
              name: "image_field",
              type: "image_field",
              value: "",
              previewUrl: "",
            },
          ],
        },
      },
      {
        id: "response",
        type: "response",
        position: { x: 880, y: 300 },
        deletable: false,
        data: {
          kind: "response",
          label: "Response",
          locked: true,
          captured: "Final output will appear here.",
        },
      },
    ],
    edges: [],
    runs: [],
  };
};

export const createRequiredSampleWorkflow = (): WorkflowDocument => {
  const workflow = createBlankWorkflow("sample-ilm-workflow");
  const baseRequestNode = workflow.nodes[0];
  if (baseRequestNode.data.kind !== "requestInputs") {
    throw new Error("Sample workflow requires a Request-Inputs starter node.");
  }

  const requestInputs = {
    ...baseRequestNode,
    position: { x: -520, y: 160 },
    data: {
      ...baseRequestNode.data,
      fields: baseRequestNode.data.fields.map((field) =>
        field.id === "text_field"
          ? {
              ...field,
              value:
                "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.",
            }
          : field,
      ),
    },
  } satisfies WorkflowNode;

  const nodes: WorkflowNode[] = [
    requestInputs,
    {
      id: "crop-1",
      type: "cropImage",
      position: { x: -170, y: 50 },
      data: {
        kind: "cropImage",
        label: "Crop Image #1",
        params: { x: 20, y: 20, width: 60, height: 60 },
      },
    },
    {
      id: "crop-2",
      type: "cropImage",
      position: { x: -170, y: 365 },
      data: {
        kind: "cropImage",
        label: "Crop Image #2",
        params: { x: 0, y: 0, width: 100, height: 50 },
      },
    },
    {
      id: "gemini-1",
      type: "gemini",
      position: { x: 230, y: -20 },
      data: {
        kind: "gemini",
        label: "Gemini 3.1 Pro #1",
        model: "gemini-3.1-pro",
        inputs: {
          systemPrompt:
            "You are a marketing copywriter. Write a one-paragraph product description.",
        },
        settingsCollapsed: true,
      },
    },
    {
      id: "gemini-2",
      type: "gemini",
      position: { x: 230, y: 320 },
      data: {
        kind: "gemini",
        label: "Gemini 3.1 Pro #2",
        model: "gemini-3.1-pro",
        inputs: {
          systemPrompt:
            "Condense the following product description into a tweet-length hook under 240 characters.",
        },
        settingsCollapsed: true,
      },
    },
    {
      id: "gemini-final",
      type: "gemini",
      position: { x: 630, y: 170 },
      data: {
        kind: "gemini",
        label: "Gemini 3.1 Pro #3 (Final)",
        model: "gemini-3.1-pro",
        inputs: {
          systemPrompt:
            "You are a social media manager. Combine the tweet hook and the two product crops into a final marketing post.",
        },
        settingsCollapsed: true,
      },
    },
    { ...workflow.nodes[1], position: { x: 1020, y: 290 } },
  ];

  const edge = (
    id: string,
    source: string,
    sourceHandle: string,
    target: string,
    targetHandle: string,
    type: PortType,
  ): WorkflowEdge => ({
    id,
    source,
    sourceHandle,
    target,
    targetHandle,
    animated: true,
    data: { sourceType: type, targetType: type },
    style: { stroke: "#8b5cf6", strokeWidth: 1.5 },
  });

  return {
    ...workflow,
    name: "ILM Product Marketing Sample",
    status: "ready",
    nodes,
    edges: [
      edge("e-image-crop-1", "request-inputs", "out-image_field", "crop-1", "in-inputImage", "image"),
      edge("e-image-crop-2", "request-inputs", "out-image_field", "crop-2", "in-inputImage", "image"),
      edge("e-text-gemini-1", "request-inputs", "out-text_field", "gemini-1", "in-prompt", "text"),
      edge("e-gemini-1-gemini-2", "gemini-1", "out-response", "gemini-2", "in-prompt", "text"),
      edge("e-crop-1-final", "crop-1", "out-image", "gemini-final", "in-image", "image"),
      edge("e-crop-2-final", "crop-2", "out-image", "gemini-final", "in-image", "image"),
      edge("e-gemini-2-final", "gemini-2", "out-response", "gemini-final", "in-prompt", "text"),
      edge("e-final-response", "gemini-final", "out-response", "response", "in-result", "text"),
    ],
  };
};
