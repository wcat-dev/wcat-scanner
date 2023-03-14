import { URL } from "url";

// remove this for website-builder package
export const getHostName = (url: string) => {
  if (!url) {
    return "";
  }
  let q = decodeURIComponent(url);
  if (!/^(http|https)/.test(q)) {
    if (q.startsWith("://")) {
      q = `https${q}`;
    } else {
      q = `https://${q}`;
    }
  }

  try {
    return new URL(q).hostname;
  } catch (e) {
    console.error(`invalid url ${q} \n ${e}`);
  }
};
