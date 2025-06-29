
// src/commands/CommandRegistry.ts
import * as vscode from 'vscode';
import { ProjectManager } from '../managers/ProjectManager';
import { BuildManager } from '../managers/BuildManager';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { SolutionExplorer } from '../ui/SolutionExplorer';
import { SolutionItem } from '../types';
import { spawn } from 'child_process';
import { PathUtils } from '../utils/PathUtils';

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
            vscode.commands.registerCommand('ue5.refreshCppConfig', () => this.refreshCppConfig(deps))
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
            await deps.buildManager.buildProject(project, configuration);
            vscode.window.showInformationMessage(`Build completed successfully (${configuration})`);
        } catch (error) {
            vscode.window.showErrorMessage('Build failed - check output for details');
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
        // Implementation for packaging project
        vscode.window.showInformationMessage('Project packaging not yet implemented');
    }

    private refreshSolutionExplorer(deps: CommandDependencies) {
        if (deps.solutionExplorer) {
            deps.solutionExplorer.refresh();
        }
    }

    private async openFile(filePath: string) {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${error}`);
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