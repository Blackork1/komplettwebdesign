import axios from 'axios';
import crypto from 'crypto';
import BlogPostModel from '../models/BlogPostModel.js';
import CommentModel from '../models/CommentModel.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function hasFullConsent(req) {
  const consent = req.session?.cookieConsent;
  return Boolean(consent && consent.analytics && consent.marketing && consent.youtubeVideos);
}

function sanitizeText(value = '', maxLength = 1200) {
  return String(value || '').replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
}

async function verifyRecaptcha(token) {
  if (!token || !process.env.RECAPTCHA_SECRET) return false;

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET,
          response: token
        }
      }
    );
    return Boolean(response.data?.success);
  } catch (err) {
    console.error('reCAPTCHA verification failed:', err.message);
    return false;
  }
}

function getThrottleKey(req, slug) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  return `${ip}::${slug}`;
}

function enforceThrottle(req, slug) {
  const key = getThrottleKey(req, slug);
  const now = Date.now();
  const lastMap = req.session.commentThrottle || {};
  const last = lastMap[key];

  if (last && now - last < FIFTEEN_MINUTES) {
    return false;
  }

  req.session.commentThrottle = {
    ...lastMap,
    [key]: now
  };
  return true;
}

function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex');
}

function serializeComment(row) {
  return {
    id: row.id,
    author_name: row.author_name,
    content: row.content,
    likes: row.likes,
    dislikes: row.dislikes,
    created_at: row.created_at
  };
}

export async function listComments(req, res) {
  const post = await BlogPostModel.findBySlug(req.params.slug);
  if (!post) return res.status(404).json({ message: 'Artikel nicht gefunden' });

  const comments = await CommentModel.listByPost(post.id);
  res.json({ comments: comments.map(serializeComment) });
}

export async function addComment(req, res) {
  if (!hasFullConsent(req)) {
    return res.status(403).json({ message: 'Zum Kommentieren müssen alle Cookies akzeptiert werden.' });
  }

  const post = await BlogPostModel.findBySlug(req.params.slug);
  if (!post) return res.status(404).json({ message: 'Artikel nicht gefunden' });

  const name = sanitizeText(req.body.name, 80);
  const message = sanitizeText(req.body.comment, 1500);
  const token = req.body.recaptchaToken;

  if (!name || !message) {
    return res.status(400).json({ message: 'Bitte Name und Kommentar ausfüllen.' });
  }

  const recaptchaOk = await verifyRecaptcha(token);
  if (!recaptchaOk) {
    return res.status(400).json({ message: 'Die Spam-Prüfung ist fehlgeschlagen. Bitte versuche es erneut.' });
  }

  if (!enforceThrottle(req, post.slug)) {
    return res.status(429).json({ message: 'Bitte warte 15 Minuten, bevor du einen weiteren Kommentar sendest.' });
  }

  const ip = req.ip || req.connection?.remoteAddress || null;
  const comment = await CommentModel.create({
    postId: post.id,
    authorName: name,
    content: message,
    ipHash: hashIp(ip)
  });

  res.json({
    success: true,
    comment: serializeComment(comment)
  });
}

export async function reactToComment(req, res) {
  if (!hasFullConsent(req)) {
    return res.status(403).json({ message: 'Zum Liken oder Disliken müssen alle Cookies akzeptiert werden.' });
  }

  const commentId = Number(req.params.commentId);
  if (!commentId) return res.status(400).json({ message: 'Ungültige Kommentar-ID.' });

  const targetReaction = req.body.reaction === 'dislike' ? 'dislike' : 'like';

  const comment = await CommentModel.findById(commentId);
  if (!comment) return res.status(404).json({ message: 'Kommentar nicht gefunden.' });

  const previousReactions = req.session.commentReactions || {};
  const previousReaction = previousReactions[commentId];

  const updated = await CommentModel.applyReaction(commentId, previousReaction, targetReaction);

  req.session.commentReactions = {
    ...previousReactions,
    [commentId]: targetReaction
  };

  res.json({
    success: true,
    reaction: targetReaction,
    stats: {
      likes: updated.likes,
      dislikes: updated.dislikes
    }
  });
}