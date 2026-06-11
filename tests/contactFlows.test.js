import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { projectTypeOptions } from '../data/packages.js';
import {
  contactFlowDefinitions,
  getRequiredFieldsForProjectType,
  isFieldRequiredForProjectType
} from '../data/contactFlows.js';

test('every contact project type has an explicit branch flow', () => {
  const projectTypes = projectTypeOptions.map((option) => option.value);
  assert.deepEqual(Object.keys(contactFlowDefinitions).sort(), projectTypes.sort());
});

test('new website flow keeps package and page-scope requirements', () => {
  const required = getRequiredFieldsForProjectType('new-website');
  const steps = contactFlowDefinitions['new-website'].steps;

  assert.ok(required.includes('packageInterest'));
  assert.ok(required.includes('pageScope'));
  assert.ok(required.includes('contentStatus'));
  assert.ok(required.includes('hostingMaintenanceInterest'));
  assert.ok(steps.includes('existingWebsite'));
  assert.ok(steps.includes('pageScope'));
  assert.equal(steps.includes('websiteScope'), false);
  assert.ok(steps.indexOf('existingWebsite') < steps.indexOf('pageScope'));
});

test('specialized flows do not require website package or page-scope choices', () => {
  ['local-seo', 'audit', 'maintenance', 'bugfix', 'custom-feature'].forEach((projectType) => {
    const required = getRequiredFieldsForProjectType(projectType);

    assert.equal(isFieldRequiredForProjectType(projectType, 'packageInterest'), false);
    assert.equal(isFieldRequiredForProjectType(projectType, 'pageScope'), false);
    assert.equal(required.includes('packageInterest'), false);
    assert.equal(required.includes('pageScope'), false);
  });
});

test('audit, maintenance and bugfix flows require the website URL', () => {
  ['audit', 'maintenance', 'bugfix'].forEach((projectType) => {
    assert.equal(isFieldRequiredForProjectType(projectType, 'existingWebsiteUrl'), true);
  });
});

test('every configured contact flow step exists in the contact template', () => {
  const template = fs.readFileSync(new URL('../views/kontakt.ejs', import.meta.url), 'utf8');
  const templateSteps = new Set(
    [...template.matchAll(/data-contact-step="([^"]+)"/g)].map((match) => match[1])
  );
  if (template.includes('data-contact-final="true"')) templateSteps.add('contact');

  Object.entries(contactFlowDefinitions).forEach(([projectType, flow]) => {
    flow.steps.forEach((step) => {
      assert.ok(templateSteps.has(step), `${projectType} references missing contact step "${step}"`);
    });
  });
});
