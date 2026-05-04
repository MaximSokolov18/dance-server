export class AppError extends Error {
    constructor(
        message: string,
        readonly code: string,
        readonly statusCode: number,
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class NotFoundError extends AppError {
    constructor(message: string) {
        super(message, 'NOT_FOUND', 404);
    }
}

export class UnprocessableError extends AppError {
    constructor(message: string, code: string) {
        super(message, code, 422);
    }
}

/** PostgreSQL unique-constraint violation error code */
export const PG_UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(err: unknown): boolean {
    return typeof err === 'object' && err !== null && (err as Record<string, unknown>).code === PG_UNIQUE_VIOLATION;
}
