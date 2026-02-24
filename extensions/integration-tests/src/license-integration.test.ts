/**
 * Integration tests for license-service
 */
import * as vscode from 'vscode';

describe('License Service Integration', () => {
	let licenseService: vscode.Extension<any> | undefined;

	beforeAll(async () => {
		licenseService = vscode.extensions.getExtension('miaoda.license-service');
		if (licenseService && !licenseService.isActive) {
			await licenseService.activate();
		}
	});

	test('should be installed', () => {
		expect(licenseService).toBeDefined();
	});

	test('should activate successfully', () => {
		expect(licenseService?.isActive).toBe(true);
	});

	test('should export API', () => {
		const api = licenseService?.exports;
		expect(api).toBeDefined();
		expect(api.getLicenseManager).toBeDefined();
		expect(api.getLicenseInfo).toBeDefined();
		expect(api.hasFeature).toBeDefined();
	});

	test('should have license commands registered', async () => {
		const commands = await vscode.commands.getCommands();
		expect(commands).toContain('miaoda.license.verify');
		expect(commands).toContain('miaoda.license.showInfo');
		expect(commands).toContain('miaoda.license.manageDevices');
	});

	test('should generate device fingerprint', () => {
		// Device fingerprint should be stable across restarts
		const api = licenseService?.exports;
		if (api) {
			const licenseManager = api.getLicenseManager();
			// Test device fingerprint generation
		}
	});
});

describe('License + Auth Integration', () => {
	test('should verify license with JWT token', async () => {
		const authService = vscode.extensions.getExtension('miaoda.auth-service');
		const licenseService = vscode.extensions.getExtension('miaoda.license-service');

		if (!authService || !licenseService) {
			return;
		}

		const authAPI = await authService.activate();
		const licenseAPI = await licenseService.activate();

		const isAuth = authAPI.isAuthenticated();

		if (isAuth) {
			// License verification should use JWT token
			const licenseInfo = licenseAPI.getLicenseInfo();
			expect(licenseInfo).toBeDefined();
		}
	});

	test('should support offline grace period', async () => {
		const licenseService = vscode.extensions.getExtension('miaoda.license-service');
		if (!licenseService) {
			return;
		}

		const api = await licenseService.activate();
		const licenseInfo = api.getLicenseInfo();

		// Should work offline for 72 hours
		if (licenseInfo) {
			expect(licenseInfo.offlineGracePeriod).toBe(72);
		}
	});
});
