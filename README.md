# UE5 Development Tools for VS Code

A VS Code extension that adds proper UE5.6 project support with solution explorer, building, and C++ IntelliSense setup.

## What it does

- Detects UE5 projects automatically when you open a folder with a .uproject file
- Shows your project structure in a solution explorer (Source, Content, Config, Plugins)
- Builds your project and plugins from VS Code
- Sets up C++ IntelliSense so your includes work properly
- Launches UE5 editor directly from VS Code

## Installation

1. Install the extension
2. Open a folder that contains a .uproject file
3. Set your UE5 engine path in settings if it doesn't auto-detect

## Basic Usage

Open command palette (Ctrl+Shift+P) and type "UE5:" to see available commands:

- **Generate Project Files** - Run this after adding new C++ classes
- **Build Development** - Standard development build
- **Build DebugGame** - For debugging (Note: "Debug" config doesn't work with installed UE5)
- **Build Shipping** - Release build
- **Open Unreal Engine** - Launches editor with your project
- **Clean Build** - Removes build files

## Plugin Support

Plugins show up in the solution explorer under the Plugins folder. Right-click buildable plugins (ones with source code) to build them individually.

## Settings

```json
{
  "ue5devtools.enginePath": "C:\\Program Files\\Epic Games\\UE_5.6",
  "ue5devtools.defaultBuildConfiguration": "Development",
  "ue5devtools.defaultPlatform": "Win64"
}
```

## Common Issues

**Build fails with "Debug configuration not supported"**: Use DebugGame instead of Debug when working with installed UE5.

**IntelliSense showing errors**: Click "Refresh C++ Configuration" in the solution explorer or run the command from the palette.

**Engine not found**: Set `ue5.enginePath` in your VS Code settings to point to your UE5 installation.

**Plugins not building**: Make sure the plugin has a Source folder with actual code in it.

## Requirements

- Visual Studio Code 1.74+
- Unreal Engine 5.6
- Visual Studio 2022 with C++ tools

## Development

```bash
npm install
npm run compile
```

Press F5 to test the extension in a new VS Code window.
