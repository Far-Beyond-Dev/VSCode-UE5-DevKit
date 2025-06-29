// src/managers/ConfigurationManager.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { UE5Project } from '../types';
import { PathUtils } from '../utils/PathUtils';

const execAsync = promisify(exec);

export class ConfigurationManager {
    constructor(private outputChannel: vscode.OutputChannel) {}

    async setupCppEnvironment(project: UE5Project): Promise<void> {
        try {
            this.outputChannel.appendLine('=== Setting up C++ Environment with Auto Refresh ===');

            const vscodeDir = path.join(project.path, '.vscode');
            if (!fs.existsSync(vscodeDir)) {
                fs.mkdirSync(vscodeDir, { recursive: true });
                this.outputChannel.appendLine('Created .vscode directory');
            }

            // 1. FIRST: Refresh UE5 project files to generate compileCommands.json
            await this.refreshUE5ProjectFiles(project);

            // 2. THEN: Generate our configurations that use the compile commands database
            await this.generateProperCppProperties(project, vscodeDir);
            await this.generateLaunchConfig(project, vscodeDir);
            await this.generateTasksConfig(project, vscodeDir);
            await this.generateOptimizedSettings(project, vscodeDir);

            this.outputChannel.appendLine('✅ C++ environment configured with full IntelliSense support');

            // 3. Reload workspace to pick up changes
            await this.reloadCppWorkspace();

        } catch (error) {
            this.outputChannel.appendLine(`❌ Error setting up C++ environment: ${error}`);
            throw error;
        }
    }

    async finalizeCppSetup(): Promise<void> {
        try {
            this.outputChannel.appendLine('Finalizing C++ setup...');
            await this.configureIntelliSenseFallback();
        } catch (error) {
            this.outputChannel.appendLine(`Note: Delayed C++ setup had issues: ${error}`);
        }
    }

    private async refreshUE5ProjectFiles(project: UE5Project): Promise<void> {
        const enginePath = PathUtils.getEnginePath();
        if (!enginePath) {
            throw new Error('Engine path not configured');
        }

        const ubtPath = PathUtils.getUnrealBuildToolPath(enginePath);
        
        this.outputChannel.appendLine('🔄 Refreshing UE5 project files for VS Code...');
        
        try {
            // The EXACT command Epic uses internally for VS Code project generation
            // CRITICAL: -vscode flag generates compileCommands.json and .code-workspace
            const refreshCommand = `"${ubtPath}" -ProjectFiles -project="${project.uprojectPath}" -game -rocket -progress -platforms=Win64 -vscode`;
            
            this.outputChannel.appendLine(`Executing: ${refreshCommand}`);
            
            const { stdout, stderr } = await execAsync(refreshCommand, {
                cwd: project.path,
                timeout: 60000, // 60 second timeout
                env: {
                    ...process.env,
                    PATH: process.env.PATH + `;${PathUtils.getEngineBinariesPath(enginePath)}`
                }
            });

            if (stdout) {
                this.outputChannel.appendLine('UBT Output:');
                this.outputChannel.appendLine(stdout);
            }
            
            if (stderr && !stderr.includes('warning')) {
                this.outputChannel.appendLine('UBT Warnings:');
                this.outputChannel.appendLine(stderr);
            }

            // Verify the compile commands were generated
            await this.verifyCompileCommandsGenerated(project);
            
            this.outputChannel.appendLine('✅ UE5 project files refreshed successfully');
            
        } catch (error: any) {
            this.outputChannel.appendLine(`❌ Failed to refresh project files: ${error.message}`);
            
            // Fallback: Try the engine's GenerateProjectFiles.bat script
            await this.fallbackProjectFileGeneration(project, enginePath);
        }
    }

    private async fallbackProjectFileGeneration(project: UE5Project, enginePath: string): Promise<void> {
        this.outputChannel.appendLine('🔄 Trying fallback method: GenerateProjectFiles.bat...');
        
        try {
            const generateScriptPath = path.join(enginePath, 'Engine', 'Build', 'BatchFiles', 'GenerateProjectFiles.bat');
            
            if (!fs.existsSync(generateScriptPath)) {
                throw new Error('GenerateProjectFiles.bat not found in engine directory');
            }

            // Run GenerateProjectFiles.bat from the project directory
            const fallbackCommand = `"${generateScriptPath}" -CurrentPlatform`;
            
            this.outputChannel.appendLine(`Fallback command: ${fallbackCommand}`);
            
            const { stdout, stderr } = await execAsync(fallbackCommand, {
                cwd: project.path,
                timeout: 120000 // 2 minute timeout for full generation
            });

            if (stdout) {
                this.outputChannel.appendLine('GenerateProjectFiles Output:');
                this.outputChannel.appendLine(stdout);
            }
            
            if (stderr) {
                this.outputChannel.appendLine('GenerateProjectFiles Warnings:');
                this.outputChannel.appendLine(stderr);
            }

            this.outputChannel.appendLine('✅ Fallback project file generation completed');
            
        } catch (fallbackError: any) {
            this.outputChannel.appendLine(`❌ Fallback also failed: ${fallbackError.message}`);
            throw new Error('Both primary and fallback project file generation methods failed');
        }
    }

    private async verifyCompileCommandsGenerated(project: UE5Project): Promise<void> {
        const compileCommandsPaths = [
            path.join(project.path, '.vscode', 'compileCommands_Default.json'),
            path.join(project.path, '.vscode', `compileCommands_${project.name}.json`),
            path.join(project.path, 'compile_commands.json')
        ];

        let found = false;
        for (const compileCommandsPath of compileCommandsPaths) {
            if (fs.existsSync(compileCommandsPath)) {
                this.outputChannel.appendLine(`✅ Found compile commands: ${compileCommandsPath}`);
                found = true;
                break;
            }
        }

        if (!found) {
            this.outputChannel.appendLine('⚠️  Warning: No compile commands database found');
            this.outputChannel.appendLine('   IntelliSense will use fallback configuration');
            this.outputChannel.appendLine('   Try running "Tools > Refresh Visual Studio Code Project" in UE5 Editor');
        }
    }

    private async generateProperCppProperties(project: UE5Project, vscodeDir: string): Promise<void> {
        const enginePath = PathUtils.getEnginePath();
        const configPath = path.join(vscodeDir, 'c_cpp_properties.json');

        // The PROPER c_cpp_properties.json that uses compile commands database
        const cppProperties = {
            configurations: [
                {
                    name: `${project.name} Editor Win64 Development`,
                    intelliSenseMode: "windows-msvc-x64",
                    
                    // CRITICAL: Point to UE5's generated compile commands database
                    compileCommands: "${workspaceFolder}/.vscode/compileCommands_Default.json",
                    configurationProvider: "ms-vscode.cpptools",
                    
                    // Compiler settings
                    compilerPath: this.getCompilerPath(),
                    cStandard: "c17",
                    cppStandard: "c++20",
                    windowsSdkVersion: this.getWindowsSdkVersion(),
                    
                    // Minimal fallback paths (only used if compile commands fail)
                    includePath: [
                        "${workspaceFolder}/Intermediate/**",
                        "${workspaceFolder}/Plugins/**", 
                        "${workspaceFolder}/Source/**"
                    ],
                    
                    // Minimal fallback defines (only used if compile commands fail)
                    defines: [
                        "UNICODE",
                        "_UNICODE", 
                        "__UNREAL__",
                        "UBT_COMPILED_PLATFORM=Windows",
                        "WITH_ENGINE=1",
                        "WITH_UNREAL_DEVELOPER_TOOLS=1",
                        "WITH_APPLICATION_CORE=1",
                        "WITH_COREUOBJECT=1"
                    ],
                    
                    // Browse database settings
                    browse: {
                        path: [
                            "${workspaceFolder}",
                            `${enginePath}/Engine/Source`,
                            `${enginePath}/Engine/Plugins`
                        ],
                        limitSymbolsToIncludedHeaders: false,
                        databaseFilename: "${workspaceFolder}/.vscode/browse.vc.db"
                    }
                }
            ],
            version: 4
        };

        fs.writeFileSync(configPath, JSON.stringify(cppProperties, null, 4));
        this.outputChannel.appendLine('Generated c_cpp_properties.json with compile commands support');
    }

    private async generateOptimizedSettings(project: UE5Project, vscodeDir: string): Promise<void> {
        const settingsPath = path.join(vscodeDir, 'settings.json');
        
        const optimizedSettings = {
            // File associations for UE5
            "files.associations": {
                "*.uproject": "json",
                "*.uplugin": "json", 
                "*.h": "cpp",
                "*.hpp": "cpp",
                "*.inl": "cpp",
                "*.inc": "cpp",
                "*.usf": "hlsl",
                "*.ush": "hlsl"
            },

            // Exclude UE5 build artifacts for performance
            "files.exclude": {
                "**/Binaries": true,
                "**/Intermediate": true,
                "**/Saved": true,
                "**/.vs": true,
                "**/DerivedDataCache": true,
                "**/.vscode/browse.vc.db*": true
            },

            "search.exclude": {
                "**/Binaries": true,
                "**/Intermediate": true, 
                "**/Saved": true,
                "**/.vs": true,
                "**/DerivedDataCache": true,
                "**/Content/**/*.uasset": true,
                "**/Content/**/*.umap": true
            },

            "files.watcherExclude": {
                "**/Binaries/**": true,
                "**/Intermediate/**": true,
                "**/Saved/**": true,
                "**/.vs/**": true,
                "**/DerivedDataCache/**": true
            },

            // CRITICAL C++ IntelliSense settings for UE5
            "C_Cpp.intelliSenseEngine": "default",
            "C_Cpp.errorSquiggles": "enabled",
            "C_Cpp.autoAddFileAssociations": false,
            "C_Cpp.default.intelliSenseMode": "windows-msvc-x64", 
            "C_Cpp.default.cppStandard": "c++20",
            "C_Cpp.default.cStandard": "c17",
            
            // IMPORTANT: Enable IntelliSense fallback for UE5 projects
            "C_Cpp.intelliSenseEngineFallback": "enabled",
            
            // Performance settings for large UE5 projects
            "C_Cpp.intelliSenseUpdateDelay": 500,
            "C_Cpp.workspaceParsingPriority": "highest",
            "C_Cpp.enhancedColorization": "enabled",
            "C_Cpp.inactiveRegionOpacity": 0.5,
            "C_Cpp.dimInactiveRegions": true,
            "C_Cpp.autocomplete": "default",
            "C_Cpp.loggingLevel": "Warning",

            // UE5 coding style settings
            "editor.tabSize": 4,
            "editor.insertSpaces": false,
            "editor.detectIndentation": false,
            "editor.rulers": [120],
            "editor.wordWrap": "off",
            "editor.trimAutoWhitespace": true,

            // Language-specific overrides
            "[cpp]": {
                "editor.wordBasedSuggestions": false,
                "editor.suggest.insertMode": "replace",
                "editor.semanticHighlighting.enabled": true,
                "editor.defaultFormatter": "ms-vscode.cpptools"
            },

            "[c]": {
                "editor.wordBasedSuggestions": false,
                "editor.suggest.insertMode": "replace",
                "editor.semanticHighlighting.enabled": true,
                "editor.defaultFormatter": "ms-vscode.cpptools"
            }
        };

        // Merge with existing settings if they exist
        if (fs.existsSync(settingsPath)) {
            try {
                const existingSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                Object.assign(existingSettings, optimizedSettings);
                fs.writeFileSync(settingsPath, JSON.stringify(existingSettings, null, 4));
            } catch (error) {
                fs.writeFileSync(settingsPath, JSON.stringify(optimizedSettings, null, 4));
            }
        } else {
            fs.writeFileSync(settingsPath, JSON.stringify(optimizedSettings, null, 4));
        }

        this.outputChannel.appendLine('Generated optimized VS Code settings for UE5');
    }

    private async generateLaunchConfig(project: UE5Project, vscodeDir: string): Promise<void> {
        const enginePath = PathUtils.getEnginePath();
        const launchPath = path.join(vscodeDir, 'launch.json');
        
        const launchConfig = {
            version: "0.2.0",
            configurations: [
                {
                    name: "Launch UE5 Editor",
                    type: "cppvsdbg",
                    request: "launch",
                    program: path.join(enginePath, "Engine/Binaries/Win64/UnrealEditor.exe"),
                    args: [`"${project.uprojectPath}"`],
                    stopAtEntry: false,
                    cwd: "${workspaceFolder}",
                    environment: [],
                    console: "externalTerminal",
                    symbolSearchPath: `${enginePath}/Engine/Binaries/Win64;${project.path}/Binaries/Win64`,
                    sourceFileMap: {
                        "/Engine/Source/": `${enginePath}/Engine/Source/`
                    },
                    visualizerFile: `${enginePath}/Engine/Extras/VisualStudioDebugging/Unreal.natvis`
                },
                {
                    name: "Launch UE5 Editor (DebugGame)",
                    type: "cppvsdbg", 
                    request: "launch",
                    program: path.join(enginePath, "Engine/Binaries/Win64/UnrealEditor-Win64-DebugGame.exe"),
                    args: [`"${project.uprojectPath}"`],
                    stopAtEntry: false,
                    cwd: "${workspaceFolder}",
                    environment: [],
                    console: "externalTerminal",
                    symbolSearchPath: `${enginePath}/Engine/Binaries/Win64;${project.path}/Binaries/Win64`,
                    sourceFileMap: {
                        "/Engine/Source/": `${enginePath}/Engine/Source/`
                    },
                    visualizerFile: `${enginePath}/Engine/Extras/VisualStudioDebugging/Unreal.natvis`
                },
                {
                    name: "Attach to UE5 Editor",
                    type: "cppvsdbg",
                    request: "attach", 
                    processId: "${command:pickProcess}",
                    symbolSearchPath: `${enginePath}/Engine/Binaries/Win64;${project.path}/Binaries/Win64`,
                    sourceFileMap: {
                        "/Engine/Source/": `${enginePath}/Engine/Source/`
                    },
                    visualizerFile: `${enginePath}/Engine/Extras/VisualStudioDebugging/Unreal.natvis`
                }
            ]
        };

        fs.writeFileSync(launchPath, JSON.stringify(launchConfig, null, 4));
        this.outputChannel.appendLine('Generated launch configurations for debugging');
    }

    private async generateTasksConfig(project: UE5Project, vscodeDir: string): Promise<void> {
        const tasksPath = path.join(vscodeDir, 'tasks.json');
        const tasksConfig = {
            version: "2.0.0",
            tasks: [
                {
                    label: "UE5: Build Development Editor",
                    type: "shell",
                    command: "${command:ue5.buildDevelopment}",
                    group: {
                        kind: "build",
                        isDefault: true
                    },
                    presentation: {
                        echo: true,
                        reveal: "always",
                        focus: false,
                        panel: "shared"
                    }
                },
                {
                    label: "UE5: Refresh Project Files",
                    type: "shell",
                    command: "${command:ue5.refreshCppConfig}",
                    group: "build",
                    presentation: {
                        echo: true,
                        reveal: "always",
                        focus: false,
                        panel: "shared"
                    }
                },
                {
                    label: "UE5: Generate Project Files",
                    type: "shell",
                    command: "${command:ue5.generateProjectFiles}",
                    group: "build",
                    presentation: {
                        echo: true,
                        reveal: "always",
                        focus: false,
                        panel: "shared"
                    }
                }
            ]
        };

        fs.writeFileSync(tasksPath, JSON.stringify(tasksConfig, null, 4));
        this.outputChannel.appendLine('Generated tasks.json');
    }

    private async reloadCppWorkspace(): Promise<void> {
        try {
            const cppExtension = vscode.extensions.getExtension('ms-vscode.cpptools');
            if (cppExtension && cppExtension.isActive) {
                const commands = await vscode.commands.getCommands(true);
                if (commands.includes('C_Cpp.ReloadWorkspace')) {
                    await vscode.commands.executeCommand('C_Cpp.ReloadWorkspace');
                    this.outputChannel.appendLine('C++ workspace reloaded');
                }
            }
        } catch (error) {
            this.outputChannel.appendLine(`Note: Could not reload C++ workspace: ${error}`);
        }
    }

    private async configureIntelliSenseFallback(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('C_Cpp');
            await config.update('intelliSenseEngineFallback', 'enabled', vscode.ConfigurationTarget.Workspace);
            await config.update('intelliSenseEngine', 'default', vscode.ConfigurationTarget.Workspace);
            this.outputChannel.appendLine('IntelliSense fallback configured');
        } catch (error) {
            this.outputChannel.appendLine(`Note: Could not configure IntelliSense settings: ${error}`);
        }
    }

    private getCompilerPath(): string {
        return PathUtils.getVisualStudioCompilerPath();
    }

    private getWindowsSdkVersion(): string {
        const sdkPaths = [
            'C:/Program Files (x86)/Windows Kits/10/Include',
            'C:/Program Files/Windows Kits/10/Include'
        ];

        for (const sdkPath of sdkPaths) {
            if (fs.existsSync(sdkPath)) {
                try {
                    const versions = fs.readdirSync(sdkPath)
                        .filter(v => v.match(/^10\.\d+\.\d+\.\d+$/))
                        .sort()
                        .reverse();
                    if (versions.length > 0) {
                        return versions[0];
                    }
                } catch (error) {
                    continue;
                }
            }
        }

        return "10.0.22621.0"; // Fallback to Windows 11 SDK version
    }
}