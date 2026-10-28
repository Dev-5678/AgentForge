/**
 * AgentForge - JSON Schema Runtime Validator
 * 
 * Provides strict structural and type validation for LLM tool invocation payloads.
 * 
 * @author Dev <https://github.com/Dev-5678>
 */

export type PropertyType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';

export interface SchemaRule {
  type: PropertyType;
  required?: boolean;
  properties?: Record<string, SchemaRule>;
  items?: SchemaRule;
  enum?: any[];
  min?: number;
  max?: number;
  pattern?: RegExp;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class JsonSchemaValidator {
  public static validate(data: any, schema: SchemaRule, path: string = '$'): ValidationResult {
    const errors: string[] = [];

    if (data === undefined || data === null) {
      if (schema.required) {
        errors.push(`Field '${path}' is required but was ${data === null ? 'null' : 'missing'}`);
      }
      return { valid: errors.length === 0, errors };
    }

    // Type checking
    const actualType = this.getType(data);
    if (actualType !== schema.type) {
      errors.push(`Field '${path}' expected type '${schema.type}' but received '${actualType}'`);
      return { valid: false, errors };
    }

    // Enum constraint
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push(`Field '${path}' value '${data}' is not in allowed enum [${schema.enum.join(', ')}]`);
    }

    // String constraints
    if (schema.type === 'string') {
      if (schema.min !== undefined && data.length < schema.min) {
        errors.push(`Field '${path}' length ${data.length} is less than min ${schema.min}`);
      }
      if (schema.max !== undefined && data.length > schema.max) {
        errors.push(`Field '${path}' length ${data.length} exceeds max ${schema.max}`);
      }
      if (schema.pattern && !schema.pattern.test(data)) {
        errors.push(`Field '${path}' failed regex pattern match`);
      }
    }

    // Number constraints
    if (schema.type === 'number') {
      if (schema.min !== undefined && data < schema.min) {
        errors.push(`Field '${path}' value ${data} is less than min ${schema.min}`);
      }
      if (schema.max !== undefined && data > schema.max) {
        errors.push(`Field '${path}' value ${data} exceeds max ${schema.max}`);
      }
    }

    // Array constraints
    if (schema.type === 'array' && schema.items) {
      if (schema.min !== undefined && data.length < schema.min) {
        errors.push(`Array '${path}' has fewer items than min ${schema.min}`);
      }
      for (let i = 0; i < data.length; i++) {
        const itemResult = this.validate(data[i], schema.items, `${path}[${i}]`);
        if (!itemResult.valid) {
          errors.push(...itemResult.errors);
        }
      }
    }

    // Object constraints
    if (schema.type === 'object' && schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const propValue = data[propName];
        if (propValue === undefined) {
          if (propSchema.required) {
            errors.push(`Field '${path}.${propName}' is required`);
          }
        } else {
          const propResult = this.validate(propValue, propSchema, `${path}.${propName}`);
          if (!propResult.valid) {
            errors.push(...propResult.errors);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static getType(value: any): PropertyType {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    const t = typeof value;
    if (t === 'string') return 'string';
    if (t === 'number') return 'number';
    if (t === 'boolean') return 'boolean';
    if (t === 'object') return 'object';
    return 'null';
  }
}
