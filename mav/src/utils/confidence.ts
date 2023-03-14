// determine if captions are confident
export const confidentCaptions = (openCV) => {
  return (
    openCV && openCV?.captions?.length && openCV?.captions[0].confidence >= 0.55
  );
};
