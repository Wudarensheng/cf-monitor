/**
 * 本地开发服务器
 * 用于测试Cloudflare API连接
 */

import express from 'express';
import 'dotenv/config';
import apiApp from './node-functions/api/[[default]].js';

const app = express();
const PORT = process.env.PORT || 3000;

// 使用API路由
app.use('/api', apiApp);

// 提供静态文件服务
app.use(express.static('.'));

// 根路径返回index.html
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '.' });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log('API端点可通过 http://localhost:' + PORT + '/api 访问');
  
  if (!process.env.CF_API_TOKEN) {
    console.log('\n⚠️  警告：未检测到 CF_API_TOKEN 环境变量');
    console.log('请设置 CF_API_TOKEN 或创建 .env 文件以使用真实API数据');
    console.log('当前将使用本地模拟数据进行演示');
  }
});