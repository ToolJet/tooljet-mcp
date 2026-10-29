# Babel parser build input

`babel-parser-scopeflags.ts` is copied unchanged from Babel 7.29.8:
https://github.com/babel/babel/blob/1cb3a594b9ffc92d87ada07ecef35bb16df7072a/packages/babel-parser/src/util/scopeflags.ts

It is MIT licensed (see `babel-LICENSE`). The enum is normally inlined by Babel's
build and consequently absent from its published source map. All other parser
sources come from the source map in the pinned `@babel/parser` npm package.

`reviewable-bundle.mjs` compiles those original modules into readable ESM chunks.
It uses the package's already-expanded `State` class for Babel's private `@bit`
build macro. No parser source is fetched during a build or plugin installation.
When upgrading Babel, update this pinned input and run parser parity tests.
