import { getHostName } from "@a11ywatch/website-source-builder";
import { performance } from "perf_hooks";
import { bindTaskQ, getCWLimit } from "../queues/crawl/handle";
import { qWebsiteWorker } from "../queues/crawl";
import { crawlTrackingEmitter } from "./emitters/crawl";
import { domainName } from "../core/utils";
import type { ScanRpcCall } from "../proto/calls/scan-stream";

// crawling set per website
type CrawlSet = {
  total: number; // total pages
  current: number; // current page number
  crawling: boolean; // active crawl
  shutdown: boolean; // crawl shutdown
  duration: number; // the crawl duration
  event: ReturnType<typeof bindTaskQ>; // queue
};

// track when a new website starts and determine page completion
export const crawlingSet = new Map<string, CrawlSet>();

// handle hostname assign from domain or pages
const extractHostname = (domain?: string, pages?: string[]) =>
  domainName(getHostName(pages && pages.length === 1 ? pages[0] : domain));

// get a key for the event based on domain and uid.
export const getKey = (domain, pages, user_id) =>
  `${extractHostname(domain, pages)}-${user_id || 0}`;

// rebind the number of concurrency per object
const rebindConcurrency = async () => {
  const newLimit = getCWLimit(crawlingSet.size || 1);

  for (const item of crawlingSet.values()) {
    const itemEvent = item && item?.event;

    if (itemEvent && itemEvent?.concurrency > newLimit) {
      const q = itemEvent.getQueue();
      itemEvent.killAndDrain();
      await itemEvent.drained(); // wait till drained
      item.event.concurrency = newLimit;
      for (let j = 0; j < q.length; j++) {
        await itemEvent.unshift(q[j]);
      }
    } else if (itemEvent && itemEvent?.concurrency !== newLimit) {
      item.event.concurrency = newLimit;
    }
  }
};

// de-init crawling
const deInit = async (key, target, { duration, shutdown }: CrawlSet) => {
  crawlingSet.delete(key);
  crawlTrackingEmitter.emit(`crawl-complete-${key}`, target);

  const params = {
    userId: target.user_id,
    meta: {
      extra: {
        domain: extractHostname(target.domain),
        duration: performance.now() - duration,
        shutdown: shutdown,
      },
    },
  };

  await rebindConcurrency(); // rebind event queue and increment limit
  await qWebsiteWorker.push(params);
};

// init crawling
const crawlStart = (target) => {
  setImmediate(() => {
    const key = getKey(target.domain, target.pages, target.user_id);
    // set the item for tracking
    if (!crawlingSet.has(key)) {
      crawlingSet.set(key, {
        total: 0,
        current: 0,
        crawling: true,
        shutdown: false,
        duration: performance.now(),
        event: bindTaskQ(crawlingSet.size + 1), // add 1 to include new item
      });
    }
  });
};

// complete crawl
const crawlComplete = (target) => {
  setImmediate(async () => {
    const key = getKey(target.domain, target.pages, target.user_id);

    if (crawlingSet.has(key)) {
      const item = crawlingSet.get(key);
      item.crawling = false;

      if (item.current === item.total) {
        await deInit(key, target, item);
      }
    }
  });
};

// gRPC call
const crawlProcessing = (call: ScanRpcCall) => {
  setImmediate(async () => {
    const key = getKey(
      call.request.domain,
      call.request.pages,
      call.request.user_id
    ); // process a new item tracking count

    if (crawlingSet.has(key)) {
      const item = crawlingSet.get(key);

      item.total += 1;

      if (item.shutdown) {
        call.write({ message: "shutdown" });
        await deInit(key, call.request, item);
      }
    }

    call.end();
  });
};

// crawl finished processing the page
const crawlProcessed = (target) => {
  setImmediate(async () => {
    // process a new item tracking count
    const key = getKey(target.domain, target.pages, target.user_id);

    if (crawlingSet.has(key)) {
      const item = crawlingSet.get(key);

      item.current += 1;

      // shutdown the events
      if (target.shutdown) {
        item.shutdown = true;
        item.crawling = false;
      }

      if (!item.crawling && item.current === item.total) {
        await deInit(key, target, item);
      }
    }
  });
};

/*  Emit events to track crawling progress.
 *  This mainly tracks at a higher level the progress between the gRPC crawling across modules.
 *  @param url: scope the events to track one domain
 */
export const establishCrawlTracking = () => {
  // track when crawl has started
  crawlTrackingEmitter.on("crawl-start", crawlStart);
  // track when the crawler has processed the pages and sent.
  crawlTrackingEmitter.on("crawl-complete", crawlComplete);
  // track total amount of pages in a website via gRPC.
  crawlTrackingEmitter.on("crawl-processing", crawlProcessing);
  // track the amount of pages the website should have and determine if complete.
  crawlTrackingEmitter.on("crawl-processed", crawlProcessed);
};
