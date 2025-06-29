// src/generators/SettingsConfigGenerator.ts
import { UE5Project } from '../types';

export class SettingsConfigGenerator {
    constructor(private project: UE5Project) {}

    generate() {
        return {
            // File associations for proper syntax highlighting
            "files.associations": {
                "*.uproject": "json",
                "*.uplugin": "json",
                "*.h": "cpp",
                "*.hpp": "cpp",
                "*.hxx": "cpp",
                "*.inl": "cpp",
                "*.inc": "cpp",
                "*.ipp": "cpp",
                "*.tpp": "cpp",
                "*.cpp": "cpp",
                "*.cxx": "cpp",
                "*.cc": "cpp",
                "*.c++": "cpp",
                "*.cs": "csharp",
                "*.usf": "hlsl",
                "*.ush": "hlsl"
            },

            // Exclude build artifacts and temporary files
            "files.exclude": {
                "**/Binaries": true,
                "**/Intermediate": true,
                "**/Saved": true,
                "**/.vs": true,
                "**/DerivedDataCache": true,
                "**/.vscode/browse.vc.db*": true,
                "**/Build/Receipts": true,
                "**/Build/Android": true,
                "**/Build/IOS": true
            },

            // Exclude from search to improve performance
            "search.exclude": {
                "**/Binaries": true,
                "**/Intermediate": true,
                "**/Saved": true,
                "**/.vs": true,
                "**/DerivedDataCache": true,
                "**/.vscode/browse.vc.db*": true,
                "**/Build/Receipts": true,
                "**/Content/**/*.uasset": true,
                "**/Content/**/*.umap": true
            },

            // File watcher exclusions to improve performance
            "files.watcherExclude": {
                "**/Binaries/**": true,
                "**/Intermediate/**": true,
                "**/Saved/**": true,
                "**/.vs/**": true,
                "**/DerivedDataCache/**": true,
                "**/.vscode/browse.vc.db*": true
            },

            // C++ IntelliSense configuration
            "C_Cpp.intelliSenseEngine": "default",
            "C_Cpp.errorSquiggles": "enabled",
            "C_Cpp.autoAddFileAssociations": false,
            "C_Cpp.default.intelliSenseMode": "windows-msvc-x64",
            "C_Cpp.default.cppStandard": "c++20",
            "C_Cpp.default.cStandard": "c17",
            "C_Cpp.intelliSenseEngineFallback": "enabled",
            "C_Cpp.intelliSenseUpdateDelay": 500,
            "C_Cpp.workspaceParsingPriority": "highest",
            "C_Cpp.enhancedColorization": "enabled",
            "C_Cpp.codeFolding": "enabled",
            "C_Cpp.inactiveRegionOpacity": 0.5,
            "C_Cpp.dimInactiveRegions": true,
            "C_Cpp.autocomplete": "default",
            "C_Cpp.autocompleteAddParentheses": true,
            "C_Cpp.loggingLevel": "Warning",

            // C++ Code formatting (UE5 style)
            "C_Cpp.clang_format_style": "file",
            "C_Cpp.clang_format_fallbackStyle": "{ BasedOnStyle: LLVM, IndentWidth: 4, UseTab: ForIndentation, TabWidth: 4, AllowShortIfStatementsOnASingleLine: false, IndentCaseLabels: false, ColumnLimit: 120, AccessModifierOffset: -4, NamespaceIndentation: All, FixNamespaceComments: false }",
            "C_Cpp.vcFormat.indent.braces": false,
            "C_Cpp.vcFormat.indent.multiLineRelativeTo": "innermost",
            "C_Cpp.vcFormat.indent.preserveIndentationInComments": true,
            "C_Cpp.vcFormat.indent.caseLabels": false,
            "C_Cpp.vcFormat.indent.caseContents": true,
            "C_Cpp.vcFormat.indent.lambdaBracesWhenParameter": true,
            "C_Cpp.vcFormat.newLine.beforeOpenBrace.block": "sameLine",
            "C_Cpp.vcFormat.newLine.beforeOpenBrace.function": "sameLine",
            "C_Cpp.vcFormat.newLine.beforeOpenBrace.namespace": "sameLine",
            "C_Cpp.vcFormat.newLine.beforeOpenBrace.type": "sameLine",
            "C_Cpp.vcFormat.newLine.beforeElse": false,
            "C_Cpp.vcFormat.newLine.beforeCatch": false,
            "C_Cpp.vcFormat.space.beforeFunctionOpenParenthesis": "remove",
            "C_Cpp.vcFormat.space.withinParameterListParentheses": false,
            "C_Cpp.vcFormat.space.betweenEmptyParameterListParentheses": false,
            "C_Cpp.vcFormat.space.afterKeywordsInControlFlowStatements": true,

            // General editor settings optimized for UE5
            "editor.tabSize": 4,
            "editor.insertSpaces": false,
            "editor.detectIndentation": false,
            "editor.rulers": [120],
            "editor.wordWrap": "off",
            "editor.trimAutoWhitespace": true,
            "editor.renderWhitespace": "selection",
            "editor.renderControlCharacters": false,
            "editor.minimap.enabled": true,
            "editor.minimap.renderCharacters": false,
            "editor.minimap.maxColumn": 120,
            "editor.bracketPairColorization.enabled": true,
            "editor.guides.bracketPairs": true,
            "editor.inlineSuggest.enabled": true,
            "editor.suggest.insertMode": "replace",
            "editor.acceptSuggestionOnCommitCharacter": true,
            "editor.acceptSuggestionOnEnter": "on",
            "editor.quickSuggestions": {
                "other": true,
                "comments": false,
                "strings": false
            },

            // Git settings
            "git.ignoreLimitWarning": true,
            "git.detectSubmodules": false,

            // Terminal settings
            "terminal.integrated.defaultProfile.windows": "PowerShell",
            "terminal.integrated.cwd": "${workspaceFolder}",

            // Performance settings
            "extensions.ignoreRecommendations": false,
            "workbench.settings.enableNaturalLanguageSearch": false,
            "search.smartCase": true,
            "search.useIgnoreFiles": true,
            "search.useParentIgnoreFiles": true,

            // Language-specific settings
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
            },
            "[json]": {
                "editor.defaultFormatter": "vscode.json-language-features",
                "editor.insertSpaces": true,
                "editor.tabSize": 2
            },
            "[jsonc]": {
                "editor.defaultFormatter": "vscode.json-language-features",
                "editor.insertSpaces": true,
                "editor.tabSize": 2
            },

            // Unreal Engine specific settings
            "ue5devtools.enginePath": "",
            "ue5devtools.defaultPlatform": "Win64",
            "ue5devtools.defaultBuildConfiguration": "Development",
            "ue5devtools.showBuildOutput": true,

            // Additional helpful settings
            "breadcrumbs.enabled": true,
            "breadcrumbs.showClasses": true,
            "breadcrumbs.showFunctions": true,
            "breadcrumbs.showVariables": true,
            "outline.showClasses": true,
            "outline.showFunctions": true,
            "outline.showVariables": true,
            "workbench.tree.renderIndentGuides": "always",
            "workbench.editor.enablePreview": false,
            "workbench.editor.enablePreviewFromQuickOpen": false,

            // Problem matcher settings
            "problems.decorations.enabled": true,
            "problems.showCurrentInStatus": true,

            // Debug settings
            "debug.allowBreakpointsEverywhere": true,
            "debug.showBreakpointsInOverviewRuler": true,
            "debug.showInlineBreakpointCandidates": true,

            // IntelliCode settings (if extension is installed)
            "vsintellicode.modify.editor.suggestSelection": "automaticallyOverrodeDefaultValue",
            "vsintellicode.features.python.deepLearning": "enabled",
            "vsintellicode.features.cpp.deepLearning": "enabled"
        };
    }
}