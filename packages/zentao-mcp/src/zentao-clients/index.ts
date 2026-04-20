import { ZentaoClientLegacy } from "./client-legacy";
import { ZentaoClientV1 } from "./client-v1";
import { ZentaoClientV2 } from "./client-v2";
import type { IZentaoClient, ZentaoClientVersion, ZentaoClientConfig } from "../types";

export function createZentaoClient(
  config: ZentaoClientConfig,
  version: ZentaoClientVersion,
): IZentaoClient {
  if (version === "legacy") {
    return new ZentaoClientLegacy(config);
  }

  if (version === "v1") {
    return new ZentaoClientV1(config);
  }

  return new ZentaoClientV2(config);
}

export { ZentaoClientLegacy, ZentaoClientV1, ZentaoClientV2 };
