/**
 * Backend API success / error envelopes per
 * docs/internal/13_engineering_standards/03_api_conventions.md and
 * 14_validation_contract.md.
 */
export type ApiSuccess<T, M = Record<string, unknown>> = {
  data: T;
  meta: M;
};

export type FieldErrors = Record<string, string[]>;

export type ApiError = {
  code: string;
  message: string;
  fields?: FieldErrors;
};

export class ApiHttpError extends Error {
  status: number;
  code: string;
  fields?: FieldErrors;
  payload?: unknown;

  constructor(status: number, payload: ApiError, raw?: unknown) {
    super(payload.message || payload.code);
    this.status = status;
    this.code = payload.code;
    this.fields = payload.fields;
    this.payload = raw;
    this.name = "ApiHttpError";
  }

  isValidationError(): boolean {
    return this.code === "VALIDATION_ERROR";
  }
}
