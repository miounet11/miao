import { AgentTask, TaskStatus, TaskState, AgentTaskType } from './IAgentOrchestrator';
import { v4 as uuidv4 } from 'uuid';

/**
 * 任务依赖图节点
 */
export interface TaskNode {
  id: string;
  task: AgentTask;
  dependencies: string[]; // 依赖的任务 ID
  dependents: string[]; // 依赖此任务的任务 ID
}

/**
 * 任务依赖图
 */
export interface TaskGraph {
  nodes: Map<string, TaskNode>;
  roots: string[]; // 无依赖的根任务
}

/**
 * 执行统计
 */
export interface ExecutionStats {
  totalTasks: number;
  parallelTasks: number;
  serialTasks: number;
  estimatedSerialTime: number;
  estimatedParallelTime: number;
  speedup: number;
}

/**
 * 智能任务调度器 - 自动识别并行任务
 */
export class TaskScheduler {
  /**
   * 分析任务依赖关系
   */
  analyzeDependencies(tasks: AgentTask[]): TaskGraph {
    const nodes = new Map<string, TaskNode>();
    const roots: string[] = [];

    // 创建节点
    for (const task of tasks) {
      const id = task.id || uuidv4();
      nodes.set(id, {
        id,
        task: { ...task, id },
        dependencies: [],
        dependents: [],
      });
    }

    // 分析依赖关系
    const taskArray = Array.from(nodes.values());
    for (let i = 0; i < taskArray.length; i++) {
      const current = taskArray[i];
      const deps = this.detectDependencies(current.task, taskArray.slice(0, i));

      for (const depId of deps) {
        current.dependencies.push(depId);
        const depNode = nodes.get(depId);
        if (depNode) {
          depNode.dependents.push(current.id);
        }
      }

      if (current.dependencies.length === 0) {
        roots.push(current.id);
      }
    }

    return { nodes, roots };
  }

  /**
   * 检测任务间的依赖关系
   */
  private detectDependencies(task: AgentTask, previousTasks: TaskNode[]): string[] {
    const deps: string[] = [];

    for (const prev of previousTasks) {
      if (this.hasDependency(task, prev.task)) {
        deps.push(prev.id);
      }
    }

    return deps;
  }

  /**
   * 判断两个任务是否有依赖关系
   */
  private hasDependency(task: AgentTask, potentialDep: AgentTask): boolean {
    // 规则 1: 代码生成必须在测试生成之前
    if (
      task.type === AgentTaskType.TEST_GENERATION &&
      potentialDep.type === AgentTaskType.CODE_GENERATION
    ) {
      return true;
    }

    // 规则 2: 重构必须在代码审查之前
    if (
      task.type === AgentTaskType.CODE_REVIEW &&
      potentialDep.type === AgentTaskType.CODE_REFACTORING
    ) {
      return true;
    }

    // 规则 3: 文档生成依赖代码生成
    if (
      task.type === AgentTaskType.DOCUMENTATION &&
      potentialDep.type === AgentTaskType.CODE_GENERATION
    ) {
      return true;
    }

    // 规则 4: 相同文件的任务必须串行
    if (task.context.activeFile && task.context.activeFile === potentialDep.context.activeFile) {
      // 除非是只读操作（如代码审查、文档生成）
      const readOnlyTypes = [AgentTaskType.CODE_REVIEW, AgentTaskType.DOCUMENTATION];
      if (!readOnlyTypes.includes(task.type) || !readOnlyTypes.includes(potentialDep.type)) {
        return true;
      }
    }

    // 规则 5: Bug 修复优先级最高，其他任务等待
    if (task.type !== AgentTaskType.BUG_FIX && potentialDep.type === AgentTaskType.BUG_FIX) {
      return true;
    }

    return false;
  }

  /**
   * 生成执行计划（分层并行）
   */
  generateExecutionPlan(graph: TaskGraph): string[][] {
    const plan: string[][] = [];
    const completed = new Set<string>();
    const { nodes, roots } = graph;

    // 第一层：所有根任务（无依赖）
    let currentLayer = [...roots];

    while (currentLayer.length > 0) {
      plan.push(currentLayer);
      currentLayer.forEach((id) => completed.add(id));

      // 下一层：所有依赖已完成的任务
      const nextLayer: string[] = [];
      for (const [id, node] of nodes.entries()) {
        if (completed.has(id)) {
          continue;
        }

        // 检查所有依赖是否已完成
        const allDepsCompleted = node.dependencies.every((depId) => completed.has(depId));
        if (allDepsCompleted) {
          nextLayer.push(id);
        }
      }

      currentLayer = nextLayer;
    }

    return plan;
  }

  /**
   * 计算执行统计
   */
  calculateStats(graph: TaskGraph, plan: string[][]): ExecutionStats {
    const totalTasks = graph.nodes.size;
    const parallelTasks = plan.reduce((sum, layer) => sum + (layer.length > 1 ? layer.length : 0), 0);
    const serialTasks = totalTasks - parallelTasks;

    // 假设每个任务平均耗时 3 秒
    const avgTaskTime = 3000;
    const estimatedSerialTime = totalTasks * avgTaskTime;

    // 并行执行时间 = 层数 * 平均任务时间
    const estimatedParallelTime = plan.length * avgTaskTime;

    const speedup = estimatedSerialTime / estimatedParallelTime;

    return {
      totalTasks,
      parallelTasks,
      serialTasks,
      estimatedSerialTime,
      estimatedParallelTime,
      speedup,
    };
  }

  /**
   * 可视化执行计划
   */
  visualizePlan(graph: TaskGraph, plan: string[][]): string {
    const lines: string[] = [];
    lines.push('\n📊 Execution Plan (Parallel Layers):\n');

    for (let i = 0; i < plan.length; i++) {
      const layer = plan[i];
      lines.push(`Layer ${i + 1} (${layer.length} tasks in parallel):`);

      for (const taskId of layer) {
        const node = graph.nodes.get(taskId);
        if (node) {
          const icon = this.getTaskIcon(node.task.type);
          lines.push(`  ${icon} ${node.task.description}`);
        }
      }
      lines.push('');
    }

    const stats = this.calculateStats(graph, plan);
    lines.push('⚡ Performance:');
    lines.push(`  Serial execution: ${(stats.estimatedSerialTime / 1000).toFixed(1)}s`);
    lines.push(`  Parallel execution: ${(stats.estimatedParallelTime / 1000).toFixed(1)}s`);
    lines.push(`  Speedup: ${stats.speedup.toFixed(1)}x faster\n`);

    return lines.join('\n');
  }

  /**
   * 获取任务图标
   */
  private getTaskIcon(type: AgentTaskType): string {
    const iconMap: Record<string, string> = {
      [AgentTaskType.CODE_GENERATION]: '💻',
      [AgentTaskType.CODE_REFACTORING]: '🔧',
      [AgentTaskType.BUG_FIX]: '🐛',
      [AgentTaskType.TEST_GENERATION]: '🧪',
      [AgentTaskType.DOCUMENTATION]: '📖',
      [AgentTaskType.CODE_REVIEW]: '👀',
      [AgentTaskType.RESEARCH]: '🔍',
      [AgentTaskType.CUSTOM]: '⚙️',
    };
    return iconMap[type] || '📋';
  }

  /**
   * 智能任务分组（自动识别可并行任务）
   */
  autoGroupTasks(tasks: AgentTask[]): AgentTask[][] {
    const graph = this.analyzeDependencies(tasks);
    const plan = this.generateExecutionPlan(graph);

    return plan.map((layer) =>
      layer.map((id) => graph.nodes.get(id)!.task).filter((t) => t !== undefined)
    );
  }
}

/**
 * 单例
 */
let schedulerInstance: TaskScheduler | undefined;

export function getTaskScheduler(): TaskScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new TaskScheduler();
  }
  return schedulerInstance;
}
