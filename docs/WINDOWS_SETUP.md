# Windows Standby Machine Setup Guide

This guide ensures the background services (BullMQ Worker + Redis) run reliably on the Windows standby machine.

## 1. Prerequisites
- **Node.js v22 LTS**: Download from [nodejs.org](https://nodejs.org/) or use `nvm-windows`.
- **Docker Desktop**: Required for running Redis in a container.
- **Git**: [git-scm.com](https://git-scm.com/).

## 2. Initial Setup
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Freshair129/crmapp
   cd crmapp
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment**:
   - Copy `.env` from the Mac machine.
   - Ensure `REDIS_URL=redis://localhost:6379` (if using local Docker Redis).

## 3. Redis Setup
Run Redis in Docker with "always" restart policy:
```bash
docker run -d --name redis --restart always -p 6379:6379 redis:7-alpine
```

## 4. PM2 Configuration
1. **Install PM2 globally**:
   ```bash
   npm install -g pm2
   ```
2. **Start the Worker**:
   ```bash
   pm2 start ecosystem.config.cjs
   ```
3. **Persist and Auto-start**:
   ```bash
   pm2 save
   pm2 startup
   ```
   *(Follow the instructions provided by `pm2 startup` to configure the Windows service)*

## 5. Monitoring
- **Status**: `pm2 status`
- **Logs**: `pm2 logs crm-worker`
- **Dashboard**: `pm2 monit`
