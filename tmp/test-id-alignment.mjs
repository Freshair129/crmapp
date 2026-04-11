import 'dotenv/config';
import { generateCustomerId, generateMemberId } from '../src/utils/idGenerator.js';
import { resolveOrCreateCustomer } from '../src/lib/identityService.js';
import { logger } from '../src/lib/logger.js';

async function test() {
    console.log('--- Testing ID Generation ---');
    
    // 1. Test Customer ID
    const fbId1 = await generateCustomerId('FB');
    const fbId2 = await generateCustomerId('FB');
    console.log('FB ID 1:', fbId1);
    console.log('FB ID 2:', fbId2);
    
    // 2. Test Member ID
    const memId1 = await generateMemberId('BKK', 'P');
    console.log('Member ID 1:', memId1);

    // 3. Test Identity Service
    console.log('\n--- Testing Identity Service ---');
    const psid = 'test-psid-' + Date.now();
    const result = await resolveOrCreateCustomer({
        psid,
        channel: 'FB',
        name: 'Test Business'
    });
    
    console.log('Resolve Result:', JSON.stringify(result, null, 2));
    
    if (result.customer.customerId && result.customer.customerId.startsWith('TVS-CUS-FB-')) {
        console.log('✅ Identity Service ID Format OK');
    } else {
        console.log('❌ Identity Service ID Format MISMATCH');
    }
}

test().catch(console.error);
