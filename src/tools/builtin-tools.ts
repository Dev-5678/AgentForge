/**
 * AgentForge - Builtin Sandboxed Tools
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

import { ToolDefinition } from './sandbox.js';

export const CalculatorTool: ToolDefinition = {
  name: 'calculator',
  description: 'Evaluates basic mathematical expressions',
  parametersSchema: { expression: 'string' },
  execute: async (args) => {
    const expr = String(args.expression);
    if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
      throw new Error('Unsafe mathematical expression rejected');
    }
    return { result: Function(`'use strict'; return (${expr})`)() };
  },
};

export const SearchTool: ToolDefinition = {
  name: 'knowledge_search',
  description: 'Searches semantic internal knowledge base',
  parametersSchema: { query: 'string' },
  execute: async (args) => {
    return {
      query: args.query,
      results: [
        { title: 'CRDT Consensus', score: 0.98 },
        { title: 'Vector Invariants', score: 0.94 },
      ],
    };
  },
};
