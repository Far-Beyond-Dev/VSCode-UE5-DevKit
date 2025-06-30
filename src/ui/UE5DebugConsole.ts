// src/ui/UE5DebugConsole.ts
import * as vscode from 'vscode';
import * as path from 'path';

export class UE5DebugConsole {
    private static instance: UE5DebugConsole | null = null;
    private panel: vscode.WebviewPanel | null = null;
    private outputLines: string[] = [];
    private isEngineRunning = false;
    private currentProcess: any = null;

    private constructor(private context: vscode.ExtensionContext) {}

    public static getInstance(context: vscode.ExtensionContext): UE5DebugConsole {
        if (!UE5DebugConsole.instance) {
            UE5DebugConsole.instance = new UE5DebugConsole(context);
        }
        return UE5DebugConsole.instance;
    }

    public show(): void {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Two);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'ue5DebugConsole',
            'UE5 Engine Console',
            {
                viewColumn: vscode.ViewColumn.Two,
                preserveFocus: true
            },
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this.context.extensionUri]
            }
        );

        // Set the icon for the panel
        this.panel.iconPath = {
            light: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'unreal-black.png'),
            dark: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'unreal-white.png')
        };

        this.panel.webview.html = this.getWebviewContent();

        // Handle disposal
        this.panel.onDidDispose(() => {
            this.panel = null;
            this.stopEngine();
        });

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'clear':
                    this.clearOutput();
                    break;
                case 'stop':
                    this.stopEngine();
                    break;
                case 'restart':
                    this.restartEngine();
                    break;
                case 'saveLog':
                    this.saveLogToFile();
                    break;
            }
        });
    }

    public appendOutput(text: string, type: 'stdout' | 'stderr' | 'info' | 'error' | 'warning' = 'stdout'): void {
        const timestamp = new Date().toLocaleTimeString();
        const lines = text.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
            if (line.trim()) {
                const formattedLine = `[${timestamp}] ${line}`;
                this.outputLines.push(JSON.stringify({
                    text: formattedLine,
                    type: type,
                    timestamp: Date.now()
                }));
            }
        });

        // Keep only last 1000 lines for performance
        if (this.outputLines.length > 1000) {
            this.outputLines = this.outputLines.slice(-1000);
        }

        this.updateWebview();
    }

    public setEngineStatus(running: boolean, process?: any): void {
        this.isEngineRunning = running;
        this.currentProcess = process;
        this.updateWebview();
    }

    public clearOutput(): void {
        this.outputLines = [];
        this.updateWebview();
    }

    private stopEngine(): void {
        if (this.currentProcess) {
            try {
                this.currentProcess.kill('SIGTERM');
                this.appendOutput('🛑 Engine process terminated by user', 'info');
            } catch (error) {
                this.appendOutput(`❌ Error stopping engine: ${error}`, 'error');
            }
        }
        this.setEngineStatus(false);
    }

    private restartEngine(): void {
        this.stopEngine();
        setTimeout(() => {
            vscode.commands.executeCommand('ue5.openEngine');
        }, 1000);
    }

    private async saveLogToFile(): Promise<void> {
        try {
            const logContent = this.outputLines
                .map(line => JSON.parse(line))
                .map(entry => `${new Date(entry.timestamp).toISOString()} [${entry.type.toUpperCase()}] ${entry.text}`)
                .join('\n');

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `ue5-console-${timestamp}.log`;

            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(fileName),
                filters: {
                    'Log Files': ['log'],
                    'Text Files': ['txt'],
                    'All Files': ['*']
                }
            });

            if (uri) {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(logContent, 'utf8'));
                vscode.window.showInformationMessage(`Log saved to ${uri.fsPath}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save log: ${error}`);
        }
    }

    private updateWebview(): void {
        if (!this.panel) return;

        this.panel.webview.postMessage({
            command: 'updateOutput',
            lines: this.outputLines,
            isRunning: this.isEngineRunning
        });
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UE5 Engine Console</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            background-color: var(--vscode-panel-background);
            color: var(--vscode-foreground);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .header {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            background-color: var(--vscode-editorGroupHeader-tabsBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
            flex-shrink: 0;
        }

        .title {
            font-weight: bold;
            margin-right: 16px;
            display: flex;
            align-items: center;
        }

        .status {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin-right: 12px;
        }

        .status.running {
            background-color: #28a745;
            color: white;
        }

        .status.stopped {
            background-color: #dc3545;
            color: white;
        }

        .controls {
            display: flex;
            gap: 8px;
            margin-left: auto;
        }

        button {
            padding: 4px 12px;
            border: 1px solid var(--vscode-button-border);
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            cursor: pointer;
            border-radius: 3px;
            font-size: 12px;
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .output-container {
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .output {
            flex: 1;
            padding: 12px;
            overflow-y: auto;
            font-size: 13px;
            line-height: 1.4;
            white-space: pre-wrap;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        }

        .log-line {
            margin: 2px 0;
            padding: 2px 0;
        }

        .log-line.stdout {
            color: var(--vscode-foreground);
        }

        .log-line.stderr {
            color: #f14c4c;
        }

        .log-line.info {
            color: #4ec9b0;
        }

        .log-line.error {
            color: #f44747;
            font-weight: bold;
        }

        .log-line.warning {
            color: #ffcc02;
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--vscode-descriptionForeground);
            text-align: center;
        }

        .empty-state h3 {
            margin-bottom: 8px;
            color: var(--vscode-foreground);
        }

        .search-container {
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-editorWidget-background);
        }

        .search-input {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 3px;
            font-size: 13px;
        }

        .search-input:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }

        .highlight {
            background-color: var(--vscode-editor-findMatchHighlightBackground);
            border-radius: 2px;
        }

        /* Keyword highlighting styles */
        .keyword-error {
            color: #ff6b6b;
            font-weight: bold;
            background-color: rgba(255, 107, 107, 0.1);
            padding: 1px 2px;
            border-radius: 2px;
        }

        .keyword-warning {
            color: #ffd93d;
            font-weight: bold;
            background-color: rgba(255, 217, 61, 0.1);
            padding: 1px 2px;
            border-radius: 2px;
        }

        .keyword-success {
            color: #6bcf7f;
            font-weight: bold;
            background-color: rgba(107, 207, 127, 0.1);
            padding: 1px 2px;
            border-radius: 2px;
        }

        .keyword-info {
            color: #4dabf7;
            font-weight: bold;
            background-color: rgba(77, 171, 247, 0.1);
            padding: 1px 2px;
            border-radius: 2px;
        }

        .keyword-debug {
            color: #9c88ff;
            font-weight: bold;
            background-color: rgba(156, 136, 255, 0.1);
            padding: 1px 2px;
            border-radius: 2px;
        }

        .keyword-performance {
            color: #ff9f43;
            font-weight: bold;
            background-color: rgba(255, 159, 67, 0.1);
            padding: 1px 2px;
            border-radius: 2px;
        }

        .keyword-blueprint {
            color: #00d4aa;
            font-weight: bold;
            background-color: rgba(0, 212, 170, 0.1);
            padding: 1px 2px;
            border-radius: 2px;
        }

        .keyword-asset {
            color: #a29bfe;
            font-weight: bold;
            background-color: rgba(162, 155, 254, 0.1);
            padding: 1px 2px;
            border-radius: 2px;
        }

        .keyword-memory {
            color: #fd79a8;
            font-weight: bold;
            background-color: rgba(253, 121, 168, 0.1);
            padding: 1px 2px;
            border-radius: 2px;
        }

        .keyword-network {
            color: #55a3ff;
            font-weight: bold;
            background-color: rgba(85, 163, 255, 0.1);
            padding: 1px 2px;
            border-radius: 2px;
        }

        .footer {
            padding: 6px 12px;
            background-color: var(--vscode-statusBar-background);
            border-top: 1px solid var(--vscode-panel-border);
            font-size: 12px;
            color: var(--vscode-statusBar-foreground);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .scroll-to-bottom {
            position: absolute;
            bottom: 60px;
            right: 20px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: 1px solid var(--vscode-button-border);
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            display: none;
        }

        .scroll-to-bottom.visible {
            display: block;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">
            🎮 UE5 Engine Console
        </div>
        <div class="status stopped" id="status">STOPPED</div>
        <div class="controls">
            <button id="clearBtn" title="Clear Output">🧹 Clear</button>
            <button id="saveBtn" title="Save Log">💾 Save</button>
            <button id="stopBtn" title="Stop Engine" disabled>🛑 Stop</button>
            <button id="restartBtn" title="Restart Engine">🔄 Restart</button>
        </div>
    </div>
    
    <div class="search-container">
        <input type="text" class="search-input" id="searchInput" placeholder="Search logs... (Ctrl+F)">
    </div>

    <div class="output-container">
        <div class="output" id="output">
            <div class="empty-state">
                <h3>🚀 Ready to launch Unreal Engine</h3>
                <p>Use "UE5: Open Engine" command to start the engine and see live output here.</p>
                <p>This console provides real-time engine logs with keyword highlighting and advanced filtering.</p>
            </div>
        </div>
        <button class="scroll-to-bottom" id="scrollToBottom">⬇ Scroll to Bottom</button>
    </div>

    <div class="footer">
        <span id="lineCount">0 lines</span>
        <span id="timestamp">Ready</span>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let outputLines = [];
        let filteredLines = [];
        let searchTerm = '';
        let isRunning = false;
        let autoScroll = true;

        // Keyword highlighting patterns
        const keywordPatterns = {
            error: {
                keywords: ['error', 'failed', 'failure', 'exception', 'crash', 'critical', 'fatal', 'abort', 'assertion', 'corrupt'],
                className: 'keyword-error'
            },
            warning: {
                keywords: ['warning', 'warn', 'deprecated', 'obsolete', 'caution', 'attention', 'notice'],
                className: 'keyword-warning'
            },
            success: {
                keywords: ['success', 'successful', 'completed', 'finished', 'done', 'loaded', 'initialized', 'ready'],
                className: 'keyword-success'
            },
            info: {
                keywords: ['info', 'log', 'verbose', 'display', 'message', 'notification'],
                className: 'keyword-info'
            },
            debug: {
                keywords: ['debug', 'trace', 'breakpoint', 'step', 'inspect', 'examine'],
                className: 'keyword-debug'
            },
            performance: {
                keywords: ['fps', 'framerate', 'performance', 'optimization', 'profiler', 'benchmark', 'milliseconds', 'ms'],
                className: 'keyword-performance'
            },
            blueprint: {
                keywords: ['blueprint', 'bp_', 'graph', 'node', 'pin', 'variable', 'function', 'event'],
                className: 'keyword-blueprint'
            },
            asset: {
                keywords: ['asset', 'texture', 'material', 'mesh', 'animation', 'sound', 'uasset', 'import', 'export'],
                className: 'keyword-asset'
            },
            memory: {
                keywords: ['memory', 'allocation', 'garbage', 'gc', 'leak', 'heap', 'stack', 'mb', 'gb'],
                className: 'keyword-memory'
            },
            network: {
                keywords: ['network', 'connection', 'server', 'client', 'multiplayer', 'replication', 'rpc', 'packet'],
                className: 'keyword-network'
            }
        };

        // DOM elements
        const statusEl = document.getElementById('status');
        const outputEl = document.getElementById('output');
        const clearBtn = document.getElementById('clearBtn');
        const saveBtn = document.getElementById('saveBtn');
        const stopBtn = document.getElementById('stopBtn');
        const restartBtn = document.getElementById('restartBtn');
        const searchInput = document.getElementById('searchInput');
        const scrollToBottomBtn = document.getElementById('scrollToBottom');
        const lineCountEl = document.getElementById('lineCount');
        const timestampEl = document.getElementById('timestamp');

        // Event listeners
        clearBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'clear' });
        });

        saveBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'saveLog' });
        });

        stopBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'stop' });
        });

        restartBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'restart' });
        });

        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase();
            filterAndRenderOutput();
        });

        scrollToBottomBtn.addEventListener('click', () => {
            scrollToBottom();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                searchInput.focus();
            }
        });

        // Scroll detection
        outputEl.addEventListener('scroll', () => {
            const isAtBottom = outputEl.scrollTop + outputEl.clientHeight >= outputEl.scrollHeight - 10;
            autoScroll = isAtBottom;
            scrollToBottomBtn.classList.toggle('visible', !isAtBottom);
        });

        // Message handler
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'updateOutput':
                    outputLines = message.lines.map(line => JSON.parse(line));
                    isRunning = message.isRunning;
                    updateStatus();
                    filterAndRenderOutput();
                    break;
            }
        });

        function updateStatus() {
            if (isRunning) {
                statusEl.textContent = 'RUNNING';
                statusEl.className = 'status running';
                stopBtn.disabled = false;
            } else {
                statusEl.textContent = 'STOPPED';
                statusEl.className = 'status stopped';
                stopBtn.disabled = true;
            }
            
            timestampEl.textContent = new Date().toLocaleTimeString();
        }

        function filterAndRenderOutput() {
            if (searchTerm) {
                filteredLines = outputLines.filter(line => 
                    line.text.toLowerCase().includes(searchTerm)
                );
            } else {
                filteredLines = outputLines;
            }

            renderOutput();
            updateFooter();
        }

        function highlightKeywords(text) {
            let highlightedText = text;
            
            // Apply keyword highlighting
            Object.values(keywordPatterns).forEach(pattern => {
                pattern.keywords.forEach(keyword => {
                    const regex = new RegExp(\`\\\\b\${escapeRegex(keyword)}\\\\b\`, 'gi');
                    highlightedText = highlightedText.replace(regex, 
                        \`<span class="\${pattern.className}">\${keyword}</span>\`
                    );
                });
            });

            return highlightedText;
        }

        function renderOutput() {
            if (filteredLines.length === 0) {
                if (outputLines.length === 0) {
                    outputEl.innerHTML = \`
                        <div class="empty-state">
                            <h3>🚀 Ready to launch Unreal Engine</h3>
                            <p>Use "UE5: Open Engine" command to start the engine and see live output here.</p>
                            <p>This console provides real-time engine logs with keyword highlighting and advanced filtering.</p>
                        </div>
                    \`;
                } else {
                    outputEl.innerHTML = \`
                        <div class="empty-state">
                            <h3>🔍 No matches found</h3>
                            <p>No log lines match your search term: "\${searchTerm}"</p>
                        </div>
                    \`;
                }
                return;
            }

            const html = filteredLines.map(line => {
                let text = escapeHtml(line.text);
                
                // Apply keyword highlighting first
                text = highlightKeywords(text);
                
                // Then apply search highlighting if there's a search term
                if (searchTerm) {
                    const regex = new RegExp(\`(\${escapeRegex(searchTerm)})\`, 'gi');
                    text = text.replace(regex, '<span class="highlight">$1</span>');
                }
                
                return \`<div class="log-line \${line.type}">\${text}</div>\`;
            }).join('');

            outputEl.innerHTML = html;

            if (autoScroll) {
                scrollToBottom();
            }
        }

        function scrollToBottom() {
            outputEl.scrollTop = outputEl.scrollHeight;
            autoScroll = true;
            scrollToBottomBtn.classList.remove('visible');
        }

        function updateFooter() {
            lineCountEl.textContent = \`\${filteredLines.length} of \${outputLines.length} lines\`;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function escapeRegex(string) {
            return string.replace(/[.*+?^{}()|[\\]\\\\]/g, '\\\\$&');
        }

        // Initialize
        updateStatus();
        filterAndRenderOutput();
    </script>
</body>
</html>`;
    }
}