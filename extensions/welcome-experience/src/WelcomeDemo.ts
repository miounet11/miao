import * as vscode from 'vscode';

/**
 * 首次启动演示
 * 目标：3 秒内震撼用户
 */
export class WelcomeDemo {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * 检查是否首次启动
   */
  async checkFirstLaunch(): Promise<boolean> {
    const hasLaunched = this.context.globalState.get<boolean>('hasLaunched');
    return !hasLaunched;
  }

  /**
   * 显示欢迎演示
   */
  async show(): Promise<void> {
    const isFirstLaunch = await this.checkFirstLaunch();

    if (!isFirstLaunch) {
      return;
    }

    // 标记已启动
    await this.context.globalState.update('hasLaunched', true);

    // 创建 Webview
    this.panel = vscode.window.createWebviewPanel(
      'miaodaWelcome',
      '欢迎使用 Miaoda',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this.panel.webview.html = this.getWebviewContent();

    // 处理消息
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'startDemo':
            await this.startDemo();
            break;
          case 'skip':
            this.panel?.dispose();
            break;
          case 'startTutorial':
            await this.startTutorial();
            this.panel?.dispose();
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  /**
   * 开始演示
   */
  private async startDemo(): Promise<void> {
    // 模拟对比演示
    this.panel?.webview.postMessage({
      command: 'runDemo',
      data: {
        cursor: {
          tasks: [
            { name: '生成用户 API', duration: 5000 },
            { name: '生成产品 API', duration: 5000 },
            { name: '生成测试', duration: 4000 },
          ],
          total: 14000,
        },
        miaoda: {
          tasks: [
            { name: 'Agent 1: 生成用户 API', duration: 3000 },
            { name: 'Agent 2: 生成产品 API', duration: 3000 },
            { name: 'Agent 3: 生成测试', duration: 3000 },
          ],
          total: 3000,
          parallel: true,
        },
      },
    });
  }

  /**
   * 开始教程
   */
  private async startTutorial(): Promise<void> {
    // 启动 7 天引导
    await vscode.commands.executeCommand('miaoda.startOnboarding');
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
        .container {
            text-align: center;
            max-width: 1200px;
            padding: 40px;
        }
        .logo {
            font-size: 64px;
            margin-bottom: 20px;
            animation: fadeIn 0.5s;
        }
        h1 {
            font-size: 48px;
            margin-bottom: 20px;
            animation: fadeIn 0.7s;
        }
        .subtitle {
            font-size: 24px;
            opacity: 0.9;
            margin-bottom: 40px;
            animation: fadeIn 0.9s;
        }
        .demo-container {
            display: none;
            margin: 40px 0;
        }
        .demo-container.active {
            display: block;
            animation: fadeIn 0.5s;
        }
        .comparison {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        .demo-box {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 30px;
            min-height: 400px;
        }
        .demo-title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 20px;
        }
        .task-item {
            background: rgba(255, 255, 255, 0.1);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .task-item.running {
            background: rgba(255, 215, 0, 0.3);
            animation: pulse 1s infinite;
        }
        .task-item.completed {
            background: rgba(0, 255, 0, 0.3);
        }
        .timer {
            font-size: 48px;
            font-weight: bold;
            margin: 20px 0;
        }
        .speedup {
            font-size: 36px;
            color: #ffd700;
            margin: 20px 0;
            animation: bounce 1s infinite;
        }
        .actions {
            display: flex;
            gap: 20px;
            justify-content: center;
            animation: fadeIn 1.1s;
        }
        button {
            padding: 15px 40px;
            font-size: 18px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            font-weight: 600;
        }
        .btn-primary {
            background: #ffd700;
            color: #333;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(255, 215, 0, 0.3);
        }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.2);
            color: white;
        }
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        @keyframes bounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div id="welcome" class="welcome-screen">
            <div class="logo">🚀</div>
            <h1>欢迎来到 Miaoda</h1>
            <p class="subtitle">你的 AI 开发团队 - 比 Cursor 快 3 倍</p>
            <div class="actions">
                <button class="btn-primary" onclick="startDemo()">🎬 看看有多快（3 秒）</button>
                <button class="btn-secondary" onclick="skip()">跳过</button>
            </div>
        </div>

        <div id="demo" class="demo-container">
            <div class="comparison">
                <div class="demo-box">
                    <div class="demo-title">Cursor（串行执行）</div>
                    <div id="cursor-tasks"></div>
                    <div class="timer" id="cursor-timer">0.0s</div>
                </div>
                <div class="demo-box">
                    <div class="demo-title">Miaoda（并行执行）</div>
                    <div id="miaoda-tasks"></div>
                    <div class="timer" id="miaoda-timer">0.0s</div>
                </div>
            </div>
            <div id="result" style="display: none;">
                <div class="speedup">⚡ Miaoda 快 <span id="speedup">0</span>x</div>
                <div class="actions">
                    <button class="btn-primary" onclick="startTutorial()">🎯 开始使用（免费 50 次）</button>
                    <button class="btn-secondary" onclick="skip()">稍后</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function startDemo() {
            document.getElementById('welcome').style.display = 'none';
            document.getElementById('demo').classList.add('active');
            vscode.postMessage({ command: 'startDemo' });
        }

        function skip() {
            vscode.postMessage({ command: 'skip' });
        }

        function startTutorial() {
            vscode.postMessage({ command: 'startTutorial' });
        }

        // 接收演示数据
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'runDemo') {
                runComparison(message.data);
            }
        });

        async function runComparison(data) {
            const cursorTasks = document.getElementById('cursor-tasks');
            const miaodaTasks = document.getElementById('miaoda-tasks');
            const cursorTimer = document.getElementById('cursor-timer');
            const miaodaTimer = document.getElementById('miaoda-timer');

            // 渲染任务列表
            cursorTasks.innerHTML = data.cursor.tasks.map(t =>
                \`<div class="task-item" id="cursor-\${t.name}">\${t.name}</div>\`
            ).join('');

            miaodaTasks.innerHTML = data.miaoda.tasks.map(t =>
                \`<div class="task-item" id="miaoda-\${t.name}">\${t.name}</div>\`
            ).join('');

            // Cursor 串行执行
            let cursorTime = 0;
            for (const task of data.cursor.tasks) {
                const el = document.getElementById(\`cursor-\${task.name}\`);
                el.classList.add('running');

                await animateTimer(cursorTimer, cursorTime, cursorTime + task.duration);
                cursorTime += task.duration;

                el.classList.remove('running');
                el.classList.add('completed');
            }

            // Miaoda 并行执行
            const miaodaPromises = data.miaoda.tasks.map(async (task) => {
                const el = document.getElementById(\`miaoda-\${task.name}\`);
                el.classList.add('running');
                await new Promise(resolve => setTimeout(resolve, task.duration));
                el.classList.remove('running');
                el.classList.add('completed');
            });

            // 同时更新 Miaoda 计时器
            animateTimer(miaodaTimer, 0, data.miaoda.total);
            await Promise.all(miaodaPromises);

            // 显示结果
            const speedup = (data.cursor.total / data.miaoda.total).toFixed(1);
            document.getElementById('speedup').textContent = speedup;
            document.getElementById('result').style.display = 'block';
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
}

/**
 * 单例
 */
let welcomeDemoInstance: WelcomeDemo | undefined;

export function getWelcomeDemo(context: vscode.ExtensionContext): WelcomeDemo {
  if (!welcomeDemoInstance) {
    welcomeDemoInstance = new WelcomeDemo(context);
  }
  return welcomeDemoInstance;
}
