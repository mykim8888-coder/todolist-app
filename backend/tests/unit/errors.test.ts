/**
 * BE-03 완료 조건 검증: 커스텀 에러 클래스
 * - 모든 커스텀 에러가 AppError instanceof 체크를 통과한다
 */

import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../src/utils/errors';

describe('BE-03: 커스텀 에러 클래스', () => {
  describe('AppError 기반 클래스', () => {
    it('AppError를 직접 생성할 수 있다', () => {
      const err = new AppError(400, 'BAD_REQUEST', '잘못된 요청');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
      expect(err.message).toBe('잘못된 요청');
    });
  });

  describe('UnauthorizedError (401)', () => {
    it('기본 메시지로 생성된다', () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
      expect(err.message).toBe('인증이 필요합니다');
    });

    it('커스텀 메시지로 생성된다', () => {
      const err = new UnauthorizedError('토큰이 만료되었습니다');
      expect(err.message).toBe('토큰이 만료되었습니다');
    });

    it('AppError instanceof 체크를 통과한다', () => {
      const err = new UnauthorizedError();
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(UnauthorizedError);
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('ForbiddenError (403)', () => {
    it('기본 메시지로 생성된다', () => {
      const err = new ForbiddenError();
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
      expect(err.message).toBe('접근 권한이 없습니다');
    });

    it('커스텀 메시지로 생성된다', () => {
      const err = new ForbiddenError('타인의 리소스에 접근할 수 없습니다');
      expect(err.message).toBe('타인의 리소스에 접근할 수 없습니다');
    });

    it('AppError instanceof 체크를 통과한다', () => {
      const err = new ForbiddenError();
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(ForbiddenError);
    });
  });

  describe('NotFoundError (404)', () => {
    it('기본 메시지로 생성된다', () => {
      const err = new NotFoundError();
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('리소스를 찾을 수 없습니다');
    });

    it('AppError instanceof 체크를 통과한다', () => {
      const err = new NotFoundError();
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(NotFoundError);
    });
  });

  describe('ConflictError (409)', () => {
    it('기본 메시지로 생성된다', () => {
      const err = new ConflictError();
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT');
      expect(err.message).toBe('이미 존재하는 리소스입니다');
    });

    it('AppError instanceof 체크를 통과한다', () => {
      const err = new ConflictError();
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(ConflictError);
    });
  });

  describe('ValidationError (422)', () => {
    it('기본 메시지로 생성된다', () => {
      const err = new ValidationError();
      expect(err.statusCode).toBe(422);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.message).toBe('입력값이 올바르지 않습니다');
    });

    it('details 필드를 포함할 수 있다', () => {
      const details = [{ field: 'email', message: '이메일 형식이 아닙니다' }];
      const err = new ValidationError('유효성 오류', details);
      expect(err.details).toEqual(details);
    });

    it('details 없이 생성하면 undefined이다', () => {
      const err = new ValidationError('유효성 오류');
      expect(err.details).toBeUndefined();
    });

    it('AppError instanceof 체크를 통과한다', () => {
      const err = new ValidationError();
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(ValidationError);
    });
  });

  describe('에러 상속 계층 — 모든 에러가 AppError를 상속한다', () => {
    const allErrors: AppError[] = [
      new UnauthorizedError(),
      new ForbiddenError(),
      new NotFoundError(),
      new ConflictError(),
      new ValidationError(),
    ];

    it.each(allErrors)('%o 가 AppError 인스턴스이다', (err) => {
      expect(err).toBeInstanceOf(AppError);
    });

    it.each(allErrors)('%o 가 Error 인스턴스이다', (err) => {
      expect(err).toBeInstanceOf(Error);
    });

    it('try-catch에서 AppError로 잡을 수 있다', () => {
      function throwForbidden(): void {
        throw new ForbiddenError();
      }

      let caught: unknown;
      try {
        throwForbidden();
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(AppError);
      expect((caught as AppError).statusCode).toBe(403);
    });
  });

  describe('에러 name 필드', () => {
    it('UnauthorizedError name이 클래스명과 일치한다', () => {
      expect(new UnauthorizedError().name).toBe('UnauthorizedError');
    });

    it('ForbiddenError name이 클래스명과 일치한다', () => {
      expect(new ForbiddenError().name).toBe('ForbiddenError');
    });

    it('ValidationError name이 클래스명과 일치한다', () => {
      expect(new ValidationError().name).toBe('ValidationError');
    });
  });
});
