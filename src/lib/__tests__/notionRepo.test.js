import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as notionRepo from '@/lib/repositories/notionRepo';
import { getPrisma } from '@/lib/db';
import { generateTaskId } from '@/lib/idGenerators';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn(),
}));

vi.mock('@/lib/idGenerators', () => ({
    generateTaskId: vi.fn(),
}));

describe('notionRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            task: {
                findMany: vi.fn(),
                update: vi.fn(),
                updateMany: vi.fn(),
                create: vi.fn(),
                count: vi.fn(),
            },
        };
        getPrisma.mockResolvedValue(mockPrisma);
        // Set env vars for tests
        vi.stubEnv('NOTION_TOKEN', 'test-token');
        vi.stubEnv('NOTION_TASK_DB_ID', 'test-db-id');
    });

    describe('pushTaskToNotion', () => {
        it('should throw when env vars not set', async () => {
            vi.stubEnv('NOTION_TOKEN', '');
            vi.stubEnv('NOTION_TASK_DB_ID', '');
            await expect(notionRepo.pushTaskToNotion({ title: 'Test' }))
                .rejects.toThrow('NOTION_TOKEN or NOTION_TASK_DB_ID not set');
        });

        it('should create new page when no notionId', async () => {
            const mockResponse = { ok: true, json: () => Promise.resolve({ id: 'notion-page-1' }) };
            global.fetch = vi.fn().mockResolvedValue(mockResponse);

            const result = await notionRepo.pushTaskToNotion({
                title: 'Test Task',
                status: 'PENDING',
                priority: 'L2',
                taskId: 'TSK-001',
            });

            expect(result).toEqual({ action: 'created', notionId: 'notion-page-1' });
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.notion.com/v1/pages',
                expect.objectContaining({ method: 'POST' })
            );
        });

        it('should update existing page when notionId present', async () => {
            const mockResponse = { ok: true };
            global.fetch = vi.fn().mockResolvedValue(mockResponse);

            const result = await notionRepo.pushTaskToNotion({
                title: 'Test Task',
                status: 'DONE',
                priority: 'L1',
                notionId: 'existing-id',
            });

            expect(result).toEqual({ action: 'updated', notionId: 'existing-id' });
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.notion.com/v1/pages/existing-id',
                expect.objectContaining({ method: 'PATCH' })
            );
        });

        it('should throw when API returns error', async () => {
            global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400, text: () => Promise.resolve('Bad request') });
            await expect(notionRepo.pushTaskToNotion({ title: 'X', status: 'PENDING' }))
                .rejects.toThrow('POST failed');
        });

        it('should include start date for RANGE tasks', async () => {
            global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'n1' }) });
            await notionRepo.pushTaskToNotion({
                title: 'Range Task',
                status: 'IN_PROGRESS',
                taskType: 'RANGE',
                startDate: '2026-03-01',
                dueDate: '2026-03-10',
            });

            const body = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(body.properties['Start Date']).toBeDefined();
        });

        it('should include milestones for PROJECT tasks', async () => {
            global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'n1' }) });
            await notionRepo.pushTaskToNotion({
                title: 'Project Task',
                status: 'PENDING',
                taskType: 'PROJECT',
                milestones: [{ type: 'brief', title: 'Kickoff', date: '2026-03-01' }],
            });

            const body = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(body.properties['Milestones']).toBeDefined();
        });
    });

    describe('pushAllTasksToNotion', () => {
        it('should push active tasks and count results', async () => {
            mockPrisma.task.findMany.mockResolvedValue([
                { id: '1', taskId: 'TSK-001', title: 'T1', status: 'PENDING' },
            ]);
            global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 'n1' }) });
            mockPrisma.task.update.mockResolvedValue({});

            const result = await notionRepo.pushAllTasksToNotion();
            expect(result.total).toBe(1);
            expect(result.created + result.updated + result.failed).toBe(1);
        });
    });

    describe('pullTasksFromNotion', () => {
        it('should throw when env vars not set', async () => {
            vi.stubEnv('NOTION_TOKEN', '');
            vi.stubEnv('NOTION_TASK_DB_ID', '');
            await expect(notionRepo.pullTasksFromNotion()).rejects.toThrow('NOTION_TOKEN or NOTION_TASK_DB_ID not set');
        });

        it('should import new tasks from Notion', async () => {
            global.fetch = vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({
                        results: [{
                            id: 'notion-1',
                            properties: {
                                'CRM Task ID': { rich_text: [] },
                                'Task': { title: [{ text: { content: 'New from Notion' } }] },
                                'Status': { select: { name: '🟠 Urgent' } },
                                'Priority': { select: { name: 'L2 · Important' } },
                                'Notes': { rich_text: [] },
                                'Due Date': { date: null },
                                'Start Date': { date: null },
                                'Task Type': { select: null },
                                'Time': { rich_text: [] },
                            },
                        }],
                    }),
                })
                .mockResolvedValueOnce({ ok: true }); // Write-back PATCH

            generateTaskId.mockResolvedValue('TSK-NEW-001');
            mockPrisma.task.create.mockResolvedValue({});

            const result = await notionRepo.pullTasksFromNotion();
            expect(result.imported).toBe(1);
        });
    });

    describe('getNotionSyncStatus', () => {
        it('should return sync status', async () => {
            mockPrisma.task.count
                .mockResolvedValueOnce(10)
                .mockResolvedValueOnce(5);

            const result = await notionRepo.getNotionSyncStatus();
            expect(result).toEqual({
                totalActive: 10,
                syncedToNotion: 5,
                notionDbId: 'test-db-id',
                configured: true,
            });
        });
    });
});
