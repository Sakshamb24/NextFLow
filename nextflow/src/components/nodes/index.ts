import { CropImageNode } from "@/components/nodes/crop-image-node";
import { GeminiNode } from "@/components/nodes/gemini-node";
import { RequestInputsNode } from "@/components/nodes/request-inputs-node";
import { ResponseNode } from "@/components/nodes/response-node";

export const nodeTypes = {
  requestInputs: RequestInputsNode,
  cropImage: CropImageNode,
  gemini: GeminiNode,
  response: ResponseNode,
};
