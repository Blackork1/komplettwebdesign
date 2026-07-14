function parsePersistedEnvelope(value, schema, versionFence) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value[versionFence.key] !== versionFence.value) return null;
  const parsed = schema.safeParse(value.value);
  return parsed.success ? { ...value, value: parsed.data } : null;
}

function providerRetryIsSafe(error) {
  return error?.safeToRetry === true
    || Number(error?.status ?? error?.statusCode ?? error?.response?.status) === 429;
}

async function recordProvider(dependencies, success, errorCode = null) {
  if (typeof dependencies.recordProviderResult !== 'function') return;
  try {
    await dependencies.recordProviderResult({ providerName: 'openai', success, errorCode });
  } catch {
    // Die technische Statusanzeige darf einen fachlich sicheren Lauf nicht verändern.
  }
}

function uncertainProviderResult(message = 'Der Providerzustand ist nicht eindeutig. Die kostenpflichtige Stufe wird nicht automatisch wiederholt.') {
  return { manual: { code: 'provider_execution_uncertain', message } };
}

async function executeNewProviderStage(input, dependencies, reservation) {
  let result;
  try {
    await dependencies.assertLease();
    result = await input.execute();
  } catch (error) {
    if (error?.code === 'CONTENT_JOB_LEASE_LOST') throw error;
    await recordProvider(dependencies, false, error?.code || 'OPENAI_REQUEST_FAILED');
    if (!providerRetryIsSafe(error)) return uncertainProviderResult();
    try {
      await dependencies.costService.releaseMonthlyBudgetReservation({
        runId: input.run.id,
        stageId: input.stageId,
        reservationMonth: reservation.reservationMonth
      });
    } catch {
      return uncertainProviderResult(
        'Die Budgetreservierung konnte nicht sicher freigegeben werden. Die kostenpflichtige Stufe wird nicht automatisch wiederholt.'
      );
    }
    error.code = 'CONTENT_PROVIDER_SAFE_RETRY';
    error.retryable = true;
    throw error;
  }

  const parsed = input.schema.safeParse(result?.value);
  if (!parsed.success) {
    return { manual: {
      code: 'provider_stage_schema_invalid',
      message: 'Der Provider hat kein gültiges strukturiertes Ergebnis geliefert.',
      issues: parsed.error.issues
    } };
  }
  const usage = result.usage || {};
  const actualCost = dependencies.costService.estimateTextCost({
    usage,
    inputRate: input.inputRate,
    outputRate: input.outputRate
  });
  const envelope = {
    value: parsed.data,
    responseId: result.responseId || null,
    usage,
    promptVersion: result.promptVersion || 'unknown',
    [input.versionFence.key]: input.versionFence.value,
    reservationMonth: reservation.reservationMonth,
    actualCost
  };
  try {
    await dependencies.runRepository.updateRunStage(input.run.id, {
      currentStage: input.stageId,
      stageId: input.stageId,
      stageResult: envelope,
      tokenUsage: envelope.usage,
      responseIds: envelope.responseId ? [envelope.responseId] : []
    });
  } catch {
    return { manual: {
      code: 'provider_stage_persistence_uncertain',
      message: 'Das Providerergebnis konnte nicht eindeutig gespeichert werden. Die Reservierung bleibt zur manuellen Prüfung offen.'
    } };
  }
  await dependencies.assertLease();
  await dependencies.costService.settleMonthlyBudget({
    runId: input.run.id,
    stageId: input.stageId,
    reservationMonth: reservation.reservationMonth,
    actualCost
  });
  await recordProvider(dependencies, true);
  return { value: envelope.value, envelope, reused: false };
}

export async function executePaidStructuredTextStage(input, dependencies) {
  const persisted = await dependencies.costService.getPersistedStageResult({
    runId: input.run.id,
    stageId: input.stageId
  });
  if (persisted !== null && persisted !== undefined) {
    const envelope = parsePersistedEnvelope(persisted, input.schema, input.versionFence);
    return envelope
      ? { value: envelope.value, envelope, reused: true }
      : { manual: {
        code: 'provider_stage_result_invalid',
        message: 'Das gespeicherte Providerergebnis ist ungültig oder gehört zu einer anderen Ausgangsversion.'
      } };
  }

  await dependencies.assertLease();
  const reservation = await dependencies.costService.reserveMonthlyBudget({
    runId: input.run.id,
    stageId: input.stageId,
    estimatedCost: input.reservationCost,
    limit: Number(input.runtimeSnapshot.monthlyCostLimitEur),
    timezone: input.runtimeSnapshot.timezone
  });
  if (reservation.created !== true) {
    return { manual: {
      code: 'provider_execution_uncertain',
      message: 'Für diese Providerstufe besteht bereits eine ungeklärte Reservierung.'
    } };
  }
  return executeNewProviderStage(input, dependencies, reservation);
}
