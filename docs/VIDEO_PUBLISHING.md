# 视频发布

管理员后台的「视频发布」管理视频、平台登录任务及逐平台发布记录。前端沿用现有管理员会话；内容 API 保存 PostgreSQL 队列和私有视频；独立执行器通过受鉴权接口拉取任务，调用上游 [social-auto-upload](https://github.com/dreammis/social-auto-upload) CLI。平台 Cookie 只存执行器私有目录，前端和内容 API 不读取它们。云端模式无需本机助手；本地模式仍可单独部署。

## 当前部署选择（2026-10-02 晚间）

按站长的预算和云主机资源约束，生产现已切回本机执行。网站继续提供原后台入口、私有视频存储和任务记录；本机助手负责平台浏览器、账号登录与提交。云端发布及桌面服务已停止并禁用，云执行器凭据已吊销。小红书和视频号复用原本机会话并通过新检查；其他平台仍需本人首次登录。

助手配置为登录 Windows 后启动，重复启动会复用已有进程。发布时电脑需开机联网。自动启动配置已恢复，但未重启 Windows 验收。下方云端模板保留为可选部署能力，不代表当前生产在云端执行。

## 云端执行

云端部署使用独立系统账号运行执行器，systemd 开机启动、异常重启，并对浏览器进程设置内存上限。云端配置加 `"cloud": true`，`chrome` 指向固定版本的浏览器，必要时 `youtubeProxy` 指向管理员已有的出口。账号会话保存在该服务的私有状态目录，不复制到前端、公开文件或日志。

后台默认选择 API 的 `PUBLISHING_CLOUD_WORKER_ID` 指定的执行器。首次点击平台登录会打开嵌入式 noVNC 窗口，用户直接扫码、输入验证码或操作 B站终端。窗口关闭后，云端任务继续运行。平台账号首次授权仍须本人完成。

部署模板在 `scripts/publishing/cloud-*.service` 和 `cloud-nginx.conf.example`。TigerVNC 和 websockify 仅监听回环地址；Nginx 的桌面页面和 WebSocket 均通过现有管理员会话鉴权，云执行器必须属于该租户；WebSocket 还检查精确 Origin。不得把 5906/6086 暴露到公网。安装成熟上游 noVNC/websockify，不另写远程浏览器协议。

执行器服务、API、前端和 Nginx 需共同验收：匿名和其他租户不能连接桌面；真实后台可连接并打开云端平台窗口；停止本机助手后任务仍可回传。真实视频发布另须指定内容并核验平台实际结果。

云端浏览器使用固定可执行文件覆盖上游 channel 名称，导航超时为 90 秒，以适应小主机冷启动；任务仍有总超时和进程组清理。单个任务顺序执行，视频临时副本在任务结束后释放。上传与下载均检查可用空间，512 MB 是单文件上限，并不代表当前主机一定有足够空间。

## 当前范围

- 小红书、视频号、抖音、B站、YouTube；每台执行器每个平台一个账号。
- MP4 最大 512 MB；视频只通过管理员上传和执行器鉴权下载，不能匿名读取。
- 本地模式在发布电脑打开浏览器；云端模式在后台内嵌窗口打开浏览器。B站使用交互终端。首次需要本人扫码或验证。
- 上传一次后选择平台、填写标题/简介/话题，确认后创建多个任务；执行器按顺序执行。B站可指定分区 ID。
- 页面每五秒读取状态。离线、未登录或检查过期时禁止提交发布。
- 上游返回成功只显示「已提交 · 待平台核验」，不声称已经审核通过或公开。失败、中断均不自动重试。
- 暂不包含定时、封面上传、发布后链接自动回填和平台公开状态回查。

## 安装执行器

上游验证版本 `0012d2c355f88f683cc38dde2a2db209e14091bc`；使用 Python 3.11 或 3.12 独立环境，按其 `docs/install.md` 安装。该版本 CLI 导入旧模块还需要 `playwright==1.58.0`，主安装清单没有声明；另安装这一依赖。必须用同一虚拟环境运行 `python -m patchright install chromium`，下载匹配的浏览器运行包。配置 `chrome` 只影响部分上游路径，不能替代配套 Chromium：例如小红书登录和上传直接使用 `channel="chromium"`。没有修改上游源码。

登录按钮全部灰色时，先检查发布电脑是否在线；启动助手并等待页面刷新。账号尚未配置时，`check` 可能直接返回未登录，不能据此认定浏览器或登录窗口已经可用。安装验收须另外验证可见登录窗口，扫码及账号认证由本人完成。

用上游虚拟环境运行 `python scripts/publishing/verify_runtime.py --upstream <social-auto-upload-checkout>`，可在临时空账号目录验证实际适配器、私有路径、匹配浏览器及上游静态脚本初始化，不会登录或发布。适配器仅将读取内置 JS 的工具模块指向源码目录，Cookie 和日志仍写私有目录。

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

管理员调用 `POST /api/admin/publishing/workers`，body `{ "name": "发布电脑" }`，将一次返回的 token 直接写入上述私有配置。服务端仅保存哈希。使用上游虚拟环境的 Python 运行 `scripts/publishing/worker.py --config <private-config-path>`。停止本机进程即可离线；`DELETE /api/admin/publishing/workers/:id` 吊销它并取消排队任务。本地模式需要电脑保持运行；云端模式使用上述 systemd 单元常驻，电脑不参与执行。

上游 Cookie、浏览器缓存、诊断目录全部置于 `privateDir`。薄适配器关闭上游日志处理器，网站只收到固定状态说明，不回传原始 stdout/stderr。任务标题和平台是参数数据，以参数数组调用，不拼 shell。

## 服务端部署

应用 `0008_video_publishing` 的三个新增表，不修改现有内容表。视频存储于持久 `UPLOAD_DIR/private-video/`，Nginx 对 `/api/admin/publishing/assets` 设置 `client_max_body_size 512m`、`proxy_request_buffering off` 和足够上传超时。该路径不能增加静态文件映射。前后端构建/候选/回滚沿用 `DEPLOYMENT.md`。

任务用 `(tenant_id, request_id, platform)` 唯一约束防止重放；认领对执行器行加写锁，并在同一事务标记 running。running 不自动回队列。执行器先落本地待回执记录，网络失败仅重传回执；重启将未决 running 标为待核验。

验证命令：`node api/node_modules/tsx/dist/cli.mjs api/src/scripts/publishing-regression.ts`。真实多平台上传需本人完成账号登录并指定视频后验收。
