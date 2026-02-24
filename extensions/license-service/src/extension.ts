import * as vscode from 'vscode';
import { LicenseManager } from './license-manager';
import { DeviceFingerprint } from './device-fingerprint';

let licenseManager: LicenseManager;

export async function activate(context: vscode.ExtensionContext) {
  console.log('License Service extension activated');

  const config = vscode.workspace.getConfiguration('miaoda.license');
  const apiBaseUrl = config.get<string>('apiBaseUrl', 'https://api.miaoda.com');

  licenseManager = new LicenseManager(context, apiBaseUrl);

  // Initialize license
  await licenseManager.initialize();

  // Show license status on change
  licenseManager.onDidChangeLicense((license) => {
    if (license) {
      console.log(`License verified: ${license.plan} plan`);
    } else {
      console.log('No valid license');
    }
  });

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('miaoda.license.verify', async () => {
      try {
        const licenseKey = await vscode.window.showInputBox({
          prompt: 'Enter your license key',
          password: true,
          placeHolder: 'XXXX-XXXX-XXXX-XXXX',
        });

        if (!licenseKey) {
          return;
        }

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Verifying license...',
            cancellable: false,
          },
          async () => {
            await licenseManager.verifyLicense(licenseKey);
          }
        );

        vscode.window.showInformationMessage('License verified successfully!');
      } catch (error: any) {
        vscode.window.showErrorMessage(`License verification failed: ${error.message}`);
      }
    }),

    vscode.commands.registerCommand('miaoda.license.showInfo', async () => {
      const license = licenseManager.getLicenseInfo();

      if (!license) {
        vscode.window.showWarningMessage('No license found. Please verify your license.');
        return;
      }

      const info = [
        `Plan: ${license.plan}`,
        `Status: ${license.status}`,
        `Devices: ${license.currentDevices}/${license.maxDevices}`,
        `Features: ${license.features.join(', ')}`,
      ];

      if (license.expiresAt) {
        info.push(`Expires: ${new Date(license.expiresAt).toLocaleDateString()}`);
      }

      vscode.window.showInformationMessage(info.join('\n'));
    }),

    vscode.commands.registerCommand('miaoda.license.manageDevices', async () => {
      try {
        const devices = await licenseManager.getDevices();
        const currentFingerprint = DeviceFingerprint.generate();

        const items = devices.map((device) => ({
          label: device.name,
          description:
            device.fingerprint === currentFingerprint
              ? '(This device)'
              : `Last seen: ${new Date(device.lastSeen).toLocaleDateString()}`,
          detail: device.platform,
          fingerprint: device.fingerprint,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select a device to unbind',
        });

        if (!selected) {
          return;
        }

        if (selected.fingerprint === currentFingerprint) {
          vscode.window.showWarningMessage('Cannot unbind current device');
          return;
        }

        const confirm = await vscode.window.showWarningMessage(
          `Unbind device "${selected.label}"?`,
          'Yes',
          'No'
        );

        if (confirm === 'Yes') {
          await licenseManager.unbindDevice(selected.fingerprint);
          vscode.window.showInformationMessage('Device unbound successfully');
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to manage devices: ${error.message}`);
      }
    })
  );

  // Export API for other extensions
  return {
    getLicenseManager: () => licenseManager,
    getLicenseInfo: () => licenseManager.getLicenseInfo(),
    hasFeature: (feature: string) => licenseManager.hasFeature(feature),
  };
}

export function deactivate() {
  licenseManager?.dispose();
}
