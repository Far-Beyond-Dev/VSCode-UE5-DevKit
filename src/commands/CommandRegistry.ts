// src/commands/CommandRegistry.ts
import * as vscode from 'vscode';
import { ProjectManager } from '../managers/ProjectManager';
import { BuildManager } from '../managers/BuildManager';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { SolutionExplorer } from '../ui/SolutionExplorer';
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
                // Execa automatically handles:
                // - Windows batch files (.bat, .cmd)
                // - Paths with spaces and special characters
                // - OneDrive virtual paths
                // - Cross-platform differences
                // - Proper escaping and quoting
                // - Unicode characters in paths
                // - Network paths
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
            
            // Execa handles all path complexities automatically
            await this.executeCommand(editorPath, [project.uprojectPath], {
                cwd: project.path,
                detached: true
            });

            vscode.window.showInformationMessage('Unreal Engine opened successfully');
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to open Unreal Engine: ${error.message}`);
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
        const runUATPath = PathUtils.getRunUATPath(enginePath);
        const fs = require('fs');

        // Validate prerequisites
        if (!fs.existsSync(runUATPath)) {
            throw new Error(`RunUAT.bat not found at: ${runUATPath}`);
        }

        // Ensure output directory exists
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        // Check if project needs to be built first
        const projectBinariesPath = path.join(project.path, 'Binaries');
        if (!fs.existsSync(projectBinariesPath)) {
            const shouldBuild = await vscode.window.showWarningMessage(
                'Project binaries not found. The project needs to be built before packaging.',
                'Build and Package',
                'Package Anyway',
                'Cancel'
            );

            if (shouldBuild === 'Cancel') {
                return;
            } else if (shouldBuild === 'Build and Package') {
                vscode.window.showInformationMessage('Building project first...');
                try {
                    await vscode.commands.executeCommand('ue5.buildDevelopment');
                } catch (buildError) {
                    throw new Error('Failed to build project before packaging');
                }
            }
        }

        // Build the UAT command arguments
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

        console.log(`Packaging command: "${runUATPath}" ${uatArgs.join(' ')}`);

        // Show progress with cancellation support
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Packaging ${project.name}`,
            cancellable: true
        }, async (progress, token) => {
            return new Promise<void>((resolve, reject) => {
                progress.report({ increment: 0, message: `Starting packaging for ${platform} ${configuration}...` });

                // Use execa for bulletproof command execution
                const subprocess = execa(runUATPath, uatArgs, {
                    cwd: project.path,
                    env: {
                        ...process.env,
                        PATH: process.env.PATH + (process.platform === 'win32' 
                            ? `;${path.join(enginePath, 'Engine', 'Binaries', 'Win64')}`
                            : `:${path.join(enginePath, 'Engine', 'Binaries', 'ThirdParty')}`
                        )
                    },
                    stdio: 'pipe',
                    windowsHide: true
                });

                let totalOutput = '';
                let totalError = '';
                let currentStep = '';
                let progressValue = 0;
                let lastProgressUpdate = 0;

                // Handle cancellation
                token.onCancellationRequested(() => {
                    subprocess.kill('SIGTERM');
                    reject(new Error('Packaging cancelled by user'));
                });

                // Parse stdout for progress
                if (subprocess.stdout) {
                    subprocess.stdout.on('data', (data: Buffer) => {
                        const output = data.toString();
                        totalOutput += output;
                        console.log(output);

                        // Parse progress from UAT output
                        const lines = output.split('\n');
                        for (const line of lines) {
                            const trimmedLine = line.trim();

                            // Detect different packaging phases
                            if (trimmedLine.includes('Parsing command line') || trimmedLine.includes('Setting up command environment')) {
                                currentStep = 'Initializing...';
                                progressValue = 5;
                            } else if (trimmedLine.includes('Compiling') || (trimmedLine.includes('Building') && trimmedLine.includes('Editor'))) {
                                currentStep = 'Building project...';
                                progressValue = 15;
                            } else if (trimmedLine.includes('Cook by the book') || trimmedLine.includes('Cooking') || trimmedLine.includes('LogCook:')) {
                                currentStep = 'Cooking content...';
                                progressValue = 35;
                            } else if (trimmedLine.includes('Staging files') || trimmedLine.includes('***** STAGE COMMAND STARTED')) {
                                currentStep = 'Staging files...';
                                progressValue = 70;
                            } else if (trimmedLine.includes('Creating pak file') || trimmedLine.includes('UnrealPak')) {
                                currentStep = 'Creating package...';
                                progressValue = 85;
                            } else if (trimmedLine.includes('Moving staged files') || trimmedLine.includes('***** ARCHIVE COMMAND STARTED')) {
                                currentStep = 'Finalizing...';
                                progressValue = 95;
                            } else if (trimmedLine.includes('BUILD SUCCESSFUL') || trimmedLine.includes('AutomationTool exiting with ExitCode=0')) {
                                currentStep = 'Completed!';
                                progressValue = 100;
                            }

                            // Update progress if we detected a new step
                            if (currentStep && progressValue > lastProgressUpdate) {
                                progress.report({
                                    increment: progressValue - lastProgressUpdate,
                                    message: currentStep
                                });
                                lastProgressUpdate = progressValue;
                                currentStep = '';
                            }

                            // Look for specific progress indicators
                            const progressMatch = trimmedLine.match(/(\d+)%/);
                            if (progressMatch) {
                                const percent = parseInt(progressMatch[1]);
                                if (percent > lastProgressUpdate) {
                                    progress.report({
                                        increment: percent - lastProgressUpdate,
                                        message: `Processing... ${percent}%`
                                    });
                                    lastProgressUpdate = percent;
                                }
                            }
                        }
                    });
                }

                // Handle stderr
                if (subprocess.stderr) {
                    subprocess.stderr.on('data', (data: Buffer) => {
                        const output = data.toString();
                        totalError += output;
                        console.error(output);

                        // Check for common errors
                        if (output.toLowerCase().includes('error') && !output.toLowerCase().includes('warning')) {
                            progress.report({ message: `Error detected: ${output.substring(0, 50)}...` });
                        }
                    });
                }

                // Handle completion using execa's promise
                subprocess.then((result) => {
                    console.log(`UAT process completed successfully`);
                    console.log('Full stdout:', totalOutput);
                    
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
                }).catch((error: any) => {
                    console.log(`UAT process failed with error:`, error);
                    console.log('Full stdout:', totalOutput);
                    console.log('Full stderr:', totalError);

                    // Enhanced error analysis
                    const allOutput = totalOutput + '\n' + totalError + '\n' + (error.stderr || '') + '\n' + (error.stdout || '');
                    let errorMessage = `Packaging failed with exit code ${error.exitCode || 'unknown'}`;

                    // Look for specific error patterns
                    if (allOutput.includes('Could not find') && allOutput.includes('.uproject')) {
                        errorMessage = 'Project file not found or invalid path';
                    } else if (allOutput.includes('Visual Studio') || allOutput.includes('MSVC')) {
                        errorMessage = 'Visual Studio build tools not found. Install Visual Studio 2022 with C++ tools.';
                    } else if (allOutput.includes('Windows SDK')) {
                        errorMessage = 'Windows SDK not found. Install Windows 10/11 SDK.';
                    } else if (allOutput.includes('UnrealBuildTool') && allOutput.includes('failed')) {
                        errorMessage = 'Build failed. Try building the project in Development configuration first.';
                    } else if (allOutput.includes('Cook') && allOutput.includes('failed')) {
                        errorMessage = 'Content cooking failed. Check for corrupted assets or invalid references.';
                    } else if (allOutput.includes('AutomationTool') && allOutput.includes('exception')) {
                        errorMessage = 'UAT automation tool encountered an internal error';
                    } else if (error.message && error.message.includes('ENOENT')) {
                        errorMessage = 'RunUAT.bat not found. Check your engine path configuration.';
                    } else {
                        // Try to extract the last few error lines
                        const errorLines = allOutput.split('\n').filter(line =>
                            line.toLowerCase().includes('error') &&
                            !line.toLowerCase().includes('warning') &&
                            line.trim().length > 0
                        );

                        if (errorLines.length > 0) {
                            errorMessage = errorLines.slice(-2).join('\n');
                        }
                    }

                    // Show detailed error with option to view full log
                    vscode.window.showErrorMessage(
                        errorMessage,
                        'View Full Log'
                    ).then(selection => {
                        if (selection === 'View Full Log') {
                            // Create a new untitled document with the full log
                            vscode.workspace.openTextDocument({
                                content: `UAT Packaging Log (Execa)\n${'='.repeat(50)}\n\nCommand: "${runUATPath}" ${uatArgs.join(' ')}\n\nExit Code: ${error.exitCode || 'unknown'}\n\nStdout:\n${totalOutput}\n\nStderr:\n${totalError}\n\nError Object:\n${JSON.stringify(error, null, 2)}`,
                                language: 'log'
                            }).then(doc => {
                                vscode.window.showTextDocument(doc);
                            });
                        }
                    });

                    reject(new Error(errorMessage));
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