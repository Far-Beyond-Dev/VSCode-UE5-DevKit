// src/utils/PluginIntelliSenseFix.ts
import * as fs from 'fs';
import * as path from 'path';
import { UE5Project } from '../types';

export class PluginIntelliSenseFix {
    static generatePluginSpecificIncludes(project: UE5Project, enginePath: string): string[] {
        const includes: string[] = [];
        
        // Add project-specific plugin paths
        const pluginsDir = path.join(project.path, 'Plugins');
        if (fs.existsSync(pluginsDir)) {
            try {
                const plugins = fs.readdirSync(pluginsDir);
                for (const plugin of plugins) {
                    const pluginPath = path.join(pluginsDir, plugin);
                    if (fs.statSync(pluginPath).isDirectory()) {
                        // Add all source module paths for this plugin
                        const sourcePath = path.join(pluginPath, 'Source');
                        if (fs.existsSync(sourcePath)) {
                            const modules = fs.readdirSync(sourcePath);
                            for (const module of modules) {
                                const modulePath = path.join(sourcePath, module);
                                if (fs.statSync(modulePath).isDirectory()) {
                                    // Add both Public and Private folders
                                    includes.push(`\${workspaceFolder}/Plugins/${plugin}/Source/${module}/Public`);
                                    includes.push(`\${workspaceFolder}/Plugins/${plugin}/Source/${module}/Private`);
                                    includes.push(`\${workspaceFolder}/Plugins/${plugin}/Source/${module}/Classes`);
                                    includes.push(`\${workspaceFolder}/Plugins/${plugin}/Source/${module}`);
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error reading plugins for includes:', error);
            }
        }
        
        return includes;
    }

    static getPluginSpecificDefines(project: UE5Project): string[] {
        const defines: string[] = [];
        
        // Read the .uproject file to get plugin-specific defines
        try {
            const uprojectContent = fs.readFileSync(project.uprojectPath, 'utf8');
            const uprojectData = JSON.parse(uprojectContent);
            
            if (uprojectData.Plugins && Array.isArray(uprojectData.Plugins)) {
                for (const plugin of uprojectData.Plugins) {
                    if (plugin.Enabled !== false) {
                        // Add plugin-specific defines
                        const pluginName = plugin.Name.toUpperCase();
                        defines.push(`WITH_${pluginName}=1`);
                        defines.push(`${pluginName}_API=`);
                    }
                }
            }
        } catch (error) {
            console.error('Error reading plugin defines:', error);
        }
        
        return defines;
    }

    static ensurePluginHeadersVisible(project: UE5Project, enginePath: string): string[] {
        // This method ensures that plugin headers are properly visible to IntelliSense
        // following Epic's documentation exactly
        
        const includes: string[] = [
            // Epic's exact recommendation from documentation
            "${workspaceFolder}/Source/**",
            "${workspaceFolder}/Plugins/**",
            "${workspaceFolder}/Intermediate/**",
        ];

        // Add engine includes that are critical for basic UE5 functionality
        const engineIncludes = [
            // Core runtime - absolutely essential
            `${enginePath}/Engine/Source/Runtime/Core/Public`,
            `${enginePath}/Engine/Source/Runtime/CoreUObject/Public`,
            `${enginePath}/Engine/Source/Runtime/CoreUObject/Classes`,
            `${enginePath}/Engine/Source/Runtime/Engine/Public`,
            `${enginePath}/Engine/Source/Runtime/Engine/Classes`,
            
            // Module system
            `${enginePath}/Engine/Source/Runtime/Projects/Public`,
            `${enginePath}/Engine/Source/Runtime/Projects/Classes`,
            
            // Generated headers location
            `${enginePath}/Engine/Intermediate/Build/Win64/UnrealEditor/Inc/**`,
            `${enginePath}/Engine/Intermediate/Build/Win64/${project.name}/Inc/**`,
            `${enginePath}/Engine/Intermediate/Build/Win64/${project.name}Editor/Inc/**`,
        ];

        includes.push(...engineIncludes);
        
        // Add project-specific generated paths
        const projectGeneratedPaths = [
            "${workspaceFolder}/Intermediate/Build/Win64/UnrealEditor/Inc/**",
            `\${workspaceFolder}/Intermediate/Build/Win64/${project.name}/Inc/**`,
            `\${workspaceFolder}/Intermediate/Build/Win64/${project.name}Editor/Inc/**`,
        ];

        includes.push(...projectGeneratedPaths);
        
        return includes;
    }

    static getEssentialUE5Defines(project: UE5Project, enginePath: string): string[] {
        // These are the absolute minimum defines needed for basic UE5 IntelliSense
        return [
            // Core UE5 defines
            "WITH_EDITOR=1",
            "UE_BUILD_DEVELOPMENT=1", 
            "UE_BUILD_DEVELOPMENT_WITH_DEBUGGAME=1",
            "UE_ENGINE_DIRECTORY=\"" + enginePath.replace(/\\/g, '/') + "/Engine/\"",
            
            // Platform
            "PLATFORM_WINDOWS=1",
            "PLATFORM_MICROSOFT=1", 
            "PLATFORM_64BITS=1",
            "WIN32=1",
            "_WIN64=1",
            
            // Unicode
            "UNICODE=1",
            "_UNICODE=1", 
            
            // Unreal core
            "__UNREAL__=1",
            "UE_GAME=1",
            "IS_PROGRAM=0",
            "IS_MONOLITHIC=0",
            "WITH_ENGINE=1",
            "WITH_UNREAL_DEVELOPER_TOOLS=1",
            "WITH_APPLICATION_CORE=1",
            "WITH_COREUOBJECT=1",
            "WITH_EDITORONLY_DATA=1",
            
            // Build configuration
            "UBT_COMPILED_PLATFORM=Windows",
            "UBT_COMPILED_TARGET=Editor",
            
            // Essential module APIs - these prevent "unknown type" errors
            "CORE_API=",
            "COREUOBJECT_API=", 
            "ENGINE_API=",
            "UNREALED_API=",
            
            // Plugin support
            "WITH_PLUGIN_SUPPORT=1",
            
            // Logging (essential for DEFINE_LOG_CATEGORY)
            "WITH_LOGGING_TO_MEMORY=0",
            "USE_LOGGING_IN_SHIPPING=0",
            
            // Memory
            "USE_CACHE_FREED_OS_ALLOCS=1",
            
            // Security
            "_CRT_SECURE_NO_WARNINGS=1",
            "_CRT_NONSTDC_NO_WARNINGS=1",
        ];
    }
}

// Enhanced c_cpp_properties.json generation specifically for plugin development
export function generateEnhancedCppProperties(project: UE5Project, enginePath: string) {
    const pluginIncludes = PluginIntelliSenseFix.ensurePluginHeadersVisible(project, enginePath);
    const specificPluginIncludes = PluginIntelliSenseFix.generatePluginSpecificIncludes(project, enginePath);
    const pluginDefines = PluginIntelliSenseFix.getPluginSpecificDefines(project);
    const essentialDefines = PluginIntelliSenseFix.getEssentialUE5Defines(project, enginePath);

    return {
        configurations: [
            {
                name: `${project.name} Editor Win64 Development`,
                intelliSenseMode: "windows-msvc-x64",
                compileCommands: "",
                cStandard: "c17",
                cppStandard: "c++20",
                includePath: [
                    ...pluginIncludes,
                    ...specificPluginIncludes
                ],
                defines: [
                    ...essentialDefines,
                    ...pluginDefines
                ],
                windowsSdkVersion: "10.0.22621.0",
                compilerPath: "cl.exe",
                configurationProvider: "ms-vscode.cpptools",
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
}