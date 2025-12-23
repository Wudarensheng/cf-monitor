import express from 'express';
import fs from 'fs';
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
        if (!token) return res.status(500).json({ error: 'Missing Cloudflare API token. Set CF_API_TOKEN or cf_token.txt' });

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

        // require zoneId
        const zoneId = req.query.zoneId;
        if (!zoneId) return res.status(400).json({ error: 'Missing zoneId parameter' });

        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const start = req.query.startTime || yesterday.toISOString();
        const end = req.query.endTime || now.toISOString();

        // metrics: bandwidth, requests, uniques
        const metrics = req.query.metrics || 'bandwidth,requests';

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
