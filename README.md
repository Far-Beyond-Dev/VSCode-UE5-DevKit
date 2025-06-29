# UE5.6 Development Tools for VS Code

A comprehensive Visual Studio Code extension for Unreal Engine 5.6 development that provides essential tools and workflow automation for game developers.

## Features

### 🎮 Solution Explorer
- **Project Structure View**: Navigate your UE5 project structure with a dedicated solution explorer
- **Smart File Icons**: Different icons for C++, C#, Blueprint, and UE asset files
- **Quick File Access**: Double-click to open files directly in VS Code
- **Refresh Support**: Update the view when files change

### 🚀 Engine Integration
- **Open Engine**: Launch Unreal Editor directly from VS Code
- **Generate Project Files**: Create Visual Studio project files automatically
- **Auto-Detection**: Automatically detects UE5 projects in your workspace

### 🔨 Build System
- **Multiple Build Configurations**: 
  - Development Build
  - Debug Build
  - Shipping Build
- **Clean Build**: Remove all build artifacts
- **Build Output**: Real-time build progress in VS Code terminal
- **Platform Support**: Win64, Mac, Linux platform targets

### 📦 Packaging & Deployment
- **Cook Content**: Cook content for target platforms
- **Package Project**: Full project packaging with customizable output directory
- **Build Automation**: Integrated UnrealBuildTool and UnrealAutomationTool support

### ⚙️ Configuration
- **Engine Path Detection**: Automatic engine path detection or manual configuration
- **Build Preferences**: Set default build configuration and target platform
- **Output Control**: Toggle build output visibility

## Installation

### Prerequisites
- Visual Studio Code 1.74.0 or higher
- Unreal Engine 5.6 installed
- Node.js and npm (for development)

### From Source
1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press F5 to launch a new VS Code window with the extension loaded

### Manual Installation
1. Package with `vsce package`
2. Install with `code --install-extension ue5-dev-tools-1.0.0.vsix`

## Configuration

Open VS Code settings and configure the following:

```json
{
  "ue5.enginePath": "C:\\Program Files\\Epic Games\\UE_5.6",
  "ue5.defaultBuildConfiguration": "Development",
  "ue5.defaultPlatform": "Win64",
  "ue5.showBuildOutput": true
}
```

### Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `ue5.enginePath` | string | `""` | Path to Unreal Engine 5.6 installation |
| `ue5.defaultBuildConfiguration` | string | `"Development"` | Default build configuration (Development, Debug, Shipping, Test) |
| `ue5.defaultPlatform` | string | `"Win64"` | Default target platform (Win64, Mac, Linux) |
| `ue5.showBuildOutput` | boolean | `true` | Show build output in terminal |

## Usage

### Getting Started
1. Open a folder containing a `.uproject` file
2. The extension will automatically detect your UE5 project
3. Access UE5 tools through:
   - Command Palette (`Ctrl+Shift+P` → type "UE5")
   - Activity Bar (UE5 Tools icon)
   - Right-click context menus

### Available Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `UE5: Open Unreal Engine` | Launch Unreal Editor with current project | |
| `UE5: Generate Project Files` | Generate Visual Studio project files | |
| `UE5: Build Development` | Build project in Development configuration | |
| `UE5: Build Debug` | Build project in Debug configuration | |
| `UE5: Build Shipping` | Build project in Shipping configuration | |
| `UE5: Clean Build` | Clean all build artifacts | |
| `UE5: Cook Content` | Cook content for target platform | |
| `UE5: Package Project` | Package project for distribution | |

### Solution Explorer
- View your project structure in the UE5 Tools panel
- Navigate Source, Content, and Config folders
- Open files by double-clicking
- Refresh view with the refresh button

### Build Workflow
1. **Generate Project Files**: Run this after adding new C++ classes
2. **Build Development**: Standard development build for testing
3. **Build Shipping**: Optimized build for release
4. **Clean Build**: Remove artifacts when switching configurations

### Packaging Workflow
1. **Cook Content**: Prepare assets for target platform
2. **Package Project**: Create distributable builds

## Project Structure

```
ue5-dev-tools/
├── src/
│   └── extension.ts          # Main extension code
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript configuration
├── README.md                # This file
└── out/                     # Compiled JavaScript (generated)
```

## Development

### Building from Source
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes during development
npm run watch

# Package extension
vsce package
```

### Testing
1. Open project in VS Code
2. Press `F5` to launch Extension Development Host
3. Open a UE5 project folder in the new window
4. Test extension features

## Troubleshooting

### Engine Not Found
- Ensure UE5.6 is installed
- Set correct path in `ue5.enginePath` setting
- Check common installation paths:
  - `C:\Program Files\Epic Games\UE_5.6`
  - `C:\Program Files (x86)\Epic Games\UE_5.6`

### Build Failures
- Verify project files are generated (`UE5: Generate Project Files`)
- Check build output in VS Code terminal
- Ensure Visual Studio Build Tools are installed
- Try cleaning build first (`UE5: Clean Build`)

### Solution Explorer Empty
- Ensure `.uproject` file exists in workspace
- Try refreshing the explorer view
- Check VS Code output for error messages

### Performance Tips
- Close unnecessary VS Code windows
- Use Development builds for faster iteration
- Clean build artifacts regularly
- Exclude `Binaries/` and `Intermediate/` from version control

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style
- Use TypeScript strict mode
- Follow VS Code extension best practices
- Add JSDoc comments for public methods
- Use async/await for asynchronous operations

## Changelog

### Version 1.0.0
- Initial release
- Solution Explorer with project structure navigation
- Engine integration (open editor, generate project files)
- Build system support (Development, Debug, Shipping)
- Content cooking and project packaging
- Configurable engine path and build settings
- Clean build functionality
- Real-time build output

## License

This extension is released under the MIT License. See LICENSE file for details.

## Support

For issues, feature requests, or questions:
- Create an issue on GitHub
- Check the troubleshooting section above
- Review VS Code and UE5 documentation

## Related Extensions

Consider installing these complementary extensions:
- **C/C++** - IntelliSense and debugging for C++ code
- **C#** - Support for C# scripting in UE5
- **Unreal Engine 4 Snippets** - Code snippets (many work with UE5)
- **GitLens** - Enhanced Git integration for version control

## Acknowledgments

- Epic Games for Unreal Engine
- VS Code team for excellent extension APIs
- Community contributors and testers