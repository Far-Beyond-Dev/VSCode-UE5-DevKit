// src/generators/TasksConfigGenerator.ts
import { UE5Project } from '../types';

export class TasksConfigGenerator {
    constructor(private project: UE5Project) {}

    generate() {
        return {
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
                        panel: "shared",
                        showReuseMessage: false,
                        clear: false
                    },
                    problemMatcher: [
                        {
                            owner: "cpp",
                            fileLocation: ["relative", "${workspaceFolder}"],
                            pattern: [
                                {
                                    regexp: "^(.*)\\((\\d+)\\)\\s*:\\s+(warning|error)\\s+(C\\d+)\\s*:\\s*(.*)$",
                                    file: 1,
                                    line: 2,
                                    severity: 3,
                                    code: 4,
                                    message: 5
                                },
                                {
                                    regexp: "^(.*)\\((\\d+),(\\d+)\\)\\s*:\\s+(warning|error)\\s*:\\s*(.*)$",
                                    file: 1,
                                    line: 2,
                                    column: 3,
                                    severity: 4,
                                    message: 5
                                }
                            ]
                        },
                        {
                            owner: "ue5",
                            fileLocation: ["relative", "${workspaceFolder}"],
                            pattern: {
                                regexp: "^(.*?)\\s*\\(\\s*(\\d+)\\s*\\)\\s*:\\s*(Error|Warning)\\s*:\\s*(.*)$",
                                file: 1,
                                line: 2,
                                severity: 3,
                                message: 4
                            }
                        }
                    ]
                },
                {
                    label: "UE5: Build DebugGame Editor",
                    type: "shell",
                    command: "${command:ue5.buildDebug}",
                    group: "build",
                    presentation: {
                        echo: true,
                        reveal: "always",
                        focus: false,
                        panel: "shared",
                        showReuseMessage: false
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
                    label: "UE5: Build Shipping",
                    type: "shell",
                    command: "${command:ue5.buildShipping}",
                    group: "build",
                    presentation: {
                        echo: true,
                        reveal: "always",
                        focus: false,
                        panel: "shared",
                        showReuseMessage: false
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
                        panel: "shared",
                        showReuseMessage: false
                    },
                    runOptions: {
                        runOn: "folderOpen"
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
                        panel: "shared",
                        showReuseMessage: false
                    }
                },
                {
                    label: "UE5: Cook Content for Windows",
                    type: "shell",
                    command: "${command:ue5.cookContent}",
                    group: "build",
                    presentation: {
                        echo: true,
                        reveal: "always",
                        focus: false,
                        panel: "shared",
                        showReuseMessage: false
                    }
                },
                {
                    label: "UE5: Package Project",
                    type: "shell",
                    command: "${command:ue5.packageProject}",
                    group: "build",
                    presentation: {
                        echo: true,
                        reveal: "always",
                        focus: false,
                        panel: "shared",
                        showReuseMessage: false
                    }
                },
                {
                    label: "UE5: Refresh C++ Configuration",
                    type: "shell",
                    command: "${command:ue5.refreshCppConfig}",
                    group: "build",
                    presentation: {
                        echo: true,
                        reveal: "always",
                        focus: false,
                        panel: "shared",
                        showReuseMessage: false
                    }
                },
                {
                    label: "UE5: Compile Single File",
                    type: "shell",
                    command: "echo",
                    args: ["Compiling ${file}..."],
                    group: "build",
                    presentation: {
                        echo: true,
                        reveal: "silent",
                        focus: false,
                        panel: "shared"
                    },
                    options: {
                        cwd: "${workspaceFolder}"
                    }
                }
            ]
        };
    }
}