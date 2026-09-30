# 视频发布

管理员后台的「视频发布」管理视频、平台登录任务及逐平台发布记录。前端沿用现有管理员会话；内容 API 保存 PostgreSQL 队列和私有视频；发布电脑通过 HTTPS 拉取任务，调用上游 [social-auto-upload](https://github.com/dreammis/social-auto-upload) CLI。发布电脑不开入站端口，博客不保存平台 Cookie。

## 当前范围

- 小红书、视频号、抖音、B站、YouTube；每台执行器每个平台一个账号。
- MP4 最大 512 MB；视频只通过管理员上传和执行器鉴权下载，不能匿名读取。
- 登录在发布电脑打开浏览器；B站打开交互终端。首次需要本人扫码或验证。
- 上传一次后选择平台、填写标题/简介/话题，确认后创建多个任务；执行器按顺序执行。B站可指定分区 ID。
- 页面每五秒读取状态。离线、未登录或检查过期时禁止提交发布。
- 上游返回成功只显示「已提交 · 待平台核验」，不声称已经审核通过或公开。失败、中断均不自动重试。
- 暂不包含定时、封面上传、发布后链接自动回填和平台公开状态回查。

## 安装执行器

上游验证版本 `0012d2c355f88f683cc38dde2a2db209e14091bc`；使用 Python 3.12 独立环境，按其 `docs/install.md` 安装。该版本 CLI 导入旧模块还需要 `playwright==1.58.0`，主安装清单没有声明；另安装这一依赖。可通过 `chrome` 指定已安装的 Google Chrome，避免改动浏览器用户配置。没有修改上游源码。

在受保护的私有目录创建配置文件（不能放仓库或同步盘）：

```json
{
  "site": "https://example.com",
  "token": "issued-by-admin-api",
  "privateDir": "<private-runtime-directory>",
  "upstream": "<social-auto-upload-checkout>",
  "chrome": "<installed-chrome-executable>"
}
```

管理员调用 `POST /api/admin/publishing/workers`，body `{ "name": "发布电脑" }`，将一次返回的 token 直接写入上述私有配置。服务端仅保存哈希。使用上游虚拟环境的 Python 运行 `scripts/publishing/worker.py --config <private-config-path>`。停止本机进程即可离线；`DELETE /api/admin/publishing/workers/:id` 吊销它并取消排队任务。首次没有自动启动项；电脑重启后手动运行助手。

上游 Cookie、浏览器缓存、诊断目录全部置于 `privateDir`。薄适配器关闭上游日志处理器，网站只收到固定状态说明，不回传原始 stdout/stderr。任务标题和平台是参数数据，以参数数组调用，不拼 shell。

## 服务端部署

应用 `0008_video_publishing` 的三个新增表，不修改现有内容表。视频存储于持久 `UPLOAD_DIR/private-video/`，Nginx 对 `/api/admin/publishing/assets` 设置 `client_max_body_size 512m`、`proxy_request_buffering off` 和足够上传超时。该路径不能增加静态文件映射。前后端构建/候选/回滚沿用 `DEPLOYMENT.md`。

任务用 `(tenant_id, request_id, platform)` 唯一约束防止重放；认领对执行器行加写锁，并在同一事务标记 running。running 不自动回队列。执行器先落本地待回执记录，网络失败仅重传回执；重启将未决 running 标为待核验。

验证命令：`node api/node_modules/tsx/dist/cli.mjs api/src/scripts/publishing-regression.ts`。真实多平台上传需本人完成账号登录并指定视频后验收。
