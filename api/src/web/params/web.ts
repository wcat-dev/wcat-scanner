import { FastifyContext } from "apollo-server-fastify";
import { paramParser } from "./extracter";

// extract params for website configuration
export const getWebParams = (req: FastifyContext["request"]) => {
  const url = paramParser(req, "url");
  const customHeaders = paramParser(req, "customHeaders");
  const mobile = paramParser(req, "mobile");
  const pageInsights = paramParser(req, "pageInsights");
  const ua = paramParser(req, "ua");
  const standard = paramParser(req, "standard");
  const actions = paramParser(req, "actions");
  const robots = paramParser(req, "robots");
  const subdomains = paramParser(req, "subdomains");
  const sitemap = paramParser(req, "sitemap");
  const tld = paramParser(req, "tld");
  const ignore = paramParser(req, "ignore");
  const monitoringEnabled = paramParser(req, "monitoringEnabled");

  return {
    url,
    customHeaders,
    mobile,
    pageInsights,
    ua,
    standard,
    actions,
    robots,
    subdomains,
    tld,
    ignore,
    sitemap,
    monitoringEnabled,
  };
};
