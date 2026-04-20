#!/usr/bin/env node
/**
 * 禅道命令行工具
 * 将 MCP 工具按资源和 action 平铺为可直接执行的 CLI commands。
 */

import dotenv from "dotenv";
import yargs, { type Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import { createZentaoClient } from "./zentao-clients";
import {
  normalizeZentaoVersion,
  addZentaoConnectionOptions,
  getBoolean,
  getJsonArray,
  getNumber,
  getString,
  getStringArray,
  printJsonResult,
  type ZentaoCommandArgs,
  verifyZentaoClientOptions,
} from "./utils";
import type {
  ZentaoCliOptions,
  BugSeverity,
  BugType,
  StoryCategory,
  TestCaseStep,
  TestCaseType,
  IZentaoClient,
} from "./types";

dotenv.config({ quiet: true });

type ClientFactory = (args: ZentaoCommandArgs) => IZentaoClient;

export function getZentaoCliOptions(args: ZentaoCommandArgs): ZentaoCliOptions {
  return {
    url: getString(args, "url"),
    account: getString(args, "account"),
    password: getString(args, "password"),
    zentaoVersion: getString(args, "zentaoVersion"),
    skipSSL: getBoolean(args, "skipSSL"),
  };
}

/** 命令参数优先，未传入时回退到环境变量。 */
export function resolveZentaoCliOptions(options: ZentaoCliOptions): ZentaoCliOptions {
  return {
    url: options.url ?? process.env.ZENTAO_URL,
    account: options.account ?? process.env.ZENTAO_ACCOUNT,
    password: options.password ?? process.env.ZENTAO_PASSWORD,
    zentaoVersion: options.zentaoVersion ?? process.env.ZENTAO_VERSION,
    skipSSL: options.skipSSL ?? process.env.ZENTAO_SKIP_SSL === "true",
  };
}

const commonListOptions = (parser: Argv): Argv =>
  parser.option("limit", {
    type: "number",
    describe: "返回数量限制",
  });

function registerBugCommands(parser: Argv, getClient: ClientFactory): Argv {
  return parser.command(
    "bugs <action>",
    "Bug 操作：list / view / create / resolve / close",
    (command) =>
      command
        .positional("action", {
          choices: ["list", "view", "create", "resolve", "close"] as const,
          describe: "操作类型",
        })
        .option("bugID", { type: "number", describe: "Bug ID" })
        .option("productID", { type: "number", describe: "产品 ID" })
        .option("browseType", {
          type: "string",
          describe:
            "Bug 状态。v1/v2: all|unclosed|assignedtome|openedbyme|assignedbyme；legacy: all|unclosed|openedbyme|assigntome|resolvedbyme|toclosed|unresolved|unconfirmed|longlifebugs|postponedbugs|overduebugs|needconfirm。",
        })
        .option("limit", { type: "number", describe: "返回数量限制" })
        .option("title", { type: "string", describe: "Bug 标题" })
        .option("severity", {
          type: "number",
          choices: [1, 2, 3, 4] as const,
          describe: "严重程度",
        })
        .option("pri", { type: "number", choices: [1, 2, 3, 4] as const, describe: "优先级" })
        .option("type", { type: "string", describe: "Bug 类型" })
        .option("steps", { type: "string", describe: "重现步骤" })
        .option("assignedTo", { type: "string", describe: "指派给" })
        .option("openedBuild", { type: "array", string: true, describe: "影响版本，可重复传入" })
        .option("module", { type: "number", describe: "模块 ID" })
        .option("story", { type: "number", describe: "相关需求 ID" })
        .option("project", { type: "number", describe: "项目 ID" })
        .option("resolution", { type: "string", describe: "解决方案" })
        .option("comment", { type: "string", describe: "备注" }),
    async (args: ZentaoCommandArgs) => {
      const client = getClient(args);
      const action = getString(args, "action");
      const bugID = getNumber(args, "bugID");
      const productID = getNumber(args, "productID");

      switch (action) {
        case "list":
          if (!productID) throw new Error("缺少必要参数: productID");
          printJsonResult(
            await client.getBugs(
              productID,
              getString(args, "browseType"),
              getNumber(args, "limit"),
            ),
          );
          return;
        case "view":
          if (!bugID) throw new Error("缺少必要参数: bugID");
          printJsonResult(await client.getBug(bugID));
          return;
        case "create": {
          const title = getString(args, "title");
          const severity = getNumber(args, "severity") as BugSeverity | undefined;
          const pri = getNumber(args, "pri");
          const type = getString(args, "type") as BugType | undefined;
          if (!productID || !title || !severity || !pri || !type) {
            throw new Error("缺少必要参数: productID, title, severity, pri, type");
          }
          printJsonResult(
            await client.createBug({
              product: productID,
              title,
              severity,
              pri,
              type,
              steps: getString(args, "steps"),
              assignedTo: getString(args, "assignedTo"),
              openedBuild: getStringArray(args, "openedBuild"),
              module: getNumber(args, "module"),
              story: getNumber(args, "story"),
              project: getNumber(args, "project"),
            }),
          );
          return;
        }
        case "resolve": {
          const resolution = getString(args, "resolution") as
            | "bydesign"
            | "duplicate"
            | "external"
            | "fixed"
            | "notrepro"
            | "postponed"
            | "willnotfix"
            | undefined;
          if (!bugID) throw new Error("缺少必要参数: bugID");
          if (!resolution) throw new Error("缺少必要参数: resolution");
          const success = await client.resolveBug({
            id: bugID,
            resolution,
            comment: getString(args, "comment"),
          });
          printJsonResult({
            success,
            message: success ? `Bug #${bugID} 已解决` : `Bug #${bugID} 解决失败`,
          });
          return;
        }
        case "close": {
          if (!bugID) throw new Error("缺少必要参数: bugID");
          const success = await client.closeBug({ id: bugID, comment: getString(args, "comment") });
          printJsonResult({
            success,
            message: success ? `Bug #${bugID} 已关闭` : `Bug #${bugID} 关闭失败`,
          });
          return;
        }
        default:
          throw new Error(`未知操作类型: ${String(action)}`);
      }
    },
  );
}

function registerStoryCommands(parser: Argv, getClient: ClientFactory): Argv {
  return parser.command(
    "stories <action>",
    "需求操作：list / view / create / close",
    (command) =>
      command
        .positional("action", {
          choices: ["list", "view", "create", "close"] as const,
          describe: "操作类型",
        })
        .option("storyID", { type: "number", describe: "需求 ID" })
        .option("productID", { type: "number", describe: "产品 ID" })
        .option("browseType", {
          type: "string",
          describe: "需求状态。v1/v2: all|unclosed|assignedtome|openedbyme|assignedbyme。",
        })
        .option("limit", { type: "number", describe: "返回数量限制" })
        .option("title", { type: "string", describe: "需求标题" })
        .option("category", { type: "string", describe: "需求类型" })
        .option("pri", { type: "number", choices: [1, 2, 3, 4] as const, describe: "优先级" })
        .option("spec", { type: "string", describe: "需求描述" })
        .option("reviewer", { type: "array", string: true, describe: "评审人账号，可重复传入" })
        .option("verify", { type: "string", describe: "验收标准" })
        .option("estimate", { type: "number", describe: "预估工时" })
        .option("module", { type: "number", describe: "模块 ID" })
        .option("closedReason", { type: "string", describe: "关闭原因" })
        .option("comment", { type: "string", describe: "备注" }),
    async (args: ZentaoCommandArgs) => {
      const client = getClient(args);
      const action = getString(args, "action");
      const storyID = getNumber(args, "storyID");
      const productID = getNumber(args, "productID");

      switch (action) {
        case "list":
          if (!productID) throw new Error("缺少必要参数: productID");
          printJsonResult(
            await client.getStories(
              productID,
              getString(args, "browseType"),
              getNumber(args, "limit"),
            ),
          );
          return;
        case "view":
          if (!storyID) throw new Error("缺少必要参数: storyID");
          printJsonResult(await client.getStory(storyID));
          return;
        case "create": {
          const title = getString(args, "title");
          const category = getString(args, "category") as StoryCategory | undefined;
          const pri = getNumber(args, "pri");
          const spec = getString(args, "spec");
          const reviewer = getStringArray(args, "reviewer");
          if (!productID || !title || !category || !pri || !spec || !reviewer) {
            throw new Error("缺少必要参数: productID, title, category, pri, spec, reviewer");
          }
          printJsonResult(
            await client.createStory({
              product: productID,
              title,
              category,
              pri,
              spec,
              reviewer,
              verify: getString(args, "verify"),
              estimate: getNumber(args, "estimate"),
              module: getNumber(args, "module"),
            }),
          );
          return;
        }
        case "close": {
          const closedReason = getString(args, "closedReason") as
            | "done"
            | "subdivided"
            | "duplicate"
            | "postponed"
            | "willnotdo"
            | "cancel"
            | "bydesign"
            | undefined;
          if (!storyID) throw new Error("缺少必要参数: storyID");
          if (!closedReason) throw new Error("缺少必要参数: closedReason");
          const success = await client.closeStory({
            id: storyID,
            closedReason,
            comment: getString(args, "comment"),
          });
          printJsonResult({
            success,
            message: success ? `需求 #${storyID} 已关闭` : `需求 #${storyID} 关闭失败`,
          });
          return;
        }
        default:
          throw new Error(`未知操作类型: ${String(action)}`);
      }
    },
  );
}

function registerTestCaseCommands(parser: Argv, getClient: ClientFactory): Argv {
  return parser.command(
    "testcases <action>",
    "测试用例操作：list / view / create",
    (command) =>
      command
        .positional("action", {
          choices: ["list", "view", "create"] as const,
          describe: "操作类型",
        })
        .option("caseID", { type: "number", describe: "用例 ID" })
        .option("productID", { type: "number", describe: "产品 ID" })
        .option("limit", { type: "number", describe: "返回数量限制" })
        .option("title", { type: "string", describe: "用例标题" })
        .option("type", { type: "string", describe: "用例类型" })
        .option("steps", { type: "string", describe: "用例步骤 JSON 数组" })
        .option("pri", { type: "number", choices: [1, 2, 3, 4] as const, describe: "优先级" })
        .option("precondition", { type: "string", describe: "前置条件" })
        .option("story", { type: "number", describe: "相关需求 ID" }),
    async (args: ZentaoCommandArgs) => {
      const client = getClient(args);
      const action = getString(args, "action");
      const caseID = getNumber(args, "caseID");
      const productID = getNumber(args, "productID");

      switch (action) {
        case "list":
          if (!productID) throw new Error("缺少必要参数: productID");
          printJsonResult(await client.getTestCases(productID, getNumber(args, "limit")));
          return;
        case "view":
          if (!caseID) throw new Error("缺少必要参数: caseID");
          printJsonResult(await client.getTestCase(caseID));
          return;
        case "create": {
          const title = getString(args, "title");
          const type = getString(args, "type") as TestCaseType | undefined;
          const steps = getJsonArray<TestCaseStep>(args, "steps");
          if (!productID || !title || !type || !steps) {
            throw new Error("缺少必要参数: productID, title, type, steps");
          }
          printJsonResult(
            await client.createTestCase({
              product: productID,
              title,
              type,
              steps,
              pri: getNumber(args, "pri"),
              precondition: getString(args, "precondition"),
              story: getNumber(args, "story"),
            }),
          );
          return;
        }
        default:
          throw new Error(`未知操作类型: ${String(action)}`);
      }
    },
  );
}

function registerSimpleReadCommands(parser: Argv, getClient: ClientFactory): Argv {
  return parser
    .command(
      "products <action>",
      "产品操作：list / view",
      (command) =>
        commonListOptions(command)
          .positional("action", { choices: ["list", "view"] as const, describe: "操作类型" })
          .option("productID", { type: "number", describe: "产品 ID" }),
      async (args: ZentaoCommandArgs) => {
        const action = getString(args, "action");
        switch (action) {
          case "list":
            printJsonResult(await getClient(args).getProducts(getNumber(args, "limit")));
            return;
          case "view": {
            const productID = getNumber(args, "productID");
            if (!productID) throw new Error("缺少必要参数: productID");
            printJsonResult(await getClient(args).getProduct(productID));
            return;
          }
          default:
            throw new Error(`未知操作类型: ${String(action)}`);
        }
      },
    )
    .command(
      "projects <action>",
      "项目操作：list / view",
      (command) =>
        commonListOptions(command)
          .positional("action", { choices: ["list", "view"] as const, describe: "操作类型" })
          .option("projectID", { type: "number", describe: "项目 ID" }),
      async (args: ZentaoCommandArgs) => {
        const action = getString(args, "action");
        switch (action) {
          case "list":
            printJsonResult(await getClient(args).getProjects(getNumber(args, "limit")));
            return;
          case "view": {
            const projectID = getNumber(args, "projectID");
            if (!projectID) throw new Error("缺少必要参数: projectID");
            printJsonResult(await getClient(args).getProject(projectID));
            return;
          }
          default:
            throw new Error(`未知操作类型: ${String(action)}`);
        }
      },
    )
    .command(
      "users <action>",
      "用户操作：list / view / me",
      (command) =>
        commonListOptions(command)
          .positional("action", { choices: ["list", "view", "me"] as const, describe: "操作类型" })
          .option("userID", { type: "number", describe: "用户 ID" }),
      async (args: ZentaoCommandArgs) => {
        const action = getString(args, "action");
        switch (action) {
          case "list":
            printJsonResult(await getClient(args).getUsers(getNumber(args, "limit")));
            return;
          case "view": {
            const userID = getNumber(args, "userID");
            if (!userID) throw new Error("缺少必要参数: userID");
            printJsonResult(await getClient(args).getUser(userID));
            return;
          }
          case "me":
            printJsonResult(await getClient(args).getMyProfile());
            return;
          default:
            throw new Error(`未知操作类型: ${String(action)}`);
        }
      },
    );
}

function registerDocCommands(parser: Argv, getClient: ClientFactory): Argv {
  return parser.command(
    "docs <action>",
    "文档操作：tree / view / create / edit / createModule / editModule",
    (command) =>
      command
        .positional("action", {
          choices: ["tree", "view", "create", "edit", "createModule", "editModule"] as const,
          describe: "操作类型",
        })
        .option("spaceType", {
          type: "string",
          choices: ["product", "project"] as const,
          describe: "空间类型",
        })
        .option("spaceID", { type: "number", describe: "空间 ID" })
        .option("libID", { type: "number", describe: "文档库 ID" })
        .option("docID", { type: "number", describe: "文档 ID" })
        .option("moduleID", { type: "number", describe: "目录 ID" })
        .option("title", { type: "string", describe: "文档标题" })
        .option("content", { type: "string", describe: "文档内容" })
        .option("keywords", { type: "string", describe: "关键词" })
        .option("type", { type: "string", choices: ["text", "url"] as const, describe: "文档类型" })
        .option("url", { type: "string", describe: "外部链接" })
        .option("moduleName", { type: "string", describe: "目录名称" })
        .option("parentID", { type: "number", describe: "父目录 ID" }),
    async (args: ZentaoCommandArgs) => {
      const client = getClient(args);
      const action = getString(args, "action");
      const spaceID = getNumber(args, "spaceID");
      const libID = getNumber(args, "libID");
      const docID = getNumber(args, "docID");
      const moduleID = getNumber(args, "moduleID");

      switch (action) {
        case "tree": {
          const spaceType = getString(args, "spaceType") as "product" | "project" | undefined;
          if (!spaceType || !spaceID) throw new Error("缺少必要参数: spaceType 和 spaceID");
          printJsonResult(await client.getDocSpaceData(spaceType, spaceID));
          return;
        }
        case "view":
          if (!docID) throw new Error("缺少必要参数: docID");
          printJsonResult(await client.getDoc(docID));
          return;
        case "create": {
          const title = getString(args, "title");
          if (!libID || !title) throw new Error("缺少必要参数: libID 和 title");
          printJsonResult(
            await client.createDoc({
              lib: libID,
              title,
              type: getString(args, "type") as "text" | "url" | undefined,
              content: getString(args, "content"),
              url: getString(args, "url"),
              keywords: getString(args, "keywords"),
              module: moduleID,
            }),
          );
          return;
        }
        case "edit":
          if (!docID) throw new Error("缺少必要参数: docID");
          printJsonResult(
            await client.editDoc({
              id: docID,
              title: getString(args, "title"),
              content: getString(args, "content"),
              keywords: getString(args, "keywords"),
            }),
          );
          return;
        case "createModule": {
          const moduleName = getString(args, "moduleName");
          if (!libID || !moduleName || !spaceID) {
            throw new Error("缺少必要参数: libID, moduleName, spaceID");
          }
          printJsonResult(
            await client.createDocModule({
              name: moduleName,
              libID,
              parentID: getNumber(args, "parentID") || 0,
              objectID: spaceID,
            }),
          );
          return;
        }
        case "editModule": {
          const moduleName = getString(args, "moduleName");
          if (!moduleID || !moduleName || !libID) {
            throw new Error("缺少必要参数: moduleID, moduleName, libID");
          }
          printJsonResult(
            await client.editDocModule({
              moduleID,
              name: moduleName,
              root: libID,
              parent: getNumber(args, "parentID"),
            }),
          );
          return;
        }
        default:
          throw new Error(`未知操作类型: ${String(action)}`);
      }
    },
  );
}

function registerFileCommands(parser: Argv, getClient: ClientFactory): Argv {
  return parser.command(
    "file read",
    "读取附件或图片内容",
    (command) =>
      command
        .option("fileID", { type: "number", demandOption: true, describe: "文件 ID" })
        .option("fileType", { type: "string", demandOption: true, describe: "文件类型扩展名" }),
    async (args: ZentaoCommandArgs) =>
      printJsonResult(
        await getClient(args).readFile(
          getNumber(args, "fileID") as number,
          getString(args, "fileType") as string,
        ),
      ),
  );
}

async function main(): Promise<void> {
  let client: IZentaoClient | undefined;
  const getClient = (args: ZentaoCommandArgs): IZentaoClient => {
    const options = verifyZentaoClientOptions(
      resolveZentaoCliOptions(getZentaoCliOptions(args)),
      "命令行参数",
    );
    client ??= createZentaoClient(
      {
        url: options.url,
        account: options.account,
        password: options.password,
        rejectUnauthorized: options.skipSSL ? false : undefined,
      },
      normalizeZentaoVersion(options.zentaoVersion),
    );
    return client;
  };

  const parser = addZentaoConnectionOptions(
    yargs(hideBin(process.argv)).scriptName("zentao").usage("$0 <command> [options]"),
  )
    .strict()
    .demandCommand(1, "请指定一个命令")
    .recommendCommands()
    .help()
    .alias("h", "help")
    .version()
    .alias("v", "version")
    .wrap(Math.min(100, yargs().terminalWidth()));

  registerBugCommands(parser, getClient);
  registerStoryCommands(parser, getClient);
  registerTestCaseCommands(parser, getClient);
  registerSimpleReadCommands(parser, getClient);
  registerDocCommands(parser, getClient);
  registerFileCommands(parser, getClient);

  await parser.parseAsync();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "未知错误";
  console.error(`操作失败: ${message}`);
  process.exit(1);
});
