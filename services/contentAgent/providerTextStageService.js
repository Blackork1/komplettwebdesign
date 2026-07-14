function parsePersistedEnvelope(value, schema, versionFence) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value[versionFence.key] !== versionFence.value) return null;
  const parsed = schema.safeParse(value.value);
  return parsed.success ? { ...value, value: parsed.data } : null;
}

function stableJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => (
    `${JSON.stringify(key)}:${stableJson(value[key])}`
  )).join(',')}}`;
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
  const textCost = dependencies.costService.estimateTextCost({
    usage,
    inputRate: input.inputRate,
    outputRate: input.outputRate
  });
  let additionalCost = 0;
  if (typeof input.calculateAdditionalCost === 'function') {
    additionalCost = input.calculateAdditionalCost(result);
    if (!Number.isFinite(additionalCost) || additionalCost < 0) {
      return { manual: {
        code: 'provider_stage_cost_invalid',
        message: 'Die zusätzlichen Providerkosten konnten nicht sicher bestimmt werden.'
      } };
    }
  }
  const actualCost = textCost + additionalCost;
  const envelope = {
    value: parsed.data,
    responseId: result.responseId || null,
    usage,
    promptVersion: result.promptVersion || 'unknown',
    [input.versionFence.key]: input.versionFence.value,
    reservationMonth: reservation.reservationMonth,
    actualCost,
    ...(typeof input.calculateAdditionalCost === 'function' ? {
      textCost,
      additionalCost,
      webSearchCallCount: result.webSearchCallCount
    } : {})
  };
  try {
    await dependencies.assertLease();
  } catch (error) {
    if (error?.code === 'CONTENT_JOB_LEASE_LOST') {
      return uncertainProviderResult(
        'Die Lease ging nach der Providerantwort verloren. Das Ergebnis wird nicht automatisch gespeichert oder erneut erzeugt.'
      );
    }
    throw error;
  }
  let persistedRun;
  try {
    persistedRun = await dependencies.runRepository.updateRunStage(input.run.id, {
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
  const confirmedEnvelope = persistedRun?.stage_results_json?.[input.stageId];
  if (!confirmedEnvelope || stableJson(confirmedEnvelope) !== stableJson(envelope)) {
    return { manual: {
      code: 'provider_stage_persistence_uncertain',
      message: 'Das Providerergebnis wurde nicht eindeutig als maßgebliches Stufenergebnis bestätigt. Die Reservierung bleibt zur manuellen Prüfung offen.'
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
    if (!envelope) {
      return { manual: {
        code: 'provider_stage_result_invalid',
        message: 'Das gespeicherte Providerergebnis ist ungültig oder gehört zu einer anderen Ausgangsversion.'
      } };
    }
    await dependencies.assertLease();
    await dependencies.costService.settleMonthlyBudget({
      runId: input.run.id,
      stageId: input.stageId,
      reservationMonth: envelope.reservationMonth,
      actualCost: Number(envelope.actualCost)
    });
    await recordProvider(dependencies, true);
    return { value: envelope.value, envelope, reused: true };
  }

  await dependencies.assertLease();
  let reservation;
  try {
    reservation = await dependencies.costService.reserveMonthlyBudget({
      runId: input.run.id,
      stageId: input.stageId,
      estimatedCost: input.reservationCost,
      limit: Number(input.runtimeSnapshot.monthlyCostLimitEur),
      timezone: input.runtimeSnapshot.timezone
    });
  } catch (error) {
    if (error?.code !== 'CONTENT_BUDGET_LIMIT_REACHED') throw error;
    return { manual: {
      code: 'CONTENT_BUDGET_LIMIT_REACHED',
      message: 'Das konfigurierte Monatsbudget für KI-Inhalte ist ausgeschöpft.'
    } };
  }
  if (reservation.created !== true) {
    return { manual: {
      code: 'provider_execution_uncertain',
      message: 'Für diese Providerstufe besteht bereits eine ungeklärte Reservierung.'
    } };
  }
  return executeNewProviderStage(input, dependencies, reservation);
}
