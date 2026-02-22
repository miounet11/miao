import * as vscode from 'vscode';
import { EventBus } from '../../shared-services/src/EventBus';
import type {
  ISkillsManager,
  Skill,
  SkillFilter,
  SkillResult,
  SkillExecutionContext,
  SkillEvent,
  SkillEventType,
} from './ISkillsManager';

/**
 * Skills Manager Implementation
 * Manages skill registry, lifecycle, and execution
 */
export class SkillsManager implements ISkillsManager {
  private skills: Map<string, Skill> = new Map();
  private eventBus: EventBus;
  private outputChannel: vscode.OutputChannel;
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  constructor() {
    this.eventBus = new EventBus();
    this.outputChannel = vscode.window.createOutputChannel('Skills Manager');
  }

  /**
   * Register a new skill
   */
  registerSkill(skill: Skill): void {
    if (this.skills.has(skill.id)) {
      throw new Error(`Skill with ID '${skill.id}' is already registered`);
    }

    // Validate skill
    this.validateSkill(skill);

    this.skills.set(skill.id, skill);
    this.log(`Skill registered: ${skill.id} (${skill.name})`);

    // Emit event
    this.emitSkillEvent('skill:registered', skill.id, { skill });
  }

  /**
   * Unregister a skill by ID
   */
  unregisterSkill(skillId: string): void {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill with ID '${skillId}' not found`);
    }

    this.skills.delete(skillId);
    this.log(`Skill unregistered: ${skillId}`);

    // Emit event
    this.emitSkillEvent('skill:unregistered', skillId);
  }

  /**
   * Get a skill by ID
   */
  getSkill(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  /**
   * List all skills with optional filtering
   */
  listSkills(filter?: SkillFilter): Skill[] {
    let skills = Array.from(this.skills.values());

    if (!filter) {
      return skills;
    }

    // Filter by category
    if (filter.category) {
      skills = skills.filter(s => s.category === filter.category);
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      skills = skills.filter(s =>
        s.tags?.some(tag => filter.tags!.includes(tag))
      );
    }

    // Filter by search term
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      skills = skills.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term)
      );
    }

    return skills;
  }

  /**
   * Execute a skill with parameters
   */
  async executeSkill(
    skillId: string,
    params: any,
    context?: SkillExecutionContext
  ): Promise<SkillResult> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return {
        success: false,
        error: {
          code: 'SKILL_NOT_FOUND',
          message: `Skill with ID '${skillId}' not found`,
        },
      };
    }

    // Validate parameters
    const validationError = this.validateParameters(skill, params);
    if (validationError) {
      return {
        success: false,
        error: validationError,
      };
    }

    const startTime = Date.now();
    this.log(`Executing skill: ${skillId}`);

    // Emit start event
    this.emitSkillEvent('skill:execution:started', skillId, { params });

    try {
      // Execute with timeout
      const timeout = skill.timeout || this.DEFAULT_TIMEOUT;
      const executionContext: SkillExecutionContext = {
        ...context,
        outputChannel: this.outputChannel,
      };

      const result = await this.executeWithTimeout(
        skill.execute(params, executionContext),
        timeout
      );

      const duration = Date.now() - startTime;
      const finalResult: SkillResult = {
        ...result,
        duration,
      };

      this.log(`Skill executed successfully: ${skillId} (${duration}ms)`);

      // Emit completion event
      this.emitSkillEvent('skill:execution:completed', skillId, { result: finalResult });

      return finalResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorResult: SkillResult = {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        duration,
      };

      this.log(`Skill execution failed: ${skillId} - ${errorResult.error?.message}`);

      // Emit failure event
      this.emitSkillEvent('skill:execution:failed', skillId, { error: errorResult.error });

      return errorResult;
    }
  }

  /**
   * Subscribe to skill events
   */
  onSkillEvent(handler: (event: SkillEvent) => void): vscode.Disposable {
    return this.eventBus.on<SkillEvent>('skill:event', handler);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.skills.clear();
    this.outputChannel.dispose();
  }

  // Private helper methods

  private validateSkill(skill: Skill): void {
    if (!skill.id || !skill.name || !skill.description) {
      throw new Error('Skill must have id, name, and description');
    }

    if (!skill.execute || typeof skill.execute !== 'function') {
      throw new Error('Skill must have an execute function');
    }

    if (!['file', 'code', 'git', 'terminal', 'custom'].includes(skill.category)) {
      throw new Error('Invalid skill category');
    }
  }

  private validateParameters(skill: Skill, params: any): { code: string; message: string } | null {
    if (!skill.parameters || skill.parameters.length === 0) {
      return null;
    }

    for (const param of skill.parameters) {
      if (param.required && (params[param.name] === undefined || params[param.name] === null)) {
        return {
          code: 'MISSING_PARAMETER',
          message: `Required parameter '${param.name}' is missing`,
        };
      }

      if (params[param.name] !== undefined) {
        const actualType = Array.isArray(params[param.name]) ? 'array' : typeof params[param.name];
        if (actualType !== param.type) {
          return {
            code: 'INVALID_PARAMETER_TYPE',
            message: `Parameter '${param.name}' must be of type '${param.type}', got '${actualType}'`,
          };
        }
      }
    }

    return null;
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Execution timeout after ${timeout}ms`)), timeout)
      ),
    ]);
  }

  private emitSkillEvent(type: SkillEventType, skillId: string, data?: any): void {
    const event: SkillEvent = {
      type,
      skillId,
      timestamp: Date.now(),
      data,
    };
    this.eventBus.emit('skill:event', event);
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }
}
