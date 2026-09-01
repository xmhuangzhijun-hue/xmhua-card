# XMHUA Card

一个个人博客：**前端和后端是两个独立的服务**。前端只负责渲染，所有内容、鉴权和写入都在后端。站点主人通过 `/admin` 后台增删改站点上的每一处内容，不需要改代码、不需要重新部署。

## 结构

```
xmhua-card/
├── api/          独立后端服务（Hono + Drizzle + PostgreSQL）
│   ├── src/      路由、服务层、数据模型、迁移脚本
│   └── drizzle/  数据库迁移
└── src/          Next.js 前端（不含数据库驱动，不含任何写接口）
```

前端**没有** `DATABASE_URL`，也没有 API 路由。它通过 HTTP 从后端读取内容，因此后端换语言、前端换框架互不影响。

## 功能

- 后端：Hono + PostgreSQL + Drizzle，多租户数据隔离，Zod 校验，事务写入
- 前端：Next.js 16 App Router + React 19，服务端渲染 + ISR，笔记与独立页面静态预渲染
- `/admin` 内容后台：账号密码登录，笔记 / 项目 / 社交账号 / 能力卡片 / 独立页面的完整增删改和排序，站点设置可视化编辑
- 后台首页列出「还没完成的部分」：正文太短的笔记、没填链接的项目和社交账号
- 笔记正文支持 Markdown，编辑器带实时预览；正文全部转义后渲染，不引入解析器依赖
- 没填地址（空或 `#`）的链接**不会**出现在公开页面上，站点不会对外露出点不开的链接
- `/privacy`、`/terms`、`/cookies` 等独立页面同样由后台编辑
- 密码用 scrypt 加盐哈希存储；会话只保存 token 的 SHA-256，Cookie 为 HttpOnly + SameSite=Lax

## 本地开发

需要 Node.js 24+。

```bash
npm install
npm ci --prefix api
```

后端需要一个 PostgreSQL。没有现成实例时，可以用 PGlite 数据目录（进程内的真实 PostgreSQL，删目录即还原）：

```bash
cd api
export DATABASE_URL="pglite:./.dev-postgres"
npm run db:migrate
npm run db:seed
ADMIN_USERNAME=你的用户名 ADMIN_PASSWORD=至少十位的密码 npm run admin:create
npm run dev
```

另开一个终端启动前端：

```bash
API_INTERNAL_BASE_URL=http://127.0.0.1:39300 npm run dev
```

打开 <http://127.0.0.1:3000>，后台在 <http://127.0.0.1:3000/admin>。

生产用真实 PostgreSQL 时，把 `DATABASE_URL` 换成 `postgres://...` 即可，代码路径不变。

## 配置

前端：

| 变量 | 用途 |
| --- | --- |
| `API_INTERNAL_BASE_URL` | 服务端渲染时访问后端的地址，通常是回环地址 |
| `NEXT_PUBLIC_API_BASE_URL` | 浏览器访问后端的地址；反向代理把 `/api` 挂在同源时留空 |

后端（`api/`）：

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接地址，必填。后端不提供无数据库的回退内容 |
| `API_PORT` / `API_HOST` | 监听端口和地址，默认 `127.0.0.1:39300` |
| `DB_POOL_MAX` | 连接池大小，默认 8 |
| `DEFAULT_TENANT_SLUG` | 未指定租户时使用的默认 slug |
| `ADMIN_SESSION_TTL_HOURS` | 后台登录有效期，默认 336 小时 |
| `ADMIN_COOKIE_SECURE` | 仅在本机明文 HTTP 调试时设为 `false` |
| `ADMIN_API_KEY` | 可选的机器凭据，供脚本和 CI 使用；后台登录不需要 |
| `CORS_ALLOWED_ORIGIN` | 前后端不同源时允许的 origin，逗号分隔；同源部署留空 |
| `SELF_SERVICE_SIGNUP_ENABLED` | 多租户自助建站开关，默认关闭 |
| `SIGNUP_INVITE_CODE` | 自助建站所需的私密邀请码 |
| `SIGNUP_RATE_LIMIT` / `SIGNUP_RATE_WINDOW_SECONDS` | 自助建站限流 |
| `MAX_TENANTS` | 租户总量上限 |
| `TRUST_PROXY_HEADERS` | 仅当可信反向代理会覆盖转发头时设为 `true` |

后台密码不写进代码、不进 Git。用 `npm run admin:create --prefix api` 创建或重置，密码通过 `ADMIN_PASSWORD` 环境变量传入，只有哈希入库。

## 数据流

```text
浏览器  ──GET /notes────────▶  Next.js  ──GET /api/content──▶  API  ──▶  PostgreSQL
浏览器  ──POST /api/auth/login──────────────────────────────▶  API  ──▶  PostgreSQL
浏览器  ──PUT  /api/admin/articles/12 （带会话 Cookie）──────▶  API  ──▶  PostgreSQL
```

反向代理把 `/api/*` 直接转发给后端服务，其余路径转发给 Next.js，因此后台 Cookie 是同源的，不需要 CORS。

## 部署

前后端是两个进程，各自有构建产物：

```bash
npm run build --prefix api    # 产出 api/dist，用 node dist/index.js 启动
npm run build                 # 产出 .next/standalone
```

构建前端时需要能访问后端（静态预渲染要读内容）。参考 `docs/DEPLOYMENT.md`。

## 安全边界

- 前端不持有数据库连接、管理密钥或写接口，被攻破也改不了内容
- 所有写入经 Zod 校验并在单个事务内完成
- 管理接口默认拒绝：没有有效会话 Cookie 或机器密钥一律 401
- 修改密码会吊销该账号的全部会话
- 笔记正文先整体转义再套用 Markdown 规则，`javascript:` 和 `data:` 链接不会生成
- 真实密钥、Token 和业务数据一律不入库外的任何文件，也不进仓库
