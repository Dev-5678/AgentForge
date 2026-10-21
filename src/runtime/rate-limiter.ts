/**
 * AgentForge - Multi-Provider LLM Token & Request Quota Limiter
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

export interface ProviderQuota {
  provider: 'OPENAI' | 'ANTHROPIC' | 'GEMINI';
  requestsPerMinute: number;
  tokensPerMinute: number;
}