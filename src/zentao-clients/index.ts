import type { ZentaoConfig } from "../types";
import {
  type IZentaoClient,
  type ZentaoClientVersion,
} from "./client.interface";
import { ZentaoClientLegacy } from "./client-legacy";
import { ZentaoClientV1 } from "./client-v1";
import { ZentaoClientV2 } from "./client-v2";

export function normalizeZentaoVersion(version?: string): ZentaoClientVersion {
  const normalized = version?.trim().toLowerCase();
  if (normalized === "v0" || normalized === "0" || normalized === "legacy") {
    return "legacy";
  } else if (normalized === "v1" || normalized === "1") {
    return "v1";
  } else if (!normalized || normalized === "v2" || normalized === "2") {
    return "v2";
  }
  throw new Error(`不支持的 ZENTAO_VERSION: ${version}`);
}

export function createZentaoClient(
  config: ZentaoConfig,
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
export type { IZentaoClient, ZentaoClientVersion };
