const vscode = require('vscode');
const yaml = require('js-yaml');
const toml = require('@iarna/toml');
const toon = require('toon-json-converter');
const javascriptStringify = require('javascript-stringify').stringify;
const parquet = require('@dsnp/parquetjs');
const fs = require('fs');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Universal Conversion Logic
	// 1. Get Text & Language
	// 2. Parse Source -> Object
	// 3. Convert Object -> Target
	// 4. Replace Text
	// 5. Update Language Mode

	const register = (command, callback) => {
		context.subscriptions.push(vscode.commands.registerCommand(command, callback));
	};

	// --- Conversion Commands ---

	register('convertism.convertToYaml', () => {
		processUniversalConversion('yaml', (obj) => yaml.dump(obj));
	});

	register('convertism.convertToJson', () => {
		processUniversalConversion('json', (obj) => JSON.stringify(obj, null, 2));
	});

	register('convertism.convertToToml', () => {
		processUniversalConversion('toml', (obj) => toml.stringify(obj));
	});

	register('convertism.convertToToon', () => {
		processUniversalConversion('toon', (obj) => toon.jsonToToon(obj));
	});

	register('convertism.convertToJsObject', () => {
		processUniversalConversion('javascript', (obj) => javascriptStringify(obj, null, 2));
	});

	// --- Parquet Commands (File Based) ---

	register('convertism.convertToParquet', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		try {
			// 1. Parse Source
			const obj = parseSource(editor.document.getText(), editor.document.languageId);
			if (!obj) return;

			// Ensure data is array of objects for Parquet
			let rows = Array.isArray(obj) ? obj : [obj];

			// 2. Infer Schema
			const schemaDef = inferParquetSchema(rows[0]);
			if (!schemaDef) {
				vscode.window.showErrorMessage('Could not infer Parquet schema from data.');
				return;
			}
			const schema = new parquet.ParquetSchema(schemaDef);

			// 3. Save File
			const uri = await vscode.window.showSaveDialog({
				filters: { 'Parquet': ['parquet'] },
				saveLabel: 'Export Parquet'
			});
			if (!uri) return;

			// 4. Write Parquet
			await deleteFileIfExists(uri.fsPath);

			const writer = await parquet.ParquetWriter.openFile(schema, uri.fsPath);
			for (const row of rows) {
				await writer.appendRow(row);
			}
			await writer.close();

			vscode.window.showInformationMessage(`Successfully exported to ${uri.fsPath}`);

		} catch (e) {
			vscode.window.showErrorMessage(`Parquet Export Failed: ${e.message}`);
		}
	});

	register('convertism.convertFromParquet', async () => {
		try {
			// 1. Open File
			const uris = await vscode.window.showOpenDialog({
				filters: { 'Parquet': ['parquet'] },
				canSelectMany: false,
				openLabel: 'Import Parquet'
			});
			if (!uris || uris.length === 0) return;

			const uri = uris[0];

			// 2. Read Parquet
			let reader = await parquet.ParquetReader.openFile(uri.fsPath);
			let cursor = reader.getCursor();
			let record = null;
			let rows = [];

			while (record = await cursor.next()) {
				rows.push(record);
			}
			await reader.close();

			// 3. Insert JSON into Active Editor
			const editor = vscode.window.activeTextEditor;
			const jsonStr = JSON.stringify(rows, null, 2);

			if (editor) {
				processTextConversion('json', () => jsonStr);
				await vscode.languages.setTextDocumentLanguage(editor.document, 'json');
			} else {
				// Open new doc
				const doc = await vscode.workspace.openTextDocument({ content: jsonStr, language: 'json' });
				await vscode.window.showTextDocument(doc);
			}

		} catch (e) {
			vscode.window.showErrorMessage(`Parquet Import Failed: ${e.message}`);
		}
	});

	// --- Formatting Commands ---

	register('convertism.beautify', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		if (editor.document.languageId === 'json') {
			// Strict JSON re-serialization (removes comments, validates structure)
			processTextConversion('json', (text) => {
				const obj = JSON.parse(text);
				return JSON.stringify(obj, null, 2);
			});
		} else {
			// Universal Fallback: Use VS Code's native formatter
			vscode.commands.executeCommand('editor.action.formatDocument');
		}
	});

	register('convertism.minify', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		const lang = editor.document.languageId;

		if (lang === 'json') {
			processTextConversion('json', (text) => {
				const obj = JSON.parse(text);
				return JSON.stringify(obj);
			});
		} else if (lang === 'css') {
			processTextConversion('css', (text) => {
				return text
					.replace(/\/\*[\s\S]*?\*\//g, "") // Remove comments
					.replace(/\s+/g, " ")             // Collapse whitespace
					.replace(/\s*([:;{}])\s*/g, "$1") // Remove space around separators
					.replace(/;}/g, "}")              // Remove last semicolon
					.trim();
			});
		} else if (lang === 'javascript' || lang === 'javascriptreact') {
			processTextConversion(lang, async (text) => {
				try {
					const { minify } = require("terser");
					const result = await minify(text, { mangle: true, compress: true });
					if (result.code) return result.code;
					return text;
				} catch (e) {
					throw new Error(`Terser Minification Failed: ${e.message}`);
				}
			});
		} else {
			vscode.window.showErrorMessage(`Minify not supported for ${lang}. Only JSON, CSS, and JS are supported.`);
		}
	});
}

function inferParquetSchema(row) {
	if (!row || typeof row !== 'object') return null;
	const schema = {};

	for (const [key, value] of Object.entries(row)) {
		const type = typeof value;
		if (type === 'string') {
			schema[key] = { type: 'UTF8' };
		} else if (type === 'number') {
			if (Number.isInteger(value)) {
				schema[key] = { type: 'INT64' };
			} else {
				schema[key] = { type: 'DOUBLE' };
			}
		} else if (type === 'boolean') {
			schema[key] = { type: 'BOOLEAN' };
		}
		// Skip complex types for now
	}
	return schema;
}

async function deleteFileIfExists(path) {
	try {
		await fs.promises.unlink(path);
	} catch (e) {
		// ignore
	}
}

/**
 * Parses source text based on language ID into a JS Object.
 */
function parseSource(text, languageId) {
	switch (languageId) {
		case 'json':
		case 'jsonc':
			return JSON.parse(text);
		case 'yaml':
			return yaml.load(text);
		case 'toml':
			return toml.parse(text);
		case 'toon':
			return toon.toonToJson(text);
		case 'javascript':
		case 'javascriptreact':
			// Parse JS Object literal
			return new Function('return ' + text)();
		default:
			throw new Error(`Unsupported source language: ${languageId}`);
	}
}

/**
 * Handles the Universal conversion flow.
 * @param {string} targetLanguageId The VS Code language ID to switch to after conversion.
 * @param {(obj: any) => string} convertToTargetFunc Function taking an object and returning target string.
 */
function processUniversalConversion(targetLanguageId, convertToTargetFunc) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showInformationMessage('No active editor found');
		return;
	}

	const document = editor.document;
	const languageId = document.languageId;

	// Check if source language is supported
	const supportedLanguages = ['json', 'jsonc', 'yaml', 'toml', 'toon', 'javascript', 'javascriptreact'];
	if (!supportedLanguages.includes(languageId)) {
		vscode.window.showErrorMessage(`Convertism: Cannot convert from '${languageId}'. Supported formats: JSON, YAML, TOML, TOON, JS Object.`);
		return;
	}

	processConversion(editor, (text) => {
		try {
			// Step 1: Parse Source to Object
			const obj = parseSource(text, languageId);

			// Step 2: Convert Object to Target
			return convertToTargetFunc(obj);

		} catch (e) {
			vscode.window.showErrorMessage(`Conversion Failed: ${e.message}`);
			return null;
		}
	}, (success) => {
		if (success) {
			vscode.languages.setTextDocumentLanguage(document, targetLanguageId);
		}
	});
}

/**
 * Helper for simple text-to-text transformations (like formatting).
 */
function processTextConversion(requiredLanguageId, convertFunc) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;

	// For Import Parquet reuse, checking extension might be tricky if opened new file.
	// But usually this helper is for Beautify/Minify.
	if (requiredLanguageId && editor.document.languageId !== requiredLanguageId) {
		vscode.window.showErrorMessage(`Command only available for ${requiredLanguageId} files.`);
		return;
	}

	processConversion(editor, async (text) => {
		try {
			return await convertFunc(text);
		} catch (e) {
			vscode.window.showErrorMessage(`Error: ${e.message}`);
			return null;
		}
	});
}

/**
 * Generic helper to read, transform, replace, and optionally callback.
 */
async function processConversion(editor, transformFunc, onComplete) {
	const document = editor.document;
	const selection = editor.selection;

	const text = selection.isEmpty ? document.getText() : document.getText(selection);

	let result = transformFunc(text);
	if (result instanceof Promise) {
		result = await result;
	}

	if (result !== null && result !== undefined) {
		editor.edit(editBuilder => {
			if (selection.isEmpty) {
				const firstLine = document.lineAt(0);
				const lastLine = document.lineAt(document.lineCount - 1);
				const range = new vscode.Range(firstLine.range.start, lastLine.range.end);
				editBuilder.replace(range, result);
			} else {
				editBuilder.replace(selection, result);
			}
		}).then((success) => {
			if (onComplete) onComplete(success);
		});
	} else {
		if (onComplete) onComplete(false);
	}
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
};
