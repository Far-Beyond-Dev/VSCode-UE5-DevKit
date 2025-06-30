// src/core/UE5DevTools.ts - Updated main class
import * as vscode from 'vscode';
import { ProjectManager } from '../managers/ProjectManager';
import { BuildManager } from '../managers/BuildManager';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { SolutionExplorer } from '../ui/SolutionExplorer';
import { UE5DebugConsole } from '../ui/UE5DebugConsole';
import { CommandRegistry } from '../commands/CommandRegistry';
import { UE5Project } from '../types';

export class UE5DevTools {
    private projectManager: ProjectManager;
    private buildManager: BuildManager;
    private configurationManager: ConfigurationManager;
    private solutionExplorer: SolutionExplorer | null = null;
    private debugConsole: UE5DebugConsole | null = null;
    private commandRegistry: CommandRegistry;
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('UE5 Dev Tools');
        this.projectManager = new ProjectManager(this.outputChannel);
        this.buildManager = new BuildManager(this.outputChannel);
        this.configurationManager = new ConfigurationManager(this.outputChannel);
        this.commandRegistry = new CommandRegistry();
    }

    async initialize(context: vscode.ExtensionContext) {
        try {
            console.log('🔧 Initializing UE5 Development Tools...');
            
            // Initialize debug console early
            this.debugConsole = UE5DebugConsole.getInstance(context);
            console.log('✅ Debug console initialized');

            // Always register commands first (regardless of project detection)
            this.commandRegistry.registerCommands(context, {
                projectManager: this.projectManager,
                buildManager: this.buildManager,
                configurationManager: this.configurationManager,
                solutionExplorer: this.solutionExplorer
            });
            console.log('✅ Commands registered');

            const project = await this.projectManager.detectProject();
            
            if (project) {
                await this.setupProject(project, context);
            } else {
                console.log('ℹ️  No UE5 project detected in current workspace');
                // Set context to false so UE5-specific UI elements are hidden
                await vscode.commands.executeCommand('setContext', 'ue5.projectDetected', false);
            }

            console.log('🎉 UE5 Development Tools initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize UE5 Development Tools:', error);
            vscode.window.showErrorMessage(`Failed to initialize UE5 Development Tools: ${error}`);
        }
    }

    private async setupProject(project: UE5Project, context: vscode.ExtensionContext) {
        try {
            console.log(`🔧 Setting up UE5 project: ${project.name}`);
            
            // Set context for VS Code to enable UE5-specific UI elements
            await vscode.commands.executeCommand('setContext', 'ue5.projectDetected', true);
            
            // Initialize solution explorer
            this.solutionExplorer = new SolutionExplorer(project, context);
            console.log('✅ Solution explorer initialized');
            
            // Setup C++ environment
            await this.configurationManager.setupCppEnvironment(project);
            console.log('✅ C++ environment configured');
            
            // Schedule a delayed finalization of C++ setup to handle extension loading timing
            setTimeout(async () => {
                try {
                    await this.configurationManager.finalizeCppSetup();
                    console.log('✅ C++ setup finalized');
                } catch (error) {
                    console.log('⚠️  C++ setup finalization had issues (non-critical):', error);
                }
            }, 5000); // Wait 5 seconds for extensions to fully load
            
            this.outputChannel.appendLine(`✅ UE5 Project detected and configured: ${project.name}`);
            this.outputChannel.appendLine(`📂 Project path: ${project.path}`);
            this.outputChannel.appendLine(`🎯 Project file: ${project.uprojectPath}`);
            
            // Show welcome message with quick actions
            vscode.window.showInformationMessage(
                `🎮 UE5 project "${project.name}" detected and configured!`,
                'Open Engine',
                'Show Console',
                'Generate Project Files'
            ).then(selection => {
                switch (selection) {
                    case 'Open Engine':
                        vscode.commands.executeCommand('ue5.openEngine');
                        break;
                    case 'Show Console':
                        vscode.commands.executeCommand('ue5.showEngineOutput');
                        break;
                    case 'Generate Project Files':
                        vscode.commands.executeCommand('ue5.generateProjectFiles');
                        break;
                }
            });
            
        } catch (error) {
            console.error('❌ Failed to setup UE5 project:', error);
            this.outputChannel.appendLine(`❌ Failed to setup project: ${error}`);
            vscode.window.showErrorMessage(`Failed to setup UE5 project: ${error}`);
        }
    }
}