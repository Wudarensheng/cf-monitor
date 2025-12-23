import express from 'express';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const app = express();

function getToken() {
    let token = process.env.CF_API_TOKEN;
    if (token) return token;

    try {
        const p = `${process.cwd()}/cf_token.txt`;
        if (fs.existsSync(p)) {
            token = fs.readFileSync(p, 'utf-8').trim();
        }
    } catch (e) {
        console.error('Error reading cf_token.txt', e);
    }
    return token;
}

app.get('/config', (req, res) => {
    res.json({
        siteName: process.env.SITE_NAME || 'Cloudflare 流量监控',
        siteIcon: process.env.SITE_ICON || 'https://static.cloudflareclient.com/favicon.ico'
    });
});

app.get('/zones', async (req, res) => {
    try {
        const token = getToken();
        const useLocalMock = process.env.USE_LOCAL_MOCK === '1' || !token;
        if (!token && !useLocalMock) return res.status(500).json({ error: 'Missing Cloudflare API token. Set CF_API_TOKEN or cf_token.txt' });

        const url = new URL('https://api.cloudflare.com/client/v4/zones');
        if (req.query.name) url.searchParams.set('name', req.query.name);

        const resp = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await resp.json();
        res.json(data);
    } catch (err) {
        console.error('Error fetching Cloudflare zones', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/traffic', async (req, res) => {
    try {
        const token = getToken();
        if (!token) return res.status(500).json({ error: 'Missing Cloudflare API token. Set CF_API_TOKEN or cf_token.txt' });

        // zoneId is required for real Cloudflare calls, but optional when using local mock
        const zoneId = req.query.zoneId;
        if (!zoneId && !useLocalMock) return res.status(400).json({ error: 'Missing zoneId parameter' });

        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const start = req.query.startTime || yesterday.toISOString();
        const end = req.query.endTime || now.toISOString();

        // metrics: bandwidth, requests, uniques
        const metrics = req.query.metrics || 'bandwidth,requests';

        // If we're configured to use local mock (or token missing), try to return a local mock file
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

        const url = new URL(`https://api.cloudflare.com/client/v4/zones/${zoneId}/analytics/series`);
        url.searchParams.set('metrics', metrics);
        url.searchParams.set('since', start);
        url.searchParams.set('until', end);
        url.searchParams.set('continuous', 'true');

        const resp = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await resp.json();
        res.json(data);
    } catch (err) {
        console.error('Error fetching Cloudflare traffic', err);
        res.status(500).json({ error: err.message });
    }
});

export default app;
