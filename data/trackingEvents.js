const PAGE_CONTEXTS = Object.freeze([
  { path: '/', page_type: 'home', page_category: 'main' },
  { path: '/webdesign-berlin', page_type: 'service', page_category: 'webdesign' },
  { path: '/pakete', page_type: 'package_overview', page_category: 'offer' },
  { path: '/pakete/start', page_type: 'package_detail', page_category: 'offer', package_id: 'start' },
  { path: '/pakete/business', page_type: 'package_detail', page_category: 'offer', package_id: 'business' },
  { path: '/pakete/wachstum', page_type: 'package_detail', page_category: 'offer', package_id: 'wachstum' },
  { path: '/pakete/individuell', page_type: 'package_detail', page_category: 'offer', package_id: 'individuell' },
  { path: '/webdesign-berlin/kosten-preise-pakete', page_type: 'pricing', page_category: 'costs' },
  { path: '/webdesign-preise', page_type: 'pricing', page_category: 'costs' },
  { path: '/website-kosten-berlin', page_type: 'pricing', page_category: 'costs' },
  { path: '/leistungen', page_type: 'service_overview', page_category: 'offer' },
  { path: '/leistungen/laufende-kosten-website', page_type: 'running_costs', page_category: 'costs' },
  { path: '/leistungen/zusatzleistungen-webdesign', page_type: 'add_ons', page_category: 'offer' },
  { path: '/leistungen/website-wartung', page_type: 'maintenance', page_category: 'recurring_service' },
  { path: '/leistungen/local-seo', page_type: 'service', page_category: 'local_seo' },
  { path: '/leistungen/website-relaunch', page_type: 'service', page_category: 'relaunch' },
  { path: '/leistungen/landingpage-erstellen-lassen', page_type: 'service', page_category: 'landingpage' },
  { path: '/leistungen/website-audit', page_type: 'service', page_category: 'audit' },
  { path: '/kontakt', page_type: 'contact', page_category: 'conversion' },
  { path: '/kontakt/thankyou', page_type: 'thank_you', page_category: 'conversion' },
  { path: '/website-tester', page_type: 'tool', page_category: 'website_check' },
  { path: '/seo-tester', page_type: 'tool', page_category: 'seo_check' },
  { path: '/geo-tester', page_type: 'tool', page_category: 'geo_check' },
  { path: '/meta-tester', page_type: 'tool', page_category: 'meta_check' },
  { path: '/broken-links-tester', page_type: 'tool', page_category: 'link_check' }
]);

export const trackingEventNames = Object.freeze([
  'page_cta_click',
  'header_cta_click',
  'footer_cta_click',
  'hero_cta_click',
  'pricing_cta_click',
  'package_card_click',
  'package_detail_cta_click',
  'contact_cta_click',
  'website_check_cta_click',
  'website_check_start',
  'website_check_submit',
  'tester_started',
  'tester_completed',
  'tester_cta_clicked',
  'tester_lead_requested',
  'tester_lead_confirmed',
  'tester_report_sent',
  'seo_tester_scan_completed',
  'seo_tester_cta_clicked',
  'seo_tester_lead_requested',
  'seo_tester_lead_confirmed',
  'seo_tester_report_sent',
  'geo_tester_lead_confirmed',
  'geo_tester_report_sent',
  'broken_links_tester_cta_clicked',
  'broken_links_tester_lead_requested',
  'broken_links_tester_lead_confirmed',
  'broken_links_tester_report_sent',
  'audit_cta_click',
  'contact_form_view',
  'contact_form_start',
  'contact_form_step_view',
  'contact_form_step_complete',
  'contact_form_field_select',
  'contact_form_validation_error',
  'contact_form_submit_attempt',
  'contact_form_submit_success',
  'contact_form_submit_error',
  'project_type_selected',
  'package_interest_selected',
  'budget_range_selected',
  'timeline_selected',
  'page_scope_selected',
  'content_status_selected',
  'optional_features_selected',
  'hosting_maintenance_selected',
  'thank_you_view',
  'lead_received'
]);

export const trackingAllowedParams = Object.freeze([
  'event_source',
  'page_path',
  'page_type',
  'page_category',
  'cta_id',
  'cta_label',
  'cta_location',
  'cta_target',
  'link_url',
  'form_id',
  'form_variant',
  'step_id',
  'field_name',
  'selected_value',
  'package_id',
  'project_type',
  'budget_range',
  'timeline',
  'page_scope',
  'content_status',
  'optional_features',
  'feature_count',
  'hosting_maintenance_interest',
  'error_type',
  'locale',
  'mode',
  'tester',
  'cta_type',
  'score_bucket',
  'score_value',
  'utm_source',
  'utm_medium',
  'utm_campaign'
]);

function normalizePath(path = '/') {
  const raw = String(path || '/').split('?')[0].replace(/\/$/, '') || '/';
  if (raw === '/en') return '/';
  if (raw.startsWith('/en/')) return raw.slice(3) || '/';
  return raw;
}

export function trackingPageContextForPath(path = '/') {
  const normalized = normalizePath(path);
  const direct = PAGE_CONTEXTS.find((entry) => entry.path === normalized);
  if (direct) return { ...direct, page_path: normalized };

  if (normalized.startsWith('/pakete/')) {
    return {
      page_path: normalized,
      page_type: 'package_detail',
      page_category: 'offer'
    };
  }

  if (normalized.startsWith('/webdesign-berlin/')) {
    return {
      page_path: normalized,
      page_type: 'local_landing',
      page_category: 'webdesign'
    };
  }

  return {
    page_path: normalized,
    page_type: 'content',
    page_category: 'general'
  };
}
