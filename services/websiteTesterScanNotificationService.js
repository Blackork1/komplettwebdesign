import {
  createWebsiteTesterScanNotification,
  getWebsiteTesterConfig,
  markWebsiteTesterScanNotificationMailFailed,
  markWebsiteTesterScanNotificationMailSent
} from '../models/websiteTesterAdminModel.js';
import { sendAdminTesterScanNotification } from './mailService.js';

function scoreFromPayload(payload = {}) {
  if (Number.isFinite(payload.score)) return payload.score;
  if (Number.isFinite(payload.overallScore)) return payload.overallScore;
  if (Number.isFinite(payload.seoScore)) return payload.seoScore;
  if (Number.isFinite(payload.geoScore)) return payload.geoScore;
  return null;
}

function scoreBandFromPayload(payload = {}) {
  return payload.scoreBand || payload.seoBand || payload.geoBand || '';
}

export async function notifyWebsiteTesterScanCompleted(payload = {}, config = null) {
  try {
    const effectiveConfig = config || await getWebsiteTesterConfig().catch(() => ({
      testerScanEmailNotificationsEnabled: true
    }));
    const emailEnabled = effectiveConfig?.testerScanEmailNotificationsEnabled !== false;
    const notification = await createWebsiteTesterScanNotification({
      ...payload,
      score: scoreFromPayload(payload),
      scoreBand: scoreBandFromPayload(payload),
      emailNotificationEnabled: emailEnabled
    });

    if (!notification || !emailEnabled) return notification;

    try {
      await sendAdminTesterScanNotification({
        source: payload.source,
        requestedUrl: payload.requestedUrl,
        finalUrl: payload.finalUrl,
        status: payload.status,
        errorMessage: payload.errorMessage,
        auditId: payload.auditId,
        score: scoreFromPayload(payload),
        scoreBand: scoreBandFromPayload(payload),
        scanMode: payload.scanMode,
        locale: payload.locale,
        context: payload.contextJson || {}
      });
      await markWebsiteTesterScanNotificationMailSent(notification.id);
    } catch (mailError) {
      await markWebsiteTesterScanNotificationMailFailed(notification.id, mailError?.message || 'Mailversand fehlgeschlagen');
    }

    return notification;
  } catch (error) {
    console.error('Website-Tester-Admin-Benachrichtigung fehlgeschlagen:', error?.message || error);
    return null;
  }
}
