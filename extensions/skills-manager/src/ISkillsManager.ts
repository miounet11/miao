import * as vscode from 'vscode';

/**
 * Skill definition
 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  version: string;
  author?: string;
  tags?: string[];
  parameters?: SkillParameter[];
  timeout?: number; // milliseconds
  execute: (params: any, context: SkillExecutionContext) => Promise<SkillResult>;
}

/**
 * Skill categories
 */
export type SkillCategory = 'file' | 'code' | 'git' | 'terminal' | 'custom';

/**
 * Skill parameter definition
 */
export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
}

/**
 * Skill execution context
 */
export interface SkillExecutionContext {
  workspaceFolder?: vscode.WorkspaceFolder;
  cancellationToken?: vscode.CancellationToken;
  outputChannel?: vscode.OutputChannel;
}

/**
 * Skill execution result
 */
export interface SkillResult {
  success: boolean;
  data?: any;
  error?: SkillError;
  logs?: string[];
  duration?: number; // milliseconds
}

/**
 * Skill error
 */
export interface SkillError {
  code: string;
  message: string;
  stack?: string;
}

/**
 * Skill filter for querying
 */
export interface SkillFilter {
  category?: SkillCategory;
  tags?: string[];
  searchTerm?: string;
}

/**
 * Skill event types
 */
export type SkillEventType =
  | 'skill:registered'
  | 'skill:unregistered'
  | 'skill:execution:started'
  | 'skill:execution:completed'
  | 'skill:execution:failed';

/**
 * Skill event payload
 */
export interface SkillEvent {
  type: SkillEventType;
  skillId: string;
  timestamp: number;
  data?: any;
}

/**
 * Skills Manager Interface
 * Manages registration, lifecycle, and execution of agent skills
 */
export interface ISkillsManager {
  /**
   * Register a new skill
   */
  registerSkill(skill: Skill): void;

  /**
   * Unregister a skill by ID
   */
  unregisterSkill(skillId: string): void;

  /**
   * Get a skill by ID
   */
  getSkill(skillId: string): Skill | undefined;

  /**
   * List all skills with optional filtering
   */
  listSkills(filter?: SkillFilter): Skill[];

  /**
   * Execute a skill with parameters
   */
  executeSkill(skillId: string, params: any, context?: SkillExecutionContext): Promise<SkillResult>;

  /**
   * Subscribe to skill events
   */
  onSkillEvent(handler: (event: SkillEvent) => void): vscode.Disposable;
}
