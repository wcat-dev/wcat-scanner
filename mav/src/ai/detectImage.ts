import { classify } from "tensornet";
import { computerVision } from "./azure/azure-detect-image";
import { chainNextClassifier } from "../utils/chain-next";
import { confidentCaptions } from "../utils/confidence";
import type { ClassifyModelType, ImageConfig } from "./config";

// Determine the alt tag from a base64 or url
export const detectImageModel = async (
  config: ImageConfig
): Promise<ClassifyModelType> => {
  let predictions = [];

  try {
    const classification = config.img && (await classify(config.img));
    if (classification && classification?.length) {
      predictions = classification;
    }
  } catch (e) {
    console.error(e);
  }

  if (chainNextClassifier(predictions)) {
    let openCV;
    try {
      openCV = await computerVision(config.url, config.img);
    } catch (e) {
      console.error(e);
    }
    if (openCV && confidentCaptions(openCV)) {
      predictions = openCV.captions;
    }
  }

  const source = predictions?.length && predictions[0]; // top prediction

  return {
    className: source?.className || source?.text || "",
    probability: source?.probability || source?.confidence || 0,
  };
};
