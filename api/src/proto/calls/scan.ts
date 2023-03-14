import type { sendUnaryData, ServerWritableStream } from "@grpc/grpc-js";
import { crawlMultiSite } from "../../core/actions";
import { emailMessager } from "../../core/messagers";
import { crawlEmitter, getActiveCrawlKey } from "../../event";

type ScanParams = {
  pages: string[];
  user_id: number;
  domain: string;
  full: boolean;
};

// scan finished from crawl, either single page or all pages in a list
export const scan = async (
  call: ServerWritableStream<ScanParams, {}>,
  callback: sendUnaryData<any>
) => {
  const { pages = [], user_id: userId, domain, full } = call?.request ?? {};

  // the collection of issues found for page scans.
  const data =
    (await crawlMultiSite({
      pages,
      userId,
    })) ?? [];

  // a full site wide-scan performed. Send scan event including email.
  if (full) {
    const sendEmail = crawlEmitter.emit(
      getActiveCrawlKey(domain, userId),
      domain,
      data
    );

    if (!sendEmail) {
      await emailMessager.sendMailMultiPage({
        userId,
        data,
        domain,
        sendEmail, // if the event did not emit send email from CRON job.
      });
    }
  }

  callback(null, {});
};
