import axios from 'axios';
import { sendLineAlert } from './lineService.js';
import { logger } from './logger.js';
import { cache } from './redis.js';

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1j0laHRGzFeYZMQVX7L97ddOdfrDPRFPLjH5Z4md9yDM/export?format=csv&gid=1681580966";
const NOTIFIED_CACHE_KEY = 'sheets:notified_tasks';

/**
 * Basic CSV Parser that handles quoted values
 */
function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    return lines.map(line => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    });
}

/**
 * Syncs Google Sheets tasks and sends LINE alerts for new/updated tasks.
 */
export async function syncGoogleSheetTasks() {
    const startTime = Date.now();
    try {
        // Circuit Breaker: Skip if LINE quota is known to be exceeded
        const isSilenced = await cache.get('line:quota_exceeded');
        if (isSilenced) {
            return { success: true, alertsSent: 0, note: 'LINE quota exceeded, sync paused' };
        }

        logger.info('[SheetService]', 'Fetching spreadsheet data...');
        const response = await axios.get(SHEET_CSV_URL);
        const fetchTime = Date.now() - startTime;
        
        const rows = parseCSV(response.data);
        const parseTime = Date.now() - (startTime + fetchTime);

        // Data starts from row 4 (Index 3)
        const dataRows = rows.slice(3).filter(row => row[12]); 
        
        const notifiedList = await cache.get(NOTIFIED_CACHE_KEY) || [];
        // Use a Set for O(1) matching instead of O(N) array lookup inside the loop
        const notifiedSet = new Set(notifiedList);
        let alertCount = 0;
        let quotaHit = false;

        for (const row of dataRows) {
            if (quotaHit) break;

            const taskId = row[12];
            const title = row[13];
            const status = row[18];
            const cacheKey = `task:${taskId}:${status}`;

            if (!notifiedSet.has(cacheKey)) {
                const platform = row[14];
                const dateStr = row[15];
                const timeStr = row[16];
                const responsible = row[19];

                const message = `🎬 [Sheet Update]\n📌 Task: ${title}\n📱 Platform: ${platform}\n⏰ เวลา: ${dateStr} ${timeStr}\n🚀 สถานะ: ${status}\n👤 รับผิดชอบ: ${responsible}`;
                const sent = await sendLineAlert(message);
                
                if (sent) {
                    notifiedSet.add(cacheKey);
                    alertCount++;
                } else {
                    const stillExceeded = await cache.get('line:quota_exceeded');
                    if (stillExceeded) {
                        quotaHit = true;
                        logger.warn('[SheetService]', 'Quota hit during sync, stopping loop');
                    }
                }
            }
        }

        // Convert back to Array for Redis storage
        const newNotifiedList = Array.from(notifiedSet);
        await cache.set(NOTIFIED_CACHE_KEY, newNotifiedList, 2592000);
        
        const totalTime = Date.now() - startTime;
        logger.info('[SheetService]', `Sync finished in ${totalTime}ms (fetch: ${fetchTime}ms, parse: ${parseTime}ms), Alerts: ${alertCount}`);

        return { success: true, alertsSent: alertCount, duration: totalTime };
    } catch (error) {
        logger.error('[SheetService]', 'Sync failed', error);
        return { success: false, error: error.message };
    }
}

/**
 * Sends a summary of content tasks due today from Google Sheets.
 */
export async function sendDailySheetSummary() {
    try {
        const isSilenced = await cache.get('line:quota_exceeded');
        if (isSilenced) return;

        const response = await axios.get(SHEET_CSV_URL);
        const rows = parseCSV(response.data);
        const dataRows = rows.slice(3).filter(row => row[12]);

        const now = new Date();
        const bangkokNow = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // UTC+7
        const todayStr = `${String(bangkokNow.getDate()).padStart(2, '0')}/${String(bangkokNow.getMonth() + 1).padStart(2, '0')}/${bangkokNow.getFullYear()}`;

        const dueToday = dataRows.filter(row => row[15] === todayStr);

        if (dueToday.length === 0) return;

        let message = `📅 [Content Plan Today]\nตารางงานที่ต้องส่งวันนี้ (${dueToday.length} รายการ):\n`;
        dueToday.forEach((row, i) => {
            message += `${i + 1}. ${row[13]} (${row[14]}) - ${row[16]}\n   👤 รับผิดชอบ: ${row[19]}\n`;
        });
        message += `\nสู้ๆ นะครับทีมงาน! ✌️`;

        await sendLineAlert(message);
        logger.info('[SheetService]', 'Daily summary sent');
    } catch (error) {
        logger.error('[SheetService]', 'Daily summary failed', error);
    }
}
