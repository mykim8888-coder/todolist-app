/**
 * BE-01 완료 조건 검증: 프로젝트 초기 설정
 * - package.json 의존성 확인
 * - tsconfig 설정 확인
 * - jest 프로젝트 분리 확인
 */

import * as path from 'path';
import * as fs from 'fs';

const BACKEND_ROOT = path.resolve(__dirname, '../../');

describe('BE-01: 프로젝트 초기 설정', () => {
  describe('package.json', () => {
    let pkg: Record<string, unknown>;

    beforeAll(() => {
      const pkgPath = path.join(BACKEND_ROOT, 'package.json');
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
    });

    it('필수 런타임 의존성이 모두 존재한다', () => {
      const deps = pkg.dependencies as Record<string, string>;
      expect(deps['express']).toBeDefined();
      expect(deps['pg']).toBeDefined();
      expect(deps['bcryptjs']).toBeDefined();
      expect(deps['jsonwebtoken']).toBeDefined();
      expect(deps['cookie-parser']).toBeDefined();
      expect(deps['cors']).toBeDefined();
      expect(deps['express-rate-limit']).toBeDefined();
      expect(deps['zod']).toBeDefined();
      expect(deps['dotenv']).toBeDefined();
    });

    it('필수 개발 의존성이 모두 존재한다', () => {
      const devDeps = pkg.devDependencies as Record<string, string>;
      expect(devDeps['jest']).toBeDefined();
      expect(devDeps['ts-jest']).toBeDefined();
      expect(devDeps['supertest']).toBeDefined();
      expect(devDeps['typescript']).toBeDefined();
      expect(devDeps['@types/express']).toBeDefined();
      expect(devDeps['@types/node']).toBeDefined();
      expect(devDeps['@types/jest']).toBeDefined();
      expect(devDeps['eslint']).toBeDefined();
      expect(devDeps['prettier']).toBeDefined();
    });

    it('필수 npm 스크립트가 모두 정의되어 있다', () => {
      const scripts = pkg.scripts as Record<string, string>;
      expect(scripts['dev']).toBeDefined();
      expect(scripts['build']).toBeDefined();
      expect(scripts['start']).toBeDefined();
      expect(scripts['test']).toBeDefined();
      expect(scripts['migrate']).toBeDefined();
    });
  });

  describe('tsconfig.json', () => {
    let tsconfig: { compilerOptions: Record<string, unknown> };

    beforeAll(() => {
      const tsconfigPath = path.join(BACKEND_ROOT, 'tsconfig.json');
      tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8')) as typeof tsconfig;
    });

    it('target이 ES2022이다', () => {
      expect(tsconfig.compilerOptions['target']).toBe('ES2022');
    });

    it('module이 CommonJS이다', () => {
      expect(tsconfig.compilerOptions['module']).toBe('CommonJS');
    });

    it('strict 모드가 활성화되어 있다', () => {
      expect(tsconfig.compilerOptions['strict']).toBe(true);
    });

    it('outDir이 dist이다', () => {
      expect(tsconfig.compilerOptions['outDir']).toBe('dist');
    });

    it('rootDir이 src이다', () => {
      expect(tsconfig.compilerOptions['rootDir']).toBe('src');
    });
  });

  describe('.env.example', () => {
    let envExampleContent: string;

    beforeAll(() => {
      const envPath = path.join(BACKEND_ROOT, '.env.example');
      envExampleContent = fs.readFileSync(envPath, 'utf-8');
    });

    it('DATABASE_URL 항목이 포함되어 있다', () => {
      expect(envExampleContent).toMatch(/^DATABASE_URL=/m);
    });

    it('JWT_ACCESS_SECRET 항목이 포함되어 있다', () => {
      expect(envExampleContent).toMatch(/^JWT_ACCESS_SECRET=/m);
    });

    it('JWT_REFRESH_SECRET 항목이 포함되어 있다', () => {
      expect(envExampleContent).toMatch(/^JWT_REFRESH_SECRET=/m);
    });

    it('PORT 항목이 포함되어 있다', () => {
      expect(envExampleContent).toMatch(/^PORT=/m);
    });

    it('NODE_ENV 항목이 포함되어 있다', () => {
      expect(envExampleContent).toMatch(/^NODE_ENV=/m);
    });

    it('BCRYPT_SALT_ROUNDS 항목이 포함되어 있다', () => {
      expect(envExampleContent).toMatch(/^BCRYPT_SALT_ROUNDS=/m);
    });

    it('.env.example에 실제 비밀 값이 포함되지 않는다 (플레이스홀더만 존재)', () => {
      // 실제 비밀 키처럼 보이는 긴 랜덤 문자열이 없어야 함
      // JWT_ACCESS_SECRET 값이 플레이스홀더임을 확인
      const lines = envExampleContent.split('\n');
      const jwtAccessLine = lines.find((l) => l.startsWith('JWT_ACCESS_SECRET='));
      expect(jwtAccessLine).toBeDefined();
      // 값이 비어있거나 설명적인 플레이스홀더여야 함 (실제 랜덤 시크릿 아님)
      const value = jwtAccessLine!.split('=')[1]?.trim();
      expect(value).toBeTruthy(); // 값이 있음
      expect(value!.length).toBeLessThan(60); // 실제 JWT 시크릿처럼 매우 길지 않음
    });
  });

  describe('.prettierrc', () => {
    let prettierConfig: Record<string, unknown>;

    beforeAll(() => {
      const prettierPath = path.join(BACKEND_ROOT, '.prettierrc');
      prettierConfig = JSON.parse(fs.readFileSync(prettierPath, 'utf-8')) as Record<string, unknown>;
    });

    it('singleQuote가 true이다', () => {
      expect(prettierConfig['singleQuote']).toBe(true);
    });

    it('trailingComma가 all이다', () => {
      expect(prettierConfig['trailingComma']).toBe('all');
    });

    it('printWidth가 100이다', () => {
      expect(prettierConfig['printWidth']).toBe(100);
    });
  });

  describe('jest.config.ts', () => {
    it('jest.config.ts 파일이 존재한다', () => {
      const configPath = path.join(BACKEND_ROOT, 'jest.config.ts');
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('jest config 파일에 unit 프로젝트가 정의되어 있다', () => {
      const configPath = path.join(BACKEND_ROOT, 'jest.config.ts');
      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain("displayName: 'unit'");
    });

    it('jest config 파일에 integration 프로젝트가 정의되어 있다', () => {
      const configPath = path.join(BACKEND_ROOT, 'jest.config.ts');
      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain("displayName: 'integration'");
    });

    it('coverageThreshold가 80% 이상으로 설정되어 있다', () => {
      const configPath = path.join(BACKEND_ROOT, 'jest.config.ts');
      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('coverageThreshold');
      expect(content).toContain('80');
    });
  });
});
