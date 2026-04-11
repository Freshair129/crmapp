import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
        const m = line.match(/^([A-Z_]+)\s*=\s*(.*?)\s*$/);
        if (m) {
            let val = m[2].trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            process.env[m[1]] = process.env[m[1]] || val;
        }
    }
}

const FB_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || process.env.FB_ACCESS_TOKEN;
const PAGE_ID = process.env.FB_PAGE_ID || '170707786504';
const LIMIT_DATE = new Date('2026-01-01T00:00:00Z');
const CRM_WEBHOOK = 'http://localhost:3000/api/webhooks/facebook';
import crypto from 'crypto';

function fbGet(urlPath) {
    return new Promise((resolve, reject) => {
        let url = urlPath;
        if (!urlPath.startsWith('http')) {
             url = `https://graph.facebook.com/v19.0${urlPath}`;
        }
        url += `${url.includes('?') ? '&' : '?'}access_token=${FB_TOKEN}`;
        
        https.get(url, (res) => {
            let raw = '';
            res.on('data', d => raw += d);
            res.on('end', () => {
                try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

function sendToWebhook(payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const hmac = crypto.createHmac('sha256', process.env.FB_APP_SECRET || '');
        const signature = `sha256=${hmac.update(data).digest('hex')}`;

        const req = http.request(CRM_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'x-hub-signature-256': signature
            }
        }, (res) => {
            let raw = '';
            res.on('data', d => { raw += d; });
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
                } else {
                    resolve(raw);
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function run() {
    console.log(`🚀 Starting Historical Sync (via Webhook) from ${LIMIT_DATE.toISOString()}`);
    let url = `/${PAGE_ID}/conversations?fields=id,updated_time,participants&limit=50`;
    let convCount = 0;
    let msgCount = 0;
    
    let keepGoing = true;
    while (url && keepGoing) {
        const data = await fbGet(url);
        if (data.error) {
            console.error('API Error:', data.error);
            break;
        }
        
        const convs = data.data || [];
        if (convs.length === 0) break;
        
        for (const conv of convs) {
            const updatedTime = new Date(conv.updated_time);
            if (updatedTime < LIMIT_DATE) {
                console.log(`\nReached limit at conv updated_time: ${conv.updated_time}`);
                keepGoing = false;
                break;
            }
            
            const participants = conv.participants?.data || [];
            const customer = participants.find(p => String(p.id) !== String(PAGE_ID));
            if (!customer) continue;
            
            const psid = customer.id;
            convCount++;
            process.stdout.write(`\nSyncing conv ${psid} `);
            
            let msgUrl = `/${conv.id}/messages?fields=id,message,from,created_time,attachments,is_echo&limit=100`;
            let msgKeepGoing = true;
            let addedMsgs = 0;
            
            while (msgUrl && msgKeepGoing) {
                const msgsData = await fbGet(msgUrl);
                const msgs = msgsData.data || [];
                if (msgs.length === 0) break;
                
                // Process oldest messages first so webhook receives them natively in sequence
                const sortedMsgs = msgs.sort((a,b) => new Date(a.created_time) - new Date(b.created_time));

                for (const msg of sortedMsgs) {
                    const ct = new Date(msg.created_time);
                    if (ct < LIMIT_DATE) {
                        continue;
                    }
                    
                    const isEcho = msg.is_echo === true || String(msg.from?.id) === String(PAGE_ID);
                    const mockSender = isEcho ? PAGE_ID : psid;
                    const mockRecipient = isEcho ? psid : PAGE_ID;
                    
                    const payload = {
                        object: 'page',
                        entry: [{
                            messaging: [{
                                sender: { id: mockSender },
                                recipient: { id: mockRecipient },
                                timestamp: ct.getTime(),
                                message: {
                                    mid: msg.id,
                                    text: msg.message || "",
                                    is_echo: isEcho,
                                    attachments: msg.attachments?.data ? msg.attachments.data.map(a => ({
                                        type: a.mime_type || 'file',
                                        payload: { url: a.image_data?.url || a.video_data?.url || '' }
                                    })) : undefined
                                }
                            }]
                        }]
                    };
                    
                    try {
                        await sendToWebhook(payload);
                        addedMsgs++;
                        msgCount++;
                        process.stdout.write('.');
                    } catch (err) {
                        process.stdout.write(` x[${err.message}] `);
                    }
                    // Prevent slamming the local server too hard
                    await new Promise(r => setTimeout(r, 50));
                }
                
                if (msgKeepGoing && msgsData.paging?.cursors?.next) {
                    // For getting older messages, FB gives 'next' URL (which goes back in time)
                    msgUrl = msgsData.paging.next;
                } else {
                    msgUrl = null;
                }
            }
            process.stdout.write(` (+${addedMsgs} msgs)`);
            
        }
        
        if (keepGoing && data.paging?.next) {
            url = data.paging.next;
        } else {
            url = null;
        }
    }
    
    console.log(`\n🎉 Success! Sent ${convCount} conversations and ${msgCount} messages directly to CRM.`);
}

run().catch(console.error);
