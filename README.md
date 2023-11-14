
  

# bob-group-frontend-coding-standards

  

Script to check that frontend code follows coding standards

  

# Use in projects

  

Add the following to package.json scripts

`"standards": "node node_modules/bob-group-frontend-coding-standards --folderPath <path>"`

  

`<path>` should point to the project `src` folder

  

# For local development and testing:

  

Run `npx tsc --watch` to compile index.js file from index.ts file.

  

Run `node index.js --folderPath <path>` to test the script