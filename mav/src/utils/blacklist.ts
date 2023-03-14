// ignore local lan urls
export const blacklistUrl = (url: string) => {
  return (
    !url ||
    (url &&
      url.startsWith("http://localhost") &&
      url.startsWith("http://127.0.0.1") &&
      url.startsWith("http://0.0.0.0") &&
      url.includes(".lan:"))
  );
};
