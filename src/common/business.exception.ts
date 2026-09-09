/**
 * Structured business exception carrying a stable error code for frontend i18n.
 * Response shape: { statusCode, errorCode, message, params? }
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCodeValue } from './error-codes';

export type ErrorParams = Record<string, string | number>;

export class BusinessException extends HttpException {
  readonly errorCode: ErrorCodeValue;
  readonly params?: ErrorParams;

  constructor(
    errorCode: ErrorCodeValue,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    message?: string,
    params?: ErrorParams,
  ) {
    super(message ?? errorCode, statusCode);
    this.errorCode = errorCode;
    this.params = params;
  }

  // ── Convenience factories ──────────────────────────────────────────

  static badRequest(
    errorCode: ErrorCodeValue,
    message?: string,
    params?: ErrorParams,
  ): BusinessException {
    return new BusinessException(
      errorCode,
      HttpStatus.BAD_REQUEST,
      message,
      params,
    );
  }

  static unauthorized(
    errorCode: ErrorCodeValue,
    message?: string,
    params?: ErrorParams,
  ): BusinessException {
    return new BusinessException(
      errorCode,
      HttpStatus.UNAUTHORIZED,
      message,
      params,
    );
  }

  static forbidden(
    errorCode: ErrorCodeValue,
    message?: string,
    params?: ErrorParams,
  ): BusinessException {
    return new BusinessException(
      errorCode,
      HttpStatus.FORBIDDEN,
      message,
      params,
    );
  }

  static notFound(
    errorCode: ErrorCodeValue,
    message?: string,
    params?: ErrorParams,
  ): BusinessException {
    return new BusinessException(
      errorCode,
      HttpStatus.NOT_FOUND,
      message,
      params,
    );
  }

  static conflict(
    errorCode: ErrorCodeValue,
    message?: string,
    params?: ErrorParams,
  ): BusinessException {
    return new BusinessException(
      errorCode,
      HttpStatus.CONFLICT,
      message,
      params,
    );
  }

  static payloadTooLarge(
    errorCode: ErrorCodeValue,
    message?: string,
    params?: ErrorParams,
  ): BusinessException {
    return new BusinessException(
      errorCode,
      HttpStatus.PAYLOAD_TOO_LARGE,
      message,
      params,
    );
  }

  static internal(
    errorCode: ErrorCodeValue,
    message?: string,
    params?: ErrorParams,
  ): BusinessException {
    return new BusinessException(
      errorCode,
      HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      params,
    );
  }
}
