import * as vscode from 'vscode';
import type { ClientCapabilityType } from './ICapabilityRegistry';

/**
 * Event Bus for inter-extension communication
 * Provides type-safe event publishing and subscription within the Extension Host process
 */
export interface IEventBus {
  /**
   * Emit an event to all subscribers
   */
  emit<T>(event: string, payload: T): void;

  /**
   * Subscribe to an event
   * @returns Disposable to unsubscribe
   */
  on<T>(event: string, handler: (payload: T) => void): vscode.Disposable;

  /**
   * Subscribe to an event once (auto-unsubscribe after first invocation)
   * @returns Disposable to unsubscribe
   */
  once<T>(event: string, handler: (payload: T) => void): vscode.Disposable;

  /**
   * Request-response pattern with timeout
   */
  request<TReq, TRes>(channel: string, payload: TReq, timeout?: number): Promise<TRes>;
}

/**
 * Event map for type-safe event handling
 */
export type EventMap = {
  'task:assigned': { taskId: string; agentRole: AgentRole };
  'task:completed': { taskId: string; result: TaskResult };
  'task:failed': { taskId: string; error: TaskError };
  'skill:invoked': { skillId: string; params: Record<string, unknown> };
  'skill:result': { skillId: string; result: unknown };
  'browser:action': { action: BrowserAction };
  'browser:result': { screenshot?: string; dom?: string; logs?: string[] };
  'pipeline:progress': { planId: string; phase: string; progress: number };
  'capability:request': { type: ClientCapabilityType; params: unknown };
  'capability:response': { type: ClientCapabilityType; result: unknown };
};

// Supporting types
export type AgentRole = 'coder' | 'tester' | 'browser' | 'deployer' | 'reviewer';

export interface TaskResult {
  success: boolean;
  output: string;
  artifacts?: TaskArtifact[];
  error?: TaskError;
}

export interface TaskArtifact {
  type: 'code' | 'test_report' | 'screenshot' | 'changelog' | 'deployment_log';
  path?: string;
  content: string;
}

export interface TaskError {
  code: string;
  message: string;
  recoverable: boolean;
  suggestedAction?: string;
}

export interface BrowserAction {
  type: 'navigate' | 'click' | 'fill' | 'screenshot';
  params: Record<string, unknown>;
}
