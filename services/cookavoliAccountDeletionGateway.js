import { z, ZodError } from 'zod';

export const COOKAVOLI_API_BASE_URL = 'https://api.cookavoli.com';

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
  if (value.mode === 'immediate' && value.confirmPaidAccessLoss !== true) {
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

export class CookavoliDeletionGatewayError extends Error {
  constructor(code, status) {
    super(code);
    this.name = 'CookavoliDeletionGatewayError';
    this.code = code;
    this.status = status;
  }
}

function normalizeApiBaseUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || COOKAVOLI_API_BASE_URL));
  } catch {
    throw new TypeError('invalid_cookavoli_api_base_url');
  }
  if (
    parsed.protocol !== 'https:'
    || parsed.origin !== COOKAVOLI_API_BASE_URL
    || parsed.username
    || parsed.password
    || (parsed.pathname !== '/' && parsed.pathname !== '')
    || parsed.search
    || parsed.hash
  ) {
    throw new TypeError('invalid_cookavoli_api_base_url');
  }
  return parsed.origin;
}

function validate(schema, input, code) {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new CookavoliDeletionGatewayError(code, 400);
    }
    throw error;
  }
}

async function safeJson(response) {
  try {
    const body = await response.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? body
      : {};
  } catch {
    return {};
  }
}

export function createCookavoliAccountDeletionGateway({
  apiBaseUrl = COOKAVOLI_API_BASE_URL,
  fetchImpl = globalThis.fetch,
  timeoutMs = 8000
} = {}) {
  const baseUrl = normalizeApiBaseUrl(apiBaseUrl);
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('cookavoli_deletion_fetch_required');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 15000) {
    throw new TypeError('invalid_cookavoli_deletion_timeout');
  }

  async function forward(path, payload) {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload),
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch {
      throw new CookavoliDeletionGatewayError(
        'swipeandcook_deletion_service_unavailable',
        503
      );
    }

    const body = await safeJson(response);
    if (response.status === 202 && body.accepted === true) {
      return { status: 202, body: { accepted: true } };
    }
    if (response.status === 400 && safeClientErrors.has(body.error)) {
      return { status: 400, body: { error: body.error } };
    }
    if (response.status === 429) {
      throw new CookavoliDeletionGatewayError(
        'swipeandcook_deletion_temporarily_unavailable',
        429
      );
    }
    throw new CookavoliDeletionGatewayError(
      'swipeandcook_deletion_service_unavailable',
      503
    );
  }

  return Object.freeze({
    async start(input) {
      return forward(
        '/v1/public/account-deletion-requests',
        validate(requestSchema, input, 'invalid_external_deletion_request')
      );
    },

    async verify(input) {
      return forward(
        '/v1/public/account-deletion-verifications',
        validate(
          verificationSchema,
          input,
          'invalid_or_expired_deletion_verification'
        )
      );
    }
  });
}
