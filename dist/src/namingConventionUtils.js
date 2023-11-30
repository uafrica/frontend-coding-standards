"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidVariableName = exports.isValidStateVariableName = exports.isValidComponentName = exports.isValidComponentFileName = exports.isValidPageComponentFileName = exports.isValidInterfaceName = exports.isValidInterfaceFileName = void 0;
const utils = require("./utils");
function isValidInterfaceFileName(fileName) {
    const interfaceFileNamePattern = /^[a-z][A-Za-z]*\.interface\.ts$/;
    return interfaceFileNamePattern.test(fileName);
}
exports.isValidInterfaceFileName = isValidInterfaceFileName;
function isValidInterfaceName(interfaceName) {
    const interfaceNamePattern = /^I[A-Z][a-zA-Z]*$/;
    return interfaceNamePattern.test(interfaceName);
}
exports.isValidInterfaceName = isValidInterfaceName;
function isValidPageComponentFileName(fileName) {
    const pageComponentFileNamePattern = /^[A-Z][A-Za-z0-9]*\Page\.tsx$/;
    return pageComponentFileNamePattern.test(fileName);
}
exports.isValidPageComponentFileName = isValidPageComponentFileName;
function isValidComponentFileName(fileName) {
    const componentFileNamePattern = /^[A-Z][A-Za-z0-9]*\.tsx$/;
    return componentFileNamePattern.test(fileName);
}
exports.isValidComponentFileName = isValidComponentFileName;
function isValidComponentName(componentName) {
    return utils.upperCamelCaseRegex.test(componentName);
}
exports.isValidComponentName = isValidComponentName;
function isValidStateVariableName(variableName) {
    return utils.camelCaseRegex.test(variableName);
}
exports.isValidStateVariableName = isValidStateVariableName;
function isValidVariableName(variableName) {
    return (utils.camelCaseRegex.test(variableName) ||
        utils.upperSnakeCaseRegex.test(variableName));
}
exports.isValidVariableName = isValidVariableName;
