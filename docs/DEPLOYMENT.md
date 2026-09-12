# 自行部署

前端和 API 是两个独立进程。下列路径、服务名和端口都是示例；替换为自己的服务器配置，不包含作者的主机地址、运维账号或凭据。

## 构建与配置

在与目标服务器兼容的 Linux 环境构建。资源有限的服务器建议只运行产物，不在服务器上执行 Next.js 构建。

```bash
npm ci
npm ci --prefix api
npm run build --prefix api
API_INTERNAL_BASE_URL=http://127.0.0.1:39300 npm run build
```

前端构建需要可访问的内容 API。前端产物为 `.next/standalone`，另将 `public` 和 `.next/static` 分别复制到产物的 `public`、`.next/static`；保留该次构建自己的完整依赖。API 产物为 `api/dist`、运行依赖、`package.json` 和迁移目录。

- 前端环境：`SITE_URL`、`API_INTERNAL_BASE_URL`。不要给前端配置数据库密码。
- 后端环境：`DATABASE_URL`、`API_PORT`、`DEFAULT_TENANT_SLUG`、会话配置与持久上传目录。
- 环境文件存放在发布目录之外，仅服务管理员和运行身份可读取。不要提交实际配置到 Git。
- PostgreSQL 和 API 仅监听回环或受控私网；公网通过 HTTPS 反向代理进入。

## 初始化

首次部署先备份数据库，再执行已审查的迁移。用 `npm run db:migrate --prefix api` 应用迁移；`db:seed` 仅用于初始化演示内容，不要对已有生产内容盲目重跑。通过 `admin:create` 创建管理员，密码由受保护的环境提供，避免写进命令历史。

HTTPS 生产站点使用安全 Cookie；`ADMIN_COOKIE_SECURE=false` 只用于明文 HTTP 的本地开发。上传文件和 PostgreSQL 数据必须独立于代码发布目录持久化。

## 反向代理与服务

反向代理将 `/api/` 转给 API，其余路径转给 Next.js：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:39300;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
}
```

API 启动命令为 `node dist/index.js`，前端 standalone 为 `node server.js`。用进程管理器分别管理，以便独立重启和回滚。`TRUST_PROXY_HEADERS` 仅在确认可信代理覆盖转发头之后启用。

## GitHub 自动同步

按照 [GITHUB_SYNC.md](GITHUB_SYNC.md) 修改公开仓库、作者及租户映射。只保留一个启用调度的 API 进程，其余实例设置 `GITHUB_SYNC_DISABLED=true`。当前实现使用公开 API，不需要 GitHub Token；限流时保留旧快照。用 `/api/github` 和项目卡片上的成功时间核对实际结果。

## 发布与回滚

1. 将前后端产物放入新的版本目录，校验上传前后的 SHA-256。
2. 在独立回环端口启动候选，禁用候选同步调度；验证健康、公开正文、管理鉴权与快照读取。
3. 实际启动一次旧版本，确认回滚可运行；再切换指向新版本的链接或进程配置。
4. 分别重启 API、前端，并进行有界就绪轮询，避免把启动瞬间的 502 当成永久失败。
5. 在公网验证业务路径。失败则恢复旧版本。数据库迁移是否兼容旧代码必须逐次评估，不能默认所有迁移均可逆。

最低验收：公开首页/笔记/正文可读，登录及保存回读成功，未登录管理接口拒绝访问，移动端无溢出，GitHub 同步显示真实时间，原有服务没有受影响。
