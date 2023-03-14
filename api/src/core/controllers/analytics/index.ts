import { validateUID } from "../../../web/params/extracter";
import { connect } from "../../../database";
import { domainNameFind, websiteSearchParams } from "../../utils";
import type { Analytic } from "../../../types/schema";
import { Collection, Document } from "mongodb";

// analytics base params
type BaseParams = {
  userId?: number;
  domain?: string;
  pageUrl?: string;
};

// get analytics by domain for a user with pagination offsets.
export const getAnalyticsPaging = async (
  params,
  chain?: boolean
): Promise<[Analytic[], Collection<Document>] | Analytic[]> => {
  const { userId, domain, limit = 20, offset = 0, all = false } = params ?? {};
  const [collection] = connect("Analytics");

  let filters = {};

  if (validateUID(userId)) {
    filters = { userId };
  }

  if (typeof domain !== "undefined" && domain) {
    if (all) {
      filters = domainNameFind(filters, domain);
    } else {
      filters = { ...filters, domain };
    }
  }

  try {
    const pages = (await collection
      .find(filters)
      .skip(offset)
      .limit(limit)
      .toArray()) as Analytic[];

    return chain ? [pages, collection] : pages;
  } catch (e) {
    console.error(e);
    return chain ? [[], collection] : [];
  }
};

// Page analytics for simple error stats
export const AnalyticsController = ({ user } = { user: null }) => ({
  getWebsite: async (
    { pageUrl, userId, domain, bypass }: BaseParams & { bypass?: boolean },
    chain?: boolean
  ) => {
    const [collection] = connect("Analytics");
    const searchProps = websiteSearchParams({ pageUrl, userId, domain });

    let analytics = null;

    if (validateUID(userId) || bypass) {
      analytics = await collection.findOne(searchProps);
    }

    return chain ? [analytics, collection] : analytics;
  },
  getWebsiteAnalytics: async ({ userId, domain }: BaseParams) => {
    const [collection] = connect("Analytics");
    const searchProps = websiteSearchParams({ domain, userId });

    return validateUID(userId)
      ? await collection.find(searchProps).limit(0).toArray()
      : [];
  },
  getAnalytics: async ({ userId, pageUrl }: BaseParams) => {
    const [collection] = connect("Analytics");
    const searchProps = websiteSearchParams({ pageUrl, userId });

    return validateUID(userId)
      ? await collection.find(searchProps).limit(20).toArray()
      : [];
  },
  getAnalyticsPaging,
});
