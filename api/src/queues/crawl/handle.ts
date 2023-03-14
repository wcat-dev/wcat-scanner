import type { queueAsPromised } from "fastq";
import fastq from "fastq";
import { cpus } from "os";
import { crawlWebsite } from "../../core/actions/accessibility/crawl-group";
import { setWebsiteScore } from "../../core/utils/stats/score";
import type { Method } from "../../database/config";
import type { ResponseModel } from "../../core/models/response/types";

interface Meta {
  method?: Method;
  extra: any;
}

type Task = {
  userId: number; // make sure user id is sent
  url?: string;
  html?: string; // html to audit
  meta?: Meta;
};

// the async worker to use for crawling pages
async function asyncWorker(arg: Task): Promise<ResponseModel | boolean> {
  return await crawlWebsite(arg);
}

// the async worker to use for completed crawl actions. TODO: remove for collection appending raw value to score.
async function asyncWorkerCrawlComplete(arg: Task): Promise<void> {
  const { userId, meta } = arg;
  const { domain, duration, shutdown } = meta?.extra ?? {};

  setImmediate(async () => {
    await setWebsiteScore({
      domain,
      userId: Number(userId),
      duration,
      shutdown: !!shutdown,
    });
  });
}

let cwLimit = 4;

if (
  process.env.CRAWL_QUEUE_LIMIT &&
  !Number.isNaN(Number(process.env.CRAWL_QUEUE_LIMIT))
) {
  cwLimit = Number(process.env.CRAWL_QUEUE_LIMIT);
} else {
  cwLimit = Math.max(Math.floor(5 * (cpus().length || 1)), 4);
}

// crawl queue handler
export const q: queueAsPromised<Task> = fastq.promise(asyncWorker, cwLimit);

// current worker limit
export const getCWLimit = (limit = 1) =>
  Math.floor(cwLimit / (limit || 1)) || 1;

// bind the fastq to a function
export const bindTaskQ = (limit = 1): queueAsPromised<Task> =>
  fastq.promise(asyncWorker.bind({}), getCWLimit(limit));

// determine when crawl completed.
export const qWebsiteWorker: queueAsPromised<Task> = fastq.promise(
  asyncWorkerCrawlComplete,
  cwLimit * 2
);
