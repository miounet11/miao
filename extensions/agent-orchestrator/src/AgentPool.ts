import * as vscode from 'vscode';
import { AgentTask, TaskStatus, TaskState } from './IAgentOrchestrator';

/**
 * Agent 实例
 */
export interface Agent {
  id: string;
  name: string;
  role: 'architect' | 'backend' | 'frontend' | 'test' | 'doc';
  status: 'idle' | 'busy' | 'error';
  currentTask?: string;
  tasksCompleted: number;
  createdAt: number;
}

/**
 * Agent 池管理器
 * 负责 Agent 的创建、分配、回收
 */
export class AgentPool {
  private agents: Map<string, Agent> = new Map();
  private maxAgents: number = 5;
  private minAgents: number = 3;

  constructor() {
    this.initializePool();
  }

  /**
   * 初始化 Agent 池
   */
  private initializePool(): void {
    // 创建默认 3 个 Agent
    this.createAgent('architect');
    this.createAgent('backend');
    this.createAgent('test');
  }

  /**
   * 创建 Agent
   */
  private createAgent(role: Agent['role']): Agent {
    const id = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const agent: Agent = {
      id,
      name: this.getAgentName(role),
      role,
      status: 'idle',
      tasksCompleted: 0,
      createdAt: Date.now(),
    };

    this.agents.set(id, agent);
    return agent;
  }

  /**
   * 获取 Agent 名称
   */
  private getAgentName(role: Agent['role']): string {
    const names: Record<Agent['role'], string> = {
      architect: 'Architect',
      backend: 'Backend Engineer',
      frontend: 'Frontend Engineer',
      test: 'Test Engineer',
      doc: 'Doc Writer',
    };
    return names[role];
  }

  /**
   * 获取空闲 Agent
   */
  getIdleAgent(preferredRole?: Agent['role']): Agent | undefined {
    // 优先查找指定角色的空闲 Agent
    if (preferredRole) {
      for (const agent of this.agents.values()) {
        if (agent.status === 'idle' && agent.role === preferredRole) {
          return agent;
        }
      }
    }

    // 查找任意空闲 Agent
    for (const agent of this.agents.values()) {
      if (agent.status === 'idle') {
        return agent;
      }
    }

    // 如果没有空闲 Agent 且未达到上限，创建新 Agent
    if (this.agents.size < this.maxAgents) {
      return this.createAgent(preferredRole || 'backend');
    }

    return undefined;
  }

  /**
   * 分配任务给 Agent
   */
  assignTask(agentId: string, taskId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.status = 'busy';
    agent.currentTask = taskId;
  }

  /**
   * 释放 Agent
   */
  releaseAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return;
    }

    agent.status = 'idle';
    agent.currentTask = undefined;
    agent.tasksCompleted++;
  }

  /**
   * 标记 Agent 错误
   */
  markAgentError(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return;
    }

    agent.status = 'error';
    agent.currentTask = undefined;
  }

  /**
   * 获取所有 Agent
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * 获取 Agent 统计
   */
  getStats(): {
    total: number;
    idle: number;
    busy: number;
    error: number;
    totalTasksCompleted: number;
  } {
    const agents = this.getAllAgents();
    return {
      total: agents.length,
      idle: agents.filter((a) => a.status === 'idle').length,
      busy: agents.filter((a) => a.status === 'busy').length,
      error: agents.filter((a) => a.status === 'error').length,
      totalTasksCompleted: agents.reduce((sum, a) => sum + a.tasksCompleted, 0),
    };
  }

  /**
   * 清理空闲 Agent（保留最小数量）
   */
  cleanup(): void {
    const idleAgents = this.getAllAgents().filter((a) => a.status === 'idle');

    // 保留最小数量的 Agent
    if (idleAgents.length > this.minAgents) {
      const toRemove = idleAgents.slice(this.minAgents);
      toRemove.forEach((agent) => {
        this.agents.delete(agent.id);
      });
    }
  }

  /**
   * 重置所有 Agent
   */
  reset(): void {
    this.agents.clear();
    this.initializePool();
  }
}

/**
 * 单例
 */
let agentPoolInstance: AgentPool | undefined;

export function getAgentPool(): AgentPool {
  if (!agentPoolInstance) {
    agentPoolInstance = new AgentPool();
  }
  return agentPoolInstance;
}
