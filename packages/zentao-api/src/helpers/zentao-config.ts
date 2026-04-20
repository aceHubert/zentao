import { ZentaoRequestType } from "../types";

/**
 * 禅道配置存储对象
 */
export default class ZentaoConfig {
  /**
   * 禅道版本，例如："12.4.3"
   */
  readonly version: string;

  /**
   * 请求方式，包括 "GET" 和 "PATH_INFO"
   */
  readonly requestType: ZentaoRequestType;

  /**
   * 当请求方式为 PATH_INFO 时的参数连接字符，例如 "-"
   */
  readonly requestFix: string;

  /**
   * 当请求方式为 GET 时，模块参数名，例如 "m"
   */
  readonly moduleVar: string;

  /**
   * 当请求方式为 GET 时，方法参数名，例如 "f"
   */
  readonly methodVar: string;

  /**
   * 当请求方式为 GET 时，视图参数名，例如 "t"
   */
  readonly viewVar: string;

  /**
   * Session 变量名称，例如 "zentaosid"
   */
  readonly sessionVar: string;

  /**
   * Session 名称，例如 "zentaosid"
   */
  readonly sessionName: string;

  /**
   * Session ID，例如 "inge21mp04h95m8lo64tpp6h4c"
   */
  readonly sessionID: string;

  /**
   * Session 随机数，例如 7795
   */
  readonly random: number;

  /**
   * Session 过期时间，例如 1440
   */
  readonly expiredTime: number;

  /**
   * 服务器时间
   */
  readonly serverTime: number;

  /**
   * 创建时间
   */
  protected readonly _createTime: number;

  /**
   * Token 字符串
   */
  protected _token?: string;

  /**
   * 上次更新 Token 的时间
   */
  protected _tokenUpdateTime?: number;

  /**
   * 创建一个 ZentaoConfig 实例
   * @param config 配置对象
   * @example
   * const config = new ZentaoConfig({version: 'pro9.0.3', requestType: 'PATH_INFO', requestFix: '-', moduleVar: 'm', methodVar: 'f', viewVar: 't', sessionVar: 'zentaosid', sessionName: 'zentaosid', sessionID: '6fudr187np6d82rj23srkqt1r6', random: 5337, expiredTime: '1440', serverTime: 1615098427});
   */
  constructor(config: Record<string, any>) {
    this.version = config["version"];
    this.requestType = config["requestType"] === "GET" ? "GET" : "PATH_INFO";
    this.requestFix = config["requestFix"] ?? "-";
    this.moduleVar = config["moduleVar"] ?? "m";
    this.methodVar = config["methodVar"] ?? "f";
    this.viewVar = config["viewVar"] ?? "t";
    this.sessionVar = config["sessionVar"] ?? "zentaosid";
    this.sessionName = config["sessionName"] ?? 'zentaosid"';
    this.sessionID = config["sessionID"];
    this.random = config["random"];
    this.serverTime = config["serverTime"];
    this.expiredTime =
      typeof config["expiredTime"] === "string"
        ? Number.parseInt(config["expiredTime"], 10)
        : config["expiredTime"];
    this._tokenUpdateTime = config["_tokenUpdateTime"];
    this._token = config["_token"];
    this._createTime = Date.now();
  }

  /**
   * 获取 Token 字符串
   */
  get token(): string {
    return this._token ?? "";
  }

  /**
   * Token 验证字符串
   */
  get tokenAuth(): string {
    return `${this?.sessionName ?? ""}=${this?.sessionID ?? ""}`;
  }

  /**
   * 禅道主版本
   */
  get mainVersion(): number {
    return Number.parseInt(this.version.split(".")[0]);
  }

  /**
   * 将 Token 验证字符串更新为当前 Token
   */
  renewToken(): void {
    this._token = this.tokenAuth;
    this._tokenUpdateTime = Date.now();
  }

  /**
   * 检查当前 Token 字符串是否过期
   */
  get isTokenExpired(): boolean {
    if (!this._tokenUpdateTime) {
      return true;
    }
    return Date.now() - this._tokenUpdateTime >= (this.expiredTime - 30) * 1000;
  }
}
