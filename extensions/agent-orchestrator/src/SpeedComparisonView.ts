import * as vscode from 'vscode';

/**
 * 速度对比视图
 * 目标：直观展示 Miaoda vs Cursor 的速度差异
 */
export class SpeedComparisonView {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * 显示对比视图
   */
  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'miaodaSpeedComparison',
      '⚡ Miaoda vs Cursor',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this.panel.webview.html = this.getWebviewContent();

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    // 自动开始演示
    setTimeout(() => {
      this.startComparison();
    }, 1000);
  }

  /**
   * 开始对比演示
   */
  private startComparison(): void {
    if (!this.panel) return;

    const scenario = {
      task: '生成 REST API + 测试 + 文档',
      cursor: {
        steps: [
          { name: '生成用户 API', duration: 5000 },
          { name: '生成产品 API', duration: 5000 },
          { name: '生成订单 API', duration: 5000 },
          { name: '编写测试', duration: 4000 },
          { name: '生成文档', duration: 3000 },
        ],
        total: 22000,
      },
      miaoda: {
        agents: [
          { name: 'Backend Agent', task: '生成 API', duration: 5000 },
          { name: 'Test Agent', task: '编写测试', duration: 4000 },
          { name: 'Doc Agent', task: '生成文档', duration: 3000 },
        ],
        total: 5000,
      },
    };

    this.panel.webview.postMessage({
      command: 'startComparison',
      data: scenario,
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
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
        }
        .task-description {
            font-size: 18px;
            color: #858585;
        }
        .comparison {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 40px;
        }
        .side {
            background: #252526;
            border-radius: 12px;
            padding: 30px;
            min-height: 500px;
        }
        .side-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #3c3c3c;
        }
        .side-title {
            font-size: 24px;
            font-weight: 600;
        }
        .side-badge {
            padding: 6px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-serial {
            background: #858585;
            color: #1e1e1e;
        }
        .badge-parallel {
            background: #ffd700;
            color: #1e1e1e;
        }
        .timer {
            font-size: 48px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            font-variant-numeric: tabular-nums;
        }
        .steps {
            display: grid;
            gap: 10px;
        }
        .step {
            background: #2d2d30;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3c3c3c;
            transition: all 0.3s;
        }
        .step.running {
            border-left-color: #ffd700;
            background: rgba(255, 215, 0, 0.1);
            animation: pulse 1s infinite;
        }
        .step.completed {
            border-left-color: #0fa958;
            background: rgba(15, 169, 88, 0.1);
        }
        .step-name {
            font-size: 14px;
            margin-bottom: 5px;
        }
        .step-progress {
            height: 4px;
            background: #3c3c3c;
            border-radius: 2px;
            overflow: hidden;
        }
        .step-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #007acc, #00a8ff);
            width: 0%;
            transition: width 0.3s;
        }
        .result {
            display: none;
            text-align: center;
            padding: 40px;
            background: #252526;
            border-radius: 12px;
        }
        .result.show {
            display: block;
            animation: fadeIn 0.5s;
        }
        .result-icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
        .result-title {
            font-size: 36px;
            font-weight: 600;
            margin-bottom: 20px;
        }
        .result-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 30px;
        }
        .stat-card {
            background: #2d2d30;
            padding: 20px;
            border-radius: 8px;
        }
        .stat-value {
            font-size: 32px;
            font-weight: 600;
            color: #ffd700;
        }
        .stat-label {
            font-size: 14px;
            color: #858585;
            margin-top: 5px;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚡ 速度对比</h1>
        <p class="task-description" id="taskDescription">任务：生成 REST API + 测试 + 文档</p>
    </div>

    <div class="comparison">
        <div class="side">
            <div class="side-header">
                <div class="side-title">Cursor</div>
                <div class="side-badge badge-serial">串行执行</div>
            </div>
            <div class="timer" id="cursorTimer">0.0s</div>
            <div class="steps" id="cursorSteps"></div>
        </div>

        <div class="side">
            <div class="side-header">
                <div class="side-title">Miaoda</div>
                <div class="side-badge badge-parallel">并行执行</div>
            </div>
            <div class="timer" id="miaodaTimer">0.0s</div>
            <div class="steps" id="miaodaSteps"></div>
        </div>
    </div>

    <div class="result" id="result">
        <div class="result-icon">🎉</div>
        <div class="result-title">Miaoda 快 <span id="speedup">0</span>x</div>
        <div class="result-stats">
            <div class="stat-card">
                <div class="stat-value" id="cursorTime">0s</div>
                <div class="stat-label">Cursor 耗时</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="miaodaTime">0s</div>
                <div class="stat-label">Miaoda 耗时</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="timeSaved">0s</div>
                <div class="stat-label">节省时间</div>
            </div>
        </div>
    </div>

    <script>
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'startComparison') {
                runComparison(message.data);
            }
        });

        async function runComparison(data) {
            document.getElementById('taskDescription').textContent = '任务：' + data.task;

            // 渲染 Cursor 步骤
            const cursorSteps = document.getElementById('cursorSteps');
            cursorSteps.innerHTML = data.cursor.steps.map((step, i) => \`
                <div class="step" id="cursor-step-\${i}">
                    <div class="step-name">\${step.name}</div>
                    <div class="step-progress">
                        <div class="step-progress-fill" id="cursor-progress-\${i}"></div>
                    </div>
                </div>
            \`).join('');

            // 渲染 Miaoda 步骤
            const miaodaSteps = document.getElementById('miaodaSteps');
            miaodaSteps.innerHTML = data.miaoda.agents.map((agent, i) => \`
                <div class="step" id="miaoda-step-\${i}">
                    <div class="step-name">\${agent.name}: \${agent.task}</div>
                    <div class="step-progress">
                        <div class="step-progress-fill" id="miaoda-progress-\${i}"></div>
                    </div>
                </div>
            \`).join('');

            // Cursor 串行执行
            let cursorTime = 0;
            const cursorTimer = document.getElementById('cursorTimer');

            for (let i = 0; i < data.cursor.steps.length; i++) {
                const step = data.cursor.steps[i];
                const stepEl = document.getElementById(\`cursor-step-\${i}\`);
                const progressEl = document.getElementById(\`cursor-progress-\${i}\`);

                stepEl.classList.add('running');

                await animateProgress(progressEl, step.duration);
                await animateTimer(cursorTimer, cursorTime, cursorTime + step.duration);

                cursorTime += step.duration;
                stepEl.classList.remove('running');
                stepEl.classList.add('completed');
            }

            // Miaoda 并行执行
            const miaodaTimer = document.getElementById('miaodaTimer');
            const miaodaPromises = data.miaoda.agents.map(async (agent, i) => {
                const stepEl = document.getElementById(\`miaoda-step-\${i}\`);
                const progressEl = document.getElementById(\`miaoda-progress-\${i}\`);

                stepEl.classList.add('running');
                await animateProgress(progressEl, agent.duration);
                stepEl.classList.remove('running');
                stepEl.classList.add('completed');
            });

            animateTimer(miaodaTimer, 0, data.miaoda.total);
            await Promise.all(miaodaPromises);

            // 显示结果
            const speedup = (data.cursor.total / data.miaoda.total).toFixed(1);
            document.getElementById('speedup').textContent = speedup;
            document.getElementById('cursorTime').textContent = (data.cursor.total / 1000).toFixed(1) + 's';
            document.getElementById('miaodaTime').textContent = (data.miaoda.total / 1000).toFixed(1) + 's';
            document.getElementById('timeSaved').textContent = ((data.cursor.total - data.miaoda.total) / 1000).toFixed(1) + 's';
            document.getElementById('result').classList.add('show');
        }

        async function animateProgress(element, duration) {
            const steps = 30;
            const stepDuration = duration / steps;

            for (let i = 0; i <= steps; i++) {
                element.style.width = (i / steps * 100) + '%';
                await new Promise(resolve => setTimeout(resolve, stepDuration));
            }
        }

        async function animateTimer(element, start, end) {
            const duration = end - start;
            const steps = 30;
            const stepDuration = duration / steps;

            for (let i = 0; i <= steps; i++) {
                const current = start + (end - start) * (i / steps);
                element.textContent = (current / 1000).toFixed(1) + 's';
                await new Promise(resolve => setTimeout(resolve, stepDuration));
            }
        }
    </script>
</body>
</html>
    `;
  }

  dispose(): void {
    this.panel?.dispose();
  }
}

let speedComparisonInstance: SpeedComparisonView | undefined;

export function getSpeedComparisonView(
  context: vscode.ExtensionContext
): SpeedComparisonView {
  if (!speedComparisonInstance) {
    speedComparisonInstance = new SpeedComparisonView(context);
  }
  return speedComparisonInstance;
}
