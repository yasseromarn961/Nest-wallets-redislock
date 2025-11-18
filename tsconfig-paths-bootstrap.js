// tsconfig-paths-bootstrap.js
const tsConfigPaths = require('tsconfig-paths');
const path = require('path');

const baseUrl = path.resolve(__dirname, 'dist');

tsConfigPaths.register({
  baseUrl,
  paths: {
    'src/*': ['*'],
  },
});

console.log('tsconfig-paths-bootstrap: baseUrl ->', baseUrl);
