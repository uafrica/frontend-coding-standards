const utils = require("./utils");

function isValidInterfaceFileName(fileName: string) {
  const interfaceFileNamePattern = /^[a-z][A-Za-z]*\.interface\.ts$/;

  return interfaceFileNamePattern.test(fileName);
}

function isValidInterfaceName(interfaceName: string) {
  const interfaceNamePattern = /^I[A-Z][a-zA-Z]*$/;

  return interfaceNamePattern.test(interfaceName);
}

function isValidPageComponentFileName(fileName: string) {
  const pageComponentFileNamePattern = /^[A-Z][A-Za-z0-9]*\Page\.tsx$/;
  return pageComponentFileNamePattern.test(fileName);
}

function isValidComponentFileName(fileName: string) {
  const componentFileNamePattern = /^[A-Z][A-Za-z0-9]*\.tsx$/;
  return componentFileNamePattern.test(fileName);
}

function isValidComponentName(componentName: string) {
  return utils.upperCamelCaseRegex.test(componentName);
}

function isValidStateVariableName(variableName: string) {
  return utils.camelCaseRegex.test(variableName);
}

function isValidVariableName(variableName: string) {
  return (
    utils.camelCaseRegex.test(variableName) ||
    utils.upperSnakeCaseRegex.test(variableName)
  );
}

export {
  isValidInterfaceFileName,
  isValidInterfaceName,
  isValidPageComponentFileName,
  isValidComponentFileName,
  isValidComponentName,
  isValidStateVariableName,
  isValidVariableName,
};
