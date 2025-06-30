// src/commands/CommandRegistry.ts - Updated openEngine methods
import * as vscode from 'vscode';
import { ProjectManager } from '../managers/ProjectManager';
import { BuildManager } from '../managers/BuildManager';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { SolutionExplorer } from '../ui/SolutionExplorer';
import { UE5DebugConsole } from '../ui/UE5DebugConsole';
import { SolutionItem, UE5Project } from '../types';
import execa = require("execa")
import { PathUtils } from '../utils/PathUtils';
const path = require('path');

interface CommandDependencies {
    projectManager: ProjectManager;
    buildManager: BuildManager;
    configurationManager: ConfigurationManager;
    solutionExplorer: SolutionExplorer | null;
}

export class CommandRegistry {
    private debugConsole: UE5DebugConsole | null = null;

    registerCommands(context: vscode.ExtensionContext, deps: CommandDependencies) {
        console.log('🔧 Registering UE5 commands...');
        
        // Initialize debug console
        this.debugConsole = UE5DebugConsole.getInstance(context);
        
        const commands = [
            // Main engine commands
            vscode.commands.registerCommand('ue5.openEngine', async () => {
                console.log('🚀 Executing ue5.openEngine command');
                await this.openEngine(deps);
            }),
            vscode.commands.registerCommand('ue5.showEngineOutput', () => {
                console.log('📋 Executing ue5.showEngineOutput command');
                this.showEngineOutput();
            }),
            vscode.commands.registerCommand('ue5.clearEngineOutput', () => {
                console.log('🧹 Executing ue5.clearEngineOutput command');
                this.clearEngineOutput();
            }),
            vscode.commands.registerCommand('ue5.openEngineLogFile', async () => {
                console.log('📄 Executing ue5.openEngineLogFile command');
                await this.openEngineLogFile(deps);
            }),
            
            // Project management commands
            vscode.commands.registerCommand('ue5.generateProjectFiles', async () => {
                console.log('📁 Executing ue5.generateProjectFiles command');
                await this.generateProjectFiles(deps);
            }),
            
            // Build commands
            vscode.commands.registerCommand('ue5.buildDevelopment', async () => {
                console.log('🔨 Executing ue5.buildDevelopment command');
                await this.buildProject(deps, 'Development');
            }),
            vscode.commands.registerCommand('ue5.buildShipping', async () => {
                console.log('🚢 Executing ue5.buildShipping command');
                await this.buildProject(deps, 'Shipping');
            }),
            vscode.commands.registerCommand('ue5.buildDebug', async () => {
                console.log('🐛 Executing ue5.buildDebug command');
                await this.buildProject(deps, 'DebugGame');
            }),
            vscode.commands.registerCommand('ue5.cleanBuild', async () => {
                console.log('🗑️ Executing ue5.cleanBuild command');
                await this.cleanBuild(deps);
            }),
            
            // Packaging and content commands
            vscode.commands.registerCommand('ue5.cookContent', async () => {
                console.log('🍳 Executing ue5.cookContent command');
                await this.cookContent(deps);
            }),
            vscode.commands.registerCommand('ue5.packageProject', async () => {
                console.log('📦 Executing ue5.packageProject command');
                await this.packageProject(deps);
            }),
            
            // UI and navigation commands
            vscode.commands.registerCommand('ue5.refreshSolutionExplorer', () => {
                console.log('🔄 Executing ue5.refreshSolutionExplorer command');
                this.refreshSolutionExplorer(deps);
            }),
            vscode.commands.registerCommand('ue5.openFile', async (filePath: string) => {
                console.log('📂 Executing ue5.openFile command:', filePath);
                await this.openFile(filePath);
            }),
            vscode.commands.registerCommand('ue5.buildPlugin', async (item?: SolutionItem) => {
                console.log('🔌 Executing ue5.buildPlugin command');
                await this.buildPlugin(deps, item);
            }),
            vscode.commands.registerCommand('ue5.refreshCppConfig', async () => {
                console.log('⚙️ Executing ue5.refreshCppConfig command');
                await this.refreshCppConfig(deps);
            }),

            // Inline action commands (used by UI elements)
            vscode.commands.registerCommand('ue5.buildProjectInline', async () => {
                console.log('🔨 Executing ue5.buildProjectInline command');
                await this.buildProject(deps, 'Development');
            }),
            vscode.commands.registerCommand('ue5.openEngineInline', async () => {
                console.log('🚀 Executing ue5.openEngineInline command');
                await this.openEngine(deps);
            }),
            vscode.commands.registerCommand('ue5.packageProjectInline', async () => {
                console.log('📦 Executing ue5.packageProjectInline command');
                await this.packageProject(deps);
            }),
            vscode.commands.registerCommand('ue5.buildPluginInline', async (item?: SolutionItem) => {
                console.log('🔌 Executing ue5.buildPluginInline command');
                await this.buildPlugin(deps, item);
            })
        ];

        // Register all commands and add to subscriptions
        commands.forEach((command, index) => {
            if (command) {
                context.subscriptions.push(command);
                console.log(`✅ Registered command ${index + 1}/${commands.length}`);
            } else {
                console.error(`❌ Failed to register command at index ${index}`);
            }
        });

        console.log(`🎉 Successfully registered ${commands.length} UE5 commands`);
        
        // Verify command registration
        this.verifyCommandRegistration();
    }

    private async verifyCommandRegistration() {
        try {
            const allCommands = await vscode.commands.getCommands(true);
            const ue5Commands = allCommands.filter(cmd => cmd.startsWith('ue5.'));
            console.log('🔍 Registered UE5 commands:', ue5Commands);
            
            if (ue5Commands.length === 0) {
                console.error('❌ No UE5 commands found in registered commands list!');
            } else {
                console.log(`✅ Found ${ue5Commands.length} registered UE5 commands`);
            }
        } catch (error) {
            console.error('❌ Error verifying command registration:', error);
        }
    }

    private showEngineOutput() {
        if (this.debugConsole) {
            this.debugConsole.show();
            vscode.window.showInformationMessage('UE5 Engine Console displayed');
        }
    }

    private clearEngineOutput() {
        if (this.debugConsole) {
            this.debugConsole.clearOutput();
            vscode.window.showInformationMessage('UE5 Engine Console cleared');
        }
    }

    private async openEngineLogFile(deps: CommandDependencies) {
        try {
            const project = await deps.projectManager.detectProject();
            if (!project) {
                vscode.window.showErrorMessage('No UE5 project detected');
                return;
            }

            // Common UE5 log file locations
            const logPaths = [
                path.join(project.path, 'Saved', 'Logs', `${project.name}.log`),
                path.join(project.path, 'Saved', 'Logs', 'UnrealEditor.log'),
                path.join(project.path, 'Saved', 'Logs', 'UnrealEditor-Win64-Development.log'),
                path.join(process.env.LOCALAPPDATA || '', 'UnrealEngine', 'Common', 'Logs', 'UnrealEditor.log')
            ];

            const fs = require('fs');
            let foundLogPath: string | null = null;

            for (const logPath of logPaths) {
                if (fs.existsSync(logPath)) {
                    foundLogPath = logPath;
                    break;
                }
            }

            if (foundLogPath) {
                try {
                    const document = await vscode.workspace.openTextDocument(foundLogPath);
                    await vscode.window.showTextDocument(document);
                    
                    // Scroll to the end of the document
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        const lastLine = editor.document.lineCount - 1;
                        const range = new vscode.Range(lastLine, 0, lastLine, 0);
                        editor.revealRange(range);
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to open log file: ${error}`);
                }
            } else {
                // Show quick pick of available log files
                const savedLogsDir = path.join(project.path, 'Saved', 'Logs');
                if (fs.existsSync(savedLogsDir)) {
                    try {
                        const logFiles = fs.readdirSync(savedLogsDir)
                            .filter((file: string) => file.endsWith('.log'))
                            .map((file: string) => ({
                                label: file,
                                description: path.join(savedLogsDir, file),
                                path: path.join(savedLogsDir, file)
                            }));

                        if (logFiles.length > 0) {
                            const selected = await vscode.window.showQuickPick(
                                logFiles.map((f: { path: any; }) => f.path),
                                { placeHolder: 'Select a log file to open' }
                            );

                            if (selected) {
                                const document = await vscode.workspace.openTextDocument(selected);
                                await vscode.window.showTextDocument(document);
                            }
                        } else {
                            vscode.window.showInformationMessage('No log files found. Try running the engine first.');
                        }
                    } catch (error) {
                        vscode.window.showErrorMessage(`Error reading logs directory: ${error}`);
                    }
                } else {
                    vscode.window.showInformationMessage('No logs directory found. Try running the engine first.');
                }
            }
        } catch (error) {
            console.error('Error in openEngineLogFile:', error);
            vscode.window.showErrorMessage(`Failed to open engine log file: ${error}`);
        }
    }

    // BULLETPROOF COMMAND EXECUTOR using EXECA - handles ALL path/space/platform issues
    private async executeCommand(
        command: string,
        args: string[],
        options: {
            cwd?: string;
            env?: NodeJS.ProcessEnv;
            timeout?: number;
            detached?: boolean;
        } = {}
    ): Promise<{ stdout: string; stderr: string; code: number }> {
        try {
            const subprocess = execa(command, args, {
                cwd: options.cwd,
                env: options.env || process.env,
                timeout: options.timeout,
                stdio: options.detached ? 'ignore' : 'pipe',
                windowsHide: true,
                detached: options.detached || false
            });

            if (options.detached) {
                subprocess.unref();
                return { stdout: '', stderr: '', code: 0 };
            }

            const result = await subprocess;
            return { 
                stdout: result.stdout ?? '', 
                stderr: result.stderr ?? '', 
                code: result.exitCode || 0 
            };
        } catch (error: any) {
            return { 
                stdout: error.stdout || '', 
                stderr: error.stderr || error.message, 
                code: error.exitCode || 1 
            };
        }
    }

    // Enhanced executeCommand method that streams output to debug console
    private async executeCommandWithDebugConsole(
        command: string,
        args: string[],
        options: {
            cwd?: string;
            env?: NodeJS.ProcessEnv;
            timeout?: number;
        } = {}
    ): Promise<{ stdout: string; stderr: string; code: number; process: any }> {
        return new Promise((resolve, reject) => {
            console.log(`🚀 Executing: ${command} ${args.join(' ')}`);
            
            const subprocess = execa(command, args, {
                cwd: options.cwd,
                env: options.env || process.env,
                timeout: options.timeout,
                stdio: 'pipe',
                windowsHide: true
            });

            let stdout = '';
            let stderr = '';

            // Set engine as running in debug console
            if (this.debugConsole) {
                this.debugConsole.setEngineStatus(true, subprocess);
                this.debugConsole.appendOutput(`🚀 Starting Unreal Engine...`, 'info');
                this.debugConsole.appendOutput(`📋 Command: ${command}`, 'info');
                this.debugConsole.appendOutput(`📋 Arguments: ${args.join(' ')}`, 'info');
                this.debugConsole.appendOutput(`📂 Working Directory: ${options.cwd || process.cwd()}`, 'info');
                this.debugConsole.appendOutput('━'.repeat(80), 'info');
            }

            if (subprocess.stdout) {
                subprocess.stdout.on('data', (data: Buffer) => {
                    const text = data.toString();
                    stdout += text;
                    
                    // Stream to debug console
                    if (this.debugConsole) {
                        this.debugConsole.appendOutput(text, 'stdout');
                    }
                });
            }

            if (subprocess.stderr) {
                subprocess.stderr.on('data', (data: Buffer) => {
                    const text = data.toString();
                    stderr += text;
                    
                    // Stream to debug console with appropriate type
                    if (this.debugConsole) {
                        const isError = text.toLowerCase().includes('error') && !text.toLowerCase().includes('warning');
                        const isWarning = text.toLowerCase().includes('warning');
                        const type = isError ? 'error' : isWarning ? 'warning' : 'stderr';
                        this.debugConsole.appendOutput(text, type);
                    }
                });
            }

            subprocess.then((result) => {
                console.log(`✅ Process completed with exit code: ${result.exitCode}`);
                
                if (this.debugConsole) {
                    this.debugConsole.appendOutput('━'.repeat(80), 'info');
                    this.debugConsole.appendOutput(`✅ Process completed with exit code: ${result.exitCode || 0}`, 'info');
                    this.debugConsole.setEngineStatus(false);
                }

                resolve({
                    stdout,
                    stderr,
                    code: result.exitCode || 0,
                    process: subprocess
                });
            }).catch((error) => {
                console.log(`❌ Process failed:`, error);
                
                if (this.debugConsole) {
                    this.debugConsole.appendOutput('━'.repeat(80), 'error');
                    this.debugConsole.appendOutput(`❌ Process failed with exit code: ${error.exitCode || 1}`, 'error');
                    if (error.message) {
                        this.debugConsole.appendOutput(`Error: ${error.message}`, 'error');
                    }
                    this.debugConsole.setEngineStatus(false);
                }

                resolve({
                    stdout,
                    stderr,
                    code: error.exitCode || 1,
                    process: subprocess
                });
            });
        });
    }

    private async openEngine(deps: CommandDependencies) {
        try {
            console.log('🚀 Starting openEngine command execution...');
            
            const project = await deps.projectManager.detectProject();
            if (!project) {
                const errorMsg = 'No UE5 project detected in current workspace';
                console.error(`❌ ${errorMsg}`);
                vscode.window.showErrorMessage(errorMsg);
                return;
            }

            console.log(`✅ UE5 project detected: ${project.name} at ${project.path}`);

            const enginePath = PathUtils.getEnginePath();
            if (!enginePath) {
                const errorMsg = 'Engine path not configured. Please set ue5.enginePath in settings.';
                console.error(`❌ ${errorMsg}`);
                vscode.window.showErrorMessage(errorMsg);
                return;
            }

            console.log(`✅ Engine path found: ${enginePath}`);

            const editorPath = PathUtils.getEditorPath(enginePath);
            console.log(`✅ Editor path: ${editorPath}`);

            // Show debug console
            if (this.debugConsole) {
                this.debugConsole.show();
            }

            const config = vscode.workspace.getConfiguration('ue5');
            
            // Get configuration options
            const loggingLevel = config.get<string>('engineLoggingLevel', 'Normal');
            const customArgs = config.get<string[]>('engineLaunchArgs', ['-log', '-stdout']);

            console.log(`⚙️ Configuration: level=${loggingLevel}`);

            // Prepare launch arguments based on logging level
            const launchArgs = [project.uprojectPath, ...customArgs];
            
            switch (loggingLevel) {
                case 'Minimal':
                    launchArgs.push('-silent');
                    break;
                case 'Verbose':
                    launchArgs.push('-verbose');
                    break;
                case 'VeryVerbose':
                    launchArgs.push('-verbose', '-veryverbose');
                    break;
                default: // Normal
                    break;
            }

            console.log(`📋 Launch arguments: ${launchArgs.join(' ')}`);

            // Launch engine with debug console streaming
            const result = await this.executeCommandWithDebugConsole(
                editorPath,
                launchArgs,
                {
                    cwd: project.path,
                    env: {
                        ...process.env,
                        // Ensure proper environment for UE5
                        PATH: process.env.PATH + `;${PathUtils.getEngineBinariesPath(enginePath)}`
                    }
                }
            );

            console.log('✅ Engine launch process completed successfully');

            // Show completion notification
            if (result.code === 0) {
                vscode.window.showInformationMessage(
                    'Unreal Engine session completed successfully',
                    'Show Console',
                    'Open Log File'
                ).then(selection => {
                    switch (selection) {
                        case 'Show Console':
                            if (this.debugConsole) {
                                this.debugConsole.show();
                            }
                            break;
                        case 'Open Log File':
                            vscode.commands.executeCommand('ue5.openEngineLogFile');
                            break;
                    }
                });
            } else {
                vscode.window.showWarningMessage(
                    `Engine process exited with code: ${result.code}`,
                    'Show Console',
                    'Open Log File'
                ).then(selection => {
                    switch (selection) {
                        case 'Show Console':
                            if (this.debugConsole) {
                                this.debugConsole.show();
                            }
                            break;
                        case 'Open Log File':
                            vscode.commands.executeCommand('ue5.openEngineLogFile');
                            break;
                    }
                });
            }

        } catch (error: any) {
            const errorMsg = `Failed to open Unreal Engine: ${error.message}`;
            console.error(`❌ ${errorMsg}`, error);
            
            if (this.debugConsole) {
                this.debugConsole.appendOutput(`❌ Launch failed: ${error.message}`, 'error');
                this.debugConsole.setEngineStatus(false);
            }
            
            vscode.window.showErrorMessage(errorMsg);
        }
    }

    private async generateProjectFiles(deps: CommandDependencies) {
        const project = await deps.projectManager.detectProject();
        if (!project) {
            vscode.window.showErrorMessage('No UE5 project detected');
            return;
        }

        try {
            await deps.buildManager.generateProjectFiles(project);
            await deps.configurationManager.setupCppEnvironment(project);
            vscode.window.showInformationMessage('Project files generated successfully');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to generate project files - check output for details');
        }
    }

    private async buildProject(deps: CommandDependencies, configuration: string) {
        const project = await deps.projectManager.detectProject();
        if (!project) {
            vscode.window.showErrorMessage('No UE5 project detected');
            return;
        }

        try {
            const result = await deps.buildManager.buildProject(project, configuration);
            vscode.window.showInformationMessage(`Build completed successfully (${configuration})`);
        } catch (error: any) {
            console.log(`Build failed: ${error.message}`);
            if (error.stdout) {
                console.log(`Build output: ${error.stdout}`);
            }
            if (error.stderr) {
                console.log(`Build errors: ${error.stderr}`);
            }

            // Show more detailed error message
            const errorDetails = error.stderr || error.stdout || error.message || 'Unknown error';
            vscode.window.showErrorMessage(`Build failed: ${errorDetails.substring(0, 200)}...`);
        }
    }

    private async cleanBuild(deps: CommandDependencies) {
        const project = await deps.projectManager.detectProject();
        if (!project) {
            vscode.window.showErrorMessage('No UE5 project detected');
            return;
        }

        try {
            await this.deleteBuildFolders(project.path);
            vscode.window.showInformationMessage('Clean completed successfully');
        } catch (error) {
            vscode.window.showErrorMessage('Clean failed');
        }
    }

    private async cookContent(deps: CommandDependencies) {
        const project = await deps.projectManager.detectProject();
        if (!project) {
            vscode.window.showErrorMessage('No UE5 project detected');
            return;
        }

        const enginePath = PathUtils.getEnginePath();
        if (!enginePath) {
            vscode.window.showErrorMessage('Engine path not configured. Please set ue5.enginePath in settings.');
            return;
        }

        try {
            const runUATPath = PathUtils.getRunUATPath(enginePath);
            const args = [
                'BuildCookRun',
                `-project=${project.uprojectPath}`,
                '-cook',
                '-allmaps',
                '-unversioned',
                '-pak',
                '-compressed',
                '-stage',
                '-noP4'
            ];

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Cooking Content',
                cancellable: true
            }, async (progress, token) => {
                progress.report({ increment: 0, message: 'Starting content cooking...' });

                const result = await this.executeCommand(runUATPath, args, {
                    cwd: project.path,
                    timeout: 30 * 60 * 1000 // 30 minutes timeout
                });

                if (result.code === 0) {
                    vscode.window.showInformationMessage('Content cooking completed successfully');
                } else {
                    throw new Error(`Cooking failed with exit code ${result.code}: ${result.stderr}`);
                }
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(`Content cooking failed: ${error.message}`);
        }
    }

    private async packageProject(deps: CommandDependencies) {
        const project = await deps.projectManager.detectProject();
        if (!project) {
            vscode.window.showErrorMessage('No UE5 project detected');
            return;
        }

        const enginePath = PathUtils.getEnginePath();
        if (!enginePath) {
            vscode.window.showErrorMessage('Engine path not configured. Please set ue5.enginePath in settings.');
            return;
        }

        try {
            // Show platform selection
            const platforms = [
                { label: 'Windows 64-bit', value: 'Win64' },
                { label: 'Windows 32-bit', value: 'Win32' },
                { label: 'Linux', value: 'Linux' },
                { label: 'Mac', value: 'Mac' },
                { label: 'Android', value: 'Android' },
                { label: 'iOS', value: 'IOS' }
            ];

            const selectedPlatformItem = await vscode.window.showQuickPick(platforms, {
                placeHolder: 'Select target platform'
            });

            if (!selectedPlatformItem) return;
            const selectedPlatform = selectedPlatformItem.value;

            // Show configuration selection
            const configurations = [
                { label: 'Development - Debug symbols, some optimizations', value: 'Development' },
                { label: 'Shipping - Full optimizations, no debug info', value: 'Shipping' },
                { label: 'Test - Optimized with some debugging features', value: 'Test' }
            ];

            const selectedConfigItem = await vscode.window.showQuickPick(configurations, {
                placeHolder: 'Select build configuration'
            });

            if (!selectedConfigItem) return;
            const selectedConfig = selectedConfigItem.value;

            // Get output directory
            const defaultOutputPath = path.join(project.path, 'Packaged', `${selectedPlatform}_${selectedConfig}`);
            const outputPath = await vscode.window.showInputBox({
                prompt: 'Enter output directory for packaged project',
                value: defaultOutputPath,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Output path cannot be empty';
                    }
                    return null;
                }
            });

            if (!outputPath) return;

            // Start packaging with progress
            await this.executePackaging(project, enginePath, selectedPlatform, selectedConfig, outputPath);

        } catch (error: any) {
            vscode.window.showErrorMessage(`Packaging failed: ${error.message}`);
        }
    }

    private async executePackaging(
        project: UE5Project,
        enginePath: string,
        platform: string,
        configuration: string,
        outputPath: string
    ): Promise<void> {
        // Basic implementation - you can expand this with the full packaging logic
        const runUATPath = PathUtils.getRunUATPath(enginePath);
        const fs = require('fs');

        if (!fs.existsSync(runUATPath)) {
            throw new Error(`RunUAT.bat not found at: ${runUATPath}`);
        }

        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        const uatArgs = [
            'BuildCookRun',
            `-project=${project.uprojectPath}`,
            '-noP4',
            `-platform=${platform}`,
            `-clientconfig=${configuration}`,
            `-serverconfig=${configuration}`,
            '-cook',
            '-allmaps',
            '-build',
            '-stage',
            '-pak',
            '-archive',
            `-archivedirectory=${outputPath}`,
            '-utf8output',
            '-unattended',
            '-noxge'
        ];

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Packaging ${project.name}`,
            cancellable: true
        }, async (progress, token) => {
            progress.report({ increment: 0, message: `Starting packaging for ${platform} ${configuration}...` });
            
            const result = await this.executeCommand(runUATPath, uatArgs, {
                cwd: project.path,
                timeout: 60 * 60 * 1000 // 1 hour timeout
            });

            if (result.code === 0) {
                vscode.window.showInformationMessage(
                    `Project packaged successfully for ${platform} ${configuration}`,
                    'Open Output Folder'
                ).then(selection => {
                    if (selection === 'Open Output Folder') {
                        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
                    }
                });
            } else {
                throw new Error(`Packaging failed with exit code ${result.code}`);
            }
        });
    }

    private refreshSolutionExplorer(deps: CommandDependencies) {
        if (deps.solutionExplorer) {
            deps.solutionExplorer.refresh();
        }
    }

    private async openFile(filePath: string) {
        // Handle special action files
        if (filePath.includes('#')) {
            const [basePath, action] = filePath.split('#');
            await this.handleUIAction(action, basePath);
            return;
        }

        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${error}`);
        }
    }

    private async handleUIAction(action: string, path: string) {
        switch (action) {
            case 'build':
                await vscode.commands.executeCommand('ue5.buildDevelopment');
                break;
            case 'open':
                await vscode.commands.executeCommand('ue5.openEngine');
                break;
            case 'package':
                await vscode.commands.executeCommand('ue5.packageProject');
                break;
            case 'buildPlugin':
                // Extract plugin name from path and build
                const pluginName = path.split('\\').pop() || path.split('/').pop();
                vscode.window.showInformationMessage(`Building plugin: ${pluginName}`);
                await vscode.commands.executeCommand('ue5.buildDevelopment');
                break;
            default:
                vscode.window.showWarningMessage(`Unknown action: ${action}`);
        }
    }

    private async buildPlugin(deps: CommandDependencies, item?: SolutionItem) {
        if (!item || item.type !== 'plugin') {
            vscode.window.showErrorMessage('Please select a buildable plugin');
            return;
        }

        if (!item.buildable) {
            vscode.window.showErrorMessage('This plugin does not have buildable source code');
            return;
        }

        // For now, just build the whole project which includes plugins
        await this.buildProject(deps, 'Development');
    }

    private async refreshCppConfig(deps: CommandDependencies) {
        const project = await deps.projectManager.detectProject();
        if (!project) {
            vscode.window.showErrorMessage('No UE5 project detected');
            return;
        }

        try {
            await deps.configurationManager.setupCppEnvironment(project);
            vscode.window.showInformationMessage('C++ configuration refreshed');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to refresh C++ configuration');
        }
    }

    private async deleteBuildFolders(projectPath: string) {
        const fs = require('fs').promises;

        const foldersToClean = ['Binaries', 'Intermediate', 'Saved'];

        for (const folder of foldersToClean) {
            const folderPath = path.join(projectPath, folder);
            try {
                await fs.rmdir(folderPath, { recursive: true });
            } catch (error) {
                // Folder might not exist, that's okay
            }
        }
    }
}