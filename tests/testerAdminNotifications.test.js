import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const packageControllerSource = fs.readFileSync(new URL('../controllers/packagesController.js', import.meta.url), 'utf8');
const testerControllerSource = fs.readFileSync(new URL('../controllers/testController.js', import.meta.url), 'utf8');
const adminControllerSource = fs.readFileSync(new URL('../controllers/adminWebsiteTesterController.js', import.meta.url), 'utf8');
const adminModelSource = fs.readFileSync(new URL('../models/websiteTesterAdminModel.js', import.meta.url), 'utf8');
const adminTemplate = fs.readFileSync(new URL('../views/admin/website_tester.ejs', import.meta.url), 'utf8');
const mailServiceSource = fs.readFileSync(new URL('../services/mailService.js', import.meta.url), 'utf8');
const notificationServicePath = new URL('../services/websiteTesterScanNotificationService.js', import.meta.url);

test('package contact without appointment slot sends an owner copy', () => {
  assert.match(packageControllerSource, /function\s+buildPackageContactAdminHtml/);
  assert.match(packageControllerSource, /async function\s+sendPackageContactAdminCopy/);
  assert.match(packageControllerSource, /to:\s*'kontakt@komplettwebdesign\.de'/);
  assert.match(packageControllerSource, /replyTo:\s*email/);
  assert.match(packageControllerSource, /Neue Paketanfrage/);
  assert.match(packageControllerSource, /await\s+sendPackageContactAdminCopy\(\{[\s\S]*?pack,[\s\S]*?name,[\s\S]*?email,[\s\S]*?locale[\s\S]*?\}\)/);
});

test('website tester admin config stores scan mail notifications enabled by default', () => {
  assert.match(adminModelSource, /tester_scan_email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE/);
  assert.match(adminModelSource, /ADD COLUMN IF NOT EXISTS tester_scan_email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE/);
  assert.match(adminModelSource, /testerScanEmailNotificationsEnabled:\s*normalizeBooleanSetting\(row\.tester_scan_email_notifications_enabled,\s*true\)/);
  assert.match(adminModelSource, /tester_scan_email_notifications_enabled = COALESCE\(\$3,\s*website_tester_config\.tester_scan_email_notifications_enabled\)/);
  assert.match(adminTemplate, /name:\s*'tester_scan_email_notifications_enabled'/);
  assert.match(adminTemplate, /<select id="<%= field\.name %>" class="form-select" name="<%= field\.name %>" required>/);
  assert.match(adminTemplate, /Bei jedem abgeschlossenen Website-Test per E-Mail benachrichtigen/);
});

test('completed website tester scans create admin notifications and optional owner emails', () => {
  assert.ok(fs.existsSync(notificationServicePath), 'scan notification service should exist');
  const notificationServiceSource = fs.readFileSync(notificationServicePath, 'utf8');

  assert.match(adminModelSource, /CREATE TABLE IF NOT EXISTS website_tester_scan_notifications/);
  assert.match(adminModelSource, /export async function createWebsiteTesterScanNotification/);
  assert.match(adminModelSource, /export async function listWebsiteTesterScanNotifications/);
  assert.match(adminModelSource, /export async function markWebsiteTesterScanNotificationMailSent/);
  assert.match(adminModelSource, /export async function markWebsiteTesterScanNotificationMailFailed/);
  assert.match(notificationServiceSource, /createWebsiteTesterScanNotification/);
  assert.match(notificationServiceSource, /sendAdminTesterScanNotification/);
  assert.match(notificationServiceSource, /testerScanEmailNotificationsEnabled !== false/);
  assert.match(mailServiceSource, /export async function sendAdminTesterScanNotification/);

  ['website', 'broken-links', 'geo', 'seo', 'meta'].forEach((source) => {
    assert.match(testerControllerSource, new RegExp(`source:\\s*['"]${source}['"]`));
  });
  const notifyCalls = testerControllerSource.match(/notifyWebsiteTesterScanCompleted\(/g) || [];
  assert.ok(notifyCalls.length >= 5, 'all public tester scan endpoints should call the notification helper');
});

test('admin website tester page lists recent scan notifications', () => {
  assert.match(adminControllerSource, /listWebsiteTesterScanNotifications/);
  assert.match(adminControllerSource, /scanNotifications/);
  assert.match(adminTemplate, /Letzte Tester-Ausführungen/);
  assert.match(adminTemplate, /scanNotifications\.rows/);
});
