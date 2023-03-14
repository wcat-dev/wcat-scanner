import { ComputerVisionClient } from "@azure/cognitiveservices-computervision";
import { ApiKeyCredentials } from "@azure/ms-rest-js";
import type { ComputerVisionModels } from "@azure/cognitiveservices-computervision";

const key = process.env.COMPUTER_VISION_SUBSCRIPTION_KEY;
let endpoint = process.env.COMPUTER_VISION_ENDPOINT;

// make sure endpoint is clean
if (endpoint) {
  endpoint = endpoint.trim();
  if (!endpoint.endsWith("/")) {
    endpoint = `${endpoint}/`;
  }
}

export const computerVisionClient =
  key && endpoint
    ? new ComputerVisionClient(
        new ApiKeyCredentials({
          inHeader: { "Ocp-Apim-Subscription-Key": key.trim() },
        }),
        endpoint
      )
    : null;

export const params: ComputerVisionModels.ComputerVisionClientAnalyzeImageOptionalParams =
  {
    visualFeatures: ["Description"],
  };
