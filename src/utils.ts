const camelCaseRegex = /^[a-z][A-Za-z0-9]*$/;
const upperCamelCaseRegex = /^[A-Z][A-Za-z0-9]*$/;
const upperSnakeCaseRegex = /^[A-Z0-9_]+$/;

function keyToHumanReadable(key: string | undefined): string {
  if (!key) return "";

  // @ts-ignore
  let keyHumanReadable = key.replaceAll("_", " ");
  keyHumanReadable = keyHumanReadable.replaceAll("sender", "collection");
  keyHumanReadable = keyHumanReadable.replaceAll("receiver", "delivery");
  keyHumanReadable = keyHumanReadable.replaceAll("-", " ");

  // camel case to sentence case
  keyHumanReadable = keyHumanReadable.replace(/([A-Z])/g, " $1").trim();

  let sentenceCaseKey =
    keyHumanReadable.charAt(0).toUpperCase() +
    keyHumanReadable.slice(1).toLowerCase();

  sentenceCaseKey = sentenceCaseKey.replaceAll("Bob box", "Bob Box");
  sentenceCaseKey = sentenceCaseKey.replaceAll("Bob pay", "Bob Pay");
  sentenceCaseKey = sentenceCaseKey.replaceAll("Bob go", "Bob Go");

  return sentenceCaseKey;
}

function kebabToUpperCase(str: string) {
  // Split the string into individual words
  const words = str.split("-");

  // Capitalize each word (except the first one)
  const upperCamelCaseWords = words.map((word) => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  // Join the words and return the upper camel case string
  return upperCamelCaseWords.join("");
}

function writeOutput(
  type: "success" | "error" | "warning" | "info",
  content: any
) {
  let colors = {
    success: "\x1b[32m",
    error: "\x1b[31m",
    warning: "\x1b[33m",
    info: "\x1b[36m",
  };
  console.log(colors[type], content);
}

function isInterfaceFile(filePath: string) {
  return filePath.indexOf("src/interfaces") > -1;
}

function getInterfaceName(data: string) {
  let interfaceNameStartIndex =
    data.indexOf("export interface ") + "export interface ".length;

  let substring = data.slice(interfaceNameStartIndex);

  let interfaceNameEndIndex = substring.indexOf(" ");
  let interfaceName = substring.slice(0, interfaceNameEndIndex);
  return interfaceName;
}

function getComponentName(data: string) {
  const componentNamePattern = /function\s+([a-zA-Z0-9]*)\(/;
  let match = componentNamePattern.exec(data);
  if (match) {
    return match[1];
  } else {
    return null;
  }
}

function isComponentFile(data: string, filePath: string) {
  return (
    filePath.endsWith(".tsx") &&
    !isInterfaceFile(filePath) &&
    (filePath.indexOf("/pages/") > -1 ||
      filePath.indexOf("/components/") > -1) &&
    data.indexOf("function render") > -1
  );
}

function logErrors(
  type: "error" | "warning",
  errorSectionName: string,
  errors: IErrorObject[]
) {
  let char = "-";
  writeOutput(type, char.repeat(errorSectionName.length));
  writeOutput(type, errorSectionName.toUpperCase());
  writeOutput(type, char.repeat(errorSectionName.length));

  errors.forEach((err) => {
    console.log(
      "\t" +
        (err.file ?? "") +
        (err.error && err.file ? " - " : "") +
        (err.error ? `${err.error}` : "")
    );
  });
}

function getStateVariables(data: string) {
  const stateVariableRegex = /(?<=\[\s*)(\w+)(?=\s*,\s*set\w+\s*\])/gm;

  const variableNames = [];
  let match;

  while ((match = stateVariableRegex.exec(data)) !== null) {
    variableNames.push(match[1]);
  }
  return variableNames;
}

function getVariables(data: string) {
  const variableRegex = /\b(?:let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b(?!\s*=\s*(?:lazy\(|createContext|require))/g;


  const variableNames = [];
  let match;

  while ((match = variableRegex.exec(data)) !== null) {
    variableNames.push(match[1]);
  }
  return variableNames;
}

function getFontawesomeImportNames(data: string) {
  let regex = /icon="[^"]*"/g;

  let matches = data.match(regex);
  let iconImports: string[] = [];
  matches?.forEach((match: string) => {
    let iconString = match.replace('icon="', "").replace('"', "");
    let importName = "fa" + kebabToUpperCase(iconString);
    iconImports.push(importName);
  });
  return iconImports;
}

function insertSubstring(originalString: string, insertString: string, position: number) {
  if (position < 0) {
      position = 0;
  }
  if (position > originalString.length) {
      position = originalString.length;
  }

  const before = originalString.slice(0, position);
  const after = originalString.slice(position);

  return before + insertString + after;
}

export {
  camelCaseRegex,
  upperCamelCaseRegex,
  upperSnakeCaseRegex,
  keyToHumanReadable,
  kebabToUpperCase,
  writeOutput,
  isInterfaceFile,
  isComponentFile,
  getInterfaceName,
  getComponentName,
  logErrors,
  getStateVariables,
  getVariables,
  getFontawesomeImportNames,
  insertSubstring
};
