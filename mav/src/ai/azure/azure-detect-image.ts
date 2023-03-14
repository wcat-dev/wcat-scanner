import type { ComputerVisionModels } from "@azure/cognitiveservices-computervision";
import { base64Replacer } from "base64-to-tensor";
import { blacklistUrl } from "../../utils/blacklist";
import { logError } from "./log";
import { computerVisionClient, params } from "./client";
import { extractText } from "./extract-text";

/**
 * @param url Publicly reachable URL of an image or base64 string.
 */
export function computerVision(
  url: string,
  base64?: string
): Promise<ComputerVisionModels.ImageDescriptionDetails> {
  return new Promise(async (resolve) => {
    if (!computerVisionClient || (!url && !base64)) {
      return resolve(null);
    }
    let model;

    if (!blacklistUrl(url)) {
      try {
        model = await computerVisionClient.describeImage(url, params);
      } catch (e) {
        logError(e);
      }
    }

    // retry as local image.
    if (!model && base64) {
      const stripBase64 = Buffer.from(base64Replacer(base64), "base64");

      try {
        model = await computerVisionClient.describeImageInStream(
          stripBase64,
          params
        );
      } catch (e) {
        logError(e);
      }

      const requiresOcr =
        model &&
        model.tags?.includes("text") &&
        model.captions?.length &&
        model.captions[0].text === "text" &&
        model.captions[0].confidence >= 0.9;

      // retry with ocr text
      if (requiresOcr) {
        try {
          model = await computerVisionClient.recognizePrintedTextInStream(
            true,
            stripBase64
          );
        } catch (e) {
          logError(e);
        }

        if (model) {
          // build top results to api as one alt
          model = extractText(model);
        }
      }
    }

    resolve(model);
  });
}
