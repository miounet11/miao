import { describe, it, expect, beforeEach } from 'vitest';
import {
  AgentOrchestrator,
  getAgentOrchestrator,
  resetAgentOrchestrator,
} from '../AgentOrchestrator';
import {
  AgentTask,
  AgentTaskType,
  TaskState,
  TaskPriority,
} from '../IAgentOrchestrator';

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    resetAgentOrchestrator();
    orchestrator = new AgentOrchestrator();
  });

  describe('submitTask', () => {
    it('should submit a task and return task ID', async () => {
      const task: AgentTask = {
        type: AgentTaskType.CODE_GENERATION,
        description: 'Generate a React component',
        context: {
          workspaceRoot: '/test',
        },
      };

      const taskId = await orchestrator.submitTask(task);

      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');
    });

    it('should use provided task ID if given', async () => {
      const task: AgentTask = {
        id: 'custom-task-id',
        type: AgentTaskType.BUG_FIX,
        description: 'Fix null pointer exception',
        context: {
          workspaceRoot: '/test',
        },
      };

      const taskId = await orchestrator.submitTask(task);

      expect(taskId).toBe('custom-task-id');
    });

    it('should set task state to PENDING initially', async () => {
      const task: AgentTask = {
        type: AgentTaskType.TEST_GENERATION,
        description: 'Generate unit tests',
        context: {
          workspaceRoot: '/test',
        },
      };

      const taskId = await orchestrator.submitTask(task);
      const status = await orchestrator.getTaskStatus(taskId);

      expect(status?.state).toBe(TaskState.PENDING);
    });
  });

  describe('getTaskStatus', () => {
    it('should return task status for existing task', async () => {
      const task: AgentTask = {
        type: AgentTaskType.CODE_REVIEW,
        description: 'Review pull request',
        context: {
          workspaceRoot: '/test',
        },
      };

      const taskId = await orchestrator.submitTask(task);
      const status = await orchestrator.getTaskStatus(taskId);

      expect(status).toBeDefined();
      expect(status?.id).toBe(taskId);
      expect(status?.task.description).toBe('Review pull request');
    });

    it('should return undefined for non-existent task', async () => {
      const status = await orchestrator.getTaskStatus('non-existent-id');

      expect(status).toBeUndefined();
    });
  });

  describe('cancelTask', () => {
    it('should cancel a pending task', async () => {
      const task: AgentTask = {
        type: AgentTaskType.DOCUMENTATION,
        description: 'Generate API docs',
        context: {
          workspaceRoot: '/test',
        },
      };

      const taskId = await orchestrator.submitTask(task);
      const cancelled = await orchestrator.cancelTask(taskId);

      expect(cancelled).toBe(true);

      const status = await orchestrator.getTaskStatus(taskId);
      expect(status?.state).toBe(TaskState.CANCELLED);
    });

    it('should return false for non-existent task', async () => {
      const cancelled = await orchestrator.cancelTask('non-existent-id');

      expect(cancelled).toBe(false);
    });

    it('should return false for already completed task', async () => {
      const task: AgentTask = {
        type: AgentTaskType.RESEARCH,
        description: 'Research best practices',
        context: {
          workspaceRoot: '/test',
        },
      };

      const taskId = await orchestrator.submitTask(task);

      // Wait for task to complete
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const cancelled = await orchestrator.cancelTask(taskId);
      expect(cancelled).toBe(false);
    });
  });

  describe('listTasks', () => {
    it('should list all tasks', async () => {
      const task1: AgentTask = {
        type: AgentTaskType.CODE_GENERATION,
        description: 'Task 1',
        context: { workspaceRoot: '/test' },
      };

      const task2: AgentTask = {
        type: AgentTaskType.BUG_FIX,
        description: 'Task 2',
        context: { workspaceRoot: '/test' },
      };

      await orchestrator.submitTask(task1);
      await orchestrator.submitTask(task2);

      const tasks = await orchestrator.listTasks();

      expect(tasks).toHaveLength(2);
    });

    it('should filter tasks by state', async () => {
      const task1: AgentTask = {
        type: AgentTaskType.CODE_GENERATION,
        description: 'Task 1',
        context: { workspaceRoot: '/test' },
      };

      const task2: AgentTask = {
        type: AgentTaskType.BUG_FIX,
        description: 'Task 2',
        context: { workspaceRoot: '/test' },
      };

      const taskId1 = await orchestrator.submitTask(task1);
      await orchestrator.submitTask(task2);
      await orchestrator.cancelTask(taskId1);

      const cancelledTasks = await orchestrator.listTasks({
        state: TaskState.CANCELLED,
      });

      expect(cancelledTasks).toHaveLength(1);
      expect(cancelledTasks[0].id).toBe(taskId1);
    });

    it('should filter tasks by type', async () => {
      const task1: AgentTask = {
        type: AgentTaskType.CODE_GENERATION,
        description: 'Task 1',
        context: { workspaceRoot: '/test' },
      };

      const task2: AgentTask = {
        type: AgentTaskType.BUG_FIX,
        description: 'Task 2',
        context: { workspaceRoot: '/test' },
      };

      await orchestrator.submitTask(task1);
      await orchestrator.submitTask(task2);

      const codeTasks = await orchestrator.listTasks({
        type: AgentTaskType.CODE_GENERATION,
      });

      expect(codeTasks).toHaveLength(1);
      expect(codeTasks[0].task.type).toBe(AgentTaskType.CODE_GENERATION);
    });

    it('should filter tasks by priority', async () => {
      const task1: AgentTask = {
        type: AgentTaskType.CODE_GENERATION,
        description: 'Low priority',
        context: { workspaceRoot: '/test' },
        priority: TaskPriority.LOW,
      };

      const task2: AgentTask = {
        type: AgentTaskType.BUG_FIX,
        description: 'High priority',
        context: { workspaceRoot: '/test' },
        priority: TaskPriority.HIGH,
      };

      await orchestrator.submitTask(task1);
      await orchestrator.submitTask(task2);

      const highPriorityTasks = await orchestrator.listTasks({
        priority: TaskPriority.HIGH,
      });

      expect(highPriorityTasks).toHaveLength(1);
      expect(highPriorityTasks[0].task.priority).toBe(TaskPriority.HIGH);
    });
  });

  describe('onTaskUpdate', () => {
    it('should notify callbacks on task updates', async () => {
      const updates: any[] = [];

      orchestrator.onTaskUpdate((status) => {
        updates.push(status);
      });

      const task: AgentTask = {
        type: AgentTaskType.CODE_GENERATION,
        description: 'Test task',
        context: { workspaceRoot: '/test' },
      };

      await orchestrator.submitTask(task);

      // Wait for some updates
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(updates.length).toBeGreaterThan(0);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = getAgentOrchestrator();
      const instance2 = getAgentOrchestrator();

      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = getAgentOrchestrator();
      resetAgentOrchestrator();
      const instance2 = getAgentOrchestrator();

      expect(instance1).not.toBe(instance2);
    });
  });
});
