import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { UE5Project } from '../types';
import { PathUtils } from '../utils/PathUtils';

const execAsync = promisify(exec);

export class BuildManager {
    constructor(private outputChannel: vscode.OutputChannel) {}

    async buildProject(project: UE5Project, configuration: string, platform: string = 'Win64') {
        const enginePath = PathUtils.getEnginePath();
        if (!enginePath) {
            throw new Error('Engine path not configured');
        }

        // Validate configuration for rocket engine
        if (configuration === 'Debug' || configuration === 'DebugGame') {
            const choice = await vscode.window.showWarningMessage(
                'Debug configuration is not supported with installed engine. Use DebugGame instead?',
                'Use DebugGame',
                'Cancel'
            );
            if (choice !== 'Use DebugGame') return;
            configuration = 'DebugGame';
        }

        const ubtPath = PathUtils.getUnrealBuildToolPath(enginePath);
        let targetName = project.name;
        
        if (configuration === 'Development' || configuration === 'DebugGame') {
            targetName = `${project.name}Editor`;
        }

        const buildCommand = `"${ubtPath}" ${targetName} ${platform} ${configuration} -project="${project.uprojectPath}" -rocket -noubtmakefiles -utf8output`;

        this.outputChannel.appendLine(`Building: ${buildCommand}`);

        try {
            const { stdout, stderr } = await execAsync(buildCommand, {
                cwd: project.path,
                maxBuffer: 1024 * 1024 * 10,
                env: {
                    ...process.env,
                    UE_LOG_LOCATION: '1',
                    PATH: process.env.PATH + `;${PathUtils.getEngineBinariesPath(enginePath)}`
                }
            });

            if (this.hasErrors(stderr)) {
                throw new Error(`Build failed: ${stderr}`);
            }

            if (stderr) {
                this.outputChannel.appendLine(`Warnings: ${stderr}`);
            }

            this.outputChannel.appendLine('Build completed successfully');
            return { success: true, output: stdout };
        } catch (error: any) {
            this.outputChannel.appendLine(`Build failed: ${error.message}`);
            throw error;
        }
    }

    async generateProjectFiles(project: UE5Project) {
        const enginePath = PathUtils.getEnginePath();
        if (!enginePath) {
            throw new Error('Engine path not configured');
        }

        const ubtPath = PathUtils.getUnrealBuildToolPath(enginePath);
        const generateCommand = `"${ubtPath}" -projectfiles -project="${project.uprojectPath}" -game -rocket -progress -platforms=Win64`;

        this.outputChannel.appendLine(`Generating project files: ${generateCommand}`);

        const { stdout, stderr } = await execAsync(generateCommand, {
            cwd: project.path
        });

        if (stderr && !stderr.includes('warning')) {
            throw new Error(stderr);
        }

        this.outputChannel.appendLine('Project files generated successfully');
        return stdout;
    }

    private hasErrors(stderr: string): boolean {
        return !!stderr && (
            stderr.includes('error C') ||
            stderr.includes('fatal error') ||
            stderr.includes('Build failed') ||
            stderr.includes('ERROR:') ||
            stderr.includes('OtherCompilationError')
        );
    }
}