const VALID_NODE_ENVS = ['development', 'test', 'production'];

function parsePositiveInt(raw, name, defaultValue, errors) {
  if (raw === undefined) return defaultValue;
  if (!/^\d+$/.test(raw)) {
    errors.push(`${name}: 숫자형 문자열이어야 합니다 (현재: ${raw})`);
    return defaultValue;
  }
  return parseInt(raw, 10);
}

function validateEnv() {
  const errors = [];

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    errors.push('DATABASE_URL: 필수 환경변수가 누락되었습니다');
  } else if (!/^(postgresql|postgres):\/\//.test(databaseUrl)) {
    errors.push('DATABASE_URL: postgresql:// 또는 postgres:// 프로토콜이어야 합니다');
  }

  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv || !VALID_NODE_ENVS.includes(nodeEnv)) {
    errors.push(
      `NODE_ENV: development | test | production 중 하나여야 합니다 (현재: ${nodeEnv ?? '미설정'})`,
    );
  }

  const rawPort = process.env.PORT;
  let port = 3000;
  if (rawPort !== undefined) {
    if (!/^\d+$/.test(rawPort)) {
      errors.push(`PORT: 숫자형 문자열이어야 합니다 (현재: ${rawPort})`);
    } else {
      port = parseInt(rawPort, 10);
    }
  }

  const dbPoolMax = parsePositiveInt(process.env.DB_POOL_MAX, 'DB_POOL_MAX', 20, errors);
  const dbIdleTimeoutMs = parsePositiveInt(
    process.env.DB_IDLE_TIMEOUT_MS,
    'DB_IDLE_TIMEOUT_MS',
    30000,
    errors,
  );
  const dbConnectionTimeoutMs = parsePositiveInt(
    process.env.DB_CONNECTION_TIMEOUT_MS,
    'DB_CONNECTION_TIMEOUT_MS',
    5000,
    errors,
  );

  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  if (!jwtAccessSecret) {
    errors.push('JWT_ACCESS_SECRET: 필수 환경변수가 누락되었습니다');
  }

  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtRefreshSecret) {
    errors.push('JWT_REFRESH_SECRET: 필수 환경변수가 누락되었습니다');
  }

  const bcryptSaltRounds = parsePositiveInt(
    process.env.BCRYPT_SALT_ROUNDS,
    'BCRYPT_SALT_ROUNDS',
    12,
    errors,
  );

  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

  if (errors.length > 0) {
    errors.forEach((msg) => console.error(`[env] ${msg}`));
    process.exit(1);
  }

  return {
    DATABASE_URL: databaseUrl,
    NODE_ENV: nodeEnv,
    PORT: port,
    DB_POOL_MAX: dbPoolMax,
    DB_IDLE_TIMEOUT_MS: dbIdleTimeoutMs,
    DB_CONNECTION_TIMEOUT_MS: dbConnectionTimeoutMs,
    JWT_ACCESS_SECRET: jwtAccessSecret,
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    BCRYPT_SALT_ROUNDS: bcryptSaltRounds,
    CORS_ORIGIN: corsOrigin,
  };
}

const config = validateEnv();

module.exports = { config };
