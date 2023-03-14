import { URL } from "url";
import { logError } from "./log";

// randomized name. TODO: remove
export const randomFileName = (url: string) => {
  // inline file missing alt randomized name [TODO: seed]
  let baseP = `tmp_${Math.random()}`;

  try {
    const host = new URL(url);

    if (host) {
      const hs = host.pathname.split("/");
      hs.pop();
      const targetPath = `${host.hostname}${hs[0]}`;
      baseP = `${targetPath}`;
    }
  } catch (e) {
    logError(e);
  }

  return baseP;
};
