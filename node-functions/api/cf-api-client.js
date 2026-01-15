/**
 * Cloudflare API Client
 * 专门用于对接Cloudflare API的客户端模块
 */

import fs from 'fs';
import path from 'path';
import 'dotenv/config';

class CloudflareAPIClient {
  constructor() {
    this.baseURL = 'https://api.cloudflare.com/client/v4';
    this.token = this.getToken();
  }

  /**
   * 获取API令牌
   */
  getToken() {
    let token = process.env.CF_API_TOKEN;
    if (token) return token;

    try {
      const tokenPath = `${process.cwd()}/cf_token.txt`;
      if (fs.existsSync(tokenPath)) {
        token = fs.readFileSync(tokenPath, 'utf-8').trim();
      }
    } catch (e) {
      console.error('Error reading cf_token.txt', e);
    }
    return token;
  }

  /**
   * 通用API请求方法
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const defaultHeaders = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, config);
      
      // 检查HTTP状态码
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // 检查Cloudflare API的success字段
      if (data && typeof data === 'object' && 'success' in data && data.success === false) {
        throw new Error(`Cloudflare API Error: ${data.errors ? data.errors.map(e => e.message).join(', ') : 'Unknown error'}`);
      }
      
      return data;
    } catch (error) {
      console.error(`Error making request to ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * 获取账户ID（从环境变量或通过API获取）
   */
  async getAccountId() {
    // 首先检查环境变量
    const accountId = process.env.CF_ACCOUNT_ID;
    if (accountId) {
      return accountId;
    }

    // 如果没有环境变量，则尝试从用户信息中获取
    try {
      const userInfo = await this.getUserInfo();
      if (userInfo && userInfo.success && userInfo.result && userInfo.result.id) {
        return userInfo.result.id;
      }
    } catch (error) {
      console.error('Error getting account ID:', error);
    }

    return null;
  }

  /**
   * 获取用户信息
   */
  async getUserInfo() {
    return await this.makeRequest('/user');
  }

  /**
   * 获取所有zones
   */
  async getZones(params = {}) {
    const url = new URL(`${this.baseURL}/zones`);
    
    // 添加查询参数
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.set(key, params[key]);
      }
    });

    return await this.makeRequest(`/zones?${url.searchParams.toString()}`);
  }

  /**
   * 获取特定zone的详细信息
   */
  async getZone(zoneId) {
    return await this.makeRequest(`/zones/${zoneId}`);
  }

  /**
   * 获取zone的流量统计数据
   */
  async getZoneAnalytics(zoneId, params = {}) {
    const url = new URL(`${this.baseURL}/zones/${zoneId}/analytics/summary`);
    
    // 默认时间范围：过去24小时
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const defaultParams = {
      since: yesterday.toISOString(),
      until: now.toISOString()
    };
    
    // 合并参数
    const allParams = { ...defaultParams, ...params };
    
    Object.keys(allParams).forEach(key => {
      if (allParams[key] !== undefined && allParams[key] !== null) {
        url.searchParams.set(key, allParams[key]);
      }
    });

    return await this.makeRequest(`/zones/${zoneId}/analytics/summary?${url.searchParams.toString()}`);
  }

  /**
   * 获取zone的时间序列流量数据
   */
  async getZoneAnalyticsSeries(zoneId, params = {}) {
    const url = new URL(`${this.baseURL}/zones/${zoneId}/analytics/series`);
    
    // 默认参数
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const defaultParams = {
      since: yesterday.toISOString(),
      until: now.toISOString(),
      continuous: 'true',
      metrics: 'requests,bandwidth,uniques'
    };
    
    // 合并参数
    const allParams = { ...defaultParams, ...params };
    
    Object.keys(allParams).forEach(key => {
      if (allParams[key] !== undefined && allParams[key] !== null) {
        url.searchParams.set(key, allParams[key]);
      }
    });

    return await this.makeRequest(`/zones/${zoneId}/analytics/series?${url.searchParams.toString()}`);
  }

  /**
   * 获取zone的顶级流量数据（如top countries, top urls等）
   */
  async getZoneAnalyticsDashboard(zoneId, params = {}) {
    const url = new URL(`${this.baseURL}/zones/${zoneId}/analytics/dashboard`);
    
    // 默认时间范围
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const defaultParams = {
      since: yesterday.toISOString(),
      until: now.toISOString()
    };
    
    // 合并参数
    const allParams = { ...defaultParams, ...params };
    
    Object.keys(allParams).forEach(key => {
      if (allParams[key] !== undefined && allParams[key] !== null) {
        url.searchParams.set(key, allParams[key]);
      }
    });

    return await this.makeRequest(`/zones/${zoneId}/analytics/dashboard?${url.searchParams.toString()}`);
  }

  /**
   * 获取Workers统计信息
   */
  async getWorkersStats(accountId, params = {}) {
    if (!accountId) {
      accountId = await this.getAccountId();
    }
    
    if (!accountId) {
      throw new Error('Account ID is required for Workers API');
    }
    
    const url = new URL(`${this.baseURL}/accounts/${accountId}/workers/analytics`);
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.set(key, params[key]);
      }
    });

    return await this.makeRequest(`/accounts/${accountId}/workers/analytics?${url.searchParams.toString()}`);
  }

  /**
   * 获取Pages项目列表
   */
  async getPagesProjects(accountId, params = {}) {
    if (!accountId) {
      accountId = await this.getAccountId();
    }
    
    if (!accountId) {
      throw new Error('Account ID is required for Pages API');
    }
    
    const url = new URL(`${this.baseURL}/accounts/${accountId}/pages/projects`);
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.set(key, params[key]);
      }
    });

    return await this.makeRequest(`/accounts/${accountId}/pages/projects?${url.searchParams.toString()}`);
  }

  /**
   * 获取特定Pages项目的部署统计
   */
  async getPagesProjectDeployments(accountId, projectName, params = {}) {
    if (!accountId) {
      accountId = await this.getAccountId();
    }
    
    if (!accountId) {
      throw new Error('Account ID is required for Pages API');
    }
    
    const url = new URL(`${this.baseURL}/accounts/${accountId}/pages/projects/${projectName}/deployments`);
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.set(key, params[key]);
      }
    });

    return await this.makeRequest(`/accounts/${accountId}/pages/projects/${projectName}/deployments?${url.searchParams.toString()}`);
  }

  /**
   * 获取DDoS攻击事件
   */
  async getDdosEvents(zoneId, params = {}) {
    const url = new URL(`${this.baseURL}/zones/${zoneId}/ddos_events`);
    
    // 默认时间范围
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const defaultParams = {
      since: weekAgo.toISOString(),
      until: now.toISOString()
    };
    
    // 合并参数
    const allParams = { ...defaultParams, ...params };
    
    Object.keys(allParams).forEach(key => {
      if (allParams[key] !== undefined && allParams[key] !== null) {
        url.searchParams.set(key, allParams[key]);
      }
    });

    return await this.makeRequest(`/zones/${zoneId}/ddos_events?${url.searchParams.toString()}`);
  }

  /**
   * 获取防火墙事件
   */
  async getFirewallEvents(zoneId, params = {}) {
    const url = new URL(`${this.baseURL}/zones/${zoneId}/firewall/events`);
    
    // 默认时间范围
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    
    const defaultParams = {
      since: hourAgo.toISOString(),
      until: now.toISOString()
    };
    
    // 合并参数
    const allParams = { ...defaultParams, ...params };
    
    Object.keys(allParams).forEach(key => {
      if (allParams[key] !== undefined && allParams[key] !== null) {
        url.searchParams.set(key, allParams[key]);
      }
    });

    return await this.makeRequest(`/zones/${zoneId}/firewall/events?${url.searchParams.toString()}`);
  }
}

export default CloudflareAPIClient;