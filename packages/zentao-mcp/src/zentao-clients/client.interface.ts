import type {
  Bug,
  Story,
  Product,
  Project,
  CreateBugParams,
  ResolveBugParams,
  CloseBugParams,
  TestCase,
  TestCaseListResponse,
  CreateTestCaseParams,
  User,
  Doc,
  DocSpaceData,
  CreateDocParams,
  EditDocParams,
  CreateDocModuleParams,
  EditDocModuleParams,
  CloseStoryParams,
  CreateStoryParams,
  ZentaoFileReadResult,
} from "../types";

export type ZentaoClientVersion = "legacy" | "v1" | "v2";

export interface IZentaoClient {
  getBugs(productID: number, browseType?: string, limit?: number): Promise<Bug[]>;
  getBug(bugID: number): Promise<Bug | null>;
  createBug(params: CreateBugParams): Promise<Bug>;
  resolveBug(params: ResolveBugParams): Promise<boolean>;
  closeBug(params: CloseBugParams): Promise<boolean>;
  getStories(productID: number, browseType?: string, limit?: number): Promise<Story[]>;
  getStory(storyID: number): Promise<Story | null>;
  createStory(params: CreateStoryParams): Promise<Story>;
  closeStory(params: CloseStoryParams): Promise<boolean>;
  getTestCases(productID: number, limit?: number): Promise<TestCaseListResponse>;
  getTestCase(caseID: number): Promise<TestCase | null>;
  createTestCase(params: CreateTestCaseParams): Promise<TestCase>;
  getProducts(limit?: number): Promise<Product[]>;
  getProduct(productID: number): Promise<Product | null>;
  getProjects(limit?: number): Promise<Project[]>;
  getProject(projectID: number): Promise<Project | null>;
  getUsers(limit?: number): Promise<User[]>;
  getUser(userID: number): Promise<User | null>;
  getMyProfile(): Promise<User | null>;
  getDocSpaceData(type: "product" | "project", spaceID: number): Promise<DocSpaceData>;
  getDoc(docID: number, version?: number): Promise<Doc | null>;
  createDoc(params: CreateDocParams): Promise<{ id: number; doc: Doc }>;
  editDoc(params: EditDocParams): Promise<Doc | null>;
  createDocModule(params: CreateDocModuleParams): Promise<{ id: number; name: string }>;
  editDocModule(params: EditDocModuleParams): Promise<boolean>;
  readFile(fileID: number, fileType: string): Promise<ZentaoFileReadResult>;
}
