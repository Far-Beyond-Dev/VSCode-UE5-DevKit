// src/generators/CppPropertiesGenerator.ts
import * as fs from 'fs';
import * as path from 'path';
import { UE5Project } from '../types';
import { PathUtils } from '../utils/PathUtils';

export class CppPropertiesGenerator {
    constructor(private project: UE5Project) {}

    generate() {
        const enginePath = PathUtils.getEnginePath();
        const windowsSdkVersion = this.getWindowsSdkVersion();
        const compilerPath = this.getCompilerPath();

        return {
            configurations: [
                {
                    name: `${this.project.name} Editor Win64 Development`,
                    includePath: this.getIncludePaths(enginePath),
                    defines: this.getDefines(enginePath),
                    windowsSdkVersion: windowsSdkVersion,
                    compilerPath: compilerPath,
                    cStandard: "c17",
                    cppStandard: "c++20",
                    intelliSenseMode: "windows-msvc-x64",
                    compilerArgs: this.getCompilerArgs(),
                    browse: {
                        path: this.getBrowsePaths(enginePath),
                        limitSymbolsToIncludedHeaders: false,
                        databaseFilename: "${workspaceFolder}/.vscode/browse.vc.db"
                    },
                    forcedInclude: this.getForcedIncludes(enginePath),
                    configurationProvider: "ms-vscode.cpptools"
                }
            ],
            version: 4
        };
    }

    private getIncludePaths(enginePath: string): string[] {
        return [
            // CRITICAL: Generated headers MUST come first for IntelliSense to work properly
            "${workspaceFolder}/Intermediate/**",
            "${workspaceFolder}/Intermediate/Build/Win64/UnrealEditor/Inc/**",
            `\${workspaceFolder}/Intermediate/Build/Win64/${this.project.name}/Inc/**`,
            `\${workspaceFolder}/Intermediate/Build/Win64/${this.project.name}Editor/Inc/**`,
            
            // Project source code paths
            "${workspaceFolder}/Source/**",
            "${workspaceFolder}/Plugins/**",
            
            // Specific plugin source paths (auto-detected from project structure)
            ...this.getProjectPluginPaths(),
            
            // Engine generated headers (critical for engine types)
            `${enginePath}/Engine/Intermediate/**`,
            
            // Engine source with full recursive search
            `${enginePath}/Engine/Source/**`,
            
            // NETWORKING AND TRACE MODULES (fixes missing system headers)
            `${enginePath}/Engine/Source/Runtime/TraceLog/Public`,
            `${enginePath}/Engine/Source/Runtime/TraceLog/Private`,
            `${enginePath}/Engine/Source/Runtime/Sockets/Public`,
            `${enginePath}/Engine/Source/Runtime/Sockets/Private`,
            `${enginePath}/Engine/Source/Runtime/Networking/Public`,
            `${enginePath}/Engine/Source/Runtime/Networking/Private`,
            `${enginePath}/Engine/Source/Runtime/OnlineSubsystemUtils/Public`,
            `${enginePath}/Engine/Source/Runtime/Net/Common/Public`,
            `${enginePath}/Engine/Source/Runtime/NetCore/Public`,
            
            // Core engine runtime paths (essential for basic UE5 functionality)
            `${enginePath}/Engine/Source/Runtime/Core/Public`,
            `${enginePath}/Engine/Source/Runtime/Core/Private`,
            `${enginePath}/Engine/Source/Runtime/CoreUObject/Public`,
            `${enginePath}/Engine/Source/Runtime/CoreUObject/Private`,
            `${enginePath}/Engine/Source/Runtime/CoreUObject/Classes`,
            `${enginePath}/Engine/Source/Runtime/Engine/Public`,
            `${enginePath}/Engine/Source/Runtime/Engine/Private`,
            `${enginePath}/Engine/Source/Runtime/Engine/Classes`,
            
            // HAL (Hardware Abstraction Layer) and Platform specific
            `${enginePath}/Engine/Source/Runtime/Core/Public/HAL`,
            `${enginePath}/Engine/Source/Runtime/Core/Public/Modules`,
            `${enginePath}/Engine/Source/Runtime/Core/Public/Logging`,
            `${enginePath}/Engine/Source/Runtime/Core/Public/GenericPlatform`,
            `${enginePath}/Engine/Source/Runtime/Core/Public/Windows`,
            `${enginePath}/Engine/Source/Runtime/Core/Public/Microsoft`,
            
            // Application layer and input handling
            `${enginePath}/Engine/Source/Runtime/ApplicationCore/Public`,
            `${enginePath}/Engine/Source/Runtime/ApplicationCore/Private`,
            `${enginePath}/Engine/Source/Runtime/InputCore/Public`,
            `${enginePath}/Engine/Source/Runtime/InputCore/Private`,
            `${enginePath}/Engine/Source/Runtime/InputCore/Classes`,
            
            // Slate UI framework
            `${enginePath}/Engine/Source/Runtime/Slate/Public`,
            `${enginePath}/Engine/Source/Runtime/Slate/Private`,
            `${enginePath}/Engine/Source/Runtime/SlateCore/Public`,
            `${enginePath}/Engine/Source/Runtime/SlateCore/Private`,
            
            // Rendering system
            `${enginePath}/Engine/Source/Runtime/RHI/Public`,
            `${enginePath}/Engine/Source/Runtime/RHI/Private`,
            `${enginePath}/Engine/Source/Runtime/RenderCore/Public`,
            `${enginePath}/Engine/Source/Runtime/RenderCore/Private`,
            `${enginePath}/Engine/Source/Runtime/Renderer/Public`,
            `${enginePath}/Engine/Source/Runtime/Renderer/Private`,
            
            // Audio system
            `${enginePath}/Engine/Source/Runtime/AudioMixer/Public`,
            `${enginePath}/Engine/Source/Runtime/AudioMixer/Private`,
            
            // Editor functionality
            `${enginePath}/Engine/Source/Editor/UnrealEd/Public`,
            `${enginePath}/Engine/Source/Editor/UnrealEd/Private`,
            `${enginePath}/Engine/Source/Editor/UnrealEd/Classes`,
            `${enginePath}/Engine/Source/Editor/ToolMenus/Public`,
            `${enginePath}/Engine/Source/Editor/ToolMenus/Private`,
            `${enginePath}/Engine/Source/Editor/EditorStyle/Public`,
            `${enginePath}/Engine/Source/Editor/EditorStyle/Private`,
            `${enginePath}/Engine/Source/Editor/EditorWidgets/Public`,
            `${enginePath}/Engine/Source/Editor/EditorWidgets/Private`,
            
            // Developer tools
            `${enginePath}/Engine/Source/Developer/Settings/Public`,
            `${enginePath}/Engine/Source/Developer/Settings/Private`,
            `${enginePath}/Engine/Source/Developer/DesktopPlatform/Public`,
            `${enginePath}/Engine/Source/Developer/DesktopPlatform/Private`,
            
            // Engine plugins with recursive search
            `${enginePath}/Engine/Plugins/**/Source/**/Public`,
            `${enginePath}/Engine/Plugins/**/Source/**/Private`,
            `${enginePath}/Engine/Plugins/**/Source/**/Classes`,
            
            // Third party libraries and tools
            `${enginePath}/Engine/Source/ThirdParty/**`,
            
            // Platform-specific DirectX and Windows SDK
            `${enginePath}/Engine/Source/ThirdParty/Windows/DirectX/Include`,
            
            // Standard library paths for proper IntelliSense
            ...this.getStandardLibraryPaths(),
        ];
    }

    private getDefines(enginePath: string): string[] {
        return [
            // UE5 REFLECTION SYSTEM MACROS (ABSOLUTELY CRITICAL)
            // These macros tell IntelliSense to ignore UE5's reflection syntax
            "USTRUCT(...)=",
            "UCLASS(...)=", 
            "UPROPERTY(...)=",
            "UFUNCTION(...)=",
            "UENUM(...)=",
            "UMETA(...)=",
            "GENERATED_BODY()=",
            "GENERATED_USTRUCT_BODY()=", 
            "GENERATED_UCLASS_BODY()=",
            "GENERATED_UENUM_BODY()=",
            
            // UE5 MODULE SYSTEM MACROS
            // These fix module implementation and logging errors
            "IMPLEMENT_MODULE(...)=",
            "IMPLEMENT_PRIMARY_GAME_MODULE(...)=",
            "IMPLEMENT_GAME_MODULE(...)=",
            "DEFINE_LOG_CATEGORY(...);",
            "DEFINE_LOG_CATEGORY_STATIC(...);",
            "DECLARE_LOG_CATEGORY_EXTERN(...);",
            "DECLARE_LOG_CATEGORY_CLASS(...);",
            
            // UE5 COMMON MACROS AND KEYWORDS
            // These prevent IntelliSense from showing errors on UE5 keywords
            "FORCEINLINE=inline",
            "FORCENOINLINE=",
            "RESTRICT=",
            "CONSTEXPR=constexpr",
            "DEPRECATED(...)=",
            "UE_DEPRECATED(...)=",
            "PRAGMA_DISABLE_DEPRECATION_WARNINGS=",
            "PRAGMA_ENABLE_DEPRECATION_WARNINGS=",
            "PRAGMA_DISABLE_OPTIMIZATION=",
            "PRAGMA_ENABLE_OPTIMIZATION=",
            
            // UE5 SUBSYSTEM MACROS
            // For GameInstanceSubsystem, WorldSubsystem, etc.
            "USUBSYSTEM(...)=",
            
            // UE5 DELEGATE MACROS
            // For event handling and callbacks
            "DECLARE_DYNAMIC_MULTICAST_DELEGATE(...);",
            "DECLARE_DYNAMIC_DELEGATE(...);",
            "DECLARE_MULTICAST_DELEGATE(...);",
            "DECLARE_DELEGATE(...);",
            "DECLARE_EVENT(...);",
            
            // CORE BUILD CONFIGURATION
            "WITH_EDITOR=1",
            "UE_BUILD_DEVELOPMENT=1",
            "UE_BUILD_DEVELOPMENT_WITH_DEBUGGAME=1",
            "UE_ENGINE_DIRECTORY=\"" + enginePath.replace(/\\/g, '/') + "/Engine/\"",
            
            // PLATFORM IDENTIFICATION
            "PLATFORM_WINDOWS=1",
            "PLATFORM_MICROSOFT=1",
            "PLATFORM_64BITS=1",
            "WIN32=1",
            "_WIN64=1",
            "WINAPI_FAMILY=WINAPI_FAMILY_DESKTOP_APP",
            
            // UNICODE SUPPORT
            "UNICODE=1",
            "_UNICODE=1",
            
            // UNREAL ENGINE CORE DEFINES
            "__UNREAL__=1",
            "UE_GAME=1",
            "IS_PROGRAM=0",
            "IS_MONOLITHIC=0",
            "WITH_ENGINE=1",
            "WITH_UNREAL_DEVELOPER_TOOLS=1",
            "WITH_APPLICATION_CORE=1",
            "WITH_COREUOBJECT=1",
            "WITH_EDITORONLY_DATA=1",
            "WITH_SERVER_CODE=1",
            "WITH_PUSH_MODEL=1",
            "WITH_CHAOS=1",
            "WITH_PLUGIN_SUPPORT=1",
            "WITH_ACCESSIBILITY=1",
            "WITH_PERFCOUNTERS=1",
            "WITH_LIVE_CODING=1",
            
            // BUILD TARGET CONFIGURATION
            "UBT_COMPILED_PLATFORM=Windows",
            "UBT_COMPILED_TARGET=Editor",
            
            // MODULE API MACROS (CRITICAL FOR INTELLISENSE)
            // These prevent "unknown type" errors for UE5 classes
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
            "EDITORWIDGETS_API=",
            "SETTINGS_API=",
            "RHI_API=",
            "RENDERCORE_API=",
            "RENDERER_API=",
            "AUDIOMIXER_API=",
            "PROJECTS_API=",
            "SOCKETS_API=",
            "NETWORKING_API=",
            "NETCORE_API=",
            "ONLINESUBSYSTEMUTILS_API=",
            "TRACELOG_API=",
            
            // PROJECT-SPECIFIC MODULE API
            `${this.project.name.toUpperCase()}_API=`,
            
            // COMMON PLUGIN APIs (add more as needed for your plugins)
            ...this.getProjectPluginApis(),
            
            // SECURITY AND COMPATIBILITY
            "_CRT_SECURE_NO_WARNINGS=1",
            "_CRT_NONSTDC_NO_WARNINGS=1",
            "NOMINMAX=1",
            "WIN32_LEAN_AND_MEAN=1",
            
            // LOGGING SYSTEM CONFIGURATION
            "USE_LOGGING_IN_SHIPPING=0",
            "WITH_LOGGING_TO_MEMORY=0",
            
            // MEMORY AND PERFORMANCE
            "USE_CACHE_FREED_OS_ALLOCS=1",
            "USE_STATS_WITHOUT_ENGINE=0",
            "UE_BUILD_MINIMAL=0",
            
            // PHYSICS ENGINE (UE5 uses Chaos Physics)
            "WITH_PHYSX=0",
            "WITH_CHAOS=1",
            "PHYSICS_INTERFACE_PHYSX=0",
            "WITH_IMMEDIATE_PHYSX=0",
            
            // RENDERING FEATURES
            "WITH_CUSTOM_SV_POSITION=0",
            "COMPILE_WITHOUT_UNREAL_SUPPORT=0",
            
            // BLUEPRINT SYSTEM
            "WITH_BLUEPRINTGRAPH=1",
            "UE_BLUEPRINT_EVENTGRAPH_FASTCALLS=1",
            
            // ADDITIONAL ENGINE FEATURES
            "WITH_AUTOMATION_TESTS=1",
            "WITH_PERF_AUTOMATION_TESTS=1"
        ];
    }

    private getCompilerArgs(): string[] {
        return [
            "/permissive-",                    // Enable conformance mode
            "/Zc:inline",                      // Remove unreferenced functions and data
            "/Zc:strictStrings-",              // Disable string literal to char* conversion
            "/Zc:__cplusplus",                 // Enable correct __cplusplus macro
            "/bigobj",                         // Enable large object files
            "/wd4819",                         // Disable warning about non-ASCII characters
            "/wd4828",                         // Disable warning about disallowed characters
            "/D_CRT_SECURE_NO_WARNINGS",       // Disable CRT security warnings
            "/D_CRT_NONSTDC_NO_WARNINGS",      // Disable non-standard function warnings
            "/DNOMINMAX",                      // Prevent Windows.h from defining min/max macros
            "/experimental:module"             // Enable C++20 modules support
        ];
    }

    private getBrowsePaths(enginePath: string): string[] {
        return [
            "${workspaceFolder}",
            `${enginePath}/Engine/Source`,
            `${enginePath}/Engine/Plugins`
        ];
    }

    private getForcedIncludes(enginePath: string): string[] {
        return [
            `${enginePath}/Engine/Source/Runtime/Core/Public/HAL/Platform.h`
        ];
    }

    private getProjectPluginPaths(): string[] {
        const pluginPaths: string[] = [];
        const pluginsDir = path.join(this.project.path, 'Plugins');

        if (fs.existsSync(pluginsDir)) {
            try {
                const plugins = fs.readdirSync(pluginsDir);
                for (const plugin of plugins) {
                    const pluginPath = path.join(pluginsDir, plugin);
                    if (fs.statSync(pluginPath).isDirectory()) {
                        // Add specific plugin include paths
                        pluginPaths.push(`\${workspaceFolder}/Plugins/${plugin}/Source/${plugin}/Public`);
                        pluginPaths.push(`\${workspaceFolder}/Plugins/${plugin}/Source/${plugin}/Private`);
                        pluginPaths.push(`\${workspaceFolder}/Plugins/${plugin}/Source/${plugin}`);
                        
                        // Check for additional modules in the plugin
                        const pluginSourcePath = path.join(pluginPath, 'Source');
                        if (fs.existsSync(pluginSourcePath)) {
                            const modules = fs.readdirSync(pluginSourcePath);
                            for (const module of modules) {
                                const modulePath = path.join(pluginSourcePath, module);
                                if (fs.statSync(modulePath).isDirectory() && module !== plugin) {
                                    pluginPaths.push(`\${workspaceFolder}/Plugins/${plugin}/Source/${module}/Public`);
                                    pluginPaths.push(`\${workspaceFolder}/Plugins/${plugin}/Source/${module}/Private`);
                                    pluginPaths.push(`\${workspaceFolder}/Plugins/${plugin}/Source/${module}`);
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error reading plugins for include paths:', error);
            }
        }

        return pluginPaths;
    }

    private getProjectPluginApis(): string[] {
        const pluginApis: string[] = [];
        const pluginsDir = path.join(this.project.path, 'Plugins');

        if (fs.existsSync(pluginsDir)) {
            try {
                const plugins = fs.readdirSync(pluginsDir);
                for (const plugin of plugins) {
                    const pluginPath = path.join(pluginsDir, plugin);
                    if (fs.statSync(pluginPath).isDirectory()) {
                        // Add API define for each plugin
                        pluginApis.push(`${plugin.toUpperCase()}_API=`);
                        
                        // Check for additional modules in the plugin
                        const pluginSourcePath = path.join(pluginPath, 'Source');
                        if (fs.existsSync(pluginSourcePath)) {
                            const modules = fs.readdirSync(pluginSourcePath);
                            for (const module of modules) {
                                const modulePath = path.join(pluginSourcePath, module);
                                if (fs.statSync(modulePath).isDirectory() && module !== plugin) {
                                    pluginApis.push(`${module.toUpperCase()}_API=`);
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error reading plugins for API defines:', error);
            }
        }

        return pluginApis;
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

        return "10.0.22621.0"; // Fallback to common Windows 11 SDK version
    }

    private getCompilerPath(): string {
        return PathUtils.getVisualStudioCompilerPath();
    }

    private getStandardLibraryPaths(): string[] {
        const vsPath = PathUtils.getVisualStudioInstallPath();
        const windowsSdkPath = PathUtils.getWindowsSdkPath();
        
        const paths: string[] = [];
        
        if (vsPath) {
            // MSVC standard library includes
            paths.push(`${vsPath}/VC/Tools/MSVC/*/include`);
            paths.push(`${vsPath}/VC/Auxiliary/VS/include`);
        }
        
        if (windowsSdkPath) {
            const sdkVersion = this.getWindowsSdkVersion();
            // Windows SDK includes
            paths.push(`${windowsSdkPath}/Include/${sdkVersion}/ucrt`);
            paths.push(`${windowsSdkPath}/Include/${sdkVersion}/um`);
            paths.push(`${windowsSdkPath}/Include/${sdkVersion}/shared`);
            paths.push(`${windowsSdkPath}/Include/${sdkVersion}/winrt`);
            paths.push(`${windowsSdkPath}/Include/${sdkVersion}/cppwinrt`);
        }
        
        return paths;
    }
}