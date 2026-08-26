# XMHUA Card

一个 API 驱动、多租户的个人博客与公开名片系统。访客看到的身份信息、文案、导航、文章、产品、资源和社交链接都由后端内容接口提供；站点拥有者可以通过浏览器控制台维护内容，无需修改前端代码。

## 功能

- Next.js 16 App Router + React 19 + TypeScript
- PostgreSQL + Drizzle ORM，多租户数据隔离
- API 驱动的公开页面，支持 `?tenant=<slug>` 切换租户
- 前端支持独立 `NEXT_PUBLIC_API_BASE_URL`，后端提供可配置 CORS
- `/studio` 表单编辑器与 `/admin` 完整内容编辑器
- 租户自助创建和独立管理凭据
- Zod 校验、事务保存和默认拒绝的管理接口
- 无数据库时，仅公开读取可回退到服务端示例内容

## 快速开始

需要 Node.js 24+。只查看默认公开页面时可以不配置 PostgreSQL：

```bash
npm install
npm run dev
```

打开 <http://127.0.0.1:3000>。

需要内容管理、多租户写入或自助建站时：

```bash
copy .env.example .env.local
npm run db:generate
npm run db:migrate
npm run dev
```

请在 `.env.local` 中设置自己的 `DATABASE_URL` 和高强度 `ADMIN_API_KEY`。不要提交 `.env.local` 或任何真实密钥。

## 配置

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接地址；管理写入必需 |
| `DEFAULT_TENANT_SLUG` | 未指定租户时使用的默认 slug |
| `ADMIN_API_KEY` | 平台管理接口的 Bearer 密钥；写入必需 |
| `SELF_SERVICE_SIGNUP_ENABLED` | 是否开放访客自助创建站点，默认关闭 |
| `SIGNUP_INVITE_CODE` | 自助创建所需的私密邀请码 |
| `SIGNUP_RATE_LIMIT` / `SIGNUP_RATE_WINDOW_SECONDS` | 单个限流键在时间窗口内可提交的有效创建次数 |
| `SIGNUP_INVALID_INVITE_RATE_LIMIT` | 单个限流键在同一窗口内可提交的无效邀请码次数 |
| `MAX_TENANTS` | 数据库允许的租户总量上限 |
| `TRUST_PROXY_HEADERS` | 仅在可信反向代理会覆盖转发头时设为 `true` |
| `NEXT_PUBLIC_API_BASE_URL` | 前端调用的独立后端根地址；同源部署留空 |
| `CORS_ALLOWED_ORIGIN` | 后端允许访问的独立前端 origin；同源部署留空 |

平台管理和租户工作台始终要求 Bearer 凭据，本机访问也不例外。Docker Compose 默认只绑定 `127.0.0.1`；若要公开部署，应由受控反向代理提供 TLS 和外层限流。

## 内容与权限数据流

```text
浏览器页面 -> GET /api/content?tenant=<slug> -> PostgreSQL
                                      \-> 服务端只读回退（未配置数据库时）

平台管理员 -> /admin -> /api/admin/* -> 管理密钥校验 -> PostgreSQL 事务
租户拥有者 -> /studio -> /api/studio/* -> 租户令牌校验 -> PostgreSQL 事务
新租户     -> /start -> 邀请码与限流 -> /api/signup -> 创建租户、内容和一次性管理令牌
```

前端组件只负责渲染接口返回的数据。完整 HTTP 契约见 [docs/API.md](docs/API.md)，数据库说明见 [docs/BACKEND.md](docs/BACKEND.md)。

## 独立版本更新

前端和后端共用一个仓库，但分别在 `versions/frontend.json` 与 `versions/backend.json` 维护版本。只改一侧时可精确暂存该侧文件并单独提交、部署；API 兼容规则和发布顺序见 [docs/VERSIONING.md](docs/VERSIONING.md)。

## 常用命令

```bash
npm run dev       # 开发服务器
npm run lint      # ESLint
npm run typecheck # TypeScript 类型检查
npm run build     # 生产构建
npm run check     # lint + typecheck + build
npm run db:generate
npm run db:migrate
```

## 部署

部署到支持 Next.js 的平台，并提供 PostgreSQL 数据库与环境变量。生产环境至少应配置 `DATABASE_URL`、`DEFAULT_TENANT_SLUG` 和 `ADMIN_API_KEY`；开放自助建站前还必须配置 `SIGNUP_INVITE_CODE`、合理限额并完成数据库迁移。应用内限流是单进程防线，多实例公网部署仍应在网关层增加共享限流。管理密钥、邀请码和租户令牌都不应写入源码、构建日志或客户端默认配置。

## 开源与来源

本项目基于 [JCodesMore/ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template) 开发，视觉实现参考 [hooosberg.com](https://hooosberg.com/)。上游名称、商标、原始文案和视觉资产归各自权利人所有；本仓库与其没有官方隶属关系。使用或部署前，请自行确认你对品牌、内容和素材拥有必要权利。

项目按 [MIT License](LICENSE) 开源。
