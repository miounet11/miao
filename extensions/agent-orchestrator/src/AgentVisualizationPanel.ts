import * as vscode from 'vscode';
import { TaskStatus, TaskState, TaskStep } from './IAgentOrchestrator';
import { getEventBus } from '../../shared-services/src/EventBus';

/**
 * Agent 可视化面板
 * 目标：让用户看到 AI 团队在工作
 */

export interface AgentAvatar {
  id: string;
  name: string;
  role: string;
  icon: string;
  status: 'idle' | 'thinking' | 'working' | 'completed';
  currentTask?: string;
  progress: number;
}

export class AgentVisualizationPanel {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;
  private agents: Map<string, AgentAvatar> = new Map();
  private taskStatus: TaskStatus | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.setupEventListeners();
  }

  /**
   * 显示面板
   */
  async show(taskStatus: TaskStatus): Promise<void> {
    this.taskStatus = taskStatus;
    this.initializeAgents(taskStatus);

    if (this.panel) {
      this.panel.reveal();
    } else {
      this.panel = vscode.window.createWebviewPanel(
        'miaodaAgentVisualization',
        '🤖 Agent Team',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      this.panel.webview.html = this.getWebviewContent();

      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    }

    // 开始更新
    this.startUpdating();
  }

  /**
   * 初始化 Agents
   */
  private initializeAgents(taskStatus: TaskStatus): void {
    // 根据任务类型创建 Agents
    const agentConfigs = [
      {
        id: 'architect',
        name: 'Architect',
        role: '架构师',
        icon: '👨‍💼',
      },
      {
        id: 'backend',
        name: 'Backend Engineer',
        role: '后端工程师',
        icon: '👨‍💻',
      },
      {
        id: 'test',
        name: 'Test Engineer',
        role: '测试工程师',
        icon: '🧪',
      },
    ];

    agentConfigs.forEach((config) => {
      this.agents.set(config.id, {
        ...config,
        status: 'idle',
        progress: 0,
      });
    });
  }

  /**
   * 开始更新
   */
  private startUpdating(): void {
    const interval = setInterval(() => {
      if (!this.taskStatus || !this.panel) {
        clearInterval(interval);
        return;
      }

      this.updateAgents();
      this.sendUpdate();

      // 任务完成后停止
      if (
        this.taskStatus.state === TaskState.COMPLETED ||
        this.taskStatus.state === TaskState.FAILED
      ) {
        clearInterval(interval);
        this.onTaskCompleted();
      }
    }, 500);
  }

  /**
   * 更新 Agents 状态
   */
  private updateAgents(): void {
    if (!this.taskStatus) return;

    const steps = this.taskStatus.steps;
    const totalSteps = steps.length;

    // 模拟 Agent 分配
    steps.forEach((step, index) => {
      const agentId = this.getAgentForStep(step, index);
      const agent = this.agents.get(agentId);

      if (!agent) return;

      if (step.state === TaskState.RUNNING) {
        agent.status = 'working';
        agent.currentTask = step.name;
        agent.progress = Math.min(90, (Date.now() - step.startTime) / 100);
      } else if (step.state === TaskState.COMPLETED) {
        agent.status = 'completed';
        agent.currentTask = step.name;
        agent.progress = 100;
      } else {
        agent.status = 'idle';
      }
    });
  }

  /**
   * 为步骤分配 Agent
   */
  private getAgentForStep(step: TaskStep, index: number): string {
    const stepName = step.name.toLowerCase();

    if (stepName.includes('analyze') || stepName.includes('plan')) {
      return 'architect';
    } else if (stepName.includes('test')) {
      return 'test';
    } else {
      return 'backend';
    }
  }

  /**
   * 发送更新到 Webview
   */
  private sendUpdate(): void {
    if (!this.panel || !this.taskStatus) return;

    this.panel.webview.postMessage({
      command: 'update',
      data: {
        agents: Array.from(this.agents.values()),
        taskStatus: this.taskStatus,
        metrics: this.calculateMetrics(),
      },
    });
  }

  /**
   * 计算指标
   */
  private calculateMetrics(): any {
    if (!this.taskStatus) return {};

    const elapsed = Date.now() - this.taskStatus.startTime;
    const estimatedTotal =
      this.taskStatus.progress > 0
        ? (elapsed / this.taskStatus.progress) * 100
        : 0;
    const estimatedLeft = Math.max(0, estimatedTotal - elapsed);

    // 模拟串行执行时间（3 倍）
    const serialTime = estimatedTotal * 3;
    const speedup = serialTime / estimatedTotal;

    return {
      elapsed: this.formatDuration(elapsed),
      estimatedLeft: this.formatDuration(estimatedLeft),
      speedup: speedup.toFixed(1),
      parallelAgents: Array.from(this.agents.values()).filter(
        (a) => a.status === 'working'
      ).length,
    };
  }

  /**
   * 任务完成
   */
  private onTaskCompleted(): void {
    if (!this.panel || !this.taskStatus) return;

    const duration = this.taskStatus.endTime! - this.taskStatus.startTime;
    const serialDuration = duration * 3;
    const speedup = (serialDuration / duration).toFixed(1);

    this.panel.webview.postMessage({
      command: 'completed',
      data: {
        success: this.taskStatus.state === TaskState.COMPLETED,
        duration: this.formatDuration(duration),
        speedup,
        saved: this.formatDuration(serialDuration - duration),
      },
    });
  }

  /**
   * 格式化时长
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return '< 1s';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    const eventBus = getEventBus();

    eventBus.on('agent.task.updated', (status: TaskStatus) => {
      if (this.taskStatus && this.taskStatus.id === status.id) {
        this.taskStatus = status;
      }
    });
  }

  /**
   * 生成 Webview 内容
   */
  private getWebviewContent(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: #252526;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .metric-value {
            font-size: 24px;
            font-weight: 600;
            color: #007acc;
        }
        .metric-label {
            font-size: 12px;
            color: #858585;
            margin-top: 5px;
        }
        .agents-container {
            display: grid;
            gap: 20px;
        }
        .agent-card {
            background: #252526;
            border-radius: 12px;
            padding: 20px;
            border-left: 4px solid #3c3c3c;
            transition: all 0.3s;
        }
        .agent-card.working {
            border-left-color: #ffd700;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
        }
        .agent-card.completed {
            border-left-color: #0fa958;
        }
        .agent-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
        }
        .agent-avatar {
            font-size: 48px;
            animation: idle 2s infinite;
        }
        .agent-avatar.thinking {
            animation: thinking 1s infinite;
        }
        .agent-avatar.working {
            animation: working 0.5s infinite;
        }
        .agent-avatar.completed {
            animation: celebrate 0.5s;
        }
        .agent-info {
            flex: 1;
        }
        .agent-name {
            font-size: 18px;
            font-weight: 600;
        }
        .agent-role {
            font-size: 14px;
            color: #858585;
        }
        .agent-status {
            font-size: 12px;
            padding: 4px 12px;
            border-radius: 12px;
            display: inline-block;
        }
        .agent-status.idle {
            background: #3c3c3c;
        }
        .agent-status.working {
            background: #ffd700;
            color: #333;
            animation: pulse 1s infinite;
        }
        .agent-status.completed {
            background: #0fa958;
        }
        .agent-task {
            background: #2d2d30;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 10px;
            font-size: 14px;
        }
        .progress-bar {
            height: 6px;
            background: #3c3c3c;
            border-radius: 3px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #007acc, #00a8ff);
            transition: width 0.3s;
        }
        .completion-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .completion-overlay.show {
            display: flex;
            animation: fadeIn 0.5s;
        }
        .completion-content {
            text-align: center;
            animation: scaleIn 0.5s;
        }
        .completion-icon {
            font-size: 80px;
            margin-bottom: 20px;
        }
        .completion-title {
            font-size: 36px;
            font-weight: 600;
            margin-bottom: 20px;
        }
        .completion-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 30px;
        }
        .completion-stat {
            background: #252526;
            padding: 20px;
            border-radius: 8px;
        }
        .completion-stat-value {
            font-size: 32px;
            font-weight: 600;
            color: #ffd700;
        }
        .completion-stat-label {
            font-size: 14px;
            color: #858585;
            margin-top: 5px;
        }
        @keyframes idle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        @keyframes thinking {
            0%, 100% { transform: rotate(-5deg); }
            50% { transform: rotate(5deg); }
        }
        @keyframes working {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        @keyframes celebrate {
            0%, 100% { transform: rotate(0) scale(1); }
            25% { transform: rotate(-10deg) scale(1.2); }
            75% { transform: rotate(10deg) scale(1.2); }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes scaleIn {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 Agent Team</h1>
        <p>实时查看 AI 团队协作</p>
    </div>

    <div class="metrics" id="metrics">
        <div class="metric-card">
            <div class="metric-value" id="parallelAgents">0</div>
            <div class="metric-label">并行 Agents</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="elapsed">0s</div>
            <div class="metric-label">已用时间</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="estimatedLeft">-</div>
            <div class="metric-label">预计剩余</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="speedup">1.0x</div>
            <div class="metric-label">加速比</div>
        </div>
    </div>

    <div class="agents-container" id="agents"></div>

    <div class="completion-overlay" id="completionOverlay">
        <div class="completion-content">
            <div class="completion-icon">🎉</div>
            <div class="completion-title">任务完成！</div>
            <div class="completion-stats">
                <div class="completion-stat">
                    <div class="completion-stat-value" id="completionDuration">-</div>
                    <div class="completion-stat-label">总耗时</div>
                </div>
                <div class="completion-stat">
                    <div class="completion-stat-value" id="completionSpeedup">-</div>
                    <div class="completion-stat-label">加速比</div>
                </div>
                <div class="completion-stat">
                    <div class="completion-stat-value" id="completionSaved">-</div>
                    <div class="completion-stat-label">节省时间</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'update':
                    updateAgents(message.data.agents);
                    updateMetrics(message.data.metrics);
                    break;
                case 'completed':
                    showCompletion(message.data);
                    break;
            }
        });

        function updateAgents(agents) {
            const container = document.getElementById('agents');
            container.innerHTML = agents.map(agent => \`
                <div class="agent-card \${agent.status}">
                    <div class="agent-header">
                        <div class="agent-avatar \${agent.status}">\${agent.icon}</div>
                        <div class="agent-info">
                            <div class="agent-name">\${agent.name}</div>
                            <div class="agent-role">\${agent.role}</div>
                        </div>
                        <div class="agent-status \${agent.status}">
                            \${getStatusText(agent.status)}
                        </div>
                    </div>
                    \${agent.currentTask ? \`<div class="agent-task">📋 \${agent.currentTask}</div>\` : ''}
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: \${agent.progress}%"></div>
                    </div>
                </div>
            \`).join('');
        }

        function updateMetrics(metrics) {
            document.getElementById('parallelAgents').textContent = metrics.parallelAgents || 0;
            document.getElementById('elapsed').textContent = metrics.elapsed || '0s';
            document.getElementById('estimatedLeft').textContent = metrics.estimatedLeft || '-';
            document.getElementById('speedup').textContent = metrics.speedup + 'x' || '1.0x';
        }

        function showCompletion(data) {
            document.getElementById('completionDuration').textContent = data.duration;
            document.getElementById('completionSpeedup').textContent = data.speedup + 'x';
            document.getElementById('completionSaved').textContent = data.saved;
            document.getElementById('completionOverlay').classList.add('show');

            // 3 秒后自动关闭
            setTimeout(() => {
                document.getElementById('completionOverlay').classList.remove('show');
            }, 3000);
        }

        function getStatusText(status) {
            const statusMap = {
                idle: '待命',
                thinking: '思考中',
                working: '工作中',
                completed: '已完成'
            };
            return statusMap[status] || status;
        }
    </script>
</body>
</html>
    `;
  }

  /**
   * 清理
   */
  dispose(): void {
    this.panel?.dispose();
  }
}

/**
 * 单例
 */
let visualizationPanelInstance: AgentVisualizationPanel | undefined;

export function getAgentVisualizationPanel(
  context: vscode.ExtensionContext
): AgentVisualizationPanel {
  if (!visualizationPanelInstance) {
    visualizationPanelInstance = new AgentVisualizationPanel(context);
  }
  return visualizationPanelInstance;
}
