# EdgeOne Monitoring Dashboard (EdgeOne 监控大屏)

> [!NOTE]
> 提示：本项目已全面支持腾讯云 EdgeOne 全球版（中国站与国际站账号均可直接使用）。

### 效果图
<img width="2087" height="11971" alt="image" src="https://github.com/user-attachments/assets/cc71dc11-8a5d-4d59-9543-e0dbabac4b33" />



这是一个基于 Tencent Cloud EdgeOne API 构建的实时监控大屏，旨在提供直观的流量和请求分析。

## ✨ 主要功能

- **实时概览**：展示站点总请求数、总流量、总带宽等关键指标。
- **多维度分析**：
  - **国家/地区排行**：支持中英文显示，直观展示流量来源。
  - **省份/状态码/域名/URL/资源类型**：全方位的 Top N 分析。
- **回源分析**：监控回源流量、带宽及请求数，掌握源站负载。
- **灵活查询**：
  - 支持自定义时间段（近1小时 - 近31天）。
  - 支持切换数据粒度（分钟/小时/天/自动）。
- **个性化配置**：支持自定义站点名称。

## 🚀 快速部署

### 方式一：EdgeOne Pages (推荐)

1. Fork 本仓库到您的 GitHub 账号。
2. 前往 [腾讯云 EdgeOne 控制台](https://console.cloud.tencent.com/edgeone) 创建 Pages 项目。
3. 连接您的 GitHub 仓库。
4. 在 **环境变量 (Environment Variables)** 中添加以下配置：
   # Cloudflare Traffic Monitoring (Cloudflare 流量监控)

   本项目已迁移为使用 Cloudflare API 作为数据源，提供站点流量与请求的可视化监控面板。

   ## 效果

   前端使用 ECharts 等可视化组件，后端通过 Cloudflare REST API 获取流量与分析数据。

   ## ✨ 主要功能

   - 实时概览：展示站点总请求数、总流量、带宽等关键指标（来自 Cloudflare Analytics）。
   - 多维度分析：国家/地区、状态码、URL、资源类型等 Top N 分析（基于 Cloudflare 返回的数据）。
   - 灵活查询：支持自定义时间段（ISO 时间字符串）、可查询历史区间。
   - 个性化配置：通过环境变量自定义站点标题与图标。

   ## 环境变量 / 配置

   - `CF_API_TOKEN`：必需，Cloudflare API Token（推荐使用带 `Zone.Zone` 与 `Zone.Analytics` 权限的 Token）。
   - `SITE_NAME`：可选，大屏标题（默认 `Cloudflare 流量监控`）。
   - `SITE_ICON`：可选，网站图标 URL。

   也可将 API token 放在项目根目录的 `cf_token.txt` 文件中（仅在本地测试时使用）。

   ## 🚀 本地运行（Node.js）

   1. 克隆仓库并进入目录：

   ```bash
   git clone https://github.com/afoim/eo_monitior
   cd eo_monitior
   ```

   2. 安装依赖并运行（根据项目实际脚本调整）：

   ```bash
   npm install
   # 在支持 Node 的环境下启动后端（根据项目结构而定）
   npm run dev
   # 或者直接运行 node 后端（视项目结构而定）
   node server.js
   ```

   3. 设置环境变量（示例 `.env`）：

   ```env
   CF_API_TOKEN=xxxxxx
   SITE_NAME=我的 Cloudflare 站点监控
   SITE_ICON=https://example.com/favicon.png
   ```

   4. 访问前端（视前端部署地址而定）。

   ## 常见端点（后端）

   - `GET /config`：返回 `siteName` 与 `siteIcon`。
   - `GET /zones`：列出 Cloudflare Zone 列表，支持 `?name=` 过滤。
   - `GET /traffic?zoneId=...&since=...&until=...&metrics=bandwidth,requests`：查询指定 Zone 的时间序列指标。

   ## 权限建议

   为安全起见，建议创建最小权限的 API Token，仅授予：

   - Zone.Zone: read
   - Zone.Analytics: read

   如果需要管理域名或其他操作，再额外授权。

   ## 技术栈

   - 后端：Node.js, Express
   - 前端：HTML5, Tailwind CSS, ECharts

   ---

   如果你希望我同时更新前端以显示 Cloudflare 特有的指标（例如 requests/bandwidth 分时图），我可以继续实现对应的前端适配。
