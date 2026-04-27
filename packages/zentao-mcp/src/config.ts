import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ZentaoClientBaseOptions } from "./types";

export type ZentaoSavedConfig = Record<string, string | number | boolean | null | undefined>;
export type ZentaoConfigKey<T extends ZentaoClientBaseOptions> = Extract<keyof T, string>;
export type ZentaoConfigSource = "argument" | "config" | "env" | "unset";

export interface ZentaoConfigSpec<T extends ZentaoClientBaseOptions> {
  key: ZentaoConfigKey<T>;
  env?: string;
  parse?: (value: unknown) => T[ZentaoConfigKey<T>] | undefined;
}

export interface ZentaoConfigInspection<T extends ZentaoClientBaseOptions> {
  configFile: string;
  values: T;
  sources: Partial<Record<ZentaoConfigKey<T>, ZentaoConfigSource>>;
}

export function toConfigString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

export function toConfigBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;

  const normalizedValue = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalizedValue)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalizedValue)) return false;
  return undefined;
}

export function getZentaoConfigFilePath(): string {
  if (process.env.ZENTAO_CONFIG_FILE) {
    return process.env.ZENTAO_CONFIG_FILE;
  }

  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configHome, "zentao", "config.json");
}

export function readSavedZentaoConfig(): ZentaoSavedConfig {
  const configFile = getZentaoConfigFilePath();
  if (!fs.existsSync(configFile)) {
    return {};
  }

  const parsed = JSON.parse(fs.readFileSync(configFile, "utf8")) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`配置文件格式错误: ${configFile}`);
  }

  const rawConfig = parsed as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(rawConfig).filter(([, value]) => {
      return (
        value === null ||
        value === undefined ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      );
    }),
  ) as ZentaoSavedConfig;
}

export function writeSavedZentaoConfig(config: ZentaoSavedConfig): void {
  const configFile = getZentaoConfigFilePath();
  fs.mkdirSync(path.dirname(configFile), { recursive: true });
  fs.writeFileSync(`${configFile}.tmp`, `${JSON.stringify(config, null, 2)}\n`, {
    mode: 0o600,
  });
  fs.renameSync(`${configFile}.tmp`, configFile);
  fs.chmodSync(configFile, 0o600);
}

function resolveConfigValue<TValue>(
  argumentValue: TValue | undefined,
  savedValue: TValue | undefined,
  envValue: TValue | undefined,
): { value?: TValue; source: ZentaoConfigSource } {
  if (argumentValue !== undefined) return { value: argumentValue, source: "argument" };
  if (savedValue !== undefined) return { value: savedValue, source: "config" };
  if (envValue !== undefined) return { value: envValue, source: "env" };
  return { source: "unset" };
}

function parseConfigValue<T extends ZentaoClientBaseOptions>(
  spec: ZentaoConfigSpec<T>,
  value: unknown,
): T[ZentaoConfigKey<T>] | undefined {
  if (value === undefined || value === null) return undefined;
  return spec.parse ? spec.parse(value) : (value as T[ZentaoConfigKey<T>]);
}

export function inspectZentaoConfig<T extends ZentaoClientBaseOptions>(
  options: T,
  specs: readonly ZentaoConfigSpec<T>[],
): ZentaoConfigInspection<T> {
  const savedConfig = readSavedZentaoConfig();
  const values = { ...options };
  const sources: Partial<Record<ZentaoConfigKey<T>, ZentaoConfigSource>> = {};

  for (const spec of specs) {
    const key = spec.key;
    const resolved = resolveConfigValue(
      parseConfigValue(spec, options[key]),
      parseConfigValue(spec, savedConfig[key]),
      parseConfigValue(spec, spec.env ? process.env[spec.env] : undefined),
    );

    if (resolved.value !== undefined) {
      values[key] = resolved.value;
    }
    sources[key] = resolved.source;
  }

  return {
    configFile: getZentaoConfigFilePath(),
    values,
    sources,
  };
}

export function resolveZentaoConfig<T extends ZentaoClientBaseOptions>(
  options: T,
  specs: readonly ZentaoConfigSpec<T>[],
): T {
  return inspectZentaoConfig(options, specs).values;
}

export function updateSavedZentaoConfig(
  key: string,
  value: string | number | boolean | null,
): ZentaoSavedConfig {
  const nextConfig = {
    ...readSavedZentaoConfig(),
    [key]: value,
  };
  writeSavedZentaoConfig(nextConfig);
  return nextConfig;
}

export function removeSavedZentaoConfig(key: string): ZentaoSavedConfig {
  const nextConfig = {
    ...readSavedZentaoConfig(),
    [key]: undefined,
  };
  writeSavedZentaoConfig(nextConfig);
  return nextConfig;
}
