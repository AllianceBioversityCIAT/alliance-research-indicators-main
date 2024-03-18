# ALLIANCE RESEARCH INDICATORS

## Frontend Tech Stack

### Programming language

TypeScript is a statically typed superset of JavaScript that compiles to plain JavaScript. It offers static type checking, which enhances code quality and developer productivity. TypeScript provides type safety, allowing early error detection and better code maintainability. Alternatives: JavaScript lacks static typing, which can lead to more runtime errors.

### Framework

Angular is a comprehensive framework for building web applications. It provides features like two-way data binding, dependency injection, and modular architecture. Angular offers a complete solution with strong support for building large-scale applications and extensive tooling. Alternatives: React is another popular framework, but Angular is preferred for its opinionated structure and built-in features.

### Build tool

Webpack is a module bundler for JavaScript applications. It bundles modules and assets into optimized bundles for deployment. Webpack offers powerful features like code splitting, hot module replacement, and tree shaking for efficient bundling. Alternatives: Parcel is simpler to configure but lacks some advanced features of Webpack.

### Code coverage tool

Istanbul is a code coverage tool for JavaScript applications. It instruments code to track which parts have been executed during testing. Istanbul provides accurate code coverage metrics and integrates well with testing frameworks like Jest. Alternatives: Blanket.js is another code coverage tool, but Istanbul is more widely used and supported.

### Dependency management

npm is the default package manager for Node.js. It manages dependencies and facilitates package installation, versioning, and dependency resolution. npm has a vast ecosystem of packages and is tightly integrated with Node.js development workflows. Alternatives: Yarn is another package manager, but npm is preferred for its widespread adoption and compatibility.

### Dependency vulnerability scanning

npm Audit is a built-in feature of npm that scans dependencies for known vulnerabilities. It provides actionable insights and recommendations for securing the application. npm Audit seamlessly integrates with npm and provides comprehensive vulnerability scanning without additional setup. Alternatives: Snyk offers similar functionality but requires additional configuration and integration.

### Static code analysis

ESLint is a highly configurable static analysis tool for identifying problematic patterns in JavaScript code. It enforces consistent coding styles and helps catch errors early. ESLint offers extensive customization options and supports TypeScript out of the box. Alternatives: JSHint is simpler to configure but lacks some advanced features of ESLint.

### Unit testing

Jest is a popular testing framework for JavaScript applications. It provides a delightful testing experience with features like snapshot testing, mocking, and code coverage. Jest offers an all-in-one solution for unit testing with built-in assertion libraries and comprehensive test reporting. Alternatives: Mocha requires additional configuration and setup compared to Jest.

### UI testing

Cypress is a modern end-to-end testing framework for web applications. It offers a simple and intuitive API, automatic waiting, and real-time test feedback. Cypress provides fast and reliable UI testing with built-in features like time-traveling, debugging, and automatic retries. Alternatives: Selenium WebDriver is more complex to set up and maintain compared to Cypress.

## Backend API Tech Stack

### Programming language

TypeScript is a statically typed superset of JavaScript that compiles to plain JavaScript. It offers static type checking, which enhances code quality and developer productivity. TypeScript provides type safety and better tooling for building robust backend applications. Alternatives: JavaScript lacks static typing, which can lead to more runtime errors.

### Framework

Nest.js is a progressive Node.js framework for building efficient and scalable server-side applications. It leverages TypeScript and follows modular architecture principles. Nest.js provides built-in support for dependency injection, middleware, and decorators, making it ideal for building RESTful APIs. Alternatives: Express.js is another popular framework, but Nest.js offers more structure and features out of the box.

### Build tool

TypeScript Compiler (tsc) is the official TypeScript compiler that translates TypeScript code into JavaScript. It checks for syntax errors and emits clean JavaScript code. tsc is the standard build tool for TypeScript projects and seamlessly integrates with TypeScript workflows. Alternatives: Babel can also transpile TypeScript code, but tsc is preferred for its close integration with TypeScript.

### Code coverage tool

Istanbul is a code coverage tool for JavaScript applications. It instruments code to track which parts have been executed during testing. Istanbul provides accurate code coverage metrics and integrates well with testing frameworks like Jest. Alternatives: Blanket.js is another code coverage tool, but Istanbul is more widely used and supported.

### Static code analysis

ESLint is a highly configurable static analysis tool for identifying problematic patterns in JavaScript code. It enforces consistent coding styles and helps catch errors early. ESLint offers extensive customization options and supports TypeScript out of the box. Alternatives: TSLint is deprecated in favor of ESLint for TypeScript projects.

### Dependency management

npm is the default package manager for Node.js. It manages dependencies and facilitates package installation, versioning, and dependency resolution. npm has a vast ecosystem of packages and is tightly integrated with Node.js development workflows. Alternatives: Yarn is another package manager, but npm is preferred for its widespread adoption and compatibility.

### Dependency vulnerability scanning

npm Audit is a built-in feature of npm that scans dependencies for known vulnerabilities. It provides actionable insights and recommendations for securing the application. npm Audit seamlessly integrates with npm and provides comprehensive vulnerability scanning without additional setup. Alternatives: Snyk offers similar functionality but requires additional configuration and integration.

### Unit testing

Jest is a popular testing framework for JavaScript applications. It provides a delightful testing experience with features like snapshot testing, mocking, and code coverage. Jest offers an all-in-one solution for unit testing with built-in assertion libraries and comprehensive test reporting. Alternatives: Mocha requires additional configuration and setup compared to Jest.

### API testing framework

Supertest is a high-level abstraction for testing HTTP servers in Node.js. It provides a fluent API for making HTTP requests and assertions. Supertest integrates well with testing frameworks like Jest and provides a simple and expressive syntax for API testing. Alternatives: Postman offers similar functionality but is more suitable for manual testing and API documentation.

### API documentation

Swagger is an open-source framework for designing, building, and documenting RESTful APIs. It provides tools for generating interactive API documentation from OpenAPI specifications. Swagger simplifies API documentation by automatically generating documentation from code annotations and comments. Alternatives: RAML and API Blueprint are alternatives to Swagger but are less widely adopted.

### Architecture Diagram

![Architecture Diagram](./Architecture.png)