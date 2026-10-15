import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JsonSchemaValidator, SchemaRule } from '../src/tools/json-validator.js';

describe('JSON Schema Runtime Validator', () => {
  it('validates primitive types accurately and rejects mismatches', () => {
    const stringSchema: SchemaRule = { type: 'string', required: true };
    const numSchema: SchemaRule = { type: 'number', required: true };

    assert.strictEqual(JsonSchemaValidator.validate('hello', stringSchema).valid, true);
    assert.strictEqual(JsonSchemaValidator.validate(123, stringSchema).valid, false);

    assert.strictEqual(JsonSchemaValidator.validate(42.5, numSchema).valid, true);
    assert.strictEqual(JsonSchemaValidator.validate('42.5', numSchema).valid, false);
  });

  it('enforces required properties and allows optional properties', () => {
    const userSchema: SchemaRule = {
      type: 'object',
      properties: {
        id: { type: 'string', required: true },
        age: { type: 'number', required: false },
      },
    };

    const validUser = { id: 'usr-1' };
    assert.strictEqual(JsonSchemaValidator.validate(validUser, userSchema).valid, true);

    const invalidUser = { age: 30 };
    const result = JsonSchemaValidator.validate(invalidUser, userSchema);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length > 0, true);
  });

  it('validates nested object structures and arrays of items', () => {
    const orderSchema: SchemaRule = {
      type: 'object',
      properties: {
        orderId: { type: 'string', required: true },
        items: {
          type: 'array',
          required: true,
          items: {
            type: 'object',
            properties: {
              sku: { type: 'string', required: true },
              qty: { type: 'number', required: true, min: 1 },
            },
          },
        },
      },
    };

    const validOrder = {
      orderId: 'ord-101',
      items: [
        { sku: 'widget-a', qty: 2 },
        { sku: 'widget-b', qty: 10 },
      ],
    };
    assert.strictEqual(JsonSchemaValidator.validate(validOrder, orderSchema).valid, true);

    const invalidOrder = {
      orderId: 'ord-102',
      items: [{ sku: 'widget-a', qty: 0 }], // min is 1
    };
    assert.strictEqual(JsonSchemaValidator.validate(invalidOrder, orderSchema).valid, false);
  });

  it('validates enum values and string length boundaries', () => {
    const statusSchema: SchemaRule = {
      type: 'string',
      enum: ['PENDING', 'ACTIVE', 'ARCHIVED'],
      min: 3,
      max: 10,
    };

    assert.strictEqual(JsonSchemaValidator.validate('ACTIVE', statusSchema).valid, true);
    assert.strictEqual(JsonSchemaValidator.validate('UNKNOWN', statusSchema).valid, false);
    assert.strictEqual(JsonSchemaValidator.validate('A', statusSchema).valid, false);
  });
});
