import { z, ZodError } from 'zod';

export const DEFAULT_SWIPE_AND_COOK_API_BASE_URL =
  'https://api.swipeandcook.komplettwebdesign.de';

const requestSchema = z.object({
  email: z.string().trim().email().max(254),
  website: z.string().max(200).optional().default('')
}).strict();

const verificationSchema = z.object({
  externalRequestId: z.string().uuid(),
  email: z.string().trim().email().max(254),
  token: z.string().trim().regex(/^[A-Za-z0-9_-]{43}$/),
  mode: z.enum(['immediate', 'scheduled']),
  confirmPaidAccessLoss: z.boolean()
}).strict().superRefine((value, context) => {
  if (
    value.mode === 'immediate'
    && value.confirmPaidAccessLoss !== true
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmPaidAccessLoss'],
      message: 'paid_access_loss_confirmation_required'
    });
  }
});

const safeClientErrors = new Set([
  'invalid_external_deletion_request',
  'invalid_or_expired_deletion_verification'
]);

export class SwipeAndCookDeletionGatewayError extends Error {
  constructor(code, status) {
    super(code);
    this.name = 'SwipeAndCookDeletionGatewayError';
    this.code = code;
    this.status = status;
  }
}

function normalizeApiBaseUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(
      String(rawUrl || DEFAULT_SWIPE_AND_COOK_API_BASE_URL)
    );
  } catch {
    throw new TypeError('invalid_swipeandcook_api_base_url');
  }
  const expected = new URL(DEFAULT_SWIPE_AND_COOK_API_BASE_URL);
  if (
    parsed.protocol !== 'https:'
    || parsed.origin !== expected.origin
    || parsed.username
    || parsed.password
    || (parsed.pathname !== '/' && parsed.pathname !== '')
    || parsed.search
    || parsed.hash
  ) {
    throw new TypeError('invalid_swipeandcook_api_base_url');
  }
  return parsed.origin;
}

function validationError(code) {
  return new SwipeAndCookDeletionGatewayError(code, 400);
}

function validate(schema, value, code) {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) throw validationError(code);
    throw error;
  }
}

async function safeJson(response) {
  try {
    const result = await response.json();
    return result && typeof result === 'object' && !Array.isArray(result)
      ? result
      : {};
  } catch {
    return {};
  }
}

export function createSwipeAndCookAccountDeletionGateway({
  apiBaseUrl = DEFAULT_SWIPE_AND_COOK_API_BASE_URL,
  fetchImpl = globalThis.fetch,
  timeoutMs = 8000
} = {}) {
  const baseUrl = normalizeApiBaseUrl(apiBaseUrl);
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('swipeandcook_deletion_fetch_required');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 15000) {
    throw new TypeError('invalid_swipeandcook_deletion_timeout');
  }

  async function forward(path, payload) {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify(payload),
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch {
      throw new SwipeAndCookDeletionGatewayError(
        'swipeandcook_deletion_service_unavailable',
        503
      );
    }

    const body = await safeJson(response);
    if (response.status === 202 && body.accepted === true) {
      return {
        status: 202,
        body: { accepted: true }
      };
    }
    if (
      response.status === 400
      && safeClientErrors.has(body.error)
    ) {
      return {
        status: 400,
        body: { error: body.error }
      };
    }
    if (response.status === 429) {
      throw new SwipeAndCookDeletionGatewayError(
        'swipeandcook_deletion_temporarily_unavailable',
        429
      );
    }
    throw new SwipeAndCookDeletionGatewayError(
      'swipeandcook_deletion_service_unavailable',
      503
    );
  }

  return Object.freeze({
    async start(input) {
      const payload = validate(
        requestSchema,
        input,
        'invalid_external_deletion_request'
      );
      return forward(
        '/v1/public/account-deletion-requests',
        payload
      );
    },

    async verify(input) {
      const payload = validate(
        verificationSchema,
        input,
        'invalid_or_expired_deletion_verification'
      );
      return forward(
        '/v1/public/account-deletion-verifications',
        payload
      );
    }
  });
}
