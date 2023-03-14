export const extractText = (model) => {
  // build top results to api as one alt
  const linesOfText = [];

  model?.regions?.forEach((region) => {
    region?.lines?.forEach((line) => {
      line?.words?.forEach((word) => {
        if (word.text) {
          linesOfText.push(word.text);
        }
      });
    });
  });

  if (linesOfText.length) {
    return {
      captions: [{ confidence: 1, className: linesOfText.join(" ") }],
    };
  }

  return null;
};
