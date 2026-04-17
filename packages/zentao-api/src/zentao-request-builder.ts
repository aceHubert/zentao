import { Method } from "axios";
import { ZentaoLegacyApiResponse, ZentaoRequestParams } from "./types";
import { mergeRequestParams } from "./utils";
import Zentao from "./zentao";

/**
 * 禅道请求构建类
 * @internal
 */
export default class ZentaoRequestBuilder {
  /**
   * 禅道请求实例
   */
  readonly zentao: Zentao;

  /**
   * 模块名
   */
  readonly moduleName: string;

  _methodName: string;
  _params?: ZentaoRequestParams;
  _data?: string | Record<string, any>;
  _fields?: string[];
  _resultConvertor?: (remoteData: any, result: ZentaoLegacyApiResponse) => ZentaoLegacyApiResponse;
  _url?: string;
  _name?: string;

  /**
   * 创建一个禅道请求构建实例
   * @param zentao 禅道请求实例
   * @param moduleName 方法名
   * @param methodName 模块名
   * @param params 请求参数
   */
  constructor(
    zentao: Zentao,
    moduleName: string,
    methodName?: string,
    params?: ZentaoRequestParams,
  ) {
    this.zentao = zentao;
    this.moduleName = moduleName;
    this._methodName = methodName ?? "index";
    this._params = params;
  }

  /**
   * 获取方法名
   */
  get methodName() {
    return this._methodName;
  }

  /**
   * 获取请求参数
   */
  get params() {
    return this._params;
  }

  /**
   * 获取请求数据
   */
  get data() {
    return this._data;
  }

  /**
   * 获取结果属性过滤列表
   */
  get fields() {
    return this._fields;
  }

  /**
   * 获取请求名称
   */
  get name() {
    return this._name;
  }

  /**
   * 获取自定义请求地址
   */
  get url() {
    return this._url;
  }

  /**
   * 获取结果转换函数
   */
  get resultConvertor() {
    return this._resultConvertor;
  }

  /**
   * 设置方法名
   * @param name 方法名
   * @returns 禅道请求构建实例自身
   */
  method(name: string): ZentaoRequestBuilder {
    this._methodName = name;
    return this;
  }

  /**
   * 设置方法名，是方法 `method(name)` 的别名
   * @param name 方法名
   * @returns 禅道请求构建实例自身
   * @alias method
   */
  f(name: string): ZentaoRequestBuilder {
    return this.method(name);
  }

  /**
   * 设置请求参数
   * @param params 要设置的参数
   * @returns 禅道请求构建实例自身
   */
  withParams(params: ZentaoRequestParams): ZentaoRequestBuilder {
    this._params = params;
    return this;
  }

  /**
   * 追加请求参数
   * @param params 要追加的参数
   * @returns 禅道请求构建实例自身
   */
  appendParams(params: ZentaoRequestParams): ZentaoRequestBuilder {
    if (this._params) {
      this._params = mergeRequestParams(this._params, params);
    } else {
      this._params = params;
    }
    return this;
  }

  /**
   * 设置请求名称
   * @param name 名称
   * @returns 禅道请求构建实例自身
   */
  named(name: string): ZentaoRequestBuilder {
    this._name = name;
    return this;
  }

  /**
   * 设置结果转换函数
   * @param converter 结果转换函数
   * @returns 禅道请求构建实例自身
   */
  useConverter(
    converter: (remoteData: any, result: ZentaoLegacyApiResponse) => ZentaoLegacyApiResponse,
  ): ZentaoRequestBuilder {
    this._resultConvertor = converter;
    return this;
  }

  /**
   * 过滤需要返回的属性列表
   * @param fields 设置仅返回的属性名称列表
   * @returns 禅道请求构建实例自身
   */
  filterFields(...fields: Array<string | string[] | undefined>): ZentaoRequestBuilder {
    this._fields = fields.flat().filter((x) => x !== undefined) as string[];
    return this;
  }

  /**
   * 发起 GET 请求
   * @returns 请求结果
   */
  get(): Promise<ZentaoLegacyApiResponse> {
    return this.zentao.request(this.moduleName, this._methodName, {
      method: "GET",
      params: this._params,
      data: this._data,
      fields: this._fields,
      resultConvertor: this._resultConvertor,
      name: this._name,
      url: this._url,
    });
  }

  /**
   * 发起 POST 请求
   * @param data 要提交的数据
   * @returns 请求结果
   */
  post(data?: string | Record<string, any>): Promise<ZentaoLegacyApiResponse> {
    return this.zentao.request(this.moduleName, this._methodName, {
      method: "POST",
      params: this._params,
      data: data ?? this._data,
      fields: this._fields,
      resultConvertor: this._resultConvertor,
      name: this._name,
      url: this._url,
    });
  }

  /**
   * 发起 HTTP 请求，可以指定请求方式
   * @param method 请求方式，默认为 GET
   * @returns 请求结果
   */
  request(method?: Method) {
    return this.zentao.request(this.moduleName, this._methodName, {
      method,
      params: this._params,
      data: this._data,
      fields: this._fields,
      resultConvertor: this._resultConvertor,
      name: this._name,
      url: this._url,
    });
  }
}
