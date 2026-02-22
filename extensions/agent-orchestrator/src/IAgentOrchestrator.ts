/**
 * Agent Orchestrator Interface
 * Manages agent task lifecycle and execution
 */

export interface IAgentOrchestrator {
  /**
   * Submit a task for agent execution
   */
  submitTask(task: AgentTask): Promise<string>;

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): Promise<TaskStatus | undefined>;

  /**
   * Cancel a running task
   */
  cancelTask(taskId: string): Promise<boolean>;

  /**
   * List all tasks
   */
  listTasks(filter?: TaskFilter): Promise<TaskStatus[]>;

  /**
   * Subscribe to task updates
   */
  onTaskUpdate(callback: (status: TaskStatus) => void): void;
}

export interface AgentTask {
  id?: string;
  type: AgentTaskType;
  description: string;
  context: TaskContext;
  priority?: TaskPriority;
  constraints?: TaskConstraint[];
}

export enum AgentTaskType {
  CODE_GENERATION = 'code_generation',
  CODE_REFACTORING = 'code_refactoring',
  BUG_FIX = 'bug_fix',
  TEST_GENERATION = 'test_generation',
  DOCUMENTATION = 'documentation',
  CODE_REVIEW = 'code_review',
  RESEARCH = 'research',
  CUSTOM = 'custom',
}

export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
}

export interface TaskContext {
  workspaceRoot: string;
  activeFile?: string;
  selectedCode?: string;
  referencedFiles?: string[];
  additionalContext?: Record<string, unknown>;
}

export interface TaskConstraint {
  type: string;
  value: unknown;
}

export interface TaskStatus {
  id: string;
  task: AgentTask;
  state: TaskState;
  progress: number;
  startTime: number;
  endTime?: number;
  result?: TaskResult;
  error?: TaskError;
  steps: TaskStep[];
}

export enum TaskState {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface TaskResult {
  success: boolean;
  output: unknown;
  artifacts?: TaskArtifact[];
  metrics?: TaskMetrics;
}

export interface TaskError {
  code: string;
  message: string;
  stack?: string;
  recoverable: boolean;
}

export interface TaskStep {
  id: string;
  name: string;
  state: TaskState;
  startTime: number;
  endTime?: number;
  output?: string;
}

export interface TaskArtifact {
  type: 'file' | 'diff' | 'log' | 'screenshot';
  path: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskMetrics {
  duration: number;
  tokensUsed?: number;
  filesModified?: number;
  linesChanged?: number;
}

export interface TaskFilter {
  state?: TaskState;
  type?: AgentTaskType;
  priority?: TaskPriority;
  since?: number;
}
