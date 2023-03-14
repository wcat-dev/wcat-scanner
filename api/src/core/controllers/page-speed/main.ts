import { connect } from "../../../database";
import { domainNameFind, websiteSearchParams } from "../../utils";

// get analytics by domain for a user with pagination offsets.
export const getPageSpeedPaging = async (p, chain?: boolean) => {
  const { userId, domain, limit = 20, offset = 0, all = false } = p ?? {};
  const [collection] = connect("PageSpeed");

  let params = {};

  if (typeof userId !== "undefined") {
    params = { userId };
  }

  if (typeof domain !== "undefined" && domain) {
    if (all) {
      params = domainNameFind(params, domain);
    } else {
      params = { ...params, domain };
    }
  }

  const pages = await collection
    .find(params)
    .skip(offset)
    .limit(limit)
    .toArray();

  return chain ? [pages, collection] : pages;
};

// PageSpeed insights by lighthouse
// returns stringified json results if found.
export const PageSpeedController = () => ({
  getWebsite: async (
    {
      pageUrl,
      userId,
      domain,
      all = false,
    }: { pageUrl?: string; userId?: number; domain?: string; all?: boolean },
    chain?: boolean
  ) => {
    const [collection] = connect("PageSpeed");
    const searchProps = websiteSearchParams({
      pageUrl,
      userId,
      domain,
      all,
    });

    let insights = null;

    if (Object.keys(searchProps).length) {
      insights = await collection.findOne(searchProps);
    }

    return chain ? [insights, collection] : insights;
  },
  // get page speed by domain relating to a website.
  getWebsitePageSpeed: async ({
    userId,
    domain,
    pageUrl,
  }: {
    userId?: number;
    domain?: string;
    pageUrl?: string;
  }) => {
    const [collection] = connect("PageSpeed");
    const searchProps = websiteSearchParams({ pageUrl, domain, userId });

    return await collection.findOne(searchProps);
  },
  getPageSpeedPaging,
});
