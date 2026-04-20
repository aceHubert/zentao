import axios, { AxiosResponse } from "axios";
import Configstore from "configstore";
import https from "https";
import kleur from "kleur";
import querystring from "querystring";
import {
  ZentaoLegacyApiResponse,
  ZentaoLegacyOptions,
  ZentaoRequestMethod,
  ZentaoRequestParamPair,
  ZentaoRequestParams,
  ZentaoResponseType,
  ZentaoRequestType,
} from "../types";
import { formatZentaoUrl, normalizeRequestParams, slimmingObject } from "../utils";
import ZentaoConfig from "./zentao-config";
import ZentaoRequestBuilder from "./zentao-request-builder";

/**
 * 禅道请求类
 *
 * @example
 * import { Zentao } from 'zentao-api';
 * const zentao = new Zentao({
 *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
 * });
 * // TODO: 使用 zentao 调用其他 API
 */
export default class Zentao {
  /**
   * 当前服务器和登录账号标识字符串
   */
  private readonly _identifier: string;

  /**
   * 是否将 token 存储到本地，如果设置为 `false`，则每次创建新的 `Zentao` 实例都会在首次调用 API 之前重新获取 Token
   */
  private readonly _preserveToken: boolean;

  /**
   * 当前实例名称
   */
  private readonly _sessionName: string;

  /**
   * 禅道服务器地址
   */
  private readonly _url: string;

  /**
   * 登录账号
   */
  private readonly _account: string;

  /**
   * 登录密码
   */
  private readonly _password: string;

  /**
   * 是否校验 SSL 证书
   */
  private readonly _rejectUnauthorized?: boolean;

  /**
   * 如果设置为 `true`，则会在控制台输出详细日志
   */
  private _debug: boolean;

  /**
   * 禅道配置
   */
  private _config?: ZentaoConfig;

  /**
   * 本地存储管理对象
   */
  private _store?: Configstore;

  /**
   * 用户指定的请求方式
   */
  private _userRequestType?: ZentaoRequestType;

  /**
   * 构造一个禅道 API 请求对象
   * @param {ZentaoLegacyOptions} [options] 选项，用于指定服务器地址、账号和密码以及 API 调用相关设置
   * @example
   * import { Zentao } from 'zentao-api';
   * const zentao = new Zentao({
   *     url: 'https://pro.demo.zentao.net/', // 禅道服务器地址
   *     account: 'demo',                     // 用户账号
   *     password: '123456',                  // 用户密码
   *     accessMode: 'GET',                   // 请求方式
   *     preserveToken: true,                 // 是否将 token 存储到本地，如果设置为 `false`，则每次创建新的 `Zentao` 实例都会在首次调用 API 之前重新获取 Token
   *     debug: true,                         // 如果设置为 `true`，则会在控制台输出详细日志
   * });
   * // TODO: 使用 zentao 调用其他 API
   */
  constructor(options: ZentaoLegacyOptions) {
    this._debug = options.debug ?? false;

    this._url = formatZentaoUrl(options.url);
    this._account = options.account;
    this._password = options.password;
    this._rejectUnauthorized = options.rejectUnauthorized;

    // 创建账号标识
    this._identifier = `${this.account}@${this._url}`;

    // Zentao 实例名称
    this._sessionName = `ZENTAO-API::${options.sessionName ?? this._identifier}`;

    this._userRequestType = options.accessMode;
    this._preserveToken = options.preserveToken ?? true;

    if (this._debug) {
      console.log(
        [
          `${kleur.yellow("▶︎")} ${kleur.bold().blue(this._sessionName)} ${kleur.yellow("◀︎")}`,
          `    url: ${kleur.magenta(this.url)}`,
          `    account: ${kleur.magenta(this.account)}`,
          `    password: ${kleur.magenta(this.password)}`,
          `    preserveToken: ${kleur.magenta(`${this._preserveToken}`)}`,
          `    sessionName: ${kleur.magenta(this._sessionName)}`,
          `    identifier: ${kleur.magenta(this._identifier)}`,
          `    requestType: ${kleur.magenta(this.requestType)}`,
        ].join("\n"),
      );
    }

    // 从本地存储加载禅道配置
    if (this._preserveToken) {
      this._store = new Configstore(this._sessionName, {});
      const configFromStore = this._store.get("config");
      if (configFromStore) {
        this._config = new ZentaoConfig(configFromStore);

        if (this._debug) {
          console.log(
            [
              kleur.bold(
                `\n${kleur.gray("➡︎")} ${kleur
                  .bold()
                  .blue("Load zentao config from local storage")}`,
              ),
              `  ${JSON.stringify(configFromStore)}`,
            ].join("\n"),
          );
        }
      }
    }
  }

  /**
   * 禅道服务器地址
   */
  get url(): string {
    return this._url;
  }

  /**
   * 当前实例名称
   */
  get sessionName(): string {
    return this._sessionName;
  }

  /**
   * 当前服务器和账号标识
   */
  get identifier(): string {
    return this._identifier;
  }

  /**
   * 当前用户账号
   */
  get account(): string {
    return this._account;
  }

  /**
   * 登录密码
   */
  get password(): string {
    return this._password;
  }

  /**
   * 请求方式
   */
  get requestType(): ZentaoRequestType {
    return this._userRequestType ?? this._config?.requestType ?? "GET";
  }

  /**
   * 当前用于验证的 Token 字符串
   */
  get token(): string {
    return this._config?.token ?? "";
  }

  /**
   * 登录到禅道并更新用于请求 API 的 token，通常不需要手动调用此方法，在调用 API 时会自动判断 token 是否可用，如果不可用会自动调用此方法
   *
   * @returns 返回请求结果，当登录成功时，其中 `result` 字段为所登录的用户信息对象
   * @example
   * import { Zentao } from 'zentao-api';
   * const zentao = new Zentao({
   *     url: 'https://pro.demo.zentao.net/', account: 'demo', password: '123456'
   * });
   * const result = await zentao.login();
   * const user = result.result; // 获取当前登录的用户对象
   * console.log('当前登录的用户名称为：', user.realname);
   */
  async login(): Promise<ZentaoLegacyApiResponse> {
    await this.fetchConfig();

    const res = await this.m("user")
      .f("login")
      .useConverter((remoteData, result) => {
        if (remoteData.user) {
          result.result = remoteData.user;
        }
        return result;
      })
      .post({ account: this.account, password: this.password });

    return res;
  }

  /**
   * 获取禅道服务器配置
   * @returns 禅道服务器配置
   */
  async fetchConfig(): Promise<ZentaoConfig> {
    const url = `${this._url}/?mode=getconfig`;
    try {
      const resp =
        this._rejectUnauthorized === false
          ? await axios.get(url, {
              httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            })
          : await axios.get(url);

      const config = new ZentaoConfig(resp.data);
      this._config = config;

      this._log("fetchConfig", { resp });
    } catch (error) {
      this._log("fetchConfig", { url, error });
      throw error;
    }

    return this._config;
  }

  /**
   * 根据模块名创建一个禅道请求构建实例
   * @param moduleName 模块名
   * @param methodName 方法名
   * @param params 请求参数
   * @returns 禅道请求构建实例
   */
  module(
    moduleName: string,
    methodName?: string,
    params?: ZentaoRequestParams,
  ): ZentaoRequestBuilder {
    return new ZentaoRequestBuilder(this, moduleName, methodName, params);
  }

  /**
   * 根据模块名创建一个禅道请求构建实例
   * @param moduleName 模块名
   * @param methodName 方法名
   * @param params 请求参数
   * @returns 禅道请求构建实例
   * @alias module
   */
  m(moduleName: string, methodName?: string, params?: ZentaoRequestParams): ZentaoRequestBuilder {
    return this.module(moduleName, methodName, params);
  }

  /**
   * 向禅道服务器发起请求
   * @param moduleName 模块名
   * @param methodName 方法名
   * @param options 其他请求选项
   * @returns 请求结果
   */
  async request(
    moduleName: string,
    methodName: string = "index",
    options: {
      params?: ZentaoRequestParams;
      data?: string | Record<string, any>;
      name?: string;
      method?: ZentaoRequestMethod;
      url?: string;
      viewType?: string;
      responseType?: ZentaoResponseType;
      resultConvertor?: (
        remoteData: any,
        result: ZentaoLegacyApiResponse,
      ) => ZentaoLegacyApiResponse;
      fields?: string[];
    } = {},
  ): Promise<ZentaoLegacyApiResponse> {
    if (
      (!this._config || this._config?.isTokenExpired) &&
      `${moduleName}/${methodName}`.toLowerCase() !== "user/login"
    ) {
      await this.login();
    }

    if (!this._config) {
      throw new Error(
        `Zentao config is empty, makesure to fetch config before request from ${moduleName}-${methodName}.`,
      );
    }

    const params = normalizeRequestParams(options.params);
    const url = options.url ?? this.createUrl(moduleName, methodName, params, options.viewType);
    const name =
      options.name ?? `${moduleName}${methodName[0].toUpperCase()}${methodName.substr(1)}`;
    const method = options.method ?? "GET";
    const headers = {
      Cookie: this._config.tokenAuth,
    };

    let { data } = options;
    if (data && typeof data === "object") {
      const formData: Record<string, any> = {};
      for (const key of Object.keys(data)) {
        const value = data[key];
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            formData[`${key}[${index}]`] = item;
          });
          delete data[key];
        } else {
          formData[key] = value;
        }
      }
      data = querystring.stringify(formData);
    }

    try {
      const requestConfig = {
        method,
        url,
        data,
        headers,
        responseType: options.responseType,
      };

      const resp = await axios.request(
        this._rejectUnauthorized === false
          ? {
              ...requestConfig,
              httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            }
          : requestConfig,
      );

      let result: ZentaoLegacyApiResponse;
      const remoteData = resp.data;
      if (typeof remoteData === "object" && remoteData !== null) {
        if (
          typeof remoteData.data === "string" &&
          (remoteData.data[0] === "[" || remoteData.data[0] === "{")
        ) {
          remoteData.data = JSON.parse(remoteData.data);
        }

        const success = remoteData.status === "success" || remoteData.result === "success";
        result = {
          status: success ? 1 : 0,
          msg: remoteData.message ?? (success ? "success" : "error"),
          result: remoteData.data ?? remoteData.result,
        };
      } else {
        result = { status: 0, msg: "error", result: resp.data };
      }

      if (options.resultConvertor) {
        result = options.resultConvertor(remoteData, result);
      }

      if (options.fields && typeof result.result === "object" && result.result) {
        if (Array.isArray(result.result)) {
          result.result = result.result.map((x) => slimmingObject(x, options.fields!));
        } else {
          result.result = slimmingObject(result.result, options.fields!);
        }
      }

      if (`${moduleName}/${methodName}` === "user/login" && result.status === 1) {
        this._config?.renewToken();
        if (this._preserveToken) {
          this._store?.set("config", this._config);
        }
      }

      this._log(name, { url, result, params, data, resp });
      return result;
    } catch (error) {
      this._log(name, { url, error, params, data });
      throw error;
    }
  }

  /**
   * 生成请求地址
   * @param moduleName 模块名
   * @param methodName 方法名
   * @param params 其他参数
   * @returns 请求地址
   */
  createUrl(
    moduleName: string,
    methodName: string = "index",
    params?: ZentaoRequestParamPair[],
    viewType: string = "json",
  ): string {
    const config = this._config;
    if (!config) {
      throw new Error("Zentao config is empty, makesure fetch config before call others api.");
    }

    const urlParts: string[] = [this.url];
    if (this.requestType === "PATH_INFO") {
      urlParts.push(moduleName, config.requestFix, methodName);
      if (params) {
        for (const paramPair of params) {
          urlParts.push(config.requestFix, paramPair[1]);
        }
      }
      urlParts.push(".json");
    } else {
      urlParts.push(`?${config.moduleVar}=${moduleName}&${config.methodVar}=${methodName}`);
      if (params) {
        for (const paramPair of params) {
          urlParts.push(`&${paramPair[0]}=${encodeURIComponent(paramPair[1])}`);
        }
      }
      urlParts.push(`&${config.viewVar}=${viewType}`);
    }
    return urlParts.join("");
  }

  /**
   * 输出 API 请求日志
   * @param name 名称
   * @param atrributes 日志属性对象
   * @param others 其他日志内容
   */
  protected _log(
    name: string,
    atrributes: {
      url?: string;
      params?: ZentaoRequestParamPair[];
      data?: string | Record<string, any>;
      method?: string;
      resp?: AxiosResponse;
      result?: ZentaoLegacyApiResponse;
      error?: any;
    },
    ...others: any[]
  ) {
    if (!this._debug) {
      return;
    }

    const logLines = ["\n\n"];
    const { resp, result } = atrributes;
    const status = resp?.status ?? "";
    const success = result ? result.status === 1 : status === 200;
    const url = (resp ? resp.config.url : atrributes.url) ?? "";
    const method = (resp ? resp.config.method : atrributes.method) ?? "GET";

    logLines.push(
      kleur.bold(
        `${kleur.gray("➡︎")} ${kleur[success ? "green" : "red"]().inverse(
          ` ${name} ${success ? "✓" : "𐄂"} `,
        )}`,
      ),
    );

    logLines.push(`\n  ${kleur.bold().blue(method.toUpperCase())} ${kleur.blue().underline(url)}`);
    logLines.push(
      `    status: ${kleur[status === 200 ? "green" : "red"](
        `● ${status}`,
      )} ${kleur.gray(resp?.statusText ?? "")}`,
    );

    if (atrributes.params) {
      logLines.push(`\n  ${kleur.bold().blue("Request Parameters")}`);
      for (const pair of atrributes.params) {
        const pairValue = typeof pair[1] === "string" ? pair[1] : JSON.stringify(pair[1]);
        logLines.push(`    ${pair[0]}: ${kleur.magenta(pairValue)}`);
      }
    }

    if (resp?.config?.headers) {
      logLines.push(`\n  ${kleur.bold().blue("Request Headers")}`);
      const headers = resp.config.headers;
      for (const key of Object.keys(headers)) {
        const value =
          typeof headers[key] === "string" ? headers[key] : JSON.stringify(headers[key]);
        logLines.push(`    ${key}: ${kleur.magenta(value)}`);
      }
    }

    if (atrributes.data) {
      let { data } = atrributes;
      logLines.push(`\n  ${kleur.bold().blue("Request Data")}`);
      if (typeof data === "string") {
        data = querystring.parse(data);
      }
      for (const key of Object.keys(data)) {
        const value = typeof data[key] === "string" ? data[key] : JSON.stringify(data[key]);
        logLines.push(`    ${key}: ${kleur.magenta(value)}`);
      }
    }

    if (result) {
      logLines.push(`\n  ${kleur.bold().cyan("Response Data")}`);
      logLines.push(`    status: ${kleur[result.status === 1 ? "green" : "red"](result.status)},`);
      if (result.msg !== undefined) {
        logLines.push(
          `    msg: ${kleur[result.status === 1 ? "green" : "red"](
            typeof result.msg === "string" ? result.msg : JSON.stringify(result.msg),
          )},`,
        );
      }
      if (result.result !== undefined) {
        logLines.push(`    result: ${kleur.magenta(JSON.stringify(result.result))}`);
      }
    }
    if (resp && (!result || !success || !result.result)) {
      logLines.push(`\n  ${kleur.bold().cyan("Response Text")}`);
      logLines.push(`    ${typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data)}`);
    }

    if (atrributes.error) {
      logLines.push(`\n  ${kleur.bold().red("Error")}`);
      logLines.push(`    ${kleur.red(atrributes.error)}`);
    }

    if (others && others.length) {
      logLines.push(...others);
    }

    console.log(logLines.join("\n"));
  }
}
