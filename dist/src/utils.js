"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFontawesomeImportNames = exports.getVariables = exports.getStateVariables = exports.logErrors = exports.getComponentName = exports.getInterfaceName = exports.isComponentFile = exports.isInterfaceFile = exports.writeOutput = exports.kebabToUpperCase = exports.keyToHumanReadable = exports.upperSnakeCaseRegex = exports.upperCamelCaseRegex = exports.camelCaseRegex = void 0;
const camelCaseRegex = /^[a-z][A-Za-z0-9]*$/;
exports.camelCaseRegex = camelCaseRegex;
const upperCamelCaseRegex = /^[A-Z][A-Za-z0-9]*$/;
exports.upperCamelCaseRegex = upperCamelCaseRegex;
const upperSnakeCaseRegex = /^[A-Z0-9_]+$/;
exports.upperSnakeCaseRegex = upperSnakeCaseRegex;
function keyToHumanReadable(key) {
    if (!key)
        return "";
    // @ts-ignore
    let keyHumanReadable = key.replaceAll("_", " ");
    keyHumanReadable = keyHumanReadable.replaceAll("sender", "collection");
    keyHumanReadable = keyHumanReadable.replaceAll("receiver", "delivery");
    keyHumanReadable = keyHumanReadable.replaceAll("-", " ");
    // camel case to sentence case
    keyHumanReadable = keyHumanReadable.replace(/([A-Z])/g, " $1").trim();
    let sentenceCaseKey = keyHumanReadable.charAt(0).toUpperCase() +
        keyHumanReadable.slice(1).toLowerCase();
    sentenceCaseKey = sentenceCaseKey.replaceAll("Bob box", "Bob Box");
    sentenceCaseKey = sentenceCaseKey.replaceAll("Bob pay", "Bob Pay");
    sentenceCaseKey = sentenceCaseKey.replaceAll("Bob go", "Bob Go");
    return sentenceCaseKey;
}
exports.keyToHumanReadable = keyToHumanReadable;
function kebabToUpperCase(str) {
    // Split the string into individual words
    const words = str.split("-");
    // Capitalize each word (except the first one)
    const upperCamelCaseWords = words.map((word) => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    });
    // Join the words and return the upper camel case string
    return upperCamelCaseWords.join("");
}
exports.kebabToUpperCase = kebabToUpperCase;
function writeOutput(type, content) {
    let colors = {
        success: "\x1b[32m",
        error: "\x1b[31m",
        warning: "\x1b[33m",
        info: "\x1b[36m",
    };
    console.log(colors[type], content);
}
exports.writeOutput = writeOutput;
function isInterfaceFile(filePath) {
    return filePath.indexOf("src/interfaces") > -1;
}
exports.isInterfaceFile = isInterfaceFile;
function getInterfaceName(data) {
    let interfaceNameStartIndex = data.indexOf("export interface ") + "export interface ".length;
    let substring = data.slice(interfaceNameStartIndex);
    let interfaceNameEndIndex = substring.indexOf(" ");
    let interfaceName = substring.slice(0, interfaceNameEndIndex);
    return interfaceName;
}
exports.getInterfaceName = getInterfaceName;
function getComponentName(data) {
    const componentNamePattern = /function\s+([a-zA-Z0-9]*)\(/;
    let match = componentNamePattern.exec(data);
    if (match) {
        return match[1];
    }
    else {
        return null;
    }
}
exports.getComponentName = getComponentName;
function isComponentFile(data, filePath) {
    return (filePath.endsWith(".tsx") &&
        !isInterfaceFile(filePath) &&
        (filePath.indexOf("/pages/") > -1 ||
            filePath.indexOf("/components/") > -1) &&
        data.indexOf("function render") > -1);
}
exports.isComponentFile = isComponentFile;
function logErrors(type, errorSectionName, errors) {
    let char = "-";
    writeOutput(type, char.repeat(errorSectionName.length));
    writeOutput(type, errorSectionName.toUpperCase());
    writeOutput(type, char.repeat(errorSectionName.length));
    errors.forEach((err) => {
        var _a;
        console.log("\t" +
            ((_a = err.file) !== null && _a !== void 0 ? _a : "") +
            (err.error && err.file ? " - " : "") +
            (err.error ? `${err.error}` : ""));
    });
}
exports.logErrors = logErrors;
function getStateVariables(data) {
    const stateVariableRegex = /(?<=\[\s*)(\w+)(?=\s*,\s*set\w+\s*\])/gm;
    const variableNames = [];
    let match;
    while ((match = stateVariableRegex.exec(data)) !== null) {
        variableNames.push(match[1]);
    }
    return variableNames;
}
exports.getStateVariables = getStateVariables;
function getVariables(data) {
    const variableRegex = /\b(?:let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
    const variableNames = [];
    let match;
    while ((match = variableRegex.exec(data)) !== null) {
        variableNames.push(match[1]);
    }
    return variableNames;
}
exports.getVariables = getVariables;
function getFontawesomeImportNames(data) {
    let regex = /icon="[^"]*"/g;
    let matches = data.match(regex);
    let iconImports = [];
    matches === null || matches === void 0 ? void 0 : matches.forEach((match) => {
        let iconString = match.replace('icon="', "").replace('"', "");
        let importName = "fa" + kebabToUpperCase(iconString);
        iconImports.push(importName);
    });
    return iconImports;
}
exports.getFontawesomeImportNames = getFontawesomeImportNames;
