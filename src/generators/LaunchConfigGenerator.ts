// src/generators/LaunchConfigGenerator.ts
import { UE5Project } from '../types';
import { PathUtils } from '../utils/PathUtils';
import * as path from 'path';

export class LaunchConfigGenerator {
    constructor(private project: UE5Project) {}

    generate() {
        const enginePath = PathUtils.getEnginePath();
        
        return {
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
                    },
                    visualizerFile: `${enginePath}/Engine/Extras/VisualStudioDebugging/Unreal.natvis`
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
                    },
                    visualizerFile: `${enginePath}/Engine/Extras/VisualStudioDebugging/Unreal.natvis`
                },
                {
                    name: "Launch Game (Development)",
                    type: "cppvsdbg",
                    request: "launch",
                    program: `${this.project.path}/Binaries/Win64/${this.project.name}.exe`,
                    args: [],
                    stopAtEntry: false,
                    cwd: "${workspaceFolder}",
                    environment: [],
                    console: "externalTerminal",
                    symbolSearchPath: `${enginePath}/Engine/Binaries/Win64;${this.project.path}/Binaries/Win64`,
                    sourceFileMap: {
                        "/Engine/Source/": `${enginePath}/Engine/Source/`
                    },
                    visualizerFile: `${enginePath}/Engine/Extras/VisualStudioDebugging/Unreal.natvis`
                },
                {
                    name: "Launch Game (DebugGame)",
                    type: "cppvsdbg",
                    request: "launch",
                    program: `${this.project.path}/Binaries/Win64/${this.project.name}-Win64-DebugGame.exe`,
                    args: [],
                    stopAtEntry: false,
                    cwd: "${workspaceFolder}",
                    environment: [],
                    console: "externalTerminal",
                    symbolSearchPath: `${enginePath}/Engine/Binaries/Win64;${this.project.path}/Binaries/Win64`,
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
                    symbolSearchPath: `${enginePath}/Engine/Binaries/Win64;${this.project.path}/Binaries/Win64`,
                    sourceFileMap: {
                        "/Engine/Source/": `${enginePath}/Engine/Source/`
                    },
                    visualizerFile: `${enginePath}/Engine/Extras/VisualStudioDebugging/Unreal.natvis`
                },
                {
                    name: "Attach to Game Process",
                    type: "cppvsdbg",
                    request: "attach",
                    processId: "${command:pickProcess}",
                    symbolSearchPath: `${enginePath}/Engine/Binaries/Win64;${this.project.path}/Binaries/Win64`,
                    sourceFileMap: {
                        "/Engine/Source/": `${enginePath}/Engine/Source/`
                    },
                    visualizerFile: `${enginePath}/Engine/Extras/VisualStudioDebugging/Unreal.natvis`
                }
            ]
        };
    }
}