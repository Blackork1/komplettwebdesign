(function () {
  var EVENT_NAMES = new Set([
    "page_cta_click",
    "header_cta_click",
    "footer_cta_click",
    "hero_cta_click",
    "pricing_cta_click",
    "package_card_click",
    "package_detail_cta_click",
    "contact_cta_click",
    "website_check_cta_click",
    "website_check_start",
    "website_check_submit",
    "tester_started",
    "tester_completed",
    "tester_cta_clicked",
    "tester_lead_requested",
    "tester_lead_confirmed",
    "tester_report_sent",
    "seo_tester_scan_completed",
    "seo_tester_cta_clicked",
    "seo_tester_lead_requested",
    "seo_tester_lead_confirmed",
    "seo_tester_report_sent",
    "geo_tester_lead_confirmed",
    "geo_tester_report_sent",
    "broken_links_tester_cta_clicked",
    "broken_links_tester_lead_requested",
    "broken_links_tester_lead_confirmed",
    "broken_links_tester_report_sent",
    "audit_cta_click",
    "contact_form_view",
    "contact_form_start",
    "contact_form_step_view",
    "contact_form_step_complete",
    "contact_form_field_select",
    "contact_form_validation_error",
    "contact_form_submit_attempt",
    "contact_form_submit_success",
    "contact_form_submit_error",
    "project_type_selected",
    "package_interest_selected",
    "budget_range_selected",
    "timeline_selected",
    "page_scope_selected",
    "content_status_selected",
    "optional_features_selected",
    "hosting_maintenance_selected",
    "thank_you_view",
    "lead_received"
  ]);

  var PACKAGE_VALUES = new Set(["start", "business", "wachstum", "individuell", "unsure"]);
  var PROJECT_TYPE_VALUES = new Set([
    "new-website",
    "relaunch",
    "landingpage",
    "local-seo",
    "maintenance",
    "audit",
    "custom-feature",
    "bugfix",
    "unsure"
  ]);
  var BUDGET_VALUES = new Set(["799-1499", "1500-2499", "2500-4000", "4000-plus", "open"]);
  var TIMELINE_VALUES = new Set(["asap", "1-2-months", "3-plus-months", "open"]);
  var PAGE_SCOPE_VALUES = new Set(["onepager", "1-3", "4-7", "8-12", "12-plus", "unsure"]);
  var CONTENT_STATUS_VALUES = new Set(["content-ready", "partial-support", "copywriting-needed", "unsure"]);
  var OPTIONAL_FEATURE_VALUES = new Set([
    "extra-pages",
    "seo-pages",
    "local-seo",
    "google-business-profile",
    "tracking",
    "booking-system",
    "cms",
    "multilingual",
    "animations",
    "images",
    "migration",
    "landingpage",
    "audit",
    "shop-feature",
    "none",
    "unsure"
  ]);
  var HOSTING_MAINTENANCE_VALUES = new Set(["hosting", "maintenance", "both", "no", "unsure"]);
  var ALLOWED_UTM_VALUES = /^[a-z0-9._~-]{1,80}$/i;
  var DISALLOWED_PARAM_NAMES = new Set([
    "name",
    "email",
    "phone",
    "telephone",
    "tel",
    "company",
    "firma",
    "message",
    "nachricht",
    "textarea",
    "existingwebsiteurl",
    "website_url",
    "domain",
    "url",
    "token",
    "password",
    "passwort"
  ]);

  function getContext() {
    var context = window.KWD_TRACKING_CONTEXT || {};
    return {
      page_path: safePagePath(context.page_path || window.location.pathname || "/"),
      page_type: safeToken(context.page_type || "content", 40),
      page_category: safeToken(context.page_category || "general", 40),
      package_id: PACKAGE_VALUES.has(String(context.package_id || "")) ? context.package_id : undefined
    };
  }

  function analyticsConsentGranted() {
    var state = window.cookieConsentState || {};
    return state.analytics === true;
  }

  function safeToken(value, maxLength) {
    var cleaned = String(value || "").trim().toLowerCase();
    if (!cleaned || !/^[a-z0-9._~/-]+$/.test(cleaned)) return "";
    return cleaned.slice(0, maxLength || 80);
  }

  function safeText(value, maxLength) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, maxLength || 80);
  }

  function safeFieldName(value) {
    var cleaned = String(value || "").trim();
    if (!cleaned || !/^[A-Za-z0-9_-]+$/.test(cleaned)) return "";
    return cleaned.slice(0, 80);
  }

  function safePagePath(value) {
    try {
      var url = new URL(String(value || "/"), window.location.origin);
      return url.pathname || "/";
    } catch (err) {
      return "/";
    }
  }

  function safeLinkUrl(value) {
    if (!value) return "";
    var raw = String(value).trim();
    if (/^(mailto|tel|sms):/i.test(raw)) return "";

    try {
      var url = new URL(raw, window.location.origin);
      var safeQuery = new URLSearchParams();
      ["paket", "projektart", "packageInterest", "projectType"].forEach(function (key) {
        var queryValue = url.searchParams.get(key);
        if (queryValue && /^[a-z0-9._~-]{1,40}$/i.test(queryValue)) safeQuery.set(key, queryValue);
      });
      return url.pathname + (safeQuery.toString() ? "?" + safeQuery.toString() : "");
    } catch (err) {
      return "";
    }
  }

  function normalizeEventName(name) {
    var cleaned = String(name || "")
      .trim()
      .replace(/[^A-Za-z0-9_-]+/g, "_")
      .replace(/-/g, "_")
      .toLowerCase();

    if (cleaned === "cta_clicked") return "page_cta_click";
    if (cleaned === "contact_form_error") return "contact_form_submit_error";
    if (cleaned === "contact_form_submit") return "contact_form_submit_attempt";
    if (EVENT_NAMES.has(cleaned)) return cleaned;
    return "page_cta_click";
  }

  function valueForField(fieldName, value) {
    var field = String(fieldName || "");
    var raw = safeToken(value, 80);
    if (!raw) return "";

    if (field === "projectType" && PROJECT_TYPE_VALUES.has(raw)) return raw;
    if (field === "packageInterest" && PACKAGE_VALUES.has(raw)) return raw;
    if (field === "budgetRange" && BUDGET_VALUES.has(raw)) return raw;
    if (field === "timeline" && TIMELINE_VALUES.has(raw)) return raw;
    if (field === "pageScope" && PAGE_SCOPE_VALUES.has(raw)) return raw;
    if (field === "contentStatus" && CONTENT_STATUS_VALUES.has(raw)) return raw;
    if (field === "optionalFeatures" && OPTIONAL_FEATURE_VALUES.has(raw)) return raw;
    if (field === "hostingMaintenanceInterest" && HOSTING_MAINTENANCE_VALUES.has(raw)) return raw;
    return "";
  }

  function normalizeOptionalFeatures(value) {
    var list = Array.isArray(value)
      ? value
      : String(value || "").split(",");
    return list
      .map(function (item) { return safeToken(item, 40); })
      .filter(function (item) { return OPTIONAL_FEATURE_VALUES.has(item); })
      .slice(0, 20);
  }

  function safeUtm(value) {
    var cleaned = String(value || "").trim().slice(0, 80);
    return ALLOWED_UTM_VALUES.test(cleaned) ? cleaned : "";
  }

  function sanitizeTrackingParams(params) {
    var input = params || {};
    var out = {};
    var context = getContext();

    out.page_path = context.page_path;
    out.page_type = context.page_type;
    out.page_category = context.page_category;
    if (context.package_id) out.package_id = context.package_id;

    var fieldName = safeFieldName(input.field_name || input.fieldName);
    var selectedValue = input.selected_value !== undefined ? input.selected_value : input.value;

    Object.keys(input).forEach(function (key) {
      var normalizedKey = String(key || "").toLowerCase();
      if (DISALLOWED_PARAM_NAMES.has(normalizedKey)) return;

      if (key === "event_source") out.event_source = safeToken(input[key], 60);
      else if (key === "cta_id" || key === "cta_name") out.cta_id = safeToken(input[key], 80);
      else if (key === "cta_label") out.cta_label = safeText(input[key], 90);
      else if (key === "cta_location") out.cta_location = safeToken(input[key], 80);
      else if (key === "cta_target") out.cta_target = safeToken(input[key], 80);
      else if (key === "link_url") out.link_url = safeLinkUrl(input[key]);
      else if (key === "form_id") out.form_id = safeToken(input[key], 60);
      else if (key === "form_variant") out.form_variant = safeToken(input[key], 40);
      else if (key === "step_id") out.step_id = safeToken(input[key], 60);
      else if (key === "field_name") out.field_name = fieldName;
      else if (key === "package_id" && PACKAGE_VALUES.has(safeToken(input[key], 40))) out.package_id = safeToken(input[key], 40);
      else if (key === "project_type" && PROJECT_TYPE_VALUES.has(safeToken(input[key], 40))) out.project_type = safeToken(input[key], 40);
      else if (key === "budget_range" && BUDGET_VALUES.has(safeToken(input[key], 40))) out.budget_range = safeToken(input[key], 40);
      else if (key === "timeline" && TIMELINE_VALUES.has(safeToken(input[key], 40))) out.timeline = safeToken(input[key], 40);
      else if (key === "page_scope" && PAGE_SCOPE_VALUES.has(safeToken(input[key], 40))) out.page_scope = safeToken(input[key], 40);
      else if (key === "content_status" && CONTENT_STATUS_VALUES.has(safeToken(input[key], 40))) out.content_status = safeToken(input[key], 40);
      else if (key === "optional_features") out.optional_features = normalizeOptionalFeatures(input[key]);
      else if (key === "feature_count") {
        var count = Number(input[key]);
        if (Number.isFinite(count)) out.feature_count = Math.max(0, Math.min(20, Math.round(count)));
      } else if (key === "hosting_maintenance_interest" && HOSTING_MAINTENANCE_VALUES.has(safeToken(input[key], 40))) {
        out.hosting_maintenance_interest = safeToken(input[key], 40);
      } else if (key === "error_type") {
        out.error_type = safeToken(input[key], 60);
      } else if (key === "locale") {
        out.locale = ["de", "en"].includes(safeToken(input[key], 8)) ? safeToken(input[key], 8) : "";
      } else if (key === "mode") {
        out.mode = safeToken(input[key], 40);
      } else if (key === "tester") {
        out.tester = safeToken(input[key], 40);
      } else if (key === "cta_type") {
        out.cta_type = safeToken(input[key], 60);
      } else if (key === "score_bucket") {
        out.score_bucket = safeToken(input[key], 40);
      } else if (key === "score_value") {
        var score = Number(input[key]);
        if (Number.isFinite(score)) out.score_value = Math.max(0, Math.min(100, Math.round(score)));
      } else if (key === "utm_source") out.utm_source = safeUtm(input[key]);
      else if (key === "utm_medium") out.utm_medium = safeUtm(input[key]);
      else if (key === "utm_campaign") out.utm_campaign = safeUtm(input[key]);
    });

    if (fieldName) {
      out.field_name = fieldName;
      var fieldValue = valueForField(fieldName, selectedValue);
      if (fieldValue) {
        out.selected_value = fieldValue;
        if (fieldName === "projectType") out.project_type = fieldValue;
        if (fieldName === "packageInterest") out.package_id = fieldValue;
        if (fieldName === "budgetRange") out.budget_range = fieldValue;
        if (fieldName === "timeline") out.timeline = fieldValue;
        if (fieldName === "pageScope") out.page_scope = fieldValue;
        if (fieldName === "contentStatus") out.content_status = fieldValue;
        if (fieldName === "hostingMaintenanceInterest") out.hosting_maintenance_interest = fieldValue;
      }
    }

    if (Array.isArray(out.optional_features) && out.optional_features.length) {
      out.feature_count = out.optional_features.length;
    }

    Object.keys(out).forEach(function (key) {
      if (out[key] === "" || out[key] === undefined || (Array.isArray(out[key]) && !out[key].length)) {
        delete out[key];
      }
    });

    return out;
  }

  function sendToExistingAnalytics(eventName, params) {
    if (!analyticsConsentGranted()) return;

    var measurementId = window.env && window.env.GA_MEASUREMENT_ID;
    if (measurementId && window["ga-disable-" + measurementId]) return;

    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params);
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push(Object.assign({ event: eventName }, params));
    }

    if (Array.isArray(window._paq)) {
      window._paq.push(["trackEvent", "komplettwebdesign", eventName, params.cta_id || params.form_id || params.page_path || ""]);
    }

    if (typeof window.plausible === "function") {
      window.plausible(eventName, { props: params });
    }

    if (window.fathom && typeof window.fathom.trackEvent === "function") {
      window.fathom.trackEvent(eventName);
    }

    if (typeof window.umami === "function") {
      window.umami(eventName, params);
    } else if (window.umami && typeof window.umami.track === "function") {
      window.umami.track(eventName, params);
    }
  }

  function trackEvent(name, params) {
    var eventName = normalizeEventName(name);
    var safeParams = sanitizeTrackingParams(params || {});
    var detail = { eventName: eventName, params: safeParams };

    window.dispatchEvent(new CustomEvent("kwd:tracking", { detail: detail }));
    document.dispatchEvent(new CustomEvent("kwd:tracking", { detail: detail }));

    sendToExistingAnalytics(eventName, safeParams);

    if (window.location.search.indexOf("debug-tracking") !== -1) {
      console.debug("[tracking]", eventName, safeParams);
    }
  }

  function eventNameForCta(element) {
    var explicit = element.getAttribute("data-event-name") || element.getAttribute("data-event");
    if (explicit) return normalizeEventName(explicit);

    var location = element.getAttribute("data-cta-location") || "";
    var rawTrack = element.getAttribute("data-track") || "";
    var targetUrl = element.getAttribute("href") || "";

    if (/global_header|header/i.test(location)) return "header_cta_click";
    if (/footer/i.test(location)) return "footer_cta_click";
    if (/hero/i.test(location)) return "hero_cta_click";
    if (/package|paket/i.test(location) || /\/pakete\//.test(targetUrl)) return "package_card_click";
    if (/pricing|preise|kosten/i.test(location)) return "pricing_cta_click";
    if (/website[-_]?tester|check/i.test(rawTrack + " " + targetUrl)) return "website_check_cta_click";
    if (/audit/i.test(rawTrack + " " + targetUrl)) return "audit_cta_click";
    if (/contact|kontakt|anfrage/i.test(rawTrack + " " + targetUrl)) return "contact_cta_click";
    return "page_cta_click";
  }

  function inferPackageId(element) {
    var value = element.getAttribute("data-package-id") || "";
    if (PACKAGE_VALUES.has(value)) return value;
    var href = element.getAttribute("href") || "";
    var match = href.match(/\/pakete\/(start|business|wachstum|individuell)(?:[/?#]|$)/);
    if (match) return match[1];
    try {
      var url = new URL(href, window.location.origin);
      var queryPackage = url.searchParams.get("paket") || url.searchParams.get("packageInterest");
      if (PACKAGE_VALUES.has(queryPackage)) return queryPackage;
    } catch (err) {}
    return "";
  }

  function bindCtaTracking() {
    var ctas = Array.from(document.querySelectorAll("[data-track], [data-cta-id], [data-cta-name]"));
    ctas.forEach(function (element) {
      if (element.dataset.ctaTrackingBound === "true") return;
      element.dataset.ctaTrackingBound = "true";

      element.addEventListener("click", function () {
        var packageId = inferPackageId(element);
        trackEvent(eventNameForCta(element), {
          event_source: "click",
          cta_id: element.getAttribute("data-cta-id") || element.getAttribute("data-cta-name") || element.getAttribute("data-track") || "",
          cta_label: element.innerText || element.textContent || "",
          cta_location: element.getAttribute("data-cta-location") || "",
          cta_target: element.getAttribute("target") || "",
          link_url: element.getAttribute("href") || "",
          package_id: packageId
        });
      }, { passive: true });
    });
  }

  function validityErrorType(field) {
    if (!field || !field.validity) return "invalid";
    if (field.validity.valueMissing) return "missing_required";
    if (field.validity.typeMismatch) return "type_mismatch";
    if (field.validity.tooShort) return "too_short";
    if (field.validity.tooLong) return "too_long";
    if (field.validity.patternMismatch) return "pattern_mismatch";
    return "invalid";
  }

  function bindFormTracking() {
    var forms = Array.from(document.querySelectorAll(".contact-form"));
    forms.forEach(function (form) {
      if (form.dataset.trackingFormBound === "true") return;
      form.dataset.trackingFormBound = "true";

      trackEvent("contact_form_view", {
        event_source: "form",
        form_id: form.id || "",
        form_variant: form.dataset.formVariant || "contact"
      });

      if (form.dataset.formHasErrors === "true") {
        trackEvent("contact_form_submit_error", {
          event_source: "server",
          form_id: form.id || "",
          form_variant: form.dataset.formVariant || "contact",
          error_type: "server_validation"
        });
      }

      form.addEventListener("invalid", function (event) {
        var field = event.target;
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
        trackEvent("contact_form_validation_error", {
          event_source: "browser_validation",
          form_id: form.id || "",
          form_variant: form.dataset.formVariant || "contact",
          field_name: field.name || "",
          error_type: validityErrorType(field)
        });
      }, true);
    });
  }

  window.KWDTracking = {
    trackEvent: trackEvent,
    sanitizeTrackingParams: sanitizeTrackingParams,
    getContext: getContext
  };

  window.dispatchEvent(new CustomEvent("kwd:tracking-ready"));

  document.addEventListener("DOMContentLoaded", function () {
    bindCtaTracking();
    bindFormTracking();
  });
})();
