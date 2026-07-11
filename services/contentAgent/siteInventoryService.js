import { load } from 'cheerio';
import { CONTENT_AGENT_LINKS } from '../../data/contentAgentLinks.js';

function text(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function isInternalPath(value) {
  return typeof value === 'string' && /^\/(?!\/)/.test(value.trim());
}

function extractArticleContext(content) {
  if (typeof content !== 'string' || !content.trim()) {
    return { headings: [], internalLinks: [] };
  }

  const $ = load(content, null, false);
  const headings = unique($('h1, h2, h3, h4, h5, h6').toArray().map((heading) => text($(heading).text())));
  const internalLinks = unique($('a[href]').toArray()
    .map((link) => text($(link).attr('href')))
    .filter(isInternalPath));
  return { headings, internalLinks };
}

function normalizeArticle(post = {}) {
  const extracted = extractArticleContext(post.content);
  const primaryKeyword = text(post.primaryKeyword ?? post.primary_keyword);
  const contentCluster = text(post.contentCluster ?? post.content_cluster);
  return {
    title: text(post.title),
    slug: text(post.slug),
    excerpt: text(post.excerpt),
    category: text(post.category),
    description: text(post.description),
    ...(primaryKeyword ? { primaryKeyword } : {}),
    ...(contentCluster ? { contentCluster } : {}),
    headings: unique([
      ...(Array.isArray(post.headings) ? post.headings.map(text) : []),
      ...extracted.headings
    ]),
    internalLinks: unique([
      ...normalizeInternalLinks(post.internalLinks),
      ...extracted.internalLinks
    ])
  };
}

function normalizeInternalLinks(links) {
  if (!Array.isArray(links)) return [];
  return unique(links.map((link) => text(typeof link === 'string' ? link : link?.url)).filter(isInternalPath));
}

function headingValues(source, keys) {
  return unique([
    ...(Array.isArray(source.headings) ? source.headings.map(text) : []),
    ...keys.map((key) => text(source[key]))
  ]);
}

function normalizeServicePage(page = {}) {
  const description = [page.metaDescription, page.meta_description, page.subtitle, page.description]
    .map(text)
    .find(Boolean) || '';
  return {
    title: text(page.title),
    slug: text(page.slug),
    description,
    headings: headingValues(page, [
      'hero_title',
      'heroTitle',
      'intro_problem_title',
      'intro_solution_title',
      'risks_title',
      'cta_title'
    ]),
    internalLinks: unique([
      ...normalizeInternalLinks(page.internalLinks),
      ...[page.cta_button_link, page.ctaButtonLink].map(text).filter(isInternalPath)
    ])
  };
}

function normalizeIndustry(industry = {}) {
  return {
    name: text(industry.name),
    title: text(industry.title || industry.name),
    slug: text(industry.slug),
    description: text(industry.description),
    headings: headingValues(industry, ['hero_h1', 'hero_h2']),
    internalLinks: normalizeInternalLinks(industry.internalLinks)
  };
}

const PACKAGE_CONTEXT_FIELDS = [
  'packageKey',
  'name',
  'displayName',
  'slug',
  'canonicalPath',
  'priceLabel',
  'priceType',
  'vatNote',
  'shortDescription',
  'longDescription',
  'positioning',
  'targetGroup',
  'notFor',
  'pageScope',
  'textScope',
  'seoScope',
  'techScope',
  'feedbackRounds',
  'timeline'
];

function normalizePackage(pkg = {}) {
  return Object.fromEntries(PACKAGE_CONTEXT_FIELDS.flatMap((field) => {
    const value = pkg[field];
    if (value === undefined || value === null || value === '') return [];
    return [[field, typeof value === 'string' ? text(value) : value]];
  }));
}

async function defaultLoadBlogPosts() {
  const { default: pool } = await import('../../util/db.js');
  const { rows } = await pool.query(`
    SELECT p.title, p.slug, p.excerpt, p.content, p.category, p.description,
           m.primary_keyword, m.content_cluster
      FROM posts p
      LEFT JOIN content_post_metadata m ON m.post_id = p.id
     WHERE p.published = TRUE
     ORDER BY p.created_at DESC
  `);
  return rows;
}

async function defaultLoadGuides() {
  const { default: RatgeberModel } = await import('../../models/RatgeberModel.js');
  return RatgeberModel.findAll();
}

async function defaultLoadServicePages() {
  const { default: pool } = await import('../../util/db.js');
  const { rows } = await pool.query(`
    SELECT slug, title, subtitle, meta_description, hero_title, hero_subtitle,
           intro_problem_title, intro_solution_title, risks_title,
           cta_title, cta_button_link
      FROM leistungen_pages
     WHERE is_published = TRUE
     ORDER BY created_at DESC
  `);
  return rows;
}

async function defaultLoadIndustries() {
  const { listIndustries } = await import('../../models/industryModel.js');
  return listIndustries();
}

async function defaultGetVisiblePackages() {
  const { default: pricingService } = await import('../pricingService.js');
  return pricingService.getVisiblePackages();
}

function loaderFrom(dependencies, directName, objectName, methodName, fallback) {
  if (typeof dependencies[directName] === 'function') return dependencies[directName];
  const object = dependencies[objectName];
  if (object && typeof object[methodName] === 'function') return object[methodName].bind(object);
  return fallback;
}

export async function buildSiteInventory(dependencies = {}) {
  if (!dependencies || typeof dependencies !== 'object' || Array.isArray(dependencies)) {
    throw new TypeError('Die Abhängigkeiten müssen als Objekt übergeben werden.');
  }
  const loadBlogPosts = loaderFrom(dependencies, 'loadBlogPosts', 'blogModel', 'findAll', defaultLoadBlogPosts);
  const loadGuides = loaderFrom(dependencies, 'loadGuides', 'guideModel', 'findAll', defaultLoadGuides);
  const loadServicePages = loaderFrom(dependencies, 'loadServicePages', 'servicePageReader', 'findAll', defaultLoadServicePages);
  const loadIndustries = loaderFrom(dependencies, 'loadIndustries', 'industryModel', 'listIndustries', defaultLoadIndustries);
  const getVisiblePackages = loaderFrom(
    dependencies,
    'getVisiblePackages',
    'pricingService',
    'getVisiblePackages',
    defaultGetVisiblePackages
  );

  const [blogPosts, guides, servicePages, industries, packages] = await Promise.all([
    loadBlogPosts(),
    loadGuides(),
    loadServicePages(),
    loadIndustries(),
    getVisiblePackages()
  ]);

  return {
    blogPosts: (blogPosts || []).map(normalizeArticle),
    guides: (guides || []).map(normalizeArticle),
    servicePages: (servicePages || []).map(normalizeServicePage),
    industries: (industries || []).map(normalizeIndustry),
    packages: (packages || []).map(normalizePackage),
    approvedLinks: CONTENT_AGENT_LINKS.map((link) => ({ ...link }))
  };
}
