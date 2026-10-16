import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PromptTemplate } from '../src/utils/prompt-template.js';

describe('Prompt Template Interpolation Engine', () => {
  it('interpolates basic context variables correctly', () => {
    const template = 'Hello, {{name}}! You are a {{role}}.';
    const output = PromptTemplate.render(template, { name: 'Alice', role: 'Security Agent' });
    assert.strictEqual(output, 'Hello, Alice! You are a Security Agent.');
  });

  it('supports nested dot-notation paths in context', () => {
    const template = 'Execute on {{infra.cluster.region}} with model {{infra.model}}.';
    const ctx = {
      infra: {
        cluster: { region: 'us-east-1' },
        model: 'gemini-1.5-pro',
      },
    };
    const output = PromptTemplate.render(template, ctx);
    assert.strictEqual(output, 'Execute on us-east-1 with model gemini-1.5-pro.');
  });

  it('supports fallback default values when variables are undefined', () => {
    const template = 'User: {{username || "Anonymous"}}, Port: {{port || "8080"}}';
    const output = PromptTemplate.render(template, { port: 3000 });
    assert.strictEqual(output, 'User: Anonymous, Port: 3000');
  });

  it('supports unescaped raw interpolation and HTML entity escaping', () => {
    const rawTemplate = 'Payload: {{{code}}}';
    const rawOutput = PromptTemplate.render(rawTemplate, { code: '<script>alert(1)</script>' });
    assert.strictEqual(rawOutput, 'Payload: <script>alert(1)</script>');

    const escapedTemplate = 'Safe: {{code}}';
    const escapedOutput = PromptTemplate.render(escapedTemplate, { code: '<div class="test">Ok</div>' }, { escapeHtml: true });
    assert.strictEqual(escapedOutput, 'Safe: &lt;div class=&quot;test&quot;&gt;Ok&lt;/div&gt;');
  });

  it('throws an error in strict mode when required variable is absent', () => {
    const template = 'Target: {{targetHost}}';
    assert.throws(() => {
      PromptTemplate.render(template, {}, { strict: true });
    }, /missing required variable 'targetHost'/);
  });
});
