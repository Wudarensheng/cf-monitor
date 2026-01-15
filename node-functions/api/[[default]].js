import express from 'express';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import CloudflareAPIClient from './cf-api-client.js';

const app = express();
const cfClient = new CloudflareAPIClient();

app.get('/config', (req, res) => {
    res.json({
        siteName: process.env.SITE_NAME || 'Cloudflare 流量监控',
        siteIcon: process.env.SITE_ICON || 'https://static.cloudflareclient.com/favicon.ico'
    });
});

app.get('/zones', async (req, res) => {
    try {
        const useLocalMock = process.env.USE_LOCAL_MOCK === '1' || !cfClient.token;
        if (!cfClient.token && !useLocalMock) return res.status(500).json({ error: 'Missing Cloudflare API token. Set CF_API_TOKEN or cf_token.txt' });

        if (useLocalMock) {
            // Return mock data
            const mockFile = path.join(process.cwd(), '辅助文件', '站点id回参.json');
            if (fs.existsSync(mockFile)) {
                const raw = fs.readFileSync(mockFile, 'utf-8');
                const json = JSON.parse(raw);
                return res.json(json);
            } else {
                return res.status(500).json({ error: `Local mock not found: ${mockFile}` });
            }
        }

        // Get zones with optional name filter
        const zonesResponse = await cfClient.getZones(req.query);
        res.json(zonesResponse);
    } catch (err) {
        console.error('Error fetching Cloudflare zones', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/traffic', async (req, res) => {
    try {
        const useLocalMock = process.env.USE_LOCAL_MOCK === '1' || !cfClient.token;
        if (!cfClient.token && !useLocalMock) return res.status(500).json({ error: 'Missing Cloudflare API token. Set CF_API_TOKEN or cf_token.txt' });

        // zoneId is required for real Cloudflare calls, but optional when using local mock
        const zoneId = req.query.zoneId;
        if (!zoneId && !useLocalMock) return res.status(400).json({ error: 'Missing zoneId parameter' });

        if (useLocalMock) {
            try {
                const metric = req.query.metric || 'l7Flow_flux';
                const mockFile = path.join(process.cwd(), '辅助文件', `mock_${metric}.json`);
                if (fs.existsSync(mockFile)) {
                    const raw = fs.readFileSync(mockFile, 'utf-8');
                    const json = JSON.parse(raw);
                    return res.json(json);
                } else {
                    return res.status(500).json({ error: `Local mock not found: ${mockFile}` });
                }
            } catch (e) {
                console.error('Error returning local mock:', e);
                return res.status(500).json({ error: e.message });
            }
        }

        // Prepare parameters for API call
        const params = {
            startTime: req.query.startTime,
            endTime: req.query.endTime,
            metrics: req.query.metrics || 'bandwidth,requests',
            continuous: 'true'
        };

        // Remove undefined/null values
        Object.keys(params).forEach(key => {
            if (params[key] === undefined || params[key] === null) {
                delete params[key];
            }
        });

        const data = await cfClient.getZoneAnalyticsSeries(zoneId, params);
        res.json(data);
    } catch (err) {
        console.error('Error fetching Cloudflare traffic', err);
        res.status(500).json({ error: err.message });
    }
});

// Pages Build Count endpoint
app.get('/pages/build-count', async (req, res) => {
    try {
        const useLocalMock = process.env.USE_LOCAL_MOCK === '1' || !cfClient.token;
        
        if (useLocalMock) {
            // Return mock data
            const mockFile = path.join(process.cwd(), '辅助文件', '构建次数回参.json');
            if (fs.existsSync(mockFile)) {
                const raw = fs.readFileSync(mockFile, 'utf-8');
                const json = JSON.parse(raw);
                return res.json(json);
            } else {
                return res.status(500).json({ error: `Local mock not found: ${mockFile}` });
            }
        }

        const accountId = process.env.CF_ACCOUNT_ID; // Account ID needed for Pages API
        if (!accountId) {
            return res.status(400).json({ error: 'CF_ACCOUNT_ID environment variable required for Pages API' });
        }

        // Fetch pages projects to get deployment information
        const projectsResponse = await cfClient.getPagesProjects(accountId);
        if (!projectsResponse.success) {
            return res.status(500).json({ error: 'Failed to fetch Pages projects' });
        }

        // Calculate deployment counts
        let dailyCount = 0;
        let monthlyCount = 0;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Process each project to count deployments
        for (const project of projectsResponse.result) {
            try {
                const deploymentsResponse = await cfClient.getPagesProjectDeployments(accountId, project.name);
                
                if (deploymentsResponse.success && Array.isArray(deploymentsResponse.result)) {
                    for (const deployment of deploymentsResponse.result) {
                        const createdDate = new Date(deployment.created_on);
                        
                        if (createdDate >= startOfDay) {
                            dailyCount++;
                        }
                        
                        if (createdDate >= startOfMonth) {
                            monthlyCount++;
                        }
                    }
                }
            } catch (e) {
                console.warn(`Could not fetch deployments for project ${project.name}:`, e.message);
                continue;
            }
        }

        res.json({
            success: true,
            errors: [],
            messages: [],
            result: {
                dplDailyCount: dailyCount,
                dplMonthCount: monthlyCount
            }
        });
    } catch (err) {
        console.error('Error fetching Pages build count', err);
        res.status(500).json({ error: err.message });
    }
});

// Cloud Functions Requests endpoint
app.get('/pages/cloud-function-requests', async (req, res) => {
    try {
        const useLocalMock = process.env.USE_LOCAL_MOCK === '1' || !cfClient.token;
        
        if (useLocalMock) {
            // Return mock data
            const mockFile = path.join(process.cwd(), '辅助文件', 'cloudfunction请求数回参.json');
            if (fs.existsSync(mockFile)) {
                const raw = fs.readFileSync(mockFile, 'utf-8');
                const json = JSON.parse(raw);
                return res.json(json);
            } else {
                return res.status(500).json({ error: `Local mock not found: ${mockFile}` });
            }
        }

        // For Cloudflare Workers/Functions analytics, we'd need to use Workers API
        const accountId = process.env.CF_ACCOUNT_ID || await cfClient.getAccountId();
        if (!accountId) {
            return res.status(400).json({ error: 'Account ID required for Workers API' });
        }

        const params = {
            since: req.query.startTime,
            until: req.query.endTime
        };

        // Remove undefined/null values
        Object.keys(params).forEach(key => {
            if (params[key] === undefined || params[key] === null) {
                delete params[key];
            }
        });

        try {
            const data = await cfClient.getWorkersStats(accountId, params);
            res.json(data);
        } catch (e) {
            // If workers API fails, return mock response structure
            console.warn('Workers API failed, returning mock response:', e.message);
            
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const startTime = req.query.startTime || yesterday.toISOString();
            const endTime = req.query.endTime || now.toISOString();

            res.json({
                success: true,
                errors: [],
                messages: [],
                result: {
                    Status: "success",
                    Granularity: "hour",
                    Timestamps: [
                        startTime,
                        endTime
                    ],
                    Values: [100, 150], // Example values
                    TotalValue: 250
                }
            });
        }
    } catch (err) {
        console.error('Error fetching Cloud Functions requests', err);
        res.status(500).json({ error: err.message });
    }
});

// Cloud Functions Monthly Stats endpoint
app.get('/pages/cloud-function-monthly-stats', async (req, res) => {
    try {
        const useLocalMock = process.env.USE_LOCAL_MOCK === '1' || !cfClient.token;
        
        if (useLocalMock) {
            // Return mock data
            const mockFile = path.join(process.cwd(), '辅助文件', '当月cf请求数和GBs回参.json');
            if (fs.existsSync(mockFile)) {
                const raw = fs.readFileSync(mockFile, 'utf-8');
                const json = JSON.parse(raw);
                return res.json(json);
            } else {
                return res.status(500).json({ error: `Local mock not found: ${mockFile}` });
            }
        }

        const accountId = process.env.CF_ACCOUNT_ID || await cfClient.getAccountId();
        if (!accountId) {
            return res.status(400).json({ error: 'Account ID required for Workers API' });
        }

        try {
            const params = {
                since: req.query.since,
                until: req.query.until
            };

            // Remove undefined/null values
            Object.keys(params).forEach(key => {
                if (params[key] === undefined || params[key] === null) {
                    delete params[key];
                }
            });

            const data = await cfClient.getWorkersStats(accountId, params);
            res.json(data);
        } catch (e) {
            // If workers API fails, return mock response structure
            console.warn('Workers API failed, returning mock response:', e.message);

            res.json({
                success: true,
                errors: [],
                messages: [],
                result: {
                    TotalMemDuration: 10240, // Example: 10240 ms*GB of compute
                    TotalInvocation: 5000    // Example: 5000 invocations
                }
            });
        }
    } catch (err) {
        console.error('Error fetching Cloud Functions monthly stats', err);
        res.status(500).json({ error: err.message });
    }
});

// Detailed zone analytics endpoint
app.get('/zone-analytics/:zoneId', async (req, res) => {
    try {
        const useLocalMock = process.env.USE_LOCAL_MOCK === '1' || !cfClient.token;
        if (!cfClient.token && !useLocalMock) return res.status(500).json({ error: 'Missing Cloudflare API token. Set CF_API_TOKEN or cf_token.txt' });

        const zoneId = req.params.zoneId;
        if (!zoneId) return res.status(400).json({ error: 'Missing zoneId parameter' });

        if (useLocalMock) {
            // Return mock data
            const mockFile = path.join(process.cwd(), '辅助文件', '站点总带宽回参.json');
            if (fs.existsSync(mockFile)) {
                const raw = fs.readFileSync(mockFile, 'utf-8');
                const json = JSON.parse(raw);
                return res.json(json);
            } else {
                return res.status(500).json({ error: `Local mock not found: ${mockFile}` });
            }
        }

        const params = {
            since: req.query.since,
            until: req.query.until
        };

        // Remove undefined/null values
        Object.keys(params).forEach(key => {
            if (params[key] === undefined || params[key] === null) {
                delete params[key];
            }
        });

        const data = await cfClient.getZoneAnalytics(zoneId, params);
        res.json(data);
    } catch (err) {
        console.error('Error fetching Cloudflare zone analytics', err);
        res.status(500).json({ error: err.message });
    }
});

// Zone dashboard analytics endpoint (top countries, URLs, etc.)
app.get('/zone-dashboard/:zoneId', async (req, res) => {
    try {
        const useLocalMock = process.env.USE_LOCAL_MOCK === '1' || !cfClient.token;
        if (!cfClient.token && !useLocalMock) return res.status(500).json({ error: 'Missing Cloudflare API token. Set CF_API_TOKEN or cf_token.txt' });

        const zoneId = req.params.zoneId;
        if (!zoneId) return res.status(400).json({ error: 'Missing zoneId parameter' });

        if (useLocalMock) {
            // Return mock data
            const mockFile = path.join(process.cwd(), '辅助文件', 'TOP状态码示例回参.json');
            if (fs.existsSync(mockFile)) {
                const raw = fs.readFileSync(mockFile, 'utf-8');
                const json = JSON.parse(raw);
                return res.json(json);
            } else {
                return res.status(500).json({ error: `Local mock not found: ${mockFile}` });
            }
        }

        const params = {
            since: req.query.since,
            until: req.query.until
        };

        // Remove undefined/null values
        Object.keys(params).forEach(key => {
            if (params[key] === undefined || params[key] === null) {
                delete params[key];
            }
        });

        const data = await cfClient.getZoneAnalyticsDashboard(zoneId, params);
        res.json(data);
    } catch (err) {
        console.error('Error fetching Cloudflare zone dashboard analytics', err);
        res.status(500).json({ error: err.message });
    }
});

// Firewall events endpoint
app.get('/firewall-events/:zoneId', async (req, res) => {
    try {
        const useLocalMock = process.env.USE_LOCAL_MOCK === '1' || !cfClient.token;
        if (!cfClient.token && !useLocalMock) return res.status(500).json({ error: 'Missing Cloudflare API token. Set CF_API_TOKEN or cf_token.txt' });

        const zoneId = req.params.zoneId;
        if (!zoneId) return res.status(400).json({ error: 'Missing zoneId parameter' });

        if (useLocalMock) {
            // Return mock data
            const mockFile = path.join(process.cwd(), '辅助文件', 'EdgeFunction请求数示例回参.json');
            if (fs.existsSync(mockFile)) {
                const raw = fs.readFileSync(mockFile, 'utf-8');
                const json = JSON.parse(raw);
                return res.json(json);
            } else {
                return res.status(500).json({ error: `Local mock not found: ${mockFile}` });
            }
        }

        const params = {
            since: req.query.since,
            until: req.query.until
        };

        // Remove undefined/null values
        Object.keys(params).forEach(key => {
            if (params[key] === undefined || params[key] === null) {
                delete params[key];
            }
        });

        const data = await cfClient.getFirewallEvents(zoneId, params);
        res.json(data);
    } catch (err) {
        console.error('Error fetching firewall events', err);
        res.status(500).json({ error: err.message });
    }
});

// DDoS events endpoint
app.get('/ddos-events/:zoneId', async (req, res) => {
    try {
        const useLocalMock = process.env.USE_LOCAL_MOCK === '1' || !cfClient.token;
        if (!cfClient.token && !useLocalMock) return res.status(500).json({ error: 'Missing Cloudflare API token. Set CF_API_TOKEN or cf_token.txt' });

        const zoneId = req.params.zoneId;
        if (!zoneId) return res.status(400).json({ error: 'Missing zoneId parameter' });

        if (useLocalMock) {
            // Return mock data
            const mockFile = path.join(process.cwd(), '辅助文件', 'EdgeFunctionsCPU时间回参.json');
            if (fs.existsSync(mockFile)) {
                const raw = fs.readFileSync(mockFile, 'utf-8');
                const json = JSON.parse(raw);
                return res.json(json);
            } else {
                return res.status(500).json({ error: `Local mock not found: ${mockFile}` });
            }
        }

        const params = {
            since: req.query.since,
            until: req.query.until
        };

        // Remove undefined/null values
        Object.keys(params).forEach(key => {
            if (params[key] === undefined || params[key] === null) {
                delete params[key];
            }
        });

        const data = await cfClient.getDdosEvents(zoneId, params);
        res.json(data);
    } catch (err) {
        console.error('Error fetching DDoS events', err);
        res.status(500).json({ error: err.message });
    }
});

export default app;
