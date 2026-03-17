import fetch from 'node-fetch';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

const endpoints = [
    '/api/inbox/conversations',
    '/api/marketing/campaigns',
    '/api/marketing/insights',
    '/api/analytics/executive',
    '/api/analytics/team'
];

async function runSmokeTests() {
    console.log('🔍 Running Smoke Tests...');
    let failedCount = 0;

    for (const endpoint of endpoints) {
        try {
            const url = `${BASE_URL}${endpoint}`;
            const res = await fetch(url);
            if (res.ok) {
                console.log(`✅ ${endpoint} - ${res.status} OK`);
            } else {
                console.error(`❌ ${endpoint} - ${res.status} FAILED`);
                failedCount++;
            }
        } catch (error) {
            console.error(`❌ ${endpoint} - CONNECTION ERROR: ${error.message}`);
            failedCount++;
        }
    }

    if (failedCount > 0) {
        console.error(`\n💥 Smoke Tests FAILED: ${failedCount} endpoint(s) unreachable.`);
        process.exit(1);
    } else {
        console.log('\n🌟 Smoke Tests PASSED!');
    }
}

runSmokeTests();
