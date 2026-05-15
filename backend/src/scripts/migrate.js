require('dotenv/config');
const { runMigrations } = require('../db/utils');
const { closePool } = require('../db/pool');

runMigrations()
  .then(() => {
    console.log('[migrate] 모든 마이그레이션 완료');
    return closePool();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate] 오류:', err);
    process.exit(1);
  });
