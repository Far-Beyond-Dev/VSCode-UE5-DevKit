import * as vscode from 'vscode';
import { ProjectManager } from '../managers/ProjectManager';
import { BuildManager } from '../managers/BuildManager';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { SolutionExplorer } from '../ui/SolutionExplorer';
import { CommandRegistry } from '../commands/CommandRegistry';
import { UE5Project } from '../types';

export class UE5DevTools {
    private projectManager: ProjectManager;
    private buildManager: BuildManager;
    private configurationManager: ConfigurationManager;
    private solutionExplorer: SolutionExplorer | null = null;
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
        const project = await this.projectManager.detectProject();
        
        if (project) {
            await this.setupProject(project, context);
        }

        this.commandRegistry.registerCommands(context, {
            projectManager: this.projectManager,
            buildManager: this.buildManager,
            configurationManager: this.configurationManager,
            solutionExplorer: this.solutionExplorer
        });
    }

    private async setupProject(project: UE5Project, context: vscode.ExtensionContext) {
        await vscode.commands.executeCommand('setContext', 'ue5.projectDetected', true);
        
        this.solutionExplorer = new SolutionExplorer(project, context);
        await this.configurationManager.setupCppEnvironment(project);
        
        // Schedule a delayed finalization of C++ setup to handle extension loading timing
        setTimeout(async () => {
            try {
                await this.configurationManager.finalizeCppSetup();
            } catch (error) {
                // Silent fail - this is just optimization
            }
        }, 5000); // Wait 5 seconds for extensions to fully load
        
        this.outputChannel.appendLine(`UE5 Project detected: ${project.name}`);
    }
}