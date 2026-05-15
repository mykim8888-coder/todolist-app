/**
 * BE-02 완료 조건 검증: Pool 설정값이 env.ts에서 주입되며 하드코딩 없음
 * - pool.ts 소스코드에 하드코딩된 숫자(20, 30000, 5000)가 없는지 확인
 * - env.ts Config 인터페이스에 DB Pool 필드가 존재하는지 확인
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '../../src');

describe('BE-02: Pool 설정 하드코딩 검증', () => {
  describe('pool.ts — 하드코딩 제거', () => {
    let poolSource: string;

    beforeAll(() => {
      poolSource = fs.readFileSync(path.join(SRC_ROOT, 'db/pool.ts'), 'utf-8');
    });

    it('pool.ts가 env.ts config를 import한다', () => {
      expect(poolSource).toMatch(/from\s+['"].*config\/env['"]/);
    });

    it('pool.ts에 max 값이 하드코딩되어 있지 않다 (숫자 리터럴 20 없음)', () => {
      // max: 20 패턴 검사
      expect(poolSource).not.toMatch(/max\s*:\s*20/);
    });

    it('pool.ts에 idleTimeoutMillis 값이 하드코딩되어 있지 않다 (숫자 리터럴 30000 없음)', () => {
      expect(poolSource).not.toMatch(/idleTimeoutMillis\s*:\s*30000/);
    });

    it('pool.ts에 connectionTimeoutMillis 값이 하드코딩되어 있지 않다 (숫자 리터럴 5000 없음)', () => {
      expect(poolSource).not.toMatch(/connectionTimeoutMillis\s*:\s*5000/);
    });

    it('pool.ts가 config.DB_POOL_MAX를 사용한다', () => {
      expect(poolSource).toMatch(/config\.DB_POOL_MAX/);
    });

    it('pool.ts가 config.DB_IDLE_TIMEOUT_MS를 사용한다', () => {
      expect(poolSource).toMatch(/config\.DB_IDLE_TIMEOUT_MS/);
    });

    it('pool.ts가 config.DB_CONNECTION_TIMEOUT_MS를 사용한다', () => {
      expect(poolSource).toMatch(/config\.DB_CONNECTION_TIMEOUT_MS/);
    });
  });

  describe('env.ts — DB Pool 설정 필드', () => {
    let envSource: string;

    beforeAll(() => {
      envSource = fs.readFileSync(path.join(SRC_ROOT, 'config/env.ts'), 'utf-8');
    });

    it('Config 인터페이스에 DB_POOL_MAX 필드가 있다', () => {
      expect(envSource).toMatch(/DB_POOL_MAX\s*:/);
    });

    it('Config 인터페이스에 DB_IDLE_TIMEOUT_MS 필드가 있다', () => {
      expect(envSource).toMatch(/DB_IDLE_TIMEOUT_MS\s*:/);
    });

    it('Config 인터페이스에 DB_CONNECTION_TIMEOUT_MS 필드가 있다', () => {
      expect(envSource).toMatch(/DB_CONNECTION_TIMEOUT_MS\s*:/);
    });

    it('DB_POOL_MAX 기본값이 20이다', () => {
      expect(envSource).toMatch(/DB_POOL_MAX.*20|20.*DB_POOL_MAX/s);
    });

    it('DB_IDLE_TIMEOUT_MS 기본값이 30000이다', () => {
      expect(envSource).toMatch(/DB_IDLE_TIMEOUT_MS.*30000|30000.*DB_IDLE_TIMEOUT_MS/s);
    });

    it('DB_CONNECTION_TIMEOUT_MS 기본값이 5000이다', () => {
      expect(envSource).toMatch(/DB_CONNECTION_TIMEOUT_MS.*5000|5000.*DB_CONNECTION_TIMEOUT_MS/s);
    });
  });

  describe('transaction.ts — withTransaction 존재 확인', () => {
    let transactionSource: string;

    beforeAll(() => {
      transactionSource = fs.readFileSync(path.join(SRC_ROOT, 'db/transaction.ts'), 'utf-8');
    });

    it('withTransaction 함수가 export된다', () => {
      expect(transactionSource).toMatch(/export\s+async\s+function\s+withTransaction/);
    });

    it('BEGIN 쿼리가 포함된다', () => {
      expect(transactionSource).toMatch(/BEGIN/);
    });

    it('COMMIT 쿼리가 포함된다', () => {
      expect(transactionSource).toMatch(/COMMIT/);
    });

    it('ROLLBACK 쿼리가 포함된다', () => {
      expect(transactionSource).toMatch(/ROLLBACK/);
    });

    it('finally 블록에서 release()가 호출된다', () => {
      expect(transactionSource).toMatch(/finally/);
      expect(transactionSource).toMatch(/release\(\)/);
    });
  });
});
