import { EventEmitter } from 'events';

// Global singleton — survives Next.js hot-reload in dev
if (!global.__eventBus) {
    global.__eventBus = new EventEmitter();
    global.__eventBus.setMaxListeners(100); // รองรับ SSE clients หลายคนพร้อมกัน
}

export const eventBus = global.__eventBus;
