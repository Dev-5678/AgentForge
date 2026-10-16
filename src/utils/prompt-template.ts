/**
 * AgentForge - Prompt Template Engine
 * 
 * Provides mustache-style variable interpolation, raw block substitution,
 * dot-notation object property access, and fallback default values for LLM prompts.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

export interface TemplateOptions {
  strict?: boolean;
  escapeHtml?: boolean;
}

export class PromptTemplate {
  /**
   * Render template string substituting variables from context
   */
  public static render(
    template: string,
    context: Record<string, any>,
    options: TemplateOptions = {}
  ): string {
    const { strict = false, escapeHtml = false } = options;

    // First handle unescaped triple curly braces: {{{variable}}}
    let result = template.replace(/\{\{\{\s*([\w.-]+)(?:\s*\|\|\s*['"](.*?)['"])?\s*\}\}\}/g, (_, key, fallback) => {
      const val = this.resolvePath(context, key);
      if (val !== undefined && val !== null) {
        return String(val);
      }
      if (fallback !== undefined) {
        return fallback;
      }
      if (strict) {
        throw new Error(`Template strict mode: missing required variable '${key}'`);
      }
      return '';
    });

    // Then handle double curly braces: {{variable}}
    result = result.replace(/\{\{\s*([\w.-]+)(?:\s*\|\|\s*['"](.*?)['"])?\s*\}\}/g, (_, key, fallback) => {
      const val = this.resolvePath(context, key);
      let strVal = '';
      if (val !== undefined && val !== null) {
        strVal = String(val);
      } else if (fallback !== undefined) {
        strVal = fallback;
      } else if (strict) {
        throw new Error(`Template strict mode: missing required variable '${key}'`);
      }

      return escapeHtml ? this.escape(strVal) : strVal;
    });

    return result;
  }

  /**
   * Resolve nested property paths like "agent.config.model"
   */
  private static resolvePath(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }

  private static escape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
