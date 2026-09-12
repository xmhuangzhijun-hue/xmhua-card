# XMHUA Card

一个可自行部署的个人博客与作品集发布系统。**Next.js 前端与 Hono / PostgreSQL 内容后端独立运行**，通过 `/admin` 管理笔记、项目、导航与独立页面。内容更新通常不需要重新部署；视觉组件和部分作品集展示仍由源码维护。

在线实例：[huangzhijun.online](https://huangzhijun.online/) · [部署指南](docs/DEPLOYMENT.md) · [GitHub 自动同步](docs/GITHUB_SYNC.md) · [开源与隐私边界](docs/OPEN_SOURCE.md)

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

### 阅读与展示

- 全站知识场景首页、项目独立封面、毛玻璃材质、深浅主题与移动端布局
- React Bits 衍生动效：Waves、GradientText、StarBorder、SpotlightCard 等；保留第三方授权，支持暂停与减少动态效果
- 笔记分类、标签、搜索和深链接；正文目录、阅读进度、字号调整、专注阅读及复制链接
- 项目说明与贡献证据可展开，已有公开链接可直接访问

### GitHub 事实自动更新

- 通过 Octokit 每小时读取已配置公开仓库的 Star、主要语言、许可证、最近推送及最新 Release
- 贡献项目按作者读取 PR 状态；通过其他 PR 合入的修复以显式证据关联单独展示
- PostgreSQL 保留最近成功快照；失败显示延迟，不把请求失败当成零贡献
- 作者说明与自动事实分离；浏览器不接触管理凭据或数据库

这是带实际作品集配置的开源实现。Fork 后需要按 [同步说明](docs/GITHUB_SYNC.md) 替换仓库、作者和租户映射；不会自动发现你的全部项目，也不会自动判断两个补丁是否等价。

## 本地开发

需要 Node.js 24+。以下命令使用 Bash（Windows 可在 WSL 中执行）。

```bash
npm install
npm ci --prefix api
```

后端需要一个 PostgreSQL。没有现成实例时，可以用 PGlite 数据目录（进程内的真实 PostgreSQL，删目录即还原）：

```bash
cd api
export DATABASE_URL="pglite:./.dev-postgres"
export ADMIN_COOKIE_SECURE=false
export GITHUB_SYNC_DISABLED=true
npm run db:migrate
npm run db:seed
export ADMIN_USERNAME=owner
read -r -s -p "Admin password (at least 10 characters): " ADMIN_PASSWORD
export ADMIN_PASSWORD
npm run admin:create
unset ADMIN_PASSWORD
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
| `SITE_URL` | 你自己的公开 HTTPS 域名，用于 canonical 与站点地图 |
| `API_INTERNAL_BASE_URL` | 服务端渲染时访问后端的地址，通常是回环地址 |
| `NEXT_PUBLIC_API_BASE_URL` | 浏览器访问后端的地址；反向代理把 `/api` 挂在同源时留空 |

后端（`api/`）：

| 变量 | 用途 |
| --- | --- |
| `GITHUB_SYNC_DISABLED` | 设为 `true` 停用同步；本地开发及额外 API 实例建议停用 |
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

- 前端服务不持有数据库连接或管理密钥；浏览器中的后台编辑仍通过鉴权 API 写入。此边界不等于抵御所有前端或会话攻击
- 管理接口校验输入并执行租户限定；需要多步原子性的操作使用事务
- 管理接口默认拒绝：没有有效会话 Cookie 或机器密钥一律 401
- 修改密码会吊销该账号的全部会话
- 笔记正文先整体转义再套用 Markdown 规则，`javascript:` 和 `data:` 链接不会生成
- 真实密钥、Token、数据库备份、上传文件和私有笔记不应提交到开源仓库；通过受保护的运行环境配置凭据

## 验证与授权

```bash
npm run lint
npm run typecheck
npm run security:check
npm run check --prefix api
node api/node_modules/tsx/dist/cli.mjs api/src/scripts/github-regression.ts
node api/node_modules/tsx/dist/cli.mjs api/src/scripts/github-storage-regression.ts
```

构建还需要可访问的内容 API；CI 使用仓库内的演示数据桩。部署后应再次检查登录、内容保存回读、公开正文、同步时间及移动端交互。

项目采用 [MIT](LICENSE)；第三方组件遵循其各自授权，React Bits 授权保留于 `src/components/react-bits/LICENSE.md`。仓库包含公开展示数据和 Demo，不能把它们当作真实生产业务数据。
