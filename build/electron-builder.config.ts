import { Configuration } from 'electron-builder';

/**
 * Electron Builder configuration for Miaoda IDE
 * Cross-platform packaging for macOS, Windows, and Linux
 */
const config: Configuration = {
	appId: 'com.miaoda.ide',
	productName: 'Miaoda IDE',
	copyright: 'Copyright © 2024 Miaoda',

	// Directories
	directories: {
		output: 'dist',
		buildResources: 'build/resources',
	},

	// Files to include
	files: [
		'out/**/*',
		'extensions/**/*',
		'node_modules/**/*',
		'package.json',
		'product.json',
		'!**/*.ts',
		'!**/*.map',
		'!**/test/**',
		'!**/__tests__/**',
	],

	// Extra resources
	extraResources: [
		{
			from: 'resources',
			to: 'resources',
			filter: ['**/*'],
		},
	],

	// macOS configuration
	mac: {
		category: 'public.app-category.developer-tools',
		target: [
			{
				target: 'dmg',
				arch: ['x64', 'arm64'],
			},
			{
				target: 'zip',
				arch: ['x64', 'arm64'],
			},
		],
		icon: 'build/resources/icon.icns',
		hardenedRuntime: true,
		gatekeeperAssess: false,
		entitlements: 'build/entitlements.mac.plist',
		entitlementsInherit: 'build/entitlements.mac.plist',
		// Code signing (requires Apple Developer certificate)
		// Uncomment when you have certificates
		// identity: 'Developer ID Application: Your Name (TEAM_ID)',
	},

	// macOS DMG configuration
	dmg: {
		contents: [
			{
				x: 130,
				y: 220,
			},
			{
				x: 410,
				y: 220,
				type: 'link',
				path: '/Applications',
			},
		],
		window: {
			width: 540,
			height: 380,
		},
	},

	// Windows configuration
	win: {
		target: [
			{
				target: 'nsis',
				arch: ['x64', 'arm64'],
			},
			{
				target: 'zip',
				arch: ['x64', 'arm64'],
			},
		],
		icon: 'build/resources/icon.ico',
		// Code signing (requires Windows certificate)
		// Uncomment when you have certificate
		// certificateFile: 'path/to/certificate.pfx',
		// certificatePassword: process.env.WINDOWS_CERT_PASSWORD,
	},

	// Windows NSIS installer configuration
	nsis: {
		oneClick: false,
		allowToChangeInstallationDirectory: true,
		perMachine: false,
		createDesktopShortcut: true,
		createStartMenuShortcut: true,
		shortcutName: 'Miaoda IDE',
	},

	// Linux configuration
	linux: {
		target: [
			{
				target: 'deb',
				arch: ['x64', 'arm64'],
			},
			{
				target: 'rpm',
				arch: ['x64', 'arm64'],
			},
			{
				target: 'AppImage',
				arch: ['x64', 'arm64'],
			},
		],
		icon: 'build/resources/icon.png',
		category: 'Development',
		maintainer: 'Miaoda Team <support@miaoda.com>',
		vendor: 'Miaoda',
		desktop: {
			Name: 'Miaoda IDE',
			Comment: 'AI-powered development environment',
			GenericName: 'Code Editor',
			Keywords: 'code;editor;ide;development;ai',
		},
	},

	// Auto-update configuration
	publish: [
		{
			provider: 'generic',
			url: 'https://releases.miaoda.com',
			channel: 'latest',
		},
	],

	// Compression
	compression: 'maximum',

	// Artifact naming
	artifactName: '${productName}-${version}-${os}-${arch}.${ext}',

	// Build version
	buildVersion: process.env.BUILD_NUMBER || '1.0.0',
};

export default config;
