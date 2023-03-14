const MIN_SCORE = 0.45;

// the classification score is low and should chain to the next detection.
export const chainNextClassifier = (predictions): boolean => {
  let next = !predictions?.length;

  if (predictions?.length) {
    const topItem = predictions[0];

    if ("score" in topItem) {
      next = topItem.score <= MIN_SCORE;
    }
    if ("probability" in topItem) {
      next = topItem.probability <= MIN_SCORE;
    }
  }

  return next;
};
