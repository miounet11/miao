/**
 * Structured LLM error with troubleshooting info
 */
export interface LLMError {
	type: 'auth_error' | 'rate_limit' | 'model_not_found' | 'context_length' | 'server_error' | 'network_error';
	statusCode: number;
	message: string;
	suggestion: string;
	provider: string;
	retryable: boolean;
}
