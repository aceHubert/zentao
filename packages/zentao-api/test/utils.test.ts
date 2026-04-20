import * as utils from "../src/utils";

describe("utils.createDate", () => {
  it("date from string", () => {
    const date = utils.createDate("2020-02-01");
    expect(date).toBeInstanceOf(Date);
    expect(date.toDateString()).toBe("Sat Feb 01 2020");
  });

  it("date from timestamp", () => {
    const date = utils.createDate(1615214148009); // Mon Mar 08 2021 22:35:48 GMT+0800
    expect(date).toBeInstanceOf(Date);
    expect(date.getTime()).toBe(1615214148009);
  });

  it("date from php timestamp", () => {
    const date = utils.createDate(1615214148); // Mon Mar 08 2021 22:35:48 GMT+0800
    expect(date).toBeInstanceOf(Date);
    expect(date.getTime()).toBe(1615214148000);
  });
});

describe("utils.formatDate", () => {
  it("format time", () => {
    const date = new Date(1615214108029); // 2021/3/8 22:35:08
    expect(utils.formatDate(date, "hh:mm")).toBe("22:35");
    expect(utils.formatDate(date, "hh:mm:ss")).toBe("22:35:08");
    expect(utils.formatDate(date, "HH:mm:s")).toBe("10:35:8");
    expect(utils.formatDate(date, "hh:mm:s.S")).toBe("22:35:8.29");
    expect(utils.formatDate(date, "hh:mm:s.SSS")).toBe("22:35:8.029");
    expect(utils.formatDate(date, "H:mm:ss")).toBe("10:35:08");
    expect(utils.formatDate(date, "m")).toBe("35");
  });

  it("format date", () => {
    const date = new Date(1615214108029); // 2021/3/8 22:35:08
    expect(utils.formatDate(date, "hh:mm")).toBe("22:35");
    expect(utils.formatDate(date, "hh:mm:ss")).toBe("22:35:08");
    expect(utils.formatDate(date, "HH:mm:s")).toBe("10:35:8");
    expect(utils.formatDate(date, "hh:mm:s.S")).toBe("22:35:8.29");
    expect(utils.formatDate(date, "hh:mm:s.SSS")).toBe("22:35:8.029");
    expect(utils.formatDate(date, "H:mm:ss")).toBe("10:35:08");
    expect(utils.formatDate(date, "m")).toBe("35");
  });
});

describe("utils.formatZentaoUrl", () => {
  it("formatZentaoUrl", () => {
    expect(utils.formatZentaoUrl("http://demo.zentao.net/")).toBe("http://demo.zentao.net/");
    expect(utils.formatZentaoUrl("http://demo.zentao.net")).toBe("http://demo.zentao.net/");
    expect(utils.formatZentaoUrl("https://demo.zentao.net/")).toBe("https://demo.zentao.net/");
    expect(utils.formatZentaoUrl("https://demo.zentao.net")).toBe("https://demo.zentao.net/");
    expect(utils.formatZentaoUrl("demo.zentao.net")).toBe("http://demo.zentao.net/");
    expect(utils.formatZentaoUrl("demo.zentao.net/")).toBe("http://demo.zentao.net/");
    expect(utils.formatZentaoUrl("http://demo.zentao.net/index.php")).toBe(
      "http://demo.zentao.net/",
    );
    expect(utils.formatZentaoUrl("https://demo.zentao.net/index.php")).toBe(
      "https://demo.zentao.net/",
    );
    expect(utils.formatZentaoUrl("demo.zentao.net/index.php")).toBe("http://demo.zentao.net/");
  });
});

describe("utils.slimmingObject", () => {
  it("slimmingObject", () => {
    expect(utils.slimmingObject({ a: 1, b: null, c: "3", d: true }, ["b", "c"])).toStrictEqual({
      b: null,
      c: "3",
    });
    expect(
      utils.slimmingObject({ a: 1, b: null, c: "3", d: true }, ["a", "b", "c", "d"]),
    ).toStrictEqual({ a: 1, b: null, c: "3", d: true });
    expect(utils.slimmingObject({ a: 1, b: null, c: "3", d: true }, [])).toStrictEqual({});
    expect(utils.slimmingObject(undefined, ["b", "c"])).toBe(undefined);
    expect(utils.slimmingObject(null, ["b", "c"])).toBe(null);
  });
});

describe("utils.normalizeRequestParams", () => {
  expect(utils.normalizeRequestParams({ foo: "bar", hello: "world" })).toStrictEqual([
    ["foo", "bar"],
    ["hello", "world"],
  ]);
  expect(utils.normalizeRequestParams("answer=42")).toStrictEqual([["answer", "42"]]);
  expect(utils.normalizeRequestParams("foo=bar&answer=42")).toStrictEqual([
    ["answer", "42"],
    ["foo", "bar"],
  ]);
  expect(
    utils.normalizeRequestParams([
      ["foo", "ter"],
      ["say", "hi"],
    ]),
  ).toStrictEqual([
    ["foo", "ter"],
    ["say", "hi"],
  ]);
  expect(utils.normalizeRequestParams([])).toStrictEqual([]);
  expect(utils.normalizeRequestParams()).toStrictEqual([]);
});

describe("utils.mergeRequestParams", () => {
  const params1 = { foo: "bar", hello: "world" };
  const params2 = "answer=42";
  const params3 = [
    ["foo", "ter"],
    ["say", "hi"],
  ];

  expect(utils.mergeRequestParams(params1, params2)).toStrictEqual([
    ["foo", "bar"],
    ["hello", "world"],
    ["answer", "42"],
  ]);
  expect(utils.mergeRequestParams(params1, params2, params3)).toStrictEqual([
    ["foo", ["bar", "ter"]],
    ["hello", "world"],
    ["answer", "42"],
    ["say", "hi"],
  ]);
});
