/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Miaoda IDE. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IMiaodaService, MiaodaService } from 'vs/miaoda/browser/miaodaService';
import { LifecyclePhase } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions } from 'vs/workbench/common/contributions';

// Register the Miaoda service as a singleton
registerSingleton(IMiaodaService, MiaodaService, true);

// Register workbench contribution to initialize the service
class MiaodaWorkbenchContribution {
  constructor(private miaodaService: IMiaodaService) {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await this.miaodaService.initialize();
    } catch (error) {
      console.error('Failed to initialize Miaoda service', error);
    }
  }
}

const workbenchRegistry = Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(MiaodaWorkbenchContribution, LifecyclePhase.Ready);
