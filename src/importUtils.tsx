function fixLodashImports(data: string) {
  let importAll = 'import _ from "lodash";';
  if (data.includes(importAll)) {
    const lodashFunctionRegex = /_\.\w+[A-Za-z]*\(/g;
    const lodashFunctions = data.match(lodashFunctionRegex);
    let functionNames: string[] = [];
    lodashFunctions?.forEach((functionString: string) => {
      let functionName = functionString.substring(2, functionString.length - 1);
      functionNames.push(functionName);

      data = data.replace(functionString, functionName + "(");

      let newImport = `import ${functionName} from "lodash/${functionName}";`;
      if (!data.includes(newImport)) {
        // prevent newImport from being added multiple times
        data = data.replace(importAll, `${importAll}\n${newImport}`);
      }
    });

    data = data.replace(importAll, "");
  }

  return data;
}

export { fixLodashImports };
