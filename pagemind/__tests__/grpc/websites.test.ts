import {
  createClient,
  killClient,
  controller,
} from "@app/proto/website-client";
import { createServer, killServer } from "@app/proto/grpc-server";

const { scan } = controller;

describe("gRPC websites", () => {
  beforeAll(async () => {
    await createServer();
    await createClient();
  });
  afterAll(async () => {
    await killClient();
    await killServer();
  });
  test.skip("scan website", async () => {
    const { webPage } = await scan("https://scanner.wcat.dev");

    expect(webPage).toBeTruthy();
  });
});
