import { createServer } from "./rpc-server";

export const startGRPC = async () => {
  await createServer();
};
