import { setBackend, enableProdMode } from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-wasm";
import { startGRPC } from "./proto/init";

if (process.env.NODE_ENV === "production") {
  enableProdMode();
}

startGRPC()
  .then(() => {
    setBackend("wasm").catch((e) => {
      console.warn("Wasm backend error:", e);
    });
  })
  .catch((e) => {
    console.error(e);
    process.exit(1); // exit if gRPC failed to start.
  });
