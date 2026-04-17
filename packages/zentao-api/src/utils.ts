import CryptoJS from "crypto-js";
import querystring from "querystring";
import { ZentaoRequestParamPair, ZentaoRequestParams } from "./types";

export const md5 = (value: string): string => CryptoJS.MD5(value).toString();

/**
 * 创建一个 Date 对象
 * @param {Date|number|String} [date=null] 用于创建 Date 对象的日期时间表达值，如果留空则创建当前系统时间对象
 * @return {Date} 日期时间对象
 * @function
 */
export const createDate = (date: Date | number | string) => {
  if (!date) {
    return new Date();
  }
  if (!(date instanceof Date)) {
    if (typeof date === "string") {
      date = date.trim();
      if (/^\d+$/.test(date)) {
        date = Number.parseInt(date, 10);
      }
    }
    if (typeof date === "number" && date < 10000000000) {
      date *= 1000;
    }
    date = new Date(date);
  }
  return date;
};

/**
 * 格式化日期时间值为字符串
 * @remarks
 * 所有可用的格式化参数有：
 * - `yyyy`，例如：'2018'，表示四位数字表示的年份
 * - `yy`，例如：'18'，表示两位数字表示的年份
 * - `MM`，例如：'07'，表示两位数字表示的月份，不足两位在起始用 0 填充
 * - `M`，例如：'10'，表示一位或两位数字表示的月份
 * - `dd`，例如：'05'，表示两位数字表示的日期，不足两位在起始用 0 填充
 * - `d`，例如：'5'，表示一位或两位数字表示的日期
 * - `hh`，例如：'08'，表示两位数字表示的小时，不足两位在起始用 0 填充
 * - `h`，例如：'8'，表示一位或两位数字表示的小时
 * - `mm`，例如：'3'，表示两位数字表示的分钟，不足两位在起始用 0 填充
 * - `m`，例如：'03'，表示一位或两位数字表示的分钟
 * - `ss`，例如：'5'，表示两位数字表示的秒数，不足两位在起始用 0 填充
 * - `s`，例如：'05'，表示一位或两位数字表示的秒数
 * - `S`，例如：'236'，表示毫秒数
 * - `SSS`，例如：'036'，表示毫秒数，不足3位在起始用 0 填充
 * @summary 格式化日期时间值为字符串
 * @param {Date|number|string} date 要格式化的日期时间表达值
 * @param {string} [format='yyyy-MM-dd hh:ss'] 格式化字符串
 * @return {string} 日期时间格式化文本
 * @function
 */
export const formatDate = (date: Date | number | string, format: string = "yyyy-MM-dd hh:mm") => {
  date = createDate(date);

  const dateInfo: Record<string, any> = {
    "M+": date.getMonth() + 1,
    "d+": date.getDate(),
    "h+": date.getHours(),
    "H+": date.getHours() % 12,
    "m+": date.getMinutes(),
    "s+": date.getSeconds(),
    // 'q+': Math.floor((date.getMonth() + 3) / 3),
    "S+": date.getMilliseconds(),
  };
  if (/(y+)/i.test(format)) {
    format = format.replace(RegExp.$1, `${date.getFullYear()}`.substr(4 - RegExp.$1.length));
  }
  Object.keys(dateInfo).forEach((k) => {
    if (new RegExp(`(${k})`).test(format)) {
      const str = `${dateInfo[k]}`;
      format = format.replace(
        RegExp.$1,
        RegExp.$1.length === 1 ? str : `00${str}`.substr(str.length + 2 - RegExp.$1.length),
      );
    }
  });
  return format;
};

/**
 * 格式化禅道地址
 * @param url 禅道地址
 * @returns 格式化后的禅道地址
 * @example
 * // 以下例子都返回 `http://demo.zentao.net/`
 * formatZentaoUrl('http://demo.zentao.net');
 * formatZentaoUrl('http://demo.zentao.net');
 * formatZentaoUrl('http://demo.zentao.net/index.php');
 * formatZentaoUrl('demo.zentao.net');
 */
export function formatZentaoUrl(url: string) {
  if (url.endsWith("/index.php")) {
    url = url.substr(0, url.length - 9);
  } else if (!url.endsWith("/")) {
    url = `${url}/`;
  }
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    url = `http://${url}`;
  }
  return url;
}

/**
 * 创建一个新的对象，仅保留给定的原始对象上给定的属性
 * @param object 给定的原始对象
 * @param fields 要保留属性名称列表
 * @returns 新的对象
 * @example
 * const obj = {a: 1, b: 2, c: 3, d: 4};
 * slimmingObject(obj, ['b', 'c']); // 返回 `{b: 2, c: 3}`
 */
export function slimmingObject(object: any, fields: string[]): any {
  if (!object || typeof object !== "object" || object === null) {
    return object;
  }
  const newObject: Record<string, any> = {};
  for (const field of fields) {
    newObject[field] = object[field];
  }
  return newObject;
}

/**
 * 格式化请求参数定义
 * @param params 要格式化的参数定义
 * @returns 格式化后的参数列表
 * @example
 * // 下面返回：`[['foo', 'bar'], ['hello', 'world']]`
 * normalizeRequestParams([['foo', 'bar'], ['hello', 'world']]);
 *
 * // 下面返回：`[['foo', 'bar'], ['hello', 'world']]`
 * normalizeRequestParams('foo=bar&hello=world');
 *
 * // 下面返回：`[['foo', 'bar'], ['hello', 'world']]`
 * normalizeRequestParams({foo: 'bar', hello: 'world'});
 *
 * // 下面返回：`[['', 'bar'], ['', 'world']]`
 * normalizeRequestParams(['foo', 'bar']);
 *
 * // 下面返回：`[['foo', 'bar'], ['', 'world']]`
 * normalizeRequestParams([['foo', 'bar'], 'bar']);
 */
export function normalizeRequestParams(params?: ZentaoRequestParams): ZentaoRequestParamPair[] {
  const normalizedParams: ZentaoRequestParamPair[] = [];
  if (typeof params === "string") {
    params = querystring.parse(params);
  }
  if (params && typeof params === "object") {
    if (Array.isArray(params)) {
      for (const param of params) {
        normalizedParams.push(typeof param === "string" ? ["", param] : param);
      }
    } else if (params as Record<string, any>) {
      for (const key of Object.keys(params).sort()) {
        normalizedParams.push([key, params[key]]);
      }
    }
  }
  return normalizedParams;
}

/**
 * 合并两个请求参数定义，并返回合并且格式化后的定义
 * @param params 参数定义
 * @param otherParams 要合并的其他参数定义
 * @returns 合并后的参数列表
 * @example
 * const params1 = {foo: 'bar', hello: 'world'};
 * const params2 = 'answer='42'';
 * const params3 = [['foo', 'ter'], ['say', 'hi']];
 *
 * // 以下返回 `[['foo', 'bar'], ['answer', '42']]`
 * mergeRequestParams(params1, params2);
 *
 * // 以下返回 `[['foo', ['bar', 'ter']], ['answer', '42'], ['hello', 'world'], ['say', 'hi']]`
 * mergeRequestParams(params1, params2, params3);
 */
export function mergeRequestParams(
  params: ZentaoRequestParams,
  ...otherParams: ZentaoRequestParams[]
): ZentaoRequestParamPair[] {
  const normalizedParams = normalizeRequestParams(params);
  for (const otherParam of otherParams) {
    const otherNormalizedParams = normalizeRequestParams(otherParam);
    for (const param of otherNormalizedParams) {
      if (typeof param[0] === "string" && param[0].length) {
        const existsParam = normalizedParams.find((x) => x[0] === param[0]);
        if (existsParam) {
          if (Array.isArray(existsParam[1])) {
            existsParam[1].push(param[1]);
          } else {
            existsParam[1] = [existsParam[1], param[1]];
          }
          continue;
        }
      }
      normalizedParams.push(param);
    }
  }
  return normalizedParams;
}
