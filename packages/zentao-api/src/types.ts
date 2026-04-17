/* eslint-disable @typescript-eslint/no-empty-object-type */
import { AxiosRequestConfig, Method } from "axios";

export type Primitive = string | number | boolean;
export type QueryValue = Primitive | null | undefined;
export type RestEntity = Record<string, any>;

/**
 * 支持的禅道请求方式，影响 API 请求 URL 构建方式
 */
export type ZentaoRequestType = "PATH_INFO" | "GET";

/**
 * 禅道请求参数键值对
 */
export type ZentaoRequestParamPair = any[]; // [name: string, value: string]

/**
 * 禅道请求参数
 */
export type ZentaoRequestParams =
  | Array<ZentaoRequestParamPair>
  | string[]
  | string
  | Record<string, any>;

/**
 * 禅道 API 请求方式
 */
export type ZentaoRequestMethod = Method;

export type ZentaoResponseType = AxiosRequestConfig["responseType"];

/**
 * 禅道 Legacy API 返回结果
 */
export interface ZentaoLegacyApiResponse {
  /**
   * 状态
   *
   * @remarks
   * 如果为 `0` 则表示操作请求失败，如果为 `1`，表示操作请求成功
   */
  status: 0 | 1;

  /**
   * 服务器返回的描述结果的文本
   */
  msg?: any;

  /**
   * 请求结果数据
   */
  result?: any;
}

/**
 * 禅道 RESTAPI 返回结果
 */
export interface ZentaoApiResponse<T = any> {
  data?: T;
  token?: string;
  result?: any;
  message?: string;
  [key: string]: any;
}

/**
 * 禅道 API 初始化选项
 */
export interface ZentaoLegacyOptions {
  /**
   * 禅道服务器地址
   */
  readonly url: string;

  /**
   * 登录账号
   */
  readonly account: string;

  /**
   * 登录密码
   */
  readonly password: string;

  /**
   * 请求形式
   */
  readonly accessMode?: ZentaoRequestType;

  /**
   * 是否将 token 存储到本地，如果设置为 `false`，则每次创建新的 `Zentao` 实例都会在首次调用 API 之前重新获取 Token
   */
  readonly preserveToken?: boolean;

  /**
   * 当前 `Zentao` 实例名称
   */
  readonly sessionName?: string;

  /**
   * 如果设置为 `true`，则会在控制台输出详细日志
   */
  readonly debug?: boolean;
}

/**
 * 禅道 API v1 初始化选项
 */
export interface ZentaoV1Options {
  url: string;
  account: string;
  password: string;
  rejectUnauthorized?: boolean;
  timeout?: number;
}

/**
 * 禅道 API v2 初始化选项
 */
export interface ZentaoV2Options extends ZentaoV1Options {}

export type DocType = "text" | "url" | "word" | "ppt" | "excel";

export interface Doc {
  id: number;
  lib: number;
  module?: number;
  title: string;
  type: DocType;
  content?: string;
  url?: string;
  keywords?: string;
  addedBy?: string;
  addedDate?: string;
  editedBy?: string;
  editedDate?: string;
  version?: number;
  acl?: string;
  views?: number;
}

export type DocLibType = "product" | "project" | "execution" | "custom" | "api";

export interface DocLib {
  id: number;
  name: string;
  type: DocLibType;
  product?: number;
  project?: number;
  acl?: string;
  deleted?: boolean;
}

export interface CreateDocParams {
  lib: number;
  title: string;
  type?: DocType;
  content?: string;
  url?: string;
  keywords?: string;
  module?: number;
}

export interface EditDocParams {
  id: number;
  title?: string;
  content?: string;
  keywords?: string;
}

export interface DocModule {
  id: number;
  name: string;
  parent: number;
  root: number;
  path?: string;
  grade?: number;
  order?: number;
  children?: DocModule[];
}

export interface DocSpaceData {
  libs?: DocLib[];
  modules?: DocModule[];
  docs?: Doc[];
}

export interface CreateDocModuleParams {
  name: string;
  libID: number;
  parentID?: number;
  objectID: number;
}

export interface EditDocModuleParams {
  moduleID: number;
  name: string;
  root: number;
  parent?: number;
}

export interface ZentaoFileReadResult {
  fileID: number;
  fileType: string;
  mimeType: string;
  encoding: "base64";
  data: string;
  size: number;
}
