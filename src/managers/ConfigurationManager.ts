// src/managers/ConfigurationManager.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { UE5Project } from '../types';
import { PathUtils } from '../utils/PathUtils';
import { CppPropertiesGenerator } from '../generators/CppPropertiesGenerator';
import { LaunchConfigGenerator } from '../generators/LaunchConfigGenerator';
import { TasksConfigGenerator } from '../generators/TasksConfigGenerator';
import { SettingsConfigGenerator } from '../generators/SettingsConfigGenerator';

export class ConfigurationManager {
    constructor(private outputChannel: vscode.OutputChannel) { }

    async setupCppEnvironment(project: UE5Project): Promise<void> {
        try {
            this.outputChannel.appendLine('=== Setting up C++ Environment ===');

            const vscodeDir = path.join(project.path, '.vscode');
            if (!fs.existsSync(vscodeDir)) {
                fs.mkdirSync(vscodeDir, { recursive: true });
                this.outputChannel.appendLine('Created .vscode directory');
            }

            // Generate all configuration files
            await this.generateCppProperties(project, vscodeDir);
            await this.generateLaunchConfig(project, vscodeDir);
            await this.generateTasksConfig(project, vscodeDir);
            await this.generateSettings(project, vscodeDir);

            this.outputChannel.appendLine('C++ environment configured successfully');

            // Reload workspace to pick up changes (if C++ extension is available)
            await this.reloadCppWorkspace();

            // Configure IntelliSense fallback
            await this.configureIntelliSenseFallback();

        } catch (error) {
            this.outputChannel.appendLine(`Error setting up C++ environment: ${error}`);
            throw error;
        }
    }

    async finalizeCppSetup(): Promise<void> {
        // This method can be called after a delay to ensure the C++ extension is fully loaded
        try {
            this.outputChannel.appendLine('Finalizing C++ setup...');

            const cppExtension = vscode.extensions.getExtension('ms-vscode.cpptools');
            if (cppExtension && cppExtension.isActive) {
                // Now try the reload command
                const commands = await vscode.commands.getCommands(true);
                if (commands.includes('C_Cpp.ReloadWorkspace')) {
                    await vscode.commands.executeCommand('C_Cpp.ReloadWorkspace');
                    this.outputChannel.appendLine('C++ workspace reloaded (delayed)');
                }

                // Apply additional settings
                await this.configureIntelliSenseFallback();
            }
        } catch (error) {
            this.outputChannel.appendLine(`Note: Delayed C++ setup had issues: ${error}`);
        }
    }

    private async generateCppProperties(project: UE5Project, vscodeDir: string): Promise<void> {
        try {
            const generator = new CppPropertiesGenerator(project);
            const config = generator.generate();
            const configPath = path.join(vscodeDir, 'c_cpp_properties.json');

            fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
            this.outputChannel.appendLine('Generated c_cpp_properties.json');
        } catch (error) {
            this.outputChannel.appendLine(`Error generating C++ properties: ${error}`);
            throw error;
        }
    }

    private async generateLaunchConfig(project: UE5Project, vscodeDir: string): Promise<void> {
        try {
            const generator = new LaunchConfigGenerator(project);
            const config = generator.generate();
            const configPath = path.join(vscodeDir, 'launch.json');

            fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
            this.outputChannel.appendLine('Generated launch.json');
        } catch (error) {
            this.outputChannel.appendLine(`Error generating launch config: ${error}`);
            throw error;
        }
    }

    private async generateTasksConfig(project: UE5Project, vscodeDir: string): Promise<void> {
        try {
            const generator = new TasksConfigGenerator(project);
            const config = generator.generate();
            const configPath = path.join(vscodeDir, 'tasks.json');

            fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
            this.outputChannel.appendLine('Generated tasks.json');
        } catch (error) {
            this.outputChannel.appendLine(`Error generating tasks config: ${error}`);
            throw error;
        }
    }

    private async generateSettings(project: UE5Project, vscodeDir: string): Promise<void> {
        try {
            const generator = new SettingsConfigGenerator(project);
            const config = generator.generate();
            const configPath = path.join(vscodeDir, 'settings.json');

            // Merge with existing settings
            if (fs.existsSync(configPath)) {
                try {
                    const existingSettings = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    Object.assign(existingSettings, config);
                    fs.writeFileSync(configPath, JSON.stringify(existingSettings, null, 4));
                    this.outputChannel.appendLine('Updated existing settings.json');
                } catch (error) {
                    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
                    this.outputChannel.appendLine('Generated new settings.json (existing file was invalid)');
                }
            } else {
                fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
                this.outputChannel.appendLine('Generated settings.json');
            }
        } catch (error) {
            this.outputChannel.appendLine(`Error generating settings: ${error}`);
            throw error;
        }
    }

    private async reloadCppWorkspace(): Promise<void> {
        try {
            // Check if C/C++ extension is available
            const cppExtension = vscode.extensions.getExtension('ms-vscode.cpptools');
            if (cppExtension) {
                // Ensure the extension is activated
                if (!cppExtension.isActive) {
                    this.outputChannel.appendLine('Activating C/C++ extension...');
                    await cppExtension.activate();
                    this.outputChannel.appendLine('C/C++ extension activated');

                    // Wait a bit for the extension to fully initialize
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                // Check if the command is available before calling it
                const commands = await vscode.commands.getCommands(true);
                if (commands.includes('C_Cpp.ReloadWorkspace')) {
                    await vscode.commands.executeCommand('C_Cpp.ReloadWorkspace');
                    this.outputChannel.appendLine('C++ workspace reloaded');
                } else {
                    this.outputChannel.appendLine('C_Cpp.ReloadWorkspace command not yet available - extension may still be loading');

                    // Try alternative approach - force refresh IntelliSense
                    if (commands.includes('C_Cpp.RescanWorkspace')) {
                        await vscode.commands.executeCommand('C_Cpp.RescanWorkspace');
                        this.outputChannel.appendLine('C++ workspace rescanned');
                    }
                }
            } else {
                this.outputChannel.appendLine('C/C++ extension not found');
            }
        } catch (error) {
            this.outputChannel.appendLine(`Note: Could not reload C++ workspace (${error}). This is usually fine - IntelliSense will pick up changes automatically.`);
            // Don't throw here as this is not critical for the setup
        }
    }

    private async configureIntelliSenseFallback(): Promise<void> {
        try {
            // Check if C/C++ extension is available and active
            const cppExtension = vscode.extensions.getExtension('ms-vscode.cpptools');
            if (!cppExtension) {
                this.outputChannel.appendLine('C/C++ extension not available - skipping IntelliSense configuration');
                return;
            }

            if (!cppExtension.isActive) {
                this.outputChannel.appendLine('C/C++ extension not yet active - skipping IntelliSense configuration');
                return;
            }

            // Configure IntelliSense fallback as mentioned in the documentation
            const config = vscode.workspace.getConfiguration('C_Cpp');

            // Set multiple important IntelliSense settings
            await config.update('intelliSenseEngineFallback', 'enabled', vscode.ConfigurationTarget.Workspace);
            await config.update('intelliSenseEngine', 'default', vscode.ConfigurationTarget.Workspace);
            await config.update('autocomplete', 'default', vscode.ConfigurationTarget.Workspace);

            this.outputChannel.appendLine('IntelliSense configuration applied');
        } catch (error) {
            this.outputChannel.appendLine(`Note: Could not configure IntelliSense settings (${error}). You can set these manually in VS Code settings.`);
            // Don't throw here as this is not critical
        }
    }

    async validateCppConfiguration(project: UE5Project): Promise<boolean> {
        const vscodeDir = path.join(project.path, '.vscode');
        const requiredFiles = [
            'c_cpp_properties.json',
            'launch.json',
            'tasks.json',
            'settings.json'
        ];

        let isValid = true;

        for (const file of requiredFiles) {
            const filePath = path.join(vscodeDir, file);
            if (!fs.existsSync(filePath)) {
                this.outputChannel.appendLine(`Missing configuration file: ${file}`);
                isValid = false;
            } else {
                try {
                    // Validate JSON syntax
                    const content = fs.readFileSync(filePath, 'utf8');
                    JSON.parse(content);
                    this.outputChannel.appendLine(`Valid configuration file: ${file}`);
                } catch (error) {
                    this.outputChannel.appendLine(`Invalid JSON in configuration file: ${file}`);
                    isValid = false;
                }
            }
        }

        return isValid;
    }

    async updateEnginePathInConfigs(project: UE5Project, newEnginePath: string): Promise<void> {
        const vscodeDir = path.join(project.path, '.vscode');

        // Update settings.json
        const settingsPath = path.join(vscodeDir, 'settings.json');
        if (fs.existsSync(settingsPath)) {
            try {
                const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                settings['ue5.enginePath'] = newEnginePath;
                fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
                this.outputChannel.appendLine('Updated engine path in settings.json');
            } catch (error) {
                try {
                    // Regenerate all configs with new engine path
                    await this.setupCppEnvironment(project);
                    this.outputChannel.appendLine(`Updated all configurations with new engine path: ${newEnginePath}`);
                } catch (error) {
                    this.outputChannel.appendLine(`Error updating configurations with new engine path: ${error}`);
                    throw error;
                }
            }
        }
    }

    async checkRequiredExtensions(): Promise<{ missing: string[], recommendations: string[] }> {
        const requiredExtensions = [
            'ms-vscode.cpptools'
        ];

        const recommendedExtensions = [
            'ms-vscode.cpptools-extension-pack',
            'ms-vscode.cmake-tools',
            'twxs.cmake'
        ];

        const missing: string[] = [];
        const recommendations: string[] = [];

        // Check required extensions
        for (const extId of requiredExtensions) {
            const extension = vscode.extensions.getExtension(extId);
            if (!extension) {
                missing.push(extId);
            }
        }

        // Check recommended extensions
        for (const extId of recommendedExtensions) {
            const extension = vscode.extensions.getExtension(extId);
            if (!extension) {
                recommendations.push(extId);
            }
        }

        return { missing, recommendations };
    }

    async promptInstallExtensions(): Promise<void> {
        const { missing, recommendations } = await this.checkRequiredExtensions();

        if (missing.length > 0) {
            const action = await vscode.window.showErrorMessage(
                `Required extensions missing: ${missing.join(', ')}. Install now?`,
                'Install Required',
                'Later'
            );

            if (action === 'Install Required') {
                for (const extId of missing) {
                    try {
                        await vscode.commands.executeCommand('workbench.extensions.installExtension', extId);
                        this.outputChannel.appendLine(`Installing extension: ${extId}`);
                    } catch (error) {
                        this.outputChannel.appendLine(`Failed to install ${extId}: ${error}`);
                    }
                }
            }
        }

        if (recommendations.length > 0) {
            const action = await vscode.window.showInformationMessage(
                `Recommended extensions for better UE5 development: ${recommendations.slice(0, 2).join(', ')}${recommendations.length > 2 ? '...' : ''}. Install?`,
                'Install Recommended',
                'Later'
            );

            if (action === 'Install Recommended') {
                for (const extId of recommendations) {
                    try {
                        await vscode.commands.executeCommand('workbench.extensions.installExtension', extId);
                        this.outputChannel.appendLine(`Installing recommended extension: ${extId}`);
                    } catch (error) {
                        this.outputChannel.appendLine(`Failed to install ${extId}: ${error}`);
                    }
                }
            }
        }
    }
}