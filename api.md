请求基路径: https://zentao.fivepointtex.com/api.php/v1
GET
/products/:id/testcases
获取产品用例列表
请求头
名称	类型	必填	描述
Token	String	是	认证凭证Token
请求响应
名称	类型	必填	描述
page	int	是	当前页数
total	int	是	用例总数
limit	int	是	每页用例数
testcases	array	是	用例列表
∟ id	int	是	用例ID
∟ product	int	是	所属产品
∟ branch	int	否	所属分支
∟ module	int	否	所有模块
∟ story	int	否	相关研发需求
∟ storyVersion	int	否	需求版本
∟ title	string	否	用例标题
∟ precondition	string	否	前置条件
∟ keywords	string	否	关键词
∟ pri	int	是	优先级
∟ type	string	是	用例类型(feature 功能测试 | performance 性能测试 | config 配置相关 | install 安装部署 | security 安全相关 | interface 接口测试 | unit 单元测试 | other 其他)
∟ stage	string	是	适用阶段(unittest 单元测试阶段 | feature 功能测试阶段 | intergrate 集成测试阶段 | system 系统测试阶段 | smoke 冒烟测试阶段 | bvt 版本验证阶段)
∟ status	string	是	状态(wait 待评审 | normal 正常 | blocked 被阻塞 | investigate 研究中)
∟ openedBy	user	是	创建人
∟ openedDate	datetime	是	创建时间
∟ fromBug	int	否	来自于Bug
∟ fromCaseID	int	否	来自于用例
响应示例
{
    "page": 1,
    "total": 6,
    "limit": 20,
    "testcases": [
        {
            "id": 10,
            "project": 0,
            "product": 1,
            "execution": 0,
            "branch": 0,
            "lib": 0,
            "module": 0,
            "path": 0,
            "story": 0,
            "storyVersion": 1,
            "title": "case1",
            "precondition": "",
            "keywords": "",
            "pri": 1,
            "type": "feature",
            "auto": "no",
            "frame": "",
            "stage": "",
            "howRun": "",
            "scriptedBy": "",
            "scriptedDate": null,
            "scriptStatus": "",
            "scriptLocation": "",
            "status": "normal",
            "subStatus": "",
            "color": "",
            "frequency": "1",
            "order": 0,
            "openedBy": {
                "id": 1,
                "account": "admin",
                "avatar": "",
                "realname": "管理员"
            },
            "openedDate": "2021-12-05T15:05:16Z",
            "reviewedBy": null,
            "reviewedDate": null,
            "lastEditedBy": null,
            "lastEditedDate": null,
            "version": 1,
            "linkCase": "",
            "fromBug": 0,
            "fromCaseID": 0,
            "fromCaseVersion": 1,
            "deleted": false,
            "lastRunner": "",
            "lastRunDate": null,
            "lastRunResult": "",
            "storyTitle": null,
            "needconfirm": false,
            "bugs": 0,
            "results": 0,
            "caseFails": 0,
            "stepNumber": 1,
            "statusName": "正常"
        }
    ]
}



请求基路径: https://zentao.fivepointtex.com/api.php/v1
POST
/products/:id/testcases
创建用例
请求头
名称	类型	必填	描述
Token	String	是	认证凭证Token
请求体
名称	类型	必填	描述
branch	int	否	所属分支
module	int	否	所属模块
story	int	否	所属需求
title	string	是	用例标题
type	string	是	用例类型(feature 功能测试 | performance 性能测试 | config 配置相关 | install 安装部署 | security 安全相关 | interface 接口测试 | unit 单元测试 | other 其他)
stage	string	否	适用阶段(unittest 单元测试阶段 | feature 功能测试阶段 | intergrate 集成测试阶段 | system 系统测试阶段 | smoke 冒烟测试阶段 | bvt 版本验证阶段)
precondition	string	否	前置条件
pri	int	否	优先级
steps	array	是	用例步骤
∟ desc	string	是	步骤
∟ expect	string	是	期望
keywords	string	否	关键词
请求示例
{
    "title": "case1",
    "pri": 1,
    "steps": [
        {
            "desc": "步骤1",
            "expect": "结果1"
        }
    ],
    "type": "feature"
}
请求响应
名称	类型	必填	描述
id	int	是	用例ID
product	int	是	所属产品
branch	int	是	所属分支
module	int	是	所属模块
story	int	是	相关需求
storyVersion	int	是	需求版本
title	string	是	需求标题
precondition	string	是	前置条件
pri	int	是	优先级
type	string	是	用例类型(feature 功能测试 | performance 性能测试 | config 配置相关 | install 安装部署 | security 安全相关 | interface 接口测试 | unit 单元测试 | other 其他)
stage	string	是	适用阶段(unittest 单元测试阶段 | feature 功能测试阶段 | intergrate 集成测试阶段 | system 系统测试阶段 | smoke 冒烟测试阶段 | bvt 版本验证阶段)
steps	array	是	用例步骤列表
∟ desc	string	是	步骤
∟ expect	string	是	期望
fromBug	int	否	来自于Bug
fromCaseID	int	否	来自于用例
openedBy	string	是	创建人
openedDate	datetime	是	创建时间
响应示例
{
    "id": 8,
    "project": 0,
    "product": 1,
    "execution": 0,
    "branch": 0,
    "lib": 0,
    "module": 0,
    "path": 0,
    "story": 0,
    "storyVersion": 1,
    "title": "case1",
    "precondition": "",
    "keywords": "",
    "pri": 1,
    "type": "feature",
    "auto": "no",
    "frame": "",
    "stage": "",
    "howRun": "",
    "scriptedBy": "",
    "scriptedDate": null,
    "scriptStatus": "",
    "scriptLocation": "",
    "status": "normal",
    "subStatus": "",
    "color": "",
    "frequency": "1",
    "order": 0,
    "openedBy": "admin",
    "openedDate": "2021-11-29T07:18:29Z",
    "reviewedBy": "",
    "reviewedDate": null,
    "lastEditedBy": "",
    "lastEditedDate": null,
    "version": 1,
    "linkCase": "",
    "fromBug": 0,
    "fromCaseID": 0,
    "fromCaseVersion": 1,
    "deleted": false,
    "lastRunner": "",
    "lastRunDate": null,
    "lastRunResult": "",
    "toBugs": [],
    "steps": [
        {
            "id": 5,
            "parent": 0,
            "case": 8,
            "version": 1,
            "type": "step",
            "desc": "步骤1",
            "expect": "结果1"
        }
    ],
    "files": [],
    "currentVersion": 1
}


请求基路径: https://zentao.fivepointtex.com/api.php/v1
GET
/testcases/:id
获取用例详情
请求头
名称	类型	必填	描述
Token	String	是	认证凭证Token
请求响应
名称	类型	必填	描述
id	int	是	用例ID
product	int	是	所属产品
branch	int	是	所属分支
module	int	是	所属模块
story	int	是	相关需求
storyVersion	int	是	需求版本
title	string	是	需求标题
precondition	string	是	前置条件
pri	int	是	优先级
type	string	是	用例类型(feature 功能测试 | performance 性能测试 | config 配置相关 | install 安装部署 | security 安全相关 | interface 接口测试 | unit 单元测试 | other 其他)
stage	string	是	适用阶段(unittest 单元测试阶段 | feature 功能测试阶段 | intergrate 集成测试阶段 | system 系统测试阶段 | smoke 冒烟测试阶段 | bvt 版本验证阶段)
steps	array	是	用例步骤列表
∟ desc	string	是	步骤
∟ expect	string	是	期望
fromBug	int	否	来自于Bug
fromCaseID	int	否	来自于用例
openedBy	string	是	创建人
openedDate	datetime	是	创建时间
status	string	否	状态(wait 待评审 | normal 正常 | blocked 被阻塞 | investigate 研究中)
响应示例
{
    "id": 9,
    "project": 0,
    "product": 1,
    "execution": 0,
    "branch": 0,
    "lib": 0,
    "module": 0,
    "path": 0,
    "story": 0,
    "storyVersion": 1,
    "title": "case1",
    "precondition": "",
    "keywords": "",
    "pri": 1,
    "type": "feature",
    "auto": "no",
    "frame": "",
    "stage": "",
    "howRun": "",
    "scriptedBy": "",
    "scriptedDate": null,
    "scriptStatus": "",
    "scriptLocation": "",
    "status": "normal",
    "subStatus": "",
    "color": "",
    "frequency": "1",
    "order": 0,
    "openedBy": {
        "id": 1,
        "account": "admin",
        "avatar": "",
        "realname": "管理员"
    },
    "openedDate": "2021-11-29T07:24:42Z",
    "reviewedBy": null,
    "reviewedDate": null,
    "lastEditedBy": null,
    "lastEditedDate": null,
    "version": 1,
    "linkCase": "",
    "fromBug": 0,
    "fromCaseID": 0,
    "fromCaseVersion": 1,
    "deleted": false,
    "lastRunner": "",
    "lastRunDate": null,
    "lastRunResult": "",
    "toBugs": [],
    "steps": [
        {
            "id": 6,
            "parent": 0,
            "case": 9,
            "version": 1,
            "type": "step",
            "desc": "步骤1",
            "expect": "结果1"
        }
    ],
    "files": [],
    "currentVersion": 1,
    "caseFails": 0
}


请求基路径: https://zentao.fivepointtex.com/api.php/v1
PUT
/testcases/:id
修改用例
请求头
名称	类型	必填	描述
Token	String	是	认证凭证Token
请求体
名称	类型	必填	描述
branch	int	否	所属分支
module	int	否	所属模块
story	int	否	所属需求
title	string	否	用例标题
type	string	否	用例类型(feature 功能测试 | performance 性能测试 | config 配置相关 | install 安装部署 | security 安全相关 | interface 接口测试 | unit 单元测试 | other 其他)
stage	string	否	适用阶段(unittest 单元测试阶段 | feature 功能测试阶段 | intergrate 集成测试阶段 | system 系统测试阶段 | smoke 冒烟测试阶段 | bvt 版本验证阶段)
precondition	string	否	前置条件
pri	int	否	优先级
steps	array	否	用例步骤
∟ desc	string	否	步骤
∟ expect	string	否	期望
keywords	string	否	关键词
请求示例
{
    "title": "case1",
    "pri": 1,
    "steps": [
        {
            "desc": "步骤1",
            "expect": "结果1"
        }
    ],
    "type": "feature"
}
请求响应
名称	类型	必填	描述
id	int	是	用例ID
product	int	是	所属产品
branch	int	是	所属分支
module	int	是	所属模块
story	int	是	相关需求
storyVersion	int	是	需求版本
title	string	是	需求标题
precondition	string	是	前置条件
pri	int	是	优先级
type	string	是	用例类型(feature 功能测试 | performance 性能测试 | config 配置相关 | install 安装部署 | security 安全相关 | interface 接口测试 | unit 单元测试 | other 其他)
stage	string	是	适用阶段(unittest 单元测试阶段 | feature 功能测试阶段 | intergrate 集成测试阶段 | system 系统测试阶段 | smoke 冒烟测试阶段 | bvt 版本验证阶段)
steps	array	是	用例步骤列表
∟ desc	string	是	步骤
∟ expect	string	是	期望
fromBug	int	否	来自于Bug
fromCaseID	int	否	来自于用例
openedBy	string	是	创建人
openedDate	datetime	是	创建时间
响应示例
{
    "id": 9,
    "project": 0,
    "product": 1,
    "execution": 0,
    "branch": 0,
    "lib": 0,
    "module": 0,
    "path": 0,
    "story": 0,
    "storyVersion": 1,
    "title": "case1",
    "precondition": "",
    "keywords": "",
    "pri": 1,
    "type": "feature",
    "auto": "no",
    "frame": "",
    "stage": "",
    "howRun": "",
    "scriptedBy": "",
    "scriptedDate": null,
    "scriptStatus": "",
    "scriptLocation": "",
    "status": "normal",
    "subStatus": "",
    "color": "",
    "frequency": "1",
    "order": 0,
    "openedBy": {
        "id": 1,
        "account": "admin",
        "avatar": "",
        "realname": "管理员"
    },
    "openedDate": "2021-11-29T07:24:42Z",
    "reviewedBy": null,
    "reviewedDate": null,
    "lastEditedBy": null,
    "lastEditedDate": null,
    "version": 1,
    "linkCase": "",
    "fromBug": 0,
    "fromCaseID": 0,
    "fromCaseVersion": 1,
    "deleted": false,
    "lastRunner": "",
    "lastRunDate": null,
    "lastRunResult": "",
    "toBugs": [],
    "steps": [
        {
            "id": 6,
            "parent": 0,
            "case": 9,
            "version": 1,
            "type": "step",
            "desc": "步骤1",
            "expect": "结果1"
        }
    ],
    "files": [],
    "currentVersion": 1,
    "caseFails": 0
}


请求基路径: https://zentao.fivepointtex.com/api.php/v1
DELETE
/testcases/:id
删除用例
请求头
名称	类型	必填	描述
Token	String	是	认证凭证Token
请求响应
名称	类型	必填	描述
message	string	是	结果信息
响应示例
{
    "message": "success"
}