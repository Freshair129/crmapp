import 'dotenv/config';
import { generateCustomerId, generateMemberId } from '../src/utils/idGenerator.js';

async function test() {
    console.log('--- Testing ID Generator ---');
    
    try {
        const fbId = await generateCustomerId('FB');
        console.log('Generated FB ID:', fbId);
        
        const bkkId = await generateCustomerId('BKK');
        console.log('Generated BKK ID:', bkkId);
        
        const memId = await generateMemberId('BKK', 'P');
        console.log('Generated Member ID:', memId);
        
        console.log('✅ ID Generator appears to be working correctly.');
    } catch (err) {
        console.error('❌ ID Generator test failed:', err);
    }
}

test();
