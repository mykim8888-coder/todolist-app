require('dotenv/config');
const { config } = require('./config/env');
const { closePool } = require('./db/pool');
const { checkDatabaseConnection, runMigrations } = require('./db/utils');
const app = require('./app');

async function start() {
  const connected = await checkDatabaseConnection();
  if (!connected) {
    console.error('[server] DB 연결 실패. 서버를 종료합니다.');
    process.exit(1);
  }

  if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') {
    await runMigrations();
  }

  app.listen(config.PORT, () => {
    console.log(`[server] port=${config.PORT} NODE_ENV=${config.NODE_ENV} DB=connected`);
  });
}

async function shutdown(signal) {
  console.log(`[server] ${signal} 수신 — 종료 중...`);
  await closePool();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

start().catch((err) => {
  console.error('[server] 시작 오류:', err);
  process.exit(1);
});
