/**
 * Integration tests for auth-service
 */
import * as vscode from 'vscode';

describe('Auth Service Integration', () => {
	let authService: vscode.Extension<any> | undefined;

	beforeAll(async () => {
		authService = vscode.extensions.getExtension('miaoda.auth-service');
		if (authService && !authService.isActive) {
			await authService.activate();
		}
	});

	test('should be installed', () => {
		expect(authService).toBeDefined();
	});

	test('should activate successfully', () => {
		expect(authService?.isActive).toBe(true);
	});

	test('should export API', () => {
		const api = authService?.exports;
		expect(api).toBeDefined();
		expect(api.getAuthManager).toBeDefined();
		expect(api.getAccessToken).toBeDefined();
		expect(api.isAuthenticated).toBeDefined();
	});

	test('should have auth commands registered', async () => {
		const commands = await vscode.commands.getCommands();
		expect(commands).toContain('miaoda.auth.login');
		expect(commands).toContain('miaoda.auth.logout');
		expect(commands).toContain('miaoda.auth.showStatus');
	});

	test('should show status bar item', () => {
		// Status bar item should be visible
		// This is a visual test, would need UI testing framework
	});
});

describe('Auth + LLM Integration', () => {
	test('should configure LLM proxy mode when authenticated', async () => {
		const authService = vscode.extensions.getExtension('miaoda.auth-service');
		const sharedServices = vscode.extensions.getExtension('miaoda.shared-services');

		if (!authService || !sharedServices) {
			return;
		}

		const authAPI = await authService.activate();
		const isAuth = authAPI.isAuthenticated();

		// If authenticated, LLM should be in proxy mode
		if (isAuth) {
			// Check LLM adapter configuration
			// This would require exposing LLM adapter state
		}
	});
});
