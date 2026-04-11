import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncGoogleSheetTasks } from '@/lib/googleSheetService';

vi.mock('axios', () => ({
    default: { get: vi.fn() },
}));

vi.mock('@/lib/lineService.js', () => ({
    sendLineAlert: vi.fn(),
}));

vi.mock('@/lib/redis.js', () => ({
    cache: {
        get: vi.fn(),
        set: vi.fn(),
    },
}));

import axios from 'axios';
import { sendLineAlert } from '@/lib/lineService.js';
import { cache } from '@/lib/redis.js';

describe('googleSheetService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('syncGoogleSheetTasks', () => {
        it('should skip sync when LINE quota is exceeded', async () => {
            cache.get.mockResolvedValue(true);

            const result = await syncGoogleSheetTasks();

            expect(result.success).toBe(true);
            expect(result.alertsSent).toBe(0);
            expect(result.note).toContain('quota exceeded');
            expect(axios.get).not.toHaveBeenCalled();
        });

        it('should fetch CSV and send alerts for new tasks', async () => {
            cache.get.mockResolvedValueOnce(null).mockResolvedValueOnce([]); // quota + notified list
            const csvData = 'h1,h2,h3,h4,h5,h6,h7,h8,h9,h10,h11,h12,taskId,title,platform,date,time,h17,status,responsible\n' +
                'h1,h2,h3,h4,h5,h6,h7,h8,h9,h10,h11,h12,taskId,title,platform,date,time,h17,status,responsible\n' +
                'h1,h2,h3,h4,h5,h6,h7,h8,h9,h10,h11,h12,taskId,title,platform,date,time,h17,status,responsible\n' +
                'a,b,c,d,e,f,g,h,i,j,k,l,TASK001,Post FB,Facebook,25/03,10:00,x,Active,John';

            axios.get.mockResolvedValue({ data: csvData });
            sendLineAlert.mockResolvedValue(true);

            const result = await syncGoogleSheetTasks();

            expect(result.success).toBe(true);
            expect(result.alertsSent).toBe(1);
            expect(sendLineAlert).toHaveBeenCalledWith(expect.stringContaining('Post FB'));
        });

        it('should not re-notify already-notified tasks', async () => {
            cache.get.mockResolvedValueOnce(null).mockResolvedValueOnce(['task:TASK001:Active']);
            const csvData = 'h,h,h\nh,h,h\nh,h,h\na,b,c,d,e,f,g,h,i,j,k,l,TASK001,Post,FB,25/03,10:00,x,Active,John';
            axios.get.mockResolvedValue({ data: csvData });

            const result = await syncGoogleSheetTasks();

            expect(result.alertsSent).toBe(0);
            expect(sendLineAlert).not.toHaveBeenCalled();
        });

        it('should handle fetch error gracefully', async () => {
            cache.get.mockResolvedValue(null);
            axios.get.mockRejectedValue(new Error('Network error'));

            const result = await syncGoogleSheetTasks();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
        });
    });
});
