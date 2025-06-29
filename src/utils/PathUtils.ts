// src/utils/PathUtils.ts
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class PathUtils {
    static getEnginePath(): string {
        const config = vscode.workspace.getConfiguration('ue5devtools');
        const configuredPath = config.get<string>('enginePath');
        
        if (configuredPath && fs.existsSync(configuredPath)) {
            return configuredPath;
        }

        // Auto-detect engine path
        const commonPaths = [
            'C:\\Program Files\\Epic Games\\UE_5.6',
            'C:\\Program Files\\Epic Games\\UE_5.5',
            'C:\\Program Files\\Epic Games\\UE_5.4',
            'C:\\Program Files\\Epic Games\\UE_5.3',
            'C:\\Program Files (x86)\\Epic Games\\UE_5.6',
            'C:\\Program Files (x86)\\Epic Games\\UE_5.5',
            'C:\\Program Files (x86)\\Epic Games\\UE_5.4',
            'D:\\Epic Games\\UE_5.6',
            'D:\\Epic Games\\UE_5.5',
            'D:\\Epic Games\\UE_5.4',
            'C:\\UnrealEngine',
            'D:\\UnrealEngine',
            'E:\\UnrealEngine'
        ];

        for (const commonPath of commonPaths) {
            if (fs.existsSync(commonPath)) {
                return commonPath;
            }
        }

        return '';
    }

    static getUnrealBuildToolPath(enginePath: string): string {
        return path.join(enginePath, 'Engine', 'Binaries', 'DotNET', 'UnrealBuildTool', 'UnrealBuildTool.exe');
    }

    static getEngineBinariesPath(enginePath: string): string {
        return path.join(enginePath, 'Engine', 'Binaries', 'Win64');
    }

    static getEditorPath(enginePath: string): string {
        return path.join(enginePath, 'Engine', 'Binaries', 'Win64', 'UnrealEditor.exe');
    }

    static getEditorCmdPath(enginePath: string): string {
        return path.join(enginePath, 'Engine', 'Binaries', 'Win64', 'UnrealEditor-Cmd.exe');
    }

    static getRunUATPath(enginePath: string): string {
        return path.join(enginePath, 'Engine', 'Build', 'BatchFiles', 'RunUAT.bat');
    }

    static getVisualStudioInstallPath(): string | null {
        const vsPaths = [
            'C:/Program Files/Microsoft Visual Studio/2022',
            'C:/Program Files (x86)/Microsoft Visual Studio/2022',
            'C:/Program Files/Microsoft Visual Studio/2019',
            'C:/Program Files (x86)/Microsoft Visual Studio/2019'
        ];

        for (const vsBasePath of vsPaths) {
            const editions = ['Enterprise', 'Professional', 'Community'];
            for (const edition of editions) {
                const fullPath = path.join(vsBasePath, edition);
                if (fs.existsSync(fullPath)) {
                    return fullPath;
                }
            }
        }

        return null;
    }

    static getVisualStudioCompilerPath(): string {
        const vsPath = this.getVisualStudioInstallPath();
        if (!vsPath) {
            return 'cl.exe';
        }

        const vcToolsPath = path.join(vsPath, 'VC', 'Tools', 'MSVC');
        if (fs.existsSync(vcToolsPath)) {
            try {
                const versions = fs.readdirSync(vcToolsPath).sort().reverse();
                if (versions.length > 0) {
                    return path.join(vcToolsPath, versions[0], 'bin', 'Hostx64', 'x64', 'cl.exe');
                }
            } catch (error) {
                // Fallback
            }
        }

        return 'cl.exe';
    }

    static getWindowsSdkPath(): string | null {
        const sdkPaths = [
            'C:/Program Files (x86)/Windows Kits/10',
            'C:/Program Files/Windows Kits/10'
        ];

        for (const sdkPath of sdkPaths) {
            if (fs.existsSync(sdkPath)) {
                return sdkPath;
            }
        }

        return null;
    }

    static getWindowsSdkVersion(): string {
        const sdkPath = this.getWindowsSdkPath();
        if (!sdkPath) {
            return "10.0.22621.0"; // fallback
        }

        const includePath = path.join(sdkPath, 'Include');
        if (fs.existsSync(includePath)) {
            try {
                const versions = fs.readdirSync(includePath)
                    .filter(v => v.match(/^10\.\d+\.\d+\.\d+$/))
                    .sort()
                    .reverse();
                if (versions.length > 0) {
                    return versions[0];
                }
            } catch (error) {
                // Fallback
            }
        }

        return "10.0.22621.0";
    }

    static getMSBuildPath(): string | null {
        const vsPath = this.getVisualStudioInstallPath();
        if (vsPath) {
            const msbuildPath = path.join(vsPath, 'MSBuild', 'Current', 'Bin', 'MSBuild.exe');
            if (fs.existsSync(msbuildPath)) {
                return msbuildPath;
            }
        }

        // Try common MSBuild locations
        const commonMSBuildPaths = [
            'C:/Program Files/Microsoft Visual Studio/2022/Enterprise/MSBuild/Current/Bin/MSBuild.exe',
            'C:/Program Files/Microsoft Visual Studio/2022/Professional/MSBuild/Current/Bin/MSBuild.exe',
            'C:/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe',
            'C:/Program Files (x86)/Microsoft Visual Studio/2019/Enterprise/MSBuild/Current/Bin/MSBuild.exe',
            'C:/Program Files (x86)/Microsoft Visual Studio/2019/Professional/MSBuild/Current/Bin/MSBuild.exe',
            'C:/Program Files (x86)/Microsoft Visual Studio/2019/Community/MSBuild/Current/Bin/MSBuild.exe'
        ];

        for (const msbuildPath of commonMSBuildPaths) {
            if (fs.existsSync(msbuildPath)) {
                return msbuildPath;
            }
        }

        return null;
    }

    static validateEnginePath(enginePath: string): boolean {
        if (!enginePath || !fs.existsSync(enginePath)) {
            return false;
        }

        // Check for key engine files
        const requiredPaths = [
            path.join(enginePath, 'Engine', 'Binaries', 'Win64', 'UnrealEditor.exe'),
            path.join(enginePath, 'Engine', 'Binaries', 'DotNET', 'UnrealBuildTool', 'UnrealBuildTool.exe'),
            path.join(enginePath, 'Engine', 'Source'),
            path.join(enginePath, 'Engine', 'Build')
        ];

        for (const requiredPath of requiredPaths) {
            if (!fs.existsSync(requiredPath)) {
                return false;
            }
        }

        return true;
    }

    static getEngineVersion(enginePath: string): string | null {
        try {
            const versionFilePath = path.join(enginePath, 'Engine', 'Build', 'Build.version');
            if (fs.existsSync(versionFilePath)) {
                const versionContent = fs.readFileSync(versionFilePath, 'utf8');
                const versionData = JSON.parse(versionContent);
                return `${versionData.MajorVersion}.${versionData.MinorVersion}.${versionData.PatchVersion}`;
            }
        } catch (error) {
            // Fallback to directory name
            const engineDirName = path.basename(enginePath);
            const versionMatch = engineDirName.match(/UE_(\d+\.\d+)/);
            if (versionMatch) {
                return versionMatch[1];
            }
        }

        return null;
    }

    static getAllEngineInstallations(): Array<{ path: string; version: string | null }> {
        const installations: Array<{ path: string; version: string | null }> = [];

        // Check Epic Games launcher installations
        const epicPaths = [
            'C:\\Program Files\\Epic Games',
            'C:\\Program Files (x86)\\Epic Games',
            'D:\\Epic Games',
            'E:\\Epic Games'
        ];

        for (const epicPath of epicPaths) {
            if (fs.existsSync(epicPath)) {
                try {
                    const dirs = fs.readdirSync(epicPath);
                    for (const dir of dirs) {
                        if (dir.startsWith('UE_')) {
                            const fullPath = path.join(epicPath, dir);
                            if (this.validateEnginePath(fullPath)) {
                                const version = this.getEngineVersion(fullPath);
                                installations.push({ path: fullPath, version });
                            }
                        }
                    }
                } catch (error) {
                    // Continue checking other paths
                }
            }
        }

        // Check common source build locations
        const sourcePaths = [
            'C:\\UnrealEngine',
            'D:\\UnrealEngine',
            'E:\\UnrealEngine'
        ];

        for (const sourcePath of sourcePaths) {
            if (this.validateEnginePath(sourcePath)) {
                const version = this.getEngineVersion(sourcePath);
                installations.push({ path: sourcePath, version });
            }
        }

        return installations;
    }

    static normalizeWindowsPath(inputPath: string): string {
        return inputPath.replace(/\//g, '\\');
    }

    static normalizeUnixPath(inputPath: string): string {
        return inputPath.replace(/\\/g, '/');
    }

    static getRelativePath(fromPath: string, toPath: string): string {
        return path.relative(fromPath, toPath);
    }

    static ensureDirectoryExists(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    static async promptForEnginePath(): Promise<string | undefined> {
        const installations = this.getAllEngineInstallations();
        
        if (installations.length > 0) {
            // Show quick pick for known installations
            const items = installations.map(install => ({
                label: `UE ${install.version || 'Unknown'} - ${path.basename(install.path)}`,
                description: install.path,
                path: install.path
            }));

            items.push({
                label: '$(folder-opened) Browse for Engine...',
                description: 'Select a custom engine installation',
                path: ''
            });

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select Unreal Engine installation'
            });

            if (selected) {
                if (selected.path) {
                    return selected.path;
                } else {
                    // User wants to browse
                    return this.browseForEnginePath();
                }
            }
        } else {
            // No installations found, go straight to browse
            return this.browseForEnginePath();
        }

        return undefined;
    }

    private static async browseForEnginePath(): Promise<string | undefined> {
        const result = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            title: 'Select Unreal Engine Installation Directory'
        });

        if (result && result.length > 0) {
            const selectedPath = result[0].fsPath;
            if (this.validateEnginePath(selectedPath)) {
                return selectedPath;
            } else {
                vscode.window.showErrorMessage('Selected directory is not a valid Unreal Engine installation');
            }
        }

        return undefined;
    }
}