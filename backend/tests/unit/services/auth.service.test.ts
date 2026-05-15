/**
 * BE-06 완료 조건 검증: auth.service
 * - 동일 이메일로 두 번 signup 시 ConflictError(409)
 * - login 성공 시 accessToken + refreshToken 반환
 * - refresh 호출 시 Token Rotation (기존 삭제 + 신규 생성)
 * - 만료된 refreshToken으로 /refresh 시 UnauthorizedError
 */

// config 모킹 (env 검증 시 process.exit 방지)
jest.mock('../../../src/config/env', () => ({
  config: {
    DATABASE_URL: 'postgresql://test:test@localhost/test',
    NODE_ENV: 'test',
    PORT: 3000,
    DB_POOL_MAX: 5,
    DB_IDLE_TIMEOUT_MS: 30000,
    DB_CONNECTION_TIMEOUT_MS: 5000,
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    BCRYPT_SALT_ROUNDS: 4,
    CORS_ORIGIN: 'http://localhost:5173',
  },
}));

// 외부 의존성 전체 모킹
jest.mock('../../../src/repositories/user.repository');
jest.mock('../../../src/repositories/refreshToken.repository');
jest.mock('../../../src/utils/hash');
jest.mock('../../../src/utils/jwt');
jest.mock('../../../src/utils/tokenHash');

import * as userRepo from '../../../src/repositories/user.repository';
import * as refreshTokenRepo from '../../../src/repositories/refreshToken.repository';
import * as hashUtils from '../../../src/utils/hash';
import * as jwtUtils from '../../../src/utils/jwt';
import * as tokenHashUtils from '../../../src/utils/tokenHash';
import * as authService from '../../../src/services/auth.service';
import { ConflictError, UnauthorizedError } from '../../../src/utils/errors';
import { UserRow } from '../../../src/types/user.types';
import { RefreshTokenRow } from '../../../src/repositories/refreshToken.repository';

// 타입 캐스팅 헬퍼
const mockFindByEmail = userRepo.findByEmail as jest.Mock;
const mockCreateUser = userRepo.createUser as jest.Mock;
const mockCreateToken = refreshTokenRepo.createToken as jest.Mock;
const mockFindByTokenHash = refreshTokenRepo.findByTokenHash as jest.Mock;
const mockDeleteByTokenHash = refreshTokenRepo.deleteByTokenHash as jest.Mock;
const mockHashPassword = hashUtils.hashPassword as jest.Mock;
const mockComparePassword = hashUtils.comparePassword as jest.Mock;
const mockSignAccessToken = jwtUtils.signAccessToken as jest.Mock;
const mockSignRefreshToken = jwtUtils.signRefreshToken as jest.Mock;
const mockVerifyRefreshToken = jwtUtils.verifyRefreshToken as jest.Mock;
const mockHashToken = tokenHashUtils.hashToken as jest.Mock;

const FAKE_USER: UserRow = {
  id: 'user-uuid-123',
  email: 'test@example.com',
  password_hash: '$2b$12$hashedpw',
  name: '홍길동',
  auth_provider: 'local',
  provider_id: null,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const FAKE_TOKEN_HASH = 'sha256-hash-of-refresh-token';
const FAKE_ACCESS_TOKEN = 'fake-access-token';
const FAKE_REFRESH_TOKEN = 'fake-refresh-token';
const FAKE_NEW_REFRESH_TOKEN = 'fake-new-refresh-token';

beforeEach(() => {
  jest.clearAllMocks();
  // 기본 설정
  mockHashPassword.mockResolvedValue('$2b$12$hashedpw');
  mockComparePassword.mockResolvedValue(true);
  mockSignAccessToken.mockReturnValue(FAKE_ACCESS_TOKEN);
  mockSignRefreshToken.mockReturnValue(FAKE_REFRESH_TOKEN);
  mockHashToken.mockReturnValue(FAKE_TOKEN_HASH);
  mockCreateToken.mockResolvedValue(undefined);
  mockDeleteByTokenHash.mockResolvedValue(undefined);
  mockVerifyRefreshToken.mockReturnValue({ sub: FAKE_USER.id, email: FAKE_USER.email! });
});

describe('BE-06: auth.service', () => {
  describe('signup', () => {
    it('새 이메일로 가입하면 accessToken, refreshToken, user를 반환한다', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue(FAKE_USER);

      const result = await authService.signup({
        email: 'test@example.com',
        password: 'Password1',
        name: '홍길동',
      });

      expect(result.accessToken).toBe(FAKE_ACCESS_TOKEN);
      expect(result.refreshToken).toBe(FAKE_REFRESH_TOKEN);
      expect(result.user).toMatchObject({ id: FAKE_USER.id, email: FAKE_USER.email, name: FAKE_USER.name });
    });

    it('이메일 중복 시 ConflictError(409)를 throw한다 (BR-01)', async () => {
      mockFindByEmail.mockResolvedValue(FAKE_USER);

      await expect(
        authService.signup({ email: 'test@example.com', password: 'Password1', name: '홍길동' }),
      ).rejects.toThrow(ConflictError);
    });

    it('ConflictError의 statusCode가 409이다', async () => {
      mockFindByEmail.mockResolvedValue(FAKE_USER);

      await expect(
        authService.signup({ email: 'dup@example.com', password: 'Password1', name: '홍길동' }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('bcrypt hash가 호출된다', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue(FAKE_USER);

      await authService.signup({ email: 'test@example.com', password: 'Password1', name: '홍길동' });

      expect(mockHashPassword).toHaveBeenCalledWith('Password1');
    });

    it('createUser에 해시된 비밀번호가 전달된다', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue('hashed-pw');
      mockCreateUser.mockResolvedValue(FAKE_USER);

      await authService.signup({ email: 'test@example.com', password: 'Password1', name: '홍길동' });

      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: 'hashed-pw' }),
      );
    });

    it('refresh token이 DB에 저장된다', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue(FAKE_USER);

      await authService.signup({ email: 'test@example.com', password: 'Password1', name: '홍길동' });

      expect(mockCreateToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: FAKE_USER.id,
          tokenHash: FAKE_TOKEN_HASH,
        }),
      );
    });
  });

  describe('login', () => {
    it('올바른 자격증명으로 로그인하면 accessToken, refreshToken, user를 반환한다', async () => {
      mockFindByEmail.mockResolvedValue(FAKE_USER);
      mockComparePassword.mockResolvedValue(true);

      const result = await authService.login({ email: 'test@example.com', password: 'Password1' });

      expect(result.accessToken).toBe(FAKE_ACCESS_TOKEN);
      expect(result.refreshToken).toBe(FAKE_REFRESH_TOKEN);
      expect(result.user.email).toBe(FAKE_USER.email);
    });

    it('존재하지 않는 이메일로 로그인 시 UnauthorizedError를 throw한다', async () => {
      mockFindByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nope@example.com', password: 'Password1' }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('잘못된 비밀번호로 로그인 시 UnauthorizedError를 throw한다', async () => {
      mockFindByEmail.mockResolvedValue(FAKE_USER);
      mockComparePassword.mockResolvedValue(false);

      await expect(
        authService.login({ email: 'test@example.com', password: 'WrongPass1' }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('password_hash가 없는 사용자(OAuth) 로그인 시 UnauthorizedError를 throw한다', async () => {
      mockFindByEmail.mockResolvedValue({ ...FAKE_USER, password_hash: null });

      await expect(
        authService.login({ email: 'test@example.com', password: 'any' }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('로그인 성공 시 refresh token이 DB에 저장된다', async () => {
      mockFindByEmail.mockResolvedValue(FAKE_USER);

      await authService.login({ email: 'test@example.com', password: 'Password1' });

      expect(mockCreateToken).toHaveBeenCalledWith(
        expect.objectContaining({ userId: FAKE_USER.id }),
      );
    });
  });

  describe('logout', () => {
    it('refreshToken의 hash로 DB 레코드를 삭제한다', async () => {
      await authService.logout(FAKE_REFRESH_TOKEN);

      expect(mockHashToken).toHaveBeenCalledWith(FAKE_REFRESH_TOKEN);
      expect(mockDeleteByTokenHash).toHaveBeenCalledWith(FAKE_TOKEN_HASH);
    });

    it('void를 반환한다', async () => {
      const result = await authService.logout(FAKE_REFRESH_TOKEN);
      expect(result).toBeUndefined();
    });
  });

  describe('refresh — Token Rotation', () => {
    const validTokenRecord: RefreshTokenRow = {
      id: 'token-uuid',
      user_id: FAKE_USER.id,
      token_hash: FAKE_TOKEN_HASH,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 미래
      created_at: new Date(),
    };

    it('유효한 토큰으로 refresh 시 새 accessToken과 refreshToken을 반환한다', async () => {
      mockFindByTokenHash.mockResolvedValue(validTokenRecord);
      mockSignRefreshToken.mockReturnValue(FAKE_NEW_REFRESH_TOKEN);

      const result = await authService.refresh(FAKE_REFRESH_TOKEN);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('Token Rotation: 기존 token_hash로 deleteByTokenHash가 호출된다', async () => {
      mockFindByTokenHash.mockResolvedValue(validTokenRecord);

      await authService.refresh(FAKE_REFRESH_TOKEN);

      expect(mockDeleteByTokenHash).toHaveBeenCalledWith(FAKE_TOKEN_HASH);
    });

    it('Token Rotation: 새 refreshToken이 createToken으로 DB에 저장된다', async () => {
      mockFindByTokenHash.mockResolvedValue(validTokenRecord);
      mockSignRefreshToken.mockReturnValue(FAKE_NEW_REFRESH_TOKEN);

      await authService.refresh(FAKE_REFRESH_TOKEN);

      expect(mockCreateToken).toHaveBeenCalled();
    });

    it('DB에 없는 토큰으로 refresh 시 UnauthorizedError를 throw한다', async () => {
      mockFindByTokenHash.mockResolvedValue(null);

      await expect(authService.refresh('invalid-token')).rejects.toThrow(UnauthorizedError);
    });

    it('만료된 토큰으로 refresh 시 UnauthorizedError를 throw한다', async () => {
      const expiredRecord: RefreshTokenRow = {
        ...validTokenRecord,
        expires_at: new Date(Date.now() - 1000), // 과거
      };
      mockFindByTokenHash.mockResolvedValue(expiredRecord);

      await expect(authService.refresh(FAKE_REFRESH_TOKEN)).rejects.toThrow(UnauthorizedError);
    });

    it('만료된 토큰 감지 시 해당 DB 레코드를 삭제한다', async () => {
      const expiredRecord: RefreshTokenRow = {
        ...validTokenRecord,
        expires_at: new Date(Date.now() - 1000),
      };
      mockFindByTokenHash.mockResolvedValue(expiredRecord);

      await expect(authService.refresh(FAKE_REFRESH_TOKEN)).rejects.toThrow();

      expect(mockDeleteByTokenHash).toHaveBeenCalledWith(FAKE_TOKEN_HASH);
    });

    it('JWT 서명이 유효하지 않으면 UnauthorizedError를 throw한다', async () => {
      mockFindByTokenHash.mockResolvedValue(validTokenRecord);
      mockVerifyRefreshToken.mockImplementation(() => {
        throw new UnauthorizedError('유효하지 않은 리프레시 토큰입니다');
      });

      await expect(authService.refresh(FAKE_REFRESH_TOKEN)).rejects.toThrow(UnauthorizedError);
    });
  });
});
