# Cloudflare Traffic Monitoring Dashboard

本项目使用 Cloudflare API 作为数据源，提供站点流量与请求的可视化监控面板。

## 效果

前端使用 ECharts 等可视化组件，后端通过 Cloudflare REST API 获取流量与分析数据。

## ✨ 主要功能

- 实时概览：展示站点总请求数、总流量、带宽等关键指标（来自 Cloudflare Analytics）。
- 多维度分析：国家/地区、状态码、URL、资源类型等 Top N 分析（基于 Cloudflare 返回的数据）。
- 灵活查询：支持自定义时间段（ISO 时间字符串）、可查询历史区间。
- 个性化配置：通过环境变量自定义站点标题与图标。
- 支持 Cloudflare Pages 部署：包含完整的后端 API 实现。

## 环境变量 / 配置

- `CF_API_TOKEN`：必需，Cloudflare API Token（推荐使用带 `Zone.Zone` 与 `Zone.Analytics` 权限的 Token）。
- `SITE_NAME`：可选，大屏标题（默认 `Cloudflare 流量监控`）。
- `SITE_ICON`：可选，网站图标 URL。
- `USE_LOCAL_MOCK`：可选，设置为 `1` 时使用本地模拟数据而不是真实API。

也可将 API token 放在项目根目录的 `cf_token.txt` 文件中（仅在本地测试时使用）。

## 🚀 快速部署

### 方式一：Cloudflare Pages (推荐)

1. Fork 本仓库到您的 GitHub 账号。
2. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/) 创建 Pages 项目。
3. 连接您的 GitHub 仓库。
4. 在 **环境变量 (Environment Variables)** 中添加以下配置：
   - `CF_API_TOKEN`：您的 Cloudflare API Token
   - `SITE_NAME`：可选的站点名称

### 方式二：本地运行（Node.js）

1. 克隆仓库并进入目录：

```bash
git clone <your-repo-url>
cd cloudflare-traffic-monitor
```

2. 安装依赖并运行：

```bash
npm install
# 在支持 Node 的环境下启动后端
npm run dev
# 或者直接运行 node 后端
node server.js
```

3. 设置环境变量（示例 `.env`）：

```env
CF_API_TOKEN=your_cloudflare_api_token_here
SITE_NAME=我的 Cloudflare 站点监控
SITE_ICON=https://example.com/favicon.png
```

## API 端点

- `GET /config`：返回 `siteName` 与 `siteIcon`。
- `GET /zones`：列出 Cloudflare Zone 列表，支持 `?name=` 过滤。
- `GET /traffic?zoneId=...&startTime=...&endTime=...&metrics=bandwidth,requests`：查询指定 Zone 的时间序列指标。
- `GET /pages/build-count`：获取 Pages 构建计数信息。
- `GET /pages/cloud-function-requests`：获取 Cloud Functions 请求数统计。
- `GET /pages/cloud-function-monthly-stats`：获取 Cloud Functions 月度统计。

## Cloudflare API 集成说明

### API 认证
本项目使用 Bearer Token 认证方式访问 Cloudflare API。您需要创建具有以下权限的 API Token：
- Zone: Zone - Read
- Zone: Analytics - Read

### API 端点详情
- **Zone 列表**: `GET https://api.cloudflare.com/client/v4/zones`
- **流量分析**: `GET https://api.cloudflare.com/client/v4/zones/{zone_id}/analytics/series`
- **请求参数**:
  - `metrics`: 指标名称，如 `requests`, `bandwidth`, `uniques`
  - `since`: 开始时间 (ISO 8601 格式)
  - `until`: 结束时间 (ISO 8601 格式)
  - `continuous`: 是否连续数据

### 权限建议

为安全起见，建议创建最小权限的 API Token，仅授予：

- Zone.Zone: read
- Zone.Analytics: read

如果需要管理域名或其他操作，再额外授权。

## 技术栈

- 后端：Node.js, Express
- 前端：HTML5, Tailwind CSS, ECharts
- 部署：Cloudflare Pages + Functions