import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface UE5Project {
    name: string;
    path: string;
    uprojectPath: string;
}

interface SolutionItem {
    name: string;
    path: string;
    type: 'folder' | 'file' | 'plugin';
    children?: SolutionItem[];
    buildable?: boolean;
    pluginDescriptor?: any;
}

class UE5SolutionProvider implements vscode.TreeDataProvider<SolutionItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SolutionItem | undefined | null | void> = new vscode.EventEmitter<SolutionItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SolutionItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        private workspaceRoot: string, 
        private project: UE5Project,
        private context: vscode.ExtensionContext
    ) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SolutionItem): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(
            element.name,
            element.type === 'folder' || element.type === 'plugin' ?
                vscode.TreeItemCollapsibleState.Collapsed :
                vscode.TreeItemCollapsibleState.None
        );

        if (element.type === 'file') {
            treeItem.command = {
                command: 'ue5.openFile',
                title: 'Open File',
                arguments: [element.path]
            };
            treeItem.contextValue = 'file';

            // Set icons based on file extension
            const ext = path.extname(element.name).toLowerCase();
            switch (ext) {
                case '.h':
                    treeItem.iconPath = new vscode.ThemeIcon('symbol-class');
                    break;
                case '.cpp':
                    treeItem.iconPath = new vscode.ThemeIcon('symbol-method');
                    break;
                case '.cs':
                    treeItem.iconPath = new vscode.ThemeIcon('symbol-keyword');
                    break;
                case '.uproject':
                    treeItem.iconPath = {
                        light: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'unreal-black.png'),
                        dark: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'unreal-white.png')
                    };                    break;
                case '.uasset':
                    treeItem.iconPath = new vscode.ThemeIcon('symbol-property');
                    break;
                case '.uplugin':
                    treeItem.iconPath = {
                        light: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'unreal-black.png'),
                        dark: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'unreal-white.png')
                    };
                    break;
                default:
                    treeItem.iconPath = new vscode.ThemeIcon('file');
            }
        } else if (element.type === 'plugin') {
            treeItem.iconPath = {
                light: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'unreal-black.png'),
                dark: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'unreal-white.png')
            };

            treeItem.contextValue = element.buildable ? 'buildablePlugin' : 'plugin';
            treeItem.tooltip = `Plugin: ${element.name}${element.buildable ? ' (Buildable)' : ''}`;
        } else {
            treeItem.iconPath = new vscode.ThemeIcon('folder');
            treeItem.contextValue = 'folder';
        }

        return treeItem;
    }

    getChildren(element?: SolutionItem): Thenable<SolutionItem[]> {
        if (!this.workspaceRoot) {
            return Promise.resolve([]);
        }

        if (element) {
            if (element.type === 'plugin') {
                return Promise.resolve(this.getPluginContents(element.path));
            } else if (element.children && element.children.length > 0) {
                return Promise.resolve(element.children);
            } else {
                return Promise.resolve(this.getFilesAndFolders(element.path));
            }
        } else {
            return Promise.resolve(this.getProjectStructure());
        }
    }

    private getPluginContents(pluginPath: string): SolutionItem[] {
        const items: SolutionItem[] = [];

        try {
            const pluginSourcePath = path.join(pluginPath, 'Source');
            const pluginContentPath = path.join(pluginPath, 'Content');
            const pluginConfigPath = path.join(pluginPath, 'Config');

            // Add plugin descriptor file
            const pluginName = path.basename(pluginPath);
            const upluginPath = path.join(pluginPath, pluginName + '.uplugin');
            if (fs.existsSync(upluginPath)) {
                items.push({
                    name: pluginName + '.uplugin',
                    path: upluginPath,
                    type: 'file'
                });
            }

            if (fs.existsSync(pluginSourcePath)) {
                items.push({
                    name: 'Source',
                    path: pluginSourcePath,
                    type: 'folder'
                });
            }

            if (fs.existsSync(pluginContentPath)) {
                items.push({
                    name: 'Content',
                    path: pluginContentPath,
                    type: 'folder'
                });
            }

            if (fs.existsSync(pluginConfigPath)) {
                items.push({
                    name: 'Config',
                    path: pluginConfigPath,
                    type: 'folder'
                });
            }
        } catch (error) {
            console.error('Error reading plugin contents:', error);
        }

        return items;
    }

    private getProjectStructure(): SolutionItem[] {
        const items: SolutionItem[] = [];

        // Add main project folders
        const sourceFolder = path.join(this.workspaceRoot, 'Source');
        const contentFolder = path.join(this.workspaceRoot, 'Content');
        const configFolder = path.join(this.workspaceRoot, 'Config');
        const pluginsFolder = path.join(this.workspaceRoot, 'Plugins');

        if (fs.existsSync(sourceFolder)) {
            items.push({
                name: 'Source',
                path: sourceFolder,
                type: 'folder'
            });
        }

        if (fs.existsSync(contentFolder)) {
            items.push({
                name: 'Content',
                path: contentFolder,
                type: 'folder'
            });
        }

        if (fs.existsSync(configFolder)) {
            items.push({
                name: 'Config',
                path: configFolder,
                type: 'folder'
            });
        }

        // Add plugins folder with plugin detection
        if (fs.existsSync(pluginsFolder)) {
            const pluginItems = this.getPluginItems(pluginsFolder);
            if (pluginItems.length > 0) {
                items.push({
                    name: 'Plugins',
                    path: pluginsFolder,
                    type: 'folder',
                    children: pluginItems
                });
            }
        }

        // Add .uproject file
        if (fs.existsSync(this.project.uprojectPath)) {
            items.push({
                name: this.project.name + '.uproject',
                path: this.project.uprojectPath,
                type: 'file'
            });
        }

        return items;
    }

    private getPluginItems(pluginsFolder: string): SolutionItem[] {
        const pluginItems: SolutionItem[] = [];

        try {
            const pluginDirs = fs.readdirSync(pluginsFolder).filter(item => {
                const pluginPath = path.join(pluginsFolder, item);
                return fs.statSync(pluginPath).isDirectory();
            });

            for (const pluginDir of pluginDirs) {
                const pluginPath = path.join(pluginsFolder, pluginDir);
                const upluginPath = path.join(pluginPath, pluginDir + '.uplugin');

                if (fs.existsSync(upluginPath)) {
                    let pluginDescriptor = null;
                    let isBuildable = false;

                    try {
                        const pluginContent = fs.readFileSync(upluginPath, 'utf8');
                        pluginDescriptor = JSON.parse(pluginContent);

                        // Check if plugin has source code
                        const pluginSourcePath = path.join(pluginPath, 'Source');
                        isBuildable = fs.existsSync(pluginSourcePath) &&
                            fs.readdirSync(pluginSourcePath).length > 0;

                    } catch (error) {
                        console.error(`Error reading plugin descriptor: ${error}`);
                    }

                    pluginItems.push({
                        name: pluginDir,
                        path: pluginPath,
                        type: 'plugin',
                        buildable: isBuildable,
                        pluginDescriptor: pluginDescriptor
                    });
                }
            }
        } catch (error) {
            console.error('Error reading plugins folder:', error);
        }

        return pluginItems.sort((a, b) => a.name.localeCompare(b.name));
    }

    private getFilesAndFolders(folderPath: string): SolutionItem[] {
        const items: SolutionItem[] = [];

        try {
            const files = fs.readdirSync(folderPath);

            files.forEach(file => {
                const fullPath = path.join(folderPath, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    items.push({
                        name: file,
                        path: fullPath,
                        type: 'folder'
                    });
                } else {
                    items.push({
                        name: file,
                        path: fullPath,
                        type: 'file'
                    });
                }
            });
        } catch (error) {
            console.error('Error reading directory:', error);
        }

        return items.sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name);
            }
            return a.type === 'folder' ? -1 : 1;
        });
    }
}

class UE5DevTools {
    private outputChannel: vscode.OutputChannel;
    private config: vscode.WorkspaceConfiguration;
    private project: UE5Project | null = null;
    private solutionProvider: UE5SolutionProvider | null = null;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('UE5 Dev Tools');
        this.config = vscode.workspace.getConfiguration('ue5');
    }

    private showOutput(message: string) {
        this.outputChannel.appendLine(message);
        if (this.config.get<boolean>('showBuildOutput', true)) {
            this.outputChannel.show(true);
        }
    }

    async initialize(context: vscode.ExtensionContext) {
        // Detect UE5 project
        this.project = await this.detectUE5Project();

        if (this.project) {
            await vscode.commands.executeCommand('setContext', 'ue5.projectDetected', true);

            // Setup C++ environment
            await this.setupCppEnvironment();

            // Initialize solution explorer with context
            this.solutionProvider = new UE5SolutionProvider(this.project.path, this.project, context);
            vscode.window.createTreeView('ue5SolutionExplorer', {
                treeDataProvider: this.solutionProvider
            });

            this.showOutput(`UE5 Project detected: ${this.project.name}`);
        }

        // Register commands
        this.registerCommands(context);
    }

    private registerCommands(context: vscode.ExtensionContext) {
        const commands = [
            vscode.commands.registerCommand('ue5.openEngine', () => this.openEngine()),
            vscode.commands.registerCommand('ue5.generateProjectFiles', () => this.generateProjectFiles()),
            vscode.commands.registerCommand('ue5.buildDevelopment', () => this.buildProject('Development')),
            vscode.commands.registerCommand('ue5.buildShipping', () => this.buildProject('Shipping')),
            vscode.commands.registerCommand('ue5.buildDebug', () => this.buildProject('DebugGame')),
            vscode.commands.registerCommand('ue5.cleanBuild', () => this.cleanBuild()),
            vscode.commands.registerCommand('ue5.cookContent', () => this.cookContent()),
            vscode.commands.registerCommand('ue5.packageProject', () => this.packageProject()),
            vscode.commands.registerCommand('ue5.refreshSolutionExplorer', () => this.refreshSolutionExplorer()),
            vscode.commands.registerCommand('ue5.openFile', (filePath: string) => this.openFile(filePath)),
            vscode.commands.registerCommand('ue5.buildPlugin', (item?: SolutionItem) => this.buildPluginFromContext(item)),
            vscode.commands.registerCommand('ue5.refreshCppConfig', () => this.setupCppEnvironment())
        ];

        commands.forEach(command => context.subscriptions.push(command));
    }

    private async detectUE5Project(): Promise<UE5Project | null> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return null;
        }

        for (const folder of workspaceFolders) {
            const files = await vscode.workspace.findFiles('*.uproject', null, 10);
            if (files.length > 0) {
                const uprojectPath = files[0].fsPath;
                const projectName = path.basename(uprojectPath, '.uproject');
                const projectPath = path.dirname(uprojectPath);

                return {
                    name: projectName,
                    path: projectPath,
                    uprojectPath: uprojectPath
                };
            }
        }

        return null;
    }

    private async openEngine() {
        if (!this.project) {
            vscode.window.showErrorMessage('No UE5 project detected');
            return;
        }

        const enginePath = this.getEnginePath();
        if (!enginePath) {
            vscode.window.showErrorMessage('Engine path not configured. Please set ue5.enginePath in settings.');
            return;
        }

        const editorPath = path.join(enginePath, 'Engine', 'Binaries', 'Win64', 'UnrealEditor.exe');

        try {
            this.showOutput('Opening Unreal Engine...');
            const child = spawn(editorPath, [this.project.uprojectPath], { detached: true });
            child.unref();
            this.showOutput('Unreal Engine opened successfully');
        } catch (error) {
            this.showOutput(`Error opening engine: ${error}`);
            vscode.window.showErrorMessage('Failed to open Unreal Engine');
        }
    }

    private async generateProjectFiles() {
        if (!this.project) {
            vscode.window.showErrorMessage('No UE5 project detected');
            return;
        }

        const enginePath = this.getEnginePath();
        if (!enginePath) {
            vscode.window.showErrorMessage('Engine path not configured');
            return;
        }

        const ubtPath = path.join(enginePath, 'Engine', 'Binaries', 'DotNET', 'UnrealBuildTool', 'UnrealBuildTool.exe');

        try {
            this.showOutput('Generating project files...');

            const generateCommand = `"${ubtPath}" -projectfiles -project="${this.project.uprojectPath}" -game -rocket -progress -platforms=Win64`;
            this.showOutput(`Executing: ${generateCommand}`);

            const { stdout, stderr } = await execAsync(generateCommand, {
                cwd: this.project.path
            });

            if (stderr && !stderr.includes('warning')) {
                this.showOutput(`Generation errors: ${stderr}`);
            } else if (stderr) {
                this.showOutput(`Generation warnings: ${stderr}`);
            }

            this.showOutput('Project files generated successfully');
            this.showOutput(stdout);

            // Auto-setup C++ environment after generating project files
            await this.setupCppEnvironment();

            vscode.window.showInformationMessage('Project files generated successfully');
        } catch (error) {
            this.showOutput(`Error generating project files: ${error}`);
            vscode.window.showErrorMessage('Failed to generate project files - check output for details');
        }
    }

    private async buildProject(configuration: string) {
        if (!this.project) {
            vscode.window.showErrorMessage('No UE5 project detected');
            return;
        }

        const enginePath = this.getEnginePath();
        if (!enginePath) {
            vscode.window.showErrorMessage('Engine path not configured');
            return;
        }

        // Check if Debug configuration is requested with rocket engine
        if (configuration === 'Debug' || configuration === 'DebugGame') {
            const choice = await vscode.window.showWarningMessage(
                'Debug configuration is not supported with the installed engine distribution. Use DebugGame instead?',
                'Use DebugGame',
                'Cancel'
            );
            if (choice !== 'Use DebugGame') {
                return;
            }
            configuration = 'DebugGame';
        }

        const ubtPath = path.join(enginePath, 'Engine', 'Binaries', 'DotNET', 'UnrealBuildTool', 'UnrealBuildTool.exe');
        const platform = this.config.get<string>('defaultPlatform', 'Win64');

        // Correct target name based on configuration
        let targetName = this.project.name;
        if (configuration === 'Development' || configuration === 'DebugGame') {
            targetName = `${this.project.name}Editor`;
        }

        try {
            this.showOutput(`Building project (${configuration})...`);

            const buildCommand = `"${ubtPath}" ${targetName} ${platform} ${configuration} -project="${this.project.uprojectPath}" -rocket -noubtmakefiles -utf8output`;

            this.showOutput(`Executing: ${buildCommand}`);

            const { stdout, stderr } = await execAsync(buildCommand, {
                cwd: this.project.path,
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer
                env: {
                    ...process.env,
                    UE_LOG_LOCATION: '1',
                    PATH: process.env.PATH + `;${path.join(enginePath, 'Engine', 'Binaries', 'Win64')}`
                }
            });

            // Check for actual build errors vs warnings
            const hasErrors = stderr && (
                stderr.includes('error C') ||
                stderr.includes('fatal error') ||
                stderr.includes('Build failed') ||
                stderr.includes('ERROR:') ||
                stderr.includes('OtherCompilationError')
            );

            if (hasErrors) {
                this.showOutput(`Build errors: ${stderr}`);
                vscode.window.showErrorMessage('Build failed - check output for details');
                return;
            }

            if (stderr) {
                this.showOutput(`Build warnings: ${stderr}`);
            }

            this.showOutput('Build completed successfully');
            if (stdout) {
                this.showOutput(stdout);
            }
            vscode.window.showInformationMessage(`Build completed successfully (${configuration})`);
        } catch (error: any) {
            this.showOutput(`Build failed: ${error.message}`);
            if (error.stdout) {
                this.showOutput(`Build output: ${error.stdout}`);
            }
            if (error.stderr) {
                this.showOutput(`Build errors: ${error.stderr}`);
            }
            vscode.window.showErrorMessage('Build failed - check output for details');
        }
    }

    private async cleanBuild() {
        if (!this.project) {
            vscode.window.showErrorMessage('No UE5 project detected');
            return;
        }

        try {
            this.showOutput('Cleaning build files...');

            const foldersToClean = ['Binaries', 'Intermediate', 'Saved'];
            for (const folder of foldersToClean) {
                const folderPath = path.join(this.project.path, folder);
                if (fs.existsSync(folderPath)) {
                    await this.deleteFolderRecursive(folderPath);
                    this.showOutput(`Cleaned: ${folder}`);
                }
            }

            this.showOutput('Clean completed successfully');
            vscode.window.showInformationMessage('Clean completed successfully');
        } catch (error) {
            this.showOutput(`Clean failed: ${error}`);
            vscode.window.showErrorMessage('Clean failed');
        }
    }

    private async cookContent() {
        if (!this.project) {
            vscode.window.showErrorMessage('No UE5 project detected');
            return;
        }

        const enginePath = this.getEnginePath();
        if (!enginePath) {
            vscode.window.showErrorMessage('Engine path not configured');
            return;
        }

        const editorPath = path.join(enginePath, 'Engine', 'Binaries', 'Win64', 'UnrealEditor-Cmd.exe');
        const platform = this.config.get<string>('defaultPlatform', 'Win64');

        try {
            this.showOutput('Cooking content...');
            const { stdout, stderr } = await execAsync(`"${editorPath}" "${this.project.uprojectPath}" -run=cook -targetplatform=${platform} -iterate -unversioned`);

            if (stderr) {
                this.showOutput(`Cook warnings: ${stderr}`);
            }

            this.showOutput('Content cooked successfully');
            this.showOutput(stdout);
            vscode.window.showInformationMessage('Content cooked successfully');
        } catch (error) {
            this.showOutput(`Cook failed: ${error}`);
            vscode.window.showErrorMessage('Cook failed');
        }
    }

    private async packageProject() {
        if (!this.project) {
            vscode.window.showErrorMessage('No UE5 project detected');
            return;
        }

        const outputPath = await vscode.window.showInputBox({
            prompt: 'Enter output directory for packaged project',
            value: path.join(this.project.path, 'Packaged')
        });

        if (!outputPath) {
            return;
        }

        const enginePath = this.getEnginePath();
        if (!enginePath) {
            vscode.window.showErrorMessage('Engine path not configured');
            return;
        }

        const runUATPath = path.join(enginePath, 'Engine', 'Build', 'BatchFiles', 'RunUAT.bat');
        const platform = this.config.get<string>('defaultPlatform', 'Win64');
        const configuration = this.config.get<string>('defaultBuildConfiguration', 'Development');

        try {
            this.showOutput('Packaging project...');
            const { stdout, stderr } = await execAsync(`"${runUATPath}" BuildCookRun -project="${this.project.uprojectPath}" -noP4 -platform=${platform} -clientconfig=${configuration} -serverconfig=${configuration} -cook -allmaps -build -stage -pak -archive -archivedirectory="${outputPath}"`);

            if (stderr) {
                this.showOutput(`Package warnings: ${stderr}`);
            }

            this.showOutput('Project packaged successfully');
            this.showOutput(stdout);
            vscode.window.showInformationMessage('Project packaged successfully');
        } catch (error) {
            this.showOutput(`Package failed: ${error}`);
            vscode.window.showErrorMessage('Package failed');
        }
    }

    private refreshSolutionExplorer() {
        if (this.solutionProvider) {
            this.solutionProvider.refresh();
            this.showOutput('Solution explorer refreshed');

            // Also refresh C++ configuration to pick up any new plugins
            this.setupCppEnvironment();
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

    private getEnginePath(): string {
        const configuredPath = this.config.get<string>('enginePath');
        if (configuredPath && fs.existsSync(configuredPath)) {
            return configuredPath;
        }

        // Try common installation paths
        const commonPaths = [
            'C:\\Program Files\\Epic Games\\UE_5.6',
            'C:\\Program Files (x86)\\Epic Games\\UE_5.6',
            'D:\\Epic Games\\UE_5.6',
            'C:\\UnrealEngine',
            'D:\\UnrealEngine'
        ];

        for (const commonPath of commonPaths) {
            if (fs.existsSync(commonPath)) {
                return commonPath;
            }
        }

        return '';
    }

    private async deleteFolderRecursive(folderPath: string) {
        if (fs.existsSync(folderPath)) {
            const files = fs.readdirSync(folderPath);
            for (const file of files) {
                const curPath = path.join(folderPath, file);
                if (fs.lstatSync(curPath).isDirectory()) {
                    await this.deleteFolderRecursive(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            }
            fs.rmdirSync(folderPath);
        }
    }

    private async setupCppEnvironment() {
        if (!this.project) {
            return;
        }

        try {
            this.showOutput('Setting up C++ environment...');

            // Create or update c_cpp_properties.json
            const vscodeDir = path.join(this.project.path, '.vscode');
            if (!fs.existsSync(vscodeDir)) {
                fs.mkdirSync(vscodeDir, { recursive: true });
            }

            const enginePath = this.getEnginePath();
            const cppPropertiesPath = path.join(vscodeDir, 'c_cpp_properties.json');

            // Get all plugin source paths
            const pluginIncludePaths = this.getPluginIncludePaths();
            const generatedPaths = this.getGeneratedIncludePaths();
            const engineIncludePaths = this.getEngineIncludePaths(enginePath);

            const cppProperties = {
                configurations: [
                    {
                        name: "UE5",
                        includePath: [
                            // Project source
                            "${workspaceFolder}/Source/**",

                            // Generated files for project
                            ...generatedPaths,

                            // Plugin paths
                            "${workspaceFolder}/Plugins/**/Source/**/Public",
                            "${workspaceFolder}/Plugins/**/Source/**/Private",
                            "${workspaceFolder}/Plugins/**/Source/**/Classes",
                            ...pluginIncludePaths,

                            // Engine source paths
                            ...engineIncludePaths,

                            // Engine plugins
                            `${enginePath}/Engine/Plugins/**/Source/**/Public`,
                            `${enginePath}/Engine/Plugins/**/Source/**/Classes`,

                            // Generated engine files
                            `${enginePath}/Engine/Intermediate/Build/Win64/UnrealEditor/Inc/**`,
                            `${enginePath}/Engine/Intermediate/Build/Win64/${this.project.name}/Inc/**`,
                            `${enginePath}/Engine/Intermediate/Build/Win64/${this.project.name}Editor/Inc/**`,

                            // Build output paths
                            "${workspaceFolder}/Intermediate/Build/Win64/UnrealEditor/Inc/**",
                            `${this.project.path}/Intermediate/Build/Win64/${this.project.name}/Inc/**`,
                            `${this.project.path}/Intermediate/Build/Win64/${this.project.name}Editor/Inc/**`,

                            // Platform specific
                            `${enginePath}/Engine/Source/Runtime/Core/Public/Windows`,
                            `${enginePath}/Engine/Source/Runtime/Core/Public/Microsoft`,
                            `${enginePath}/Engine/Source/ThirdParty/Windows/DirectX/Include`
                        ],
                        defines: [
                            "WITH_EDITOR=1",
                            "UE_BUILD_DEVELOPMENT=1",
                            "UE_BUILD_DEVELOPMENT_WITH_DEBUGGAME=1",
                            "UE_ENGINE_DIRECTORY=\"" + enginePath.replace(/\\/g, '/') + "/Engine/\"",
                            "PLATFORM_WINDOWS=1",
                            "PLATFORM_MICROSOFT=1",
                            "PLATFORM_64BITS=1",
                            "UE_GAME=1",
                            "IS_PROGRAM=0",
                            "WITH_EDITORONLY_DATA=1",
                            "WITH_SERVER_CODE=1",
                            "WITH_PUSH_MODEL=1",
                            "WITH_CHAOS=1",
                            "UNICODE",
                            "_UNICODE",
                            "__UNREAL__",
                            "IS_MONOLITHIC=0",
                            "WITH_ENGINE=1",
                            "WITH_UNREAL_DEVELOPER_TOOLS=1",
                            "WITH_APPLICATION_CORE=1",
                            "WITH_COREUOBJECT=1",
                            "USE_STATS_WITHOUT_ENGINE=0",
                            "WITH_PLUGIN_SUPPORT=1",
                            "WITH_ACCESSIBILITY=1",
                            "WITH_PERFCOUNTERS=1",
                            "USE_LOGGING_IN_SHIPPING=0",
                            "WITH_LOGGING_TO_MEMORY=0",
                            "USE_CACHE_FREED_OS_ALLOCS=1",
                            "UE_BUILD_MINIMAL=0",
                            "UBT_COMPILED_PLATFORM=Windows",
                            "UBT_COMPILED_TARGET=Editor",
                            "WIN32=1",
                            "_WIN64=1",
                            "WINAPI_FAMILY=WINAPI_FAMILY_DESKTOP_APP",
                            "CORE_API=",
                            "COREUOBJECT_API=",
                            "ENGINE_API=",
                            "UNREALED_API=",
                            "SLATE_API=",
                            "SLATECORE_API=",
                            "INPUTCORE_API=",
                            "APPLICATIONCORE_API=",
                            "TOOLMENUS_API=",
                            "EDITORSTYLE_API=",
                            "SETTINGS_API=",
                            "RHI_API=",
                            "RENDERCORE_API=",
                            "WITH_LIVE_CODING=1"
                        ],
                        windowsSdkVersion: "10.0.22621.0",
                        compilerPath: this.getVisualStudioPath(),
                        cStandard: "c17",
                        cppStandard: "c++20",
                        intelliSenseMode: "windows-msvc-x64",
                        compilerArgs: [
                            "/permissive-",
                            "/Zc:inline",
                            "/Zc:strictStrings-",
                            "/Zc:__cplusplus",
                            "/bigobj",
                            "/wd4819",
                            "/wd4828",
                            "/D_CRT_SECURE_NO_WARNINGS",
                            "/D_CRT_NONSTDC_NO_WARNINGS"
                        ],
                        browse: {
                            path: [
                                "${workspaceFolder}",
                                `${enginePath}/Engine/Source`,
                                `${enginePath}/Engine/Plugins`
                            ],
                            limitSymbolsToIncludedHeaders: false,
                            databaseFilename: "${workspaceFolder}/.vscode/browse.vc.db"
                        },
                        forcedInclude: [
                            `${enginePath}/Engine/Source/Runtime/Core/Public/HAL/Platform.h`
                        ]
                    }
                ],
                version: 4
            };

            fs.writeFileSync(cppPropertiesPath, JSON.stringify(cppProperties, null, 4));

            // Create or update launch.json for debugging
            const launchPath = path.join(vscodeDir, 'launch.json');
            const launchConfig = {
                version: "0.2.0",
                configurations: [
                    {
                        name: "Launch UE5 Editor",
                        type: "cppvsdbg",
                        request: "launch",
                        program: path.join(enginePath, "Engine/Binaries/Win64/UnrealEditor.exe"),
                        args: [`"${this.project.uprojectPath}"`],
                        stopAtEntry: false,
                        cwd: "${workspaceFolder}",
                        environment: [],
                        console: "externalTerminal",
                        symbolSearchPath: `${enginePath}/Engine/Binaries/Win64;${this.project.path}/Binaries/Win64`,
                        sourceFileMap: {
                            "/Engine/Source/": `${enginePath}/Engine/Source/`
                        }
                    },
                    {
                        name: "Launch UE5 Editor (DebugGame)",
                        type: "cppvsdbg",
                        request: "launch",
                        program: path.join(enginePath, "Engine/Binaries/Win64/UnrealEditor-Win64-DebugGame.exe"),
                        args: [`"${this.project.uprojectPath}"`],
                        stopAtEntry: false,
                        cwd: "${workspaceFolder}",
                        environment: [],
                        console: "externalTerminal",
                        symbolSearchPath: `${enginePath}/Engine/Binaries/Win64;${this.project.path}/Binaries/Win64`,
                        sourceFileMap: {
                            "/Engine/Source/": `${enginePath}/Engine/Source/`
                        }
                    },
                    {
                        name: "Attach to UE5 Editor",
                        type: "cppvsdbg",
                        request: "attach",
                        processId: "${command:pickProcess}",
                        symbolSearchPath: `${enginePath}/Engine/Binaries/Win64;${this.project.path}/Binaries/Win64`
                    }
                ]
            };

            fs.writeFileSync(launchPath, JSON.stringify(launchConfig, null, 4));

            // Create tasks.json for build tasks
            const tasksPath = path.join(vscodeDir, 'tasks.json');
            const tasksConfig = {
                version: "2.0.0",
                tasks: [
                    {
                        label: "UE5: Build Development",
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
                        },
                        problemMatcher: [
                            {
                                owner: "cpp",
                                fileLocation: ["relative", "${workspaceFolder}"],
                                pattern: {
                                    regexp: "^(.*)\\((\\d+)\\)\\s*:\\s+(warning|error)\\s+(C\\d+)\\s*:\\s*(.*)$",
                                    file: 1,
                                    line: 2,
                                    severity: 3,
                                    code: 4,
                                    message: 5
                                }
                            }
                        ]
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
                    },
                    {
                        label: "UE5: Clean Build",
                        type: "shell",
                        command: "${command:ue5.cleanBuild}",
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

            // Create settings.json for optimal UE5 development
            const settingsPath = path.join(vscodeDir, 'settings.json');
            const settingsConfig = {
                "files.associations": {
                    "*.uproject": "json",
                    "*.uplugin": "json",
                    "*.h": "cpp",
                    "*.inl": "cpp",
                    "*.inc": "cpp"
                },
                "files.exclude": {
                    "**/Binaries": true,
                    "**/Intermediate": true,
                    "**/Saved": true,
                    "**/.vs": true,
                    "**/DerivedDataCache": true
                },
                "search.exclude": {
                    "**/Binaries": true,
                    "**/Intermediate": true,
                    "**/Saved": true,
                    "**/.vs": true,
                    "**/DerivedDataCache": true
                },
                "C_Cpp.intelliSenseEngine": "default",
                "C_Cpp.errorSquiggles": "enabled",
                "C_Cpp.autoAddFileAssociations": false,
                "C_Cpp.default.intelliSenseMode": "windows-msvc-x64",
                "C_Cpp.default.cppStandard": "c++20",
                "C_Cpp.default.cStandard": "c17",
                "C_Cpp.vcFormat.indent.braces": false,
                "C_Cpp.vcFormat.indent.multiLineRelativeTo": "innermost",
                "C_Cpp.vcFormat.indent.preserveIndentationInComments": true,
                "C_Cpp.vcFormat.newLine.beforeOpenBrace.block": "sameLine",
                "C_Cpp.vcFormat.newLine.beforeOpenBrace.function": "sameLine",
                "C_Cpp.vcFormat.space.beforeFunctionOpenParenthesis": "remove",
                "editor.tabSize": 4,
                "editor.insertSpaces": false,
                "editor.detectIndentation": false,
                "editor.rulers": [120],
                "editor.wordWrap": "off"
            };

            // Merge with existing settings if they exist
            if (fs.existsSync(settingsPath)) {
                try {
                    const existingSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                    Object.assign(existingSettings, settingsConfig);
                    fs.writeFileSync(settingsPath, JSON.stringify(existingSettings, null, 4));
                } catch (error) {
                    fs.writeFileSync(settingsPath, JSON.stringify(settingsConfig, null, 4));
                }
            } else {
                fs.writeFileSync(settingsPath, JSON.stringify(settingsConfig, null, 4));
            }

            this.showOutput('C++ environment configured successfully');
            
            // Reload the C++ extension to pick up new configuration
            await vscode.commands.executeCommand('C_Cpp.ReloadWorkspace');
            
        } catch (error) {
            this.showOutput(`Error setting up C++ environment: ${error}`);
        }
    }

    private getEngineIncludePaths(enginePath: string): string[] {
        const engineIncludePaths = [
            // Core engine source paths
            `${enginePath}/Engine/Source/**`,
            
            // Runtime modules - Core
            `${enginePath}/Engine/Source/Runtime/Core/Public`,
            `${enginePath}/Engine/Source/Runtime/Core/Private`,
            `${enginePath}/Engine/Source/Runtime/CoreUObject/Public`,
            `${enginePath}/Engine/Source/Runtime/CoreUObject/Private`,
            `${enginePath}/Engine/Source/Runtime/CoreUObject/Classes`,
            
            // Runtime modules - Engine
            `${enginePath}/Engine/Source/Runtime/Engine/Public`,
            `${enginePath}/Engine/Source/Runtime/Engine/Private`,
            `${enginePath}/Engine/Source/Runtime/Engine/Classes`,
            
            // Runtime modules - Application
            `${enginePath}/Engine/Source/Runtime/ApplicationCore/Public`,
            `${enginePath}/Engine/Source/Runtime/ApplicationCore/Private`,
            
            // Runtime modules - Input
            `${enginePath}/Engine/Source/Runtime/InputCore/Public`,
            `${enginePath}/Engine/Source/Runtime/InputCore/Private`,
            `${enginePath}/Engine/Source/Runtime/InputCore/Classes`,
            
            // Runtime modules - Slate
            `${enginePath}/Engine/Source/Runtime/Slate/Public`,
            `${enginePath}/Engine/Source/Runtime/Slate/Private`,
            `${enginePath}/Engine/Source/Runtime/SlateCore/Public`,
            `${enginePath}/Engine/Source/Runtime/SlateCore/Private`,
            
            // Runtime modules - Rendering
            `${enginePath}/Engine/Source/Runtime/RHI/Public`,
            `${enginePath}/Engine/Source/Runtime/RHI/Private`,
            `${enginePath}/Engine/Source/Runtime/RenderCore/Public`,
            `${enginePath}/Engine/Source/Runtime/RenderCore/Private`,
            `${enginePath}/Engine/Source/Runtime/Renderer/Public`,
            `${enginePath}/Engine/Source/Runtime/Renderer/Private`,
            
            // Runtime modules - Audio
            `${enginePath}/Engine/Source/Runtime/AudioMixer/Public`,
            `${enginePath}/Engine/Source/Runtime/AudioMixer/Private`,
            
            // Runtime modules - Networking
            `${enginePath}/Engine/Source/Runtime/Sockets/Public`,
            `${enginePath}/Engine/Source/Runtime/Sockets/Private`,
            `${enginePath}/Engine/Source/Runtime/Networking/Public`,
            `${enginePath}/Engine/Source/Runtime/Networking/Private`,
            
            // Editor modules
            `${enginePath}/Engine/Source/Editor/UnrealEd/Public`,
            `${enginePath}/Engine/Source/Editor/UnrealEd/Private`,
            `${enginePath}/Engine/Source/Editor/UnrealEd/Classes`,
            `${enginePath}/Engine/Source/Editor/ToolMenus/Public`,
            `${enginePath}/Engine/Source/Editor/ToolMenus/Private`,
            `${enginePath}/Engine/Source/Editor/EditorStyle/Public`,
            `${enginePath}/Engine/Source/Editor/EditorStyle/Private`,
            `${enginePath}/Engine/Source/Editor/EditorWidgets/Public`,
            `${enginePath}/Engine/Source/Editor/EditorWidgets/Private`,
            
            // Developer modules
            `${enginePath}/Engine/Source/Developer/Settings/Public`,
            `${enginePath}/Engine/Source/Developer/Settings/Private`,
            `${enginePath}/Engine/Source/Developer/DesktopPlatform/Public`,
            `${enginePath}/Engine/Source/Developer/DesktopPlatform/Private`,
            
            // Third party includes
            `${enginePath}/Engine/Source/ThirdParty/**`,
        ];

        return engineIncludePaths;
    }

    private getGeneratedIncludePaths(): string[] {
        const paths: string[] = [];
        const intermediatePath = path.join(this.project?.path || '', 'Intermediate', 'Build', 'Win64');

        if (fs.existsSync(intermediatePath)) {
            try {
                // Add project-specific generated paths
                const projectEditorPath = path.join(intermediatePath, `${this.project?.name}Editor`, 'Inc');
                const projectPath = path.join(intermediatePath, `${this.project?.name}`, 'Inc');
                const unrealEditorPath = path.join(intermediatePath, 'UnrealEditor', 'Inc');

                if (fs.existsSync(projectEditorPath)) {
                    paths.push(`\${workspaceFolder}/Intermediate/Build/Win64/${this.project?.name}Editor/Inc/**`);
                }
                if (fs.existsSync(projectPath)) {
                    paths.push(`\${workspaceFolder}/Intermediate/Build/Win64/${this.project?.name}/Inc/**`);
                }
                if (fs.existsSync(unrealEditorPath)) {
                    paths.push(`\${workspaceFolder}/Intermediate/Build/Win64/UnrealEditor/Inc/**`);
                }
            } catch (error) {
                console.error('Error reading generated include paths:', error);
            }
        }

        return paths;
    }

    private getPluginIncludePaths(): string[] {
        const includePaths: string[] = [];
        const pluginsDir = path.join(this.project?.path || '', 'Plugins');

        if (fs.existsSync(pluginsDir)) {
            try {
                const plugins = fs.readdirSync(pluginsDir);
                for (const plugin of plugins) {
                    const pluginPath = path.join(pluginsDir, plugin);
                    if (fs.statSync(pluginPath).isDirectory()) {
                        // Add specific plugin include paths
                        const pluginSourcePath = path.join(pluginPath, 'Source');
                        if (fs.existsSync(pluginSourcePath)) {
                            const sourceModules = fs.readdirSync(pluginSourcePath);
                            for (const module of sourceModules) {
                                const modulePath = path.join(pluginSourcePath, module);
                                if (fs.statSync(modulePath).isDirectory()) {
                                    includePaths.push(`\${workspaceFolder}/Plugins/${plugin}/Source/${module}/Public`);
                                    includePaths.push(`\${workspaceFolder}/Plugins/${plugin}/Source/${module}/Private`);
                                    includePaths.push(`\${workspaceFolder}/Plugins/${plugin}/Source/${module}`);
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error reading plugins for include paths:', error);
            }
        }

        return includePaths;
    }

    private async buildPluginFromContext(item?: SolutionItem) {
        if (!item || item.type !== 'plugin') {
            vscode.window.showErrorMessage('Please select a buildable plugin');
            return;
        }

        if (!item.buildable) {
            vscode.window.showErrorMessage('This plugin does not have buildable source code');
            return;
        }

        await this.buildPlugin(item.path, item.name);
    }

    private async buildPlugin(pluginPath: string, pluginName: string) {
        if (!this.project) {
            vscode.window.showErrorMessage('No UE5 project detected');
            return;
        }

        if (!pluginPath || !pluginName) {
            this.showOutput(`Plugin build failed: Invalid path or name - Path: ${pluginPath}, Name: ${pluginName}`);
            vscode.window.showErrorMessage('Invalid plugin path or name');
            return;
        }

        const enginePath = this.getEnginePath();
        if (!enginePath) {
            vscode.window.showErrorMessage('Engine path not configured');
            return;
        }

        const configuration = this.config.get<string>('defaultBuildConfiguration', 'Development');
        const platform = this.config.get<string>('defaultPlatform', 'Win64');
        const ubtPath = path.join(enginePath, 'Engine', 'Binaries', 'DotNET', 'UnrealBuildTool', 'UnrealBuildTool.exe');

        try {
            this.showOutput(`Building plugin: ${pluginName} (${configuration})...`);

            // Build the plugin using UBT - just build the whole project which includes plugins
            const buildCommand = `"${ubtPath}" ${this.project.name}Editor ${platform} ${configuration} -project="${this.project.uprojectPath}" -rocket -noubtmakefiles -utf8output`;

            this.showOutput(`Executing: ${buildCommand}`);

            const { stdout, stderr } = await execAsync(buildCommand, {
                cwd: this.project.path,
                maxBuffer: 1024 * 1024 * 10,
                env: {
                    ...process.env,
                    UE_LOG_LOCATION: '1',
                    PATH: process.env.PATH + `;${path.join(enginePath, 'Engine', 'Binaries', 'Win64')}`
                }
            });

            const hasErrors = stderr && (
                stderr.includes('error C') ||
                stderr.includes('fatal error') ||
                stderr.includes('Build failed') ||
                stderr.includes('ERROR:') ||
                stderr.includes('OtherCompilationError')
            );

            if (hasErrors) {
                this.showOutput(`Plugin build errors: ${stderr}`);
                vscode.window.showErrorMessage(`Plugin ${pluginName} build failed - check output for details`);
                return;
            }

            if (stderr) {
                this.showOutput(`Plugin build warnings: ${stderr}`);
            }

            this.showOutput(`Plugin ${pluginName} built successfully`);
            if (stdout) {
                this.showOutput(stdout);
            }
            vscode.window.showInformationMessage(`Plugin ${pluginName} built successfully`);
        } catch (error: any) {
            this.showOutput(`Plugin build failed: ${error.message}`);
            if (error.stdout) {
                this.showOutput(`Plugin build output: ${error.stdout}`);
            }
            if (error.stderr) {
                this.showOutput(`Plugin build errors: ${error.stderr}`);
            }
            vscode.window.showErrorMessage(`Plugin ${pluginName} build failed - check output for details`);
        }
    }

    private getVisualStudioPath(): string {
        // Try to find Visual Studio 2022 installation
        const vsPaths = [
            'C:/Program Files/Microsoft Visual Studio/2022/Community/VC/Tools/MSVC',
            'C:/Program Files/Microsoft Visual Studio/2022/Professional/VC/Tools/MSVC',
            'C:/Program Files/Microsoft Visual Studio/2022/Enterprise/VC/Tools/MSVC',
            'C:/Program Files (x86)/Microsoft Visual Studio/2022/Community/VC/Tools/MSVC',
            'C:/Program Files (x86)/Microsoft Visual Studio/2022/Professional/VC/Tools/MSVC',
            'C:/Program Files (x86)/Microsoft Visual Studio/2022/Enterprise/VC/Tools/MSVC'
        ];

        for (const vsPath of vsPaths) {
            if (fs.existsSync(vsPath)) {
                try {
                    const versions = fs.readdirSync(vsPath);
                    if (versions.length > 0) {
                        // Get the latest version
                        const latestVersion = versions.sort().reverse()[0];
                        return path.join(vsPath, latestVersion, 'bin/Hostx64/x64/cl.exe');
                    }
                } catch (error) {
                    continue;
                }
            }
        }

        // Fallback to a common path
        return 'C:/Program Files/Microsoft Visual Studio/2022/Community/VC/Tools/MSVC/14.39.33519/bin/Hostx64/x64/cl.exe';
    }
}

export function activate(context: vscode.ExtensionContext) {
    const ue5Tools = new UE5DevTools();
    ue5Tools.initialize(context);
}

export function deactivate() { }