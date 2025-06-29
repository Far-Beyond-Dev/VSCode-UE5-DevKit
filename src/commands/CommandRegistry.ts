// src/commands/CommandRegistry.ts
import * as vscode from 'vscode';
import { ProjectManager } from '../managers/ProjectManager';
import { BuildManager } from '../managers/BuildManager';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { SolutionExplorer } from '../ui/SolutionExplorer';
import { SolutionItem, UE5Project } from '../types';
import { spawn } from 'child_process';
import { PathUtils } from '../utils/PathUtils';
import * as path from 'path';

interface CommandDependencies {
    projectManager: ProjectManager;
    buildManager: BuildManager;
    configurationManager: ConfigurationManager;
    solutionExplorer: SolutionExplorer | null;
}

export class CommandRegistry {
    registerCommands(context: vscode.ExtensionContext, deps: CommandDependencies) {
        const commands = [
            vscode.commands.registerCommand('ue5.openEngine', () => this.openEngine(deps)),
            vscode.commands.registerCommand('ue5.generateProjectFiles', () => this.generateProjectFiles(deps)),
            vscode.commands.registerCommand('ue5.buildDevelopment', () => this.buildProject(deps, 'Development')),
            vscode.commands.registerCommand('ue5.buildShipping', () => this.buildProject(deps, 'Shipping')),
            vscode.commands.registerCommand('ue5.buildDebug', () => this.buildProject(deps, 'DebugGame')),
            vscode.commands.registerCommand('ue5.cleanBuild', () => this.cleanBuild(deps)),
            vscode.commands.registerCommand('ue5.cookContent', () => this.cookContent(deps)),
            vscode.commands.registerCommand('ue5.packageProject', () => this.packageProject(deps)),
            vscode.commands.registerCommand('ue5.refreshSolutionExplorer', () => this.refreshSolutionExplorer(deps)),
            vscode.commands.registerCommand('ue5.openFile', (filePath: string) => this.openFile(filePath)),
            vscode.commands.registerCommand('ue5.buildPlugin', (item?: SolutionItem) => this.buildPlugin(deps, item)),
            vscode.commands.registerCommand('ue5.refreshCppConfig', () => this.refreshCppConfig(deps)),
            
            // Inline action commands
            vscode.commands.registerCommand('ue5.buildProjectInline', () => this.buildProject(deps, 'Development')),
            vscode.commands.registerCommand('ue5.openEngineInline', () => this.openEngine(deps)),
            vscode.commands.registerCommand('ue5.packageProjectInline', () => this.packageProject(deps)),
            vscode.commands.registerCommand('ue5.buildPluginInline', (item?: SolutionItem) => this.buildPlugin(deps, item))
        ];

        commands.forEach(command => context.subscriptions.push(command));
    }

    private async openEngine(deps: CommandDependencies) {
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
            const editorPath = PathUtils.getEditorPath(enginePath);
            const child = spawn(editorPath, [project.uprojectPath], { detached: true });
            child.unref();
            vscode.window.showInformationMessage('Unreal Engine opened successfully');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to open Unreal Engine');
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
        // Implementation for cooking content
        vscode.window.showInformationMessage('Content cooking not yet implemented');
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
        const runUATPath = PathUtils.getRunUATPath(enginePath);
        
        // Ensure output directory exists
        const fs = require('fs');
        const path = require('path');
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        // Build the UAT command for packaging
        const uatCommand = [
            `"${runUATPath}"`,
            'BuildCookRun',
            `-project="${project.uprojectPath}"`,
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
            `-archivedirectory="${outputPath}"`,
            '-utf8output'
        ].join(' ');

        console.log(`Packaging command: ${uatCommand}`);

        // Show progress with cancellation support
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Packaging ${project.name}`,
            cancellable: true
        }, async (progress, token) => {
            return new Promise<void>((resolve, reject) => {
                progress.report({ increment: 0, message: `Starting packaging for ${platform} ${configuration}...` });

                const { spawn } = require('child_process');
                const child = spawn('cmd', ['/c', uatCommand], {
                    cwd: project.path,
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let totalOutput = '';
                let currentStep = '';
                let progressValue = 0;

                // Handle cancellation
                token.onCancellationRequested(() => {
                    child.kill('SIGTERM');
                    reject(new Error('Packaging cancelled by user'));
                });

                // Parse stdout for progress
                child.stdout.on('data', (data: Buffer) => {
                    const output = data.toString();
                    totalOutput += output;
                    console.log(output);

                    // Parse progress from UAT output
                    const lines = output.split('\n');
                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        
                        // Detect different packaging phases
                        if (trimmedLine.includes('Parsing command line')) {
                            currentStep = 'Initializing...';
                            progressValue = 5;
                        } else if (trimmedLine.includes('Building') && trimmedLine.includes('Editor')) {
                            currentStep = 'Building project...';
                            progressValue = 15;
                        } else if (trimmedLine.includes('Cooking')) {
                            currentStep = 'Cooking content...';
                            progressValue = 35;
                        } else if (trimmedLine.includes('Staging')) {
                            currentStep = 'Staging files...';
                            progressValue = 70;
                        } else if (trimmedLine.includes('Creating pak file')) {
                            currentStep = 'Creating package...';
                            progressValue = 85;
                        } else if (trimmedLine.includes('Moving staged files')) {
                            currentStep = 'Finalizing...';
                            progressValue = 95;
                        }

                        // Update progress if we detected a new step
                        if (currentStep) {
                            progress.report({ 
                                increment: progressValue - (progress as any).lastValue || 0,
                                message: currentStep 
                            });
                            (progress as any).lastValue = progressValue;
                            currentStep = '';
                        }

                        // Look for specific progress indicators
                        const progressMatch = trimmedLine.match(/(\d+)%/);
                        if (progressMatch) {
                            const percent = parseInt(progressMatch[1]);
                            progress.report({ 
                                increment: percent - progressValue,
                                message: `Processing... ${percent}%`
                            });
                            progressValue = percent;
                        }
                    }
                });

                // Handle stderr
                child.stderr.on('data', (data: Buffer) => {
                    const output = data.toString();
                    totalOutput += output;
                    console.error(output);
                });

                // Handle completion
                child.on('close', (code: number) => {
                    if (code === 0) {
                        progress.report({ increment: 100, message: 'Packaging completed successfully!' });
                        
                        vscode.window.showInformationMessage(
                            `Project packaged successfully for ${platform} ${configuration}`,
                            'Open Output Folder'
                        ).then(selection => {
                            if (selection === 'Open Output Folder') {
                                vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
                            }
                        });
                        
                        resolve();
                    } else {
                        // Try to extract meaningful error from output
                        const errorLines = totalOutput.split('\n').filter(line => 
                            line.toLowerCase().includes('error') || 
                            line.toLowerCase().includes('failed')
                        );
                        
                        const errorMessage = errorLines.length > 0 
                            ? errorLines.slice(-3).join('\n') 
                            : `Packaging failed with exit code ${code}`;
                            
                        reject(new Error(errorMessage));
                    }
                });

                child.on('error', (error: Error) => {
                    reject(new Error(`Failed to start packaging process: ${error.message}`));
                });
            });
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
        const path = require('path');
        
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