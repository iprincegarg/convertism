# Convertism 🚀

**Convertism** is the ultimate universal data converter for VS Code. Seamlessly convert between **JSON**, **YAML**, **TOML**, **TOON**, **JavaScript Objects**, and **Apache Parquet** with a single command.

Whether you are configuring cloud infrastructure, debugging API responses, or working with big data files, Convertism has you covered.

## ✨ Features

- **🔄 Universal Conversion**: Convert any supported format to any other format (e.g., YAML → TOML, JSON → JS Object).
- **📦 Parquet Support**: Export your data to `.parquet` binary files or import Parquet files as JSON.
- **⚡ Smart Detection**: Automatically detects source language and switches editor mode after conversion.
- **🎨 JSON Tools**: Built-in **Beautify** and **Minify** for JSON.
- **🛠️ Zero Config**: Works out of the box with intuitive shortcuts.

## 🚀 Supported Formats

| Format | Extension | Description |
| :--- | :--- | :--- |
| **JSON** | `.json` | Standard JavaScript Object Notation. |
| **YAML** | `.yaml` | Human-readable data serialization standard. |
| **TOML** | `.toml` | Minimal configuration file format. |
| **TOON** | `.toon` | Token-Oriented Object Notation (Optimized for LLMs). |
| **JS Object** | `.js` | Standard JavaScript Object literal (keys unquoted). |
| **Parquet** | `.parquet` | Columnar binary storage format (Import/Export only). |

## ⌨️ Keyboard Shortcuts

Work faster with global keybindings (active in any supported file):

| Target Format | Mac | Windows / Linux |
| :--- | :--- | :--- |
| **Convert to JSON** | `Cmd+Alt+J` | `Ctrl+Alt+J` |
| **Convert to YAML** | `Cmd+Alt+Y` | `Ctrl+Alt+Y` |
| **Convert to TOML** | `Cmd+Alt+T` | `Ctrl+Alt+T` |
| **Convert to TOON** | `Cmd+Alt+O` | `Ctrl+Alt+O` |
| **Convert to JS Object** | `Cmd+Alt+S` | `Ctrl+Alt+S` |
| **Export to Parquet** | `Cmd+Alt+P` | `Ctrl+Alt+P` |

## 📖 Usage

### Standard Conversion
1. Open any file (e.g., `config.yaml`).
2. Press the shortcut for your target format (e.g., `Cmd+Alt+J` for JSON).
3. The content is instantly converted and the editor language is updated.

### Parquet Workflow
**Exporting to Parquet:**
1. Open a data file (e.g., a large JSON array).
2. Press `Cmd+Alt+P`.
3. Save the file as `data.parquet`. *Schema is inferred automatically.*

**Importing Parquet:**
1. Open Command Palette (`Cmd+Shift+P`).
2. Run `Import Parquet to JSON`.
3. Select your `.parquet` file to load it as JSON.

## ❗ Known Issues
- **Parquet Schema**: Nested objects in Parquet export are currently simplified or stringified. Complex schemas may require manual adjustment.
- **Lossy Conversion**: Converting rich formats (like YAML with anchors) to simple formats (like JSON) may lose metadata.

## 📅 Release Notes

### 0.0.1
🎉 **Initial Release**
- Added **Universal Conversion** engine (Any-to-Any).
- Supported formats: **JSON**, **YAML**, **TOML**, **TOON**, **JS Object**.
- Added **Parquet** Import/Export support.
- Added **Beautify/Minify** JSON commands.
- Included global keyboard shortcuts.

---
**Enjoy Convertism?**  
Please leave a review on the Marketplace! ⭐️
