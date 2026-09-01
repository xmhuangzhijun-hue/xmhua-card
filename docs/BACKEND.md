# 后端

后端是 `api/` 下的独立 Node 服务，与前端分开构建、分开部署、分开重启。前端不含数据库驱动。

## 分层

```
api/src/
├── index.ts          进程入口：连接数据库，挂载路由，统一错误处理
├── env.ts            环境变量解析，唯一读取 process.env 的地方
├── db/               Drizzle schema、连接、迁移入口
├── lib/              密码、会话、HTTP 辅助、内容 Schema、注册限流
├── services/         业务逻辑：租户、内容读取、集合增删改、鉴权、多租户开通
├── routes/           HTTP 路由，只做参数解析与响应
└── scripts/          建账号、安全回归
```

路由不直接写数据库，服务层不关心 HTTP。Zod Schema 集中在 `lib/content-schema.ts`，读写共用同一份定义。

## 数据模型

| 表 | 说明 |
| --- | --- |
| `tenants` | 租户，含自助建站令牌哈希 |
| `site_settings` | 每租户一份 JSON 设置文档，键为 `homepage` |
| `articles` | 笔记，含 Markdown 正文、slug、发布状态、排序 |
| `products` | 首页项目卡片 |
| `directory_links` | 能力地图卡片 |
| `social_links` | 社交账号 |
| `pages` | 独立页面（隐私政策、服务条款、Cookie 说明等） |
| `admin_users` | 后台账号，密码为 scrypt 哈希 |
| `admin_sessions` | 会话，只存 token 的 SHA-256 与过期时间 |

后三张表由迁移 `0004` 新增，均为 `CREATE TABLE`，不改动既有表，因此可以在不停机的情况下先迁移再发布，回滚也不需要回退数据库。

## 数据库连接

`DATABASE_URL` 以 `postgres://` 开头时使用 postgres-js 连接真实实例；以 `pglite:` 开头时使用进程内 PGlite 数据目录，仅供本地开发。PGlite 依赖是 devDependency 且动态导入，生产构建不会加载。

## 安全约定

- 管理接口默认拒绝，会话 Cookie 与机器密钥二选一
- 密码校验对不存在的账号也消耗等量计算
- 改密码会吊销该账号全部会话
- 每次登录都会顺带清理过期会话
- 所有写入先经 Zod 校验，集合重排在单个事务内完成
- 跨租户 id 按不存在处理

`npm run security:check --prefix api` 覆盖上述断言，无需数据库即可运行，并在 CI 中执行。
