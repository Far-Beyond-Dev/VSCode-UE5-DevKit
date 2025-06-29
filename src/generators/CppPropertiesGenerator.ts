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
            // CRITICAL: Use recursive globs for generated headers (this is the key fix)
            "${workspaceFolder}/Intermediate/**",
            "${workspaceFolder}/Source/**",
            "${workspaceFolder}/Plugins/**",
            
            // Engine generated headers with recursive search
            `${enginePath}/Engine/Intermediate/**`,
            
            // Engine source with full recursive search (from the forum post)
            `${enginePath}/Engine/Source/**`,
            
            // Specific critical paths that must work
            `${enginePath}/Engine/Source/Runtime/Core/Public`,
            `${enginePath}/Engine/Source/Runtime/CoreUObject/Public`,
            `${enginePath}/Engine/Source/Runtime/CoreUObject/Classes`, 
            `${enginePath}/Engine/Source/Runtime/Engine/Public`,
            `${enginePath}/Engine/Source/Runtime/Engine/Classes`,
            
            // Generated include paths with specific patterns
            "${workspaceFolder}/Intermediate/Build/Win64/**",
            `${enginePath}/Engine/Intermediate/Build/Win64/**`,
            
            // Project-specific generated paths
            "${workspaceFolder}/Intermediate/Build/Win64/UnrealEditor/Inc/**",
            "${workspaceFolder}/Intermediate/Build/Win64/${workspaceFolderBasename}/**",
            "${workspaceFolder}/Intermediate/Build/Win64/${workspaceFolderBasename}Editor/**",
            
            // Plugin-specific generated paths (for Horizon plugin)
            "${workspaceFolder}/Intermediate/Build/Win64/Horizon/**",
            "${workspaceFolder}/Plugins/Horizon/Intermediate/**",
            
            // Engine plugins with recursive search
            `${enginePath}/Engine/Plugins/**`,
            
            // Standard library paths
            ...this.getStandardLibraryPaths(),
        ];
    }

    private getDefines(enginePath: string): string[] {
        return [
            // UE5 REFLECTION MACROS (CRITICAL - this fixes USTRUCT, UPROPERTY errors)
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
            
            // UE5 MODULE MACROS (fixes IMPLEMENT_MODULE, DEFINE_LOG_CATEGORY)
            "IMPLEMENT_MODULE(...)=",
            "IMPLEMENT_PRIMARY_GAME_MODULE(...)=",
            "DEFINE_LOG_CATEGORY(...);",
            "DEFINE_LOG_CATEGORY_STATIC(...);",
            "DECLARE_LOG_CATEGORY_EXTERN(...);",
            
            // Additional UE5 macros that cause IntelliSense issues
            "FORCEINLINE=inline",
            "FORCENOINLINE=",
            "RESTRICT=",
            "CONSTEXPR=constexpr",
            "DEPRECATED(...)=",
            "UE_DEPRECATED(...)=",
            "PRAGMA_DISABLE_DEPRECATION_WARNINGS=",
            "PRAGMA_ENABLE_DEPRECATION_WARNINGS=",
            
            // Subsystem macros (fixes GameInstanceSubsystem errors)
            "USUBSYSTEM(...)=",
            "DECLARE_DYNAMIC_MULTICAST_DELEGATE(...);",
            "DECLARE_DYNAMIC_DELEGATE(...);",
            
            // Core build defines
            "WITH_EDITOR=1",
            "UE_BUILD_DEVELOPMENT=1",
            "UE_BUILD_DEVELOPMENT_WITH_DEBUGGAME=1",
            "UE_ENGINE_DIRECTORY=\"" + enginePath.replace(/\\/g, '/') + "/Engine/\"",
            
            // Platform defines
            "PLATFORM_WINDOWS=1",
            "PLATFORM_MICROSOFT=1",
            "PLATFORM_64BITS=1",
            "WIN32=1",
            "_WIN64=1",
            "WINAPI_FAMILY=WINAPI_FAMILY_DESKTOP_APP",
            
            // Unicode
            "UNICODE=1",
            "_UNICODE=1",
            
            // Unreal core defines
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
            
            // Build configuration
            "UBT_COMPILED_PLATFORM=Windows",
            "UBT_COMPILED_TARGET=Editor",
            
            // Module API macros (CRITICAL - prevents "unknown type" errors)
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
            "RENDERER_API=",
            "AUDIOMIXER_API=",
            "PROJECTS_API=",
            
            // Project-specific module API (replace with your actual project name)
            `${this.project.name.toUpperCase()}_API=`,
            
            // Common plugin APIs
            "HORIZON_API=",  // For your Horizon plugin
            
            // Security and compatibility
            "_CRT_SECURE_NO_WARNINGS=1",
            "_CRT_NONSTDC_NO_WARNINGS=1",
            "NOMINMAX=1",
            "WIN32_LEAN_AND_MEAN=1",
            
            // Logging system
            "USE_LOGGING_IN_SHIPPING=0",
            "WITH_LOGGING_TO_MEMORY=0",
            
            // Memory and performance
            "USE_CACHE_FREED_OS_ALLOCS=1",
            "USE_STATS_WITHOUT_ENGINE=0",
            "UE_BUILD_MINIMAL=0",
            
            // Engine features
            "WITH_PHYSX=0",  // UE5 uses Chaos
            "WITH_CHAOS=1",
            "PHYSICS_INTERFACE_PHYSX=0",
            "WITH_IMMEDIATE_PHYSX=0",
            
            // Rendering
            "WITH_CUSTOM_SV_POSITION=0",
            "COMPILE_WITHOUT_UNREAL_SUPPORT=0",
            
            // Blueprint support
            "WITH_BLUEPRINTGRAPH=1",
            "UE_BLUEPRINT_EVENTGRAPH_FASTCALLS=1"
        ];
    }

    private getCompilerArgs(): string[] {
        return [
            "/permissive-",
            "/Zc:inline",
            "/Zc:strictStrings-",
            "/Zc:__cplusplus",
            "/bigobj",
            "/wd4819",  // Disable warning about non-ASCII characters
            "/wd4828",  // Disable warning about disallowed characters
            "/D_CRT_SECURE_NO_WARNINGS",
            "/D_CRT_NONSTDC_NO_WARNINGS",
            "/DNOMINMAX",  // Prevent Windows.h from defining min/max macros
            "/experimental:module"
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

        return "10.0.22621.0";
    }

    private getCompilerPath(): string {
        return PathUtils.getVisualStudioCompilerPath();
    }

    private getStandardLibraryPaths(): string[] {
        const vsPath = PathUtils.getVisualStudioInstallPath();
        const windowsSdkPath = PathUtils.getWindowsSdkPath();
        
        const paths: string[] = [];
        
        if (vsPath) {
            paths.push(`${vsPath}/VC/Tools/MSVC/*/include`);
            paths.push(`${vsPath}/VC/Auxiliary/VS/include`);
        }
        
        if (windowsSdkPath) {
            const sdkVersion = this.getWindowsSdkVersion();
            paths.push(`${windowsSdkPath}/Include/${sdkVersion}/ucrt`);
            paths.push(`${windowsSdkPath}/Include/${sdkVersion}/um`);
            paths.push(`${windowsSdkPath}/Include/${sdkVersion}/shared`);
            paths.push(`${windowsSdkPath}/Include/${sdkVersion}/winrt`);
        }
        
        return paths;
    }
}