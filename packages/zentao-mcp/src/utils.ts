import type { Argv, ArgumentsCamelCase } from "yargs";
import type { ZentaoClientVersion, ZentaoClientBaseOptions } from "./types";

export type ZentaoCommandArgs = ArgumentsCamelCase<Record<string, unknown>>;
export type VerifiedZentaoClientOptions<T extends ZentaoClientBaseOptions> = T &
  Required<Pick<T, "url" | "account" | "password">>;

export function getString(args: ZentaoCommandArgs, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

export function getNumber(args: ZentaoCommandArgs, key: string): number | undefined {
  const value = args[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function getBoolean(args: ZentaoCommandArgs, key: string): boolean | undefined {
  const value = args[key];
  return typeof value === "boolean" ? value : undefined;
}

export function getStringArray(args: ZentaoCommandArgs, key: string): string[] | undefined {
  const value = args[key];
  if (!Array.isArray(value)) return undefined;
  return value.map(String);
}

export function getJsonArray<T>(args: ZentaoCommandArgs, key: string): T[] | undefined {
  const value = args[key];
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string") return undefined;

  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`参数 ${key} 必须是 JSON 数组`);
  }
  return parsed as T[];
}

/** 规范化禅道客户端版本。 */
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

/** 注册 CLI 和 MCP Server 共用的禅道连接参数。 */
export function addZentaoConnectionOptions(parser: Argv): Argv {
  return parser
    .option("url", {
      type: "string",
      describe: "禅道服务器地址；未传入时读取 ZENTAO_URL",
    })
    .option("account", {
      type: "string",
      describe: "禅道用户名；未传入时读取 ZENTAO_ACCOUNT",
    })
    .option("password", {
      type: "string",
      describe: "禅道密码；未传入时读取 ZENTAO_PASSWORD",
    })
    .option("zentaoVersion", {
      type: "string",
      choices: ["legacy", "v1", "v2", "0", "1", "2"] as const,
      describe: "禅道客户端版本；未传入时读取 ZENTAO_VERSION",
    })
    .option("skipSSL", {
      type: "boolean",
      describe: "跳过 SSL 证书验证；未传入时读取 ZENTAO_SKIP_SSL",
    });
}

/** 从统一配置创建禅道客户端。 */
export function verifyZentaoClientOptions<T extends ZentaoClientBaseOptions>(
  options: T,
  sourceName: "命令行参数" | "启动参数" = "命令行参数",
): VerifiedZentaoClientOptions<T> {
  const { url, account, password } = options;

  if (!url || !account || !password) {
    throw new Error(
      [
        `请通过${sourceName}或环境变量提供禅道连接配置:`,
        "--url / ZENTAO_URL - 禅道服务器地址",
        "--account / ZENTAO_ACCOUNT - 禅道用户名",
        "--password / ZENTAO_PASSWORD - 禅道密码",
        "--zentaoVersion / ZENTAO_VERSION - 客户端版本（可选，支持 legacy / v1 / v2）",
        "--skipSSL / ZENTAO_SKIP_SSL - 是否跳过 SSL 验证（可选，自签名证书时设为 true）",
      ].join("\n"),
    );
  }
  return options as VerifiedZentaoClientOptions<T>;
}

/** 统一输出 JSON，便于 shell 管道继续处理。 */
export function printJsonResult(result: unknown): void {
  console.log(JSON.stringify(result, null, 2));
}
