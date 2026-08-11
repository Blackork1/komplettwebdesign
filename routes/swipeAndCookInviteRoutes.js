import express from 'express';

import {
  buildAndroidAssetLinks,
  buildAppleAppSiteAssociation
} from '../services/swipeAndCookAppAssociationService.js';

const canonicalHost = 'www.komplettwebdesign.de';
const canonicalPath = '/swipeandcook/einladung';
const invitePageCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'none'",
  "media-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "manifest-src 'none'",
  "worker-src 'none'"
].join('; ');

function invalidPageConfig() {
  throw new TypeError('swipeandcook_invite_page_config_invalid');
}

function checkedUrl(value, predicate) {
  if (typeof value !== 'string') invalidPageConfig();
  let url;
  try {
    url = new URL(value);
  } catch {
    invalidPageConfig();
  }
  if (
    url.protocol !== 'https:'
    || url.username
    || url.password
    || url.hash
    || !predicate(url)
  ) {
    invalidPageConfig();
  }
  return url.toString();
}

export function loadSwipeAndCookInvitePageConfig(env = process.env) {
  const canonicalInviteUrl = checkedUrl(
    env.SWIPEANDCOOK_PUBLIC_INVITE_URL,
    (url) => (
      url.hostname === canonicalHost
      && !url.port
      && url.pathname === canonicalPath
      && !url.search
    )
  );
  const testFlightUrl = checkedUrl(
    env.SWIPEANDCOOK_TESTFLIGHT_URL,
    (url) => (
      url.hostname === 'testflight.apple.com'
      && url.pathname === '/'
      && !url.search
    )
  );
  const googlePlayInternalTestUrl = checkedUrl(
    env.SWIPEANDCOOK_GOOGLE_PLAY_INTERNAL_TEST_URL,
    (url) => (
      url.hostname === 'play.google.com'
      && [
        '/apps/internaltest/',
        '/apps/testing/',
        '/store/apps/testing/'
      ].some((prefix) => url.pathname.startsWith(prefix))
    )
  );

  return Object.freeze({
    canonicalInviteUrl,
    testFlightUrl,
    googlePlayInternalTestUrl
  });
}

function setInvitePageHeaders(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', invitePageCsp);
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}

export function createSwipeAndCookInviteRouter({
  associationConfig,
  invitePageConfig
} = {}) {
  const appleAssociation = buildAppleAppSiteAssociation(associationConfig);
  const androidAssetLinks = buildAndroidAssetLinks(associationConfig);
  if (!invitePageConfig?.canonicalInviteUrl) invalidPageConfig();

  const router = express.Router();

  router.get('/.well-known/apple-app-site-association', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).type('application/json').send(JSON.stringify(appleAssociation));
  });

  router.get('/.well-known/assetlinks.json', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).type('application/json').send(JSON.stringify(androidAssetLinks));
  });

  router.get(canonicalPath, (_req, res) => {
    setInvitePageHeaders(res);
    res.status(200).render('static/swipeandcook-einladung', {
      title: 'Einladung zu Swipe & Cook',
      ...invitePageConfig
    });
  });

  return router;
}
