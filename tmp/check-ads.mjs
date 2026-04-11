
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const envStr = fs.readFileSync('e:/crm/crmapp/.env', 'utf8');
const dbUrlMatch = envStr.match(/DATABASE_URL="([^"]+)"/);
if (!dbUrlMatch) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
}

const DATABASE_URL = dbUrlMatch[1];
const client = new pg.Client({ connectionString: DATABASE_URL });

async function main() {
    await client.connect();
    const adsRes = await client.query('SELECT count(*) as count, max(updated_at) as last_sync FROM ads');
    console.log('Ads Stats:', adsRes.rows[0]);

    const campaignRes = await client.query('SELECT count(*) as count FROM campaigns');
    console.log('Campaigns Count:', campaignRes.rows[0].count);

    const latestAds = await client.query('SELECT ad_id, name, spend, updated_at FROM ads ORDER BY updated_at DESC LIMIT 5');
    console.log('Latest Synced Ads:', latestAds.rows);

    await client.end();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
