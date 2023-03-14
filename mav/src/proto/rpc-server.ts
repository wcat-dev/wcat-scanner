import { Server, ServerCredentials } from "@grpc/grpc-js";
import { detectImageModel } from "@app/ai";
import { getProto } from "./loader";
import { GRPC_HOST } from "../config/rpc";

let server: Server;

const SSL_ENABLED = process.env.SSL_ENABLED;
const SSL_CHANNEL_NAME = process.env.SSL_CHANNEL_NAME;

export const createServer = async () => {
  const mavProto = await getProto();
  const healthProto = await getProto("/health.proto");

  server = new Server(
    SSL_CHANNEL_NAME
      ? {
          "grpc.ssl_target_name_override": SSL_CHANNEL_NAME,
        }
      : undefined
  );

  server.addService(healthProto.health.HealthCheck.service, {
    check: (_call, callback) => {
      callback(null, { healthy: true });
    },
  });

  server.addService(mavProto.Mav.service, {
    parseImg: async (call, callback) => {
      const page = await detectImageModel(call.request);
      callback(null, page);
    },
  });

  server.bindAsync(
    GRPC_HOST,
    SSL_ENABLED
      ? ServerCredentials.createSsl(null, [], false)
      : ServerCredentials.createInsecure(),
    () => {
      server.start();
      console.log(`gRPC server running at ${GRPC_HOST}`);
    }
  );
};

export const killServer = async () => {
  const mavProto = await getProto();
  const healthProto = await getProto("/health.proto");

  server.removeService(mavProto.Mav.service);
  server.removeService(healthProto.health.HealthCheck.service);
  server.forceShutdown();
};
