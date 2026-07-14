function providerHttpStatus(error) {
  return Number(error?.status ?? error?.statusCode ?? error?.response?.status);
}

function providerErrorCode(error) {
  return error?.response?.data?.error?.code
    ?? error?.response?.error?.code
    ?? error?.code;
}

export function providerRequestWasRejectedBeforeExecution(error) {
  const internalSchemaRejection = error?.providerRequestStarted === false
    && error?.code === 'CONTENT_OPENAI_SCHEMA_INCOMPATIBLE';
  const providerSchemaRejection = providerHttpStatus(error) === 400
    && providerErrorCode(error) === 'invalid_json_schema';
  return internalSchemaRejection || providerSchemaRejection;
}

export function providerFailureIsSafeToRetry(error) {
  return error?.safeToRetry === true
    || providerRequestWasRejectedBeforeExecution(error);
}
