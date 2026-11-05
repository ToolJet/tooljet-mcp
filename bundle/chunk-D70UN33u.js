import { createRequire } from "node:module";
createRequire(import.meta.url);
var DIALECTS = {
  postgresql: { quote: "double", limit: "limit", metadata: "postgresql" },
  mysql: { quote: "backtick", limit: "limit", metadata: "mysql" },
  mssql: { quote: "bracket", limit: "top", metadata: "mssql" },
  snowflake: { quote: "double", limit: "limit" },
  bigquery: { quote: "backtick", limit: "limit" },
  oracledb: { quote: "double", limit: "fetch" }
};
function assertIdentifier(identifier, label) {
  if (!identifier.trim() || identifier.length > 256 || /[\0-\x1f\x7f;`"\[\]\\]/.test(identifier)) {
    throw new Error(`${label} contains unsupported or unsafe identifier characters.`);
  }
}
function quote(kind, identifier) {
  assertIdentifier(identifier, "SQL identifier");
  const style = DIALECTS[kind].quote;
  if (style === "backtick")
    return `\`${identifier}\``;
  if (style === "bracket")
    return `[${identifier}]`;
  return `"${identifier}"`;
}
function literal(value) {
  return `'${value.replaceAll("'", "''")}'`;
}
function source(kind, schema, table) {
  return schema ? `${quote(kind, schema)}.${quote(kind, table)}` : quote(kind, table);
}
function boundedSelect(kind, projection, from, limit, distinct = false) {
  const prefix2 = `SELECT ${distinct ? "DISTINCT " : ""}`;
  if (DIALECTS[kind].limit === "top")
    return `${prefix2}TOP (${limit}) ${projection} FROM ${from}`;
  if (DIALECTS[kind].limit === "fetch")
    return `${prefix2}${projection} FROM ${from} FETCH FIRST ${limit} ROWS ONLY`;
  return `${prefix2}${projection} FROM ${from} LIMIT ${limit}`;
}
function options(kind, query) {
  return {
    mode: "sql",
    query,
    ...!["snowflake"].includes(kind) ? { query_params: [] } : {},
    runOnPageLoad: false
  };
}
function metadataSql(kind, purpose, schema, table) {
  const metadata = "metadata" in DIALECTS[kind] ? DIALECTS[kind].metadata : void 0;
  if (!metadata)
    return void 0;
  if (purpose !== "views" && !table)
    throw new Error(`${purpose} discovery requires table.`);
  if (metadata !== "mysql" && !schema)
    throw new Error(`${purpose} discovery for ${kind} requires schema.`);
  const schemaFilter = metadata === "mysql" && !schema ? "DATABASE()" : literal(schema);
  const tableFilter = table ? literal(table) : void 0;
  if (metadata === "postgresql") {
    if (purpose === "primary_keys")
      return `SELECT kcu.column_name, kcu.ordinal_position, tc.constraint_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_catalog = kcu.constraint_catalog AND tc.constraint_schema = kcu.constraint_schema AND tc.constraint_name = kcu.constraint_name WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = ${schemaFilter} AND tc.table_name = ${tableFilter} ORDER BY kcu.ordinal_position`;
    if (purpose === "foreign_keys")
      return `SELECT kcu.constraint_name, kcu.column_name, ccu.table_schema AS referenced_schema, ccu.table_name AS referenced_table, ccu.column_name AS referenced_column FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_catalog = kcu.constraint_catalog AND tc.constraint_schema = kcu.constraint_schema AND tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_catalog = tc.constraint_catalog AND ccu.constraint_schema = tc.constraint_schema AND ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = ${schemaFilter} AND tc.table_name = ${tableFilter} ORDER BY kcu.constraint_name, kcu.ordinal_position`;
    if (purpose === "indexes")
      return `SELECT indexname AS index_name, indexdef AS definition FROM pg_indexes WHERE schemaname = ${schemaFilter} AND tablename = ${tableFilter} ORDER BY indexname`;
    return `SELECT table_schema, table_name AS view_name FROM information_schema.views WHERE table_schema = ${schemaFilter} ORDER BY table_name`;
  }
  if (metadata === "mysql") {
    if (purpose === "primary_keys")
      return `SELECT column_name, ordinal_position, constraint_name FROM information_schema.key_column_usage WHERE table_schema = ${schemaFilter} AND table_name = ${tableFilter} AND constraint_name = 'PRIMARY' ORDER BY ordinal_position`;
    if (purpose === "foreign_keys")
      return `SELECT constraint_name, column_name, referenced_table_schema AS referenced_schema, referenced_table_name AS referenced_table, referenced_column_name AS referenced_column FROM information_schema.key_column_usage WHERE table_schema = ${schemaFilter} AND table_name = ${tableFilter} AND referenced_table_name IS NOT NULL ORDER BY constraint_name, ordinal_position`;
    if (purpose === "indexes")
      return `SELECT index_name, column_name, non_unique, seq_in_index FROM information_schema.statistics WHERE table_schema = ${schemaFilter} AND table_name = ${tableFilter} ORDER BY index_name, seq_in_index`;
    return `SELECT table_schema, table_name AS view_name FROM information_schema.views WHERE table_schema = ${schemaFilter} ORDER BY table_name`;
  }
  if (purpose === "primary_keys")
    return `SELECT kcu.COLUMN_NAME AS column_name, kcu.ORDINAL_POSITION AS ordinal_position, tc.CONSTRAINT_NAME AS constraint_name FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND tc.TABLE_NAME = kcu.TABLE_NAME WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY' AND tc.TABLE_SCHEMA = ${schemaFilter} AND tc.TABLE_NAME = ${tableFilter} ORDER BY kcu.ORDINAL_POSITION`;
  if (purpose === "foreign_keys")
    return `SELECT fk.name AS constraint_name, pc.name AS column_name, rs.name AS referenced_schema, rt.name AS referenced_table, rc.name AS referenced_column FROM sys.foreign_key_columns fkc JOIN sys.foreign_keys fk ON fk.object_id = fkc.constraint_object_id JOIN sys.tables pt ON pt.object_id = fkc.parent_object_id JOIN sys.schemas ps ON ps.schema_id = pt.schema_id JOIN sys.columns pc ON pc.object_id = pt.object_id AND pc.column_id = fkc.parent_column_id JOIN sys.tables rt ON rt.object_id = fkc.referenced_object_id JOIN sys.schemas rs ON rs.schema_id = rt.schema_id JOIN sys.columns rc ON rc.object_id = rt.object_id AND rc.column_id = fkc.referenced_column_id WHERE ps.name = ${schemaFilter} AND pt.name = ${tableFilter} ORDER BY fk.name, fkc.constraint_column_id`;
  if (purpose === "indexes")
    return `SELECT i.name AS index_name, c.name AS column_name, i.is_unique, ic.key_ordinal FROM sys.indexes i JOIN sys.tables t ON t.object_id = i.object_id JOIN sys.schemas s ON s.schema_id = t.schema_id JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id WHERE s.name = ${schemaFilter} AND t.name = ${tableFilter} AND i.is_hypothetical = 0 ORDER BY i.name, ic.key_ordinal`;
  return `SELECT TABLE_SCHEMA AS table_schema, TABLE_NAME AS view_name FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = ${schemaFilter} ORDER BY TABLE_NAME`;
}
function boundMetadata(kind, sql) {
  if (DIALECTS[kind].limit === "top")
    return sql.replace(/^SELECT\s+/i, "SELECT TOP (100) ");
  if (DIALECTS[kind].limit === "fetch")
    return `${sql} FETCH FIRST 100 ROWS ONLY`;
  return `${sql} LIMIT 100`;
}
function safeName(value) {
  return value.replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "table";
}
function prepareSqlDiscoveryQueries(args) {
  if (!(args.kind in DIALECTS))
    throw new Error(`Datasource kind "${args.kind}" is not supported by SQL discovery.`);
  const kind = args.kind;
  if (args.schema)
    assertIdentifier(args.schema, "schema");
  if (args.table)
    assertIdentifier(args.table, "table");
  for (const column of [...args.columns ?? [], ...args.distinctColumns ?? []])
    assertIdentifier(column, "column");
  const tablePurposes = args.purposes.filter((purpose) => purpose !== "views");
  if (tablePurposes.length && !args.table)
    throw new Error("Table-scoped SQL discovery requires table.");
  if (args.purposes.includes("preview") && !args.columns?.length) {
    throw new Error("Preview discovery requires one or more explicit columns; SELECT * is never generated.");
  }
  if (args.purposes.includes("distinct") && !args.distinctColumns?.length) {
    throw new Error("Distinct discovery requires one or more explicit distinct_columns.");
  }
  const from = args.table ? source(kind, args.schema, args.table) : void 0;
  const prefix2 = safeName(args.namePrefix ?? args.table ?? args.schema ?? "schema");
  const queries = [];
  const unsupported = [];
  for (const purpose of [...new Set(args.purposes)]) {
    let sql;
    if (purpose === "count")
      sql = `SELECT COUNT(*) AS row_count FROM ${from}`;
    else if (purpose === "preview") {
      sql = boundedSelect(kind, args.columns.map((column) => quote(kind, column)).join(", "), from, args.limit);
    } else if (purpose === "distinct") {
      sql = boundedSelect(kind, args.distinctColumns.map((column) => quote(kind, column)).join(", "), from, args.limit, true);
    } else {
      sql = metadataSql(kind, purpose, args.schema, args.table);
      if (!sql) {
        unsupported.push({
          purpose,
          reason: `${args.kind} does not expose a verified ${purpose} selector and MCP has no curated read-only SQL contract for it yet.`
        });
        continue;
      }
      sql = boundMetadata(kind, sql);
    }
    queries.push({
      purpose,
      name: `${prefix2}_${purpose}`,
      datasource_id: args.datasourceId,
      options: options(kind, sql)
    });
  }
  return { queries, unsupported };
}
createRequire(import.meta.url);
var COMPONENT_FX_GUIDANCE = "For properties/styles/validation with an FX toggle, use `{ value: <expression>, fxActive: true }` only for bindings/conditions/calculations the normal control cannot express. Keep defaults and panel-editable constants (including `{{true}}`/`{{false}}`, numbers, selections, colors) out of FX. For nested Table columns/buttons/options and KeyValuePair fields, add the property key (e.g. `columnVisibility`, `disableButton`, `fieldVisibility`, `isEditable`) to that object's `fxActiveFields`, preserving other entries. ";
var COMPONENT_FX_UPDATE_GUIDANCE = COMPONENT_FX_GUIDANCE + "Updates must include both `value` and `fxActive`; revert with `{ value: <constant>, fxActive: false }`. For nested Table fields, remove only reverted property keys from `fxActiveFields`. KeyValuePair arrays merge by index; verify flag removals and report retained flags. ";
createRequire(import.meta.url);
var TableQuotaError = class extends Error {
  code = "TJDB_TABLE_LIMIT_REACHED";
  status = 451;
  retryable = false;
  constructor() {
    super("The workspace has reached its ToolJet Database table limit. Stop creating tables. Ask the user to reuse existing tables, free table capacity, or increase the workspace allowance before continuing. Keep resources already created; do not delete tables automatically.");
    this.name = "TableQuotaError";
  }
};
function tableQuotaError(error) {
  const seen = /* @__PURE__ */ new Set();
  while (error instanceof Error && !seen.has(error)) {
    if (error instanceof TableQuotaError)
      return error;
    seen.add(error);
    error = error.cause;
  }
  return void 0;
}
createRequire(import.meta.url);
function ok(value) {
  return { content: [{ type: "text", text: JSON.stringify(value) }] };
}
function fail(err) {
  const message = err instanceof Error ? err.message : String(err);
  const quota = tableQuotaError(err);
  const text = quota ? JSON.stringify({ error: {
    code: quota.code,
    status: quota.status,
    retryable: quota.retryable,
    message: quota.message,
    details: message
  } }) : `Error: ${message}`;
  return { content: [{ type: "text", text }], isError: true };
}
createRequire(import.meta.url);
var Position = class {
  line;
  column;
  index;
  constructor(line, col, index) {
    this.line = line;
    this.column = col;
    this.index = index;
  }
};
var SourceLocation = class {
  start;
  end;
  filename;
  identifierName;
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
};
function createPositionWithColumnOffset(position, columnOffset) {
  const { line, column, index } = position;
  return new Position(line, column + columnOffset, index + columnOffset);
}
var code = "BABEL_PARSER_SOURCETYPE_MODULE_REQUIRED";
var module_errors_default = {
  ImportMetaOutsideModule: {
    message: `import.meta may appear only with 'sourceType: "module"'`,
    code
  },
  ImportOutsideModule: {
    message: `'import' and 'export' may appear only with 'sourceType: "module"'`,
    code
  }
};
var NodeDescriptions = {
  ArrayPattern: "array destructuring pattern",
  AssignmentExpression: "assignment expression",
  AssignmentPattern: "assignment expression",
  ArrowFunctionExpression: "arrow function expression",
  ConditionalExpression: "conditional expression",
  CatchClause: "catch clause",
  ForOfStatement: "for-of statement",
  ForInStatement: "for-in statement",
  ForStatement: "for-loop",
  FormalParameters: "function parameter list",
  Identifier: "identifier",
  ImportSpecifier: "import specifier",
  ImportDefaultSpecifier: "import default specifier",
  ImportNamespaceSpecifier: "import namespace specifier",
  ObjectPattern: "object destructuring pattern",
  ParenthesizedExpression: "parenthesized expression",
  RestElement: "rest element",
  UpdateExpression: {
    true: "prefix operation",
    false: "postfix operation"
  },
  VariableDeclarator: "variable declaration",
  YieldExpression: "yield expression"
};
var toNodeDescription = (node) => node.type === "UpdateExpression" ? NodeDescriptions.UpdateExpression[`${node.prefix}`] : NodeDescriptions[node.type];
var to_node_description_default = toNodeDescription;
var standard_errors_default = {
  AccessorIsGenerator: ({ kind }) => `A ${kind}ter cannot be a generator.`,
  ArgumentsInClass: "'arguments' is only allowed in functions and class methods.",
  AsyncFunctionInSingleStatementContext: "Async functions can only be declared at the top level or inside a block.",
  AwaitBindingIdentifier: "Can not use 'await' as identifier inside an async function.",
  AwaitBindingIdentifierInStaticBlock: "Can not use 'await' as identifier inside a static block.",
  AwaitExpressionFormalParameter: "'await' is not allowed in async function parameters.",
  AwaitUsingNotInAsyncContext: "'await using' is only allowed within async functions and at the top levels of modules.",
  AwaitNotInAsyncContext: "'await' is only allowed within async functions and at the top levels of modules.",
  BadGetterArity: "A 'get' accessor must not have any formal parameters.",
  BadSetterArity: "A 'set' accessor must have exactly one formal parameter.",
  BadSetterRestParameter: "A 'set' accessor function argument must not be a rest parameter.",
  ConstructorClassField: "Classes may not have a field named 'constructor'.",
  ConstructorClassPrivateField: "Classes may not have a private field named '#constructor'.",
  ConstructorIsAccessor: "Class constructor may not be an accessor.",
  ConstructorIsAsync: "Constructor can't be an async function.",
  ConstructorIsGenerator: "Constructor can't be a generator.",
  DeclarationMissingInitializer: ({
    kind
  }) => `Missing initializer in ${kind} declaration.`,
  DecoratorArgumentsOutsideParentheses: "Decorator arguments must be moved inside parentheses: use '@(decorator(args))' instead of '@(decorator)(args)'.",
  DecoratorBeforeExport: "Decorators must be placed *before* the 'export' keyword. Remove the 'decoratorsBeforeExport: true' option to use the 'export @decorator class {}' syntax.",
  DecoratorsBeforeAfterExport: "Decorators can be placed *either* before or after the 'export' keyword, but not in both locations at the same time.",
  DecoratorConstructor: "Decorators can't be used with a constructor. Did you mean '@dec class { ... }'?",
  DecoratorExportClass: "Decorators must be placed *after* the 'export' keyword. Remove the 'decoratorsBeforeExport: false' option to use the '@decorator export class {}' syntax.",
  DecoratorSemicolon: "Decorators must not be followed by a semicolon.",
  DecoratorStaticBlock: "Decorators can't be used with a static block.",
  DeferImportRequiresNamespace: 'Only `import defer * as x from "./module"` is valid.',
  DeletePrivateField: "Deleting a private field is not allowed.",
  DestructureNamedImport: "ES2015 named imports do not destructure. Use another statement for destructuring after the import.",
  DuplicateConstructor: "Duplicate constructor in the same class.",
  DuplicateDefaultExport: "Only one default export allowed per module.",
  DuplicateExport: ({ exportName }) => `\`${exportName}\` has already been exported. Exported identifiers must be unique.`,
  DuplicateProto: "Redefinition of __proto__ property.",
  DuplicateRegExpFlags: "Duplicate regular expression flag.",
  ElementAfterRest: "Rest element must be last element.",
  EscapedCharNotAnIdentifier: "Invalid Unicode escape.",
  ExportBindingIsString: ({
    localName,
    exportName
  }) => `A string literal cannot be used as an exported binding without \`from\`.
- Did you mean \`export { '${localName}' as '${exportName}' } from 'some-module'\`?`,
  ExportDefaultFromAsIdentifier: "'from' is not allowed as an identifier after 'export default'.",
  ForInOfLoopInitializer: ({
    type
  }) => `'${type === "ForInStatement" ? "for-in" : "for-of"}' loop variable declaration may not have an initializer.`,
  ForInUsing: "For-in loop may not start with 'using' declaration.",
  ForOfAsync: "The left-hand side of a for-of loop may not be 'async'.",
  ForOfLet: "The left-hand side of a for-of loop may not start with 'let'.",
  GeneratorInSingleStatementContext: "Generators can only be declared at the top level or inside a block.",
  IllegalBreakContinue: ({
    type
  }) => `Unsyntactic ${type === "BreakStatement" ? "break" : "continue"}.`,
  IllegalLanguageModeDirective: "Illegal 'use strict' directive in function with non-simple parameter list.",
  IllegalReturn: "'return' outside of function.",
  ImportAttributesUseAssert: "The `assert` keyword in import attributes is deprecated and it has been replaced by the `with` keyword. You can enable the `deprecatedImportAssert` parser plugin to suppress this error.",
  ImportBindingIsString: ({ importName }) => `A string literal cannot be used as an imported binding.
- Did you mean \`import { "${importName}" as foo }\`?`,
  ImportCallArity: `\`import()\` requires exactly one or two arguments.`,
  ImportCallNotNewExpression: "Cannot use new with import(...).",
  ImportCallSpreadArgument: "`...` is not allowed in `import()`.",
  ImportJSONBindingNotDefault: "A JSON module can only be imported with `default`.",
  ImportReflectionHasAssertion: "`import module x` cannot have assertions.",
  ImportReflectionNotBinding: 'Only `import module x from "./module"` is valid.',
  IncompatibleRegExpUVFlags: "The 'u' and 'v' regular expression flags cannot be enabled at the same time.",
  InvalidBigIntLiteral: "Invalid BigIntLiteral.",
  InvalidCodePoint: "Code point out of bounds.",
  InvalidCoverDiscardElement: "'void' must be followed by an expression when not used in a binding position.",
  InvalidCoverInitializedName: "Invalid shorthand property initializer.",
  InvalidDecimal: "Invalid decimal.",
  InvalidDigit: ({ radix }) => `Expected number in radix ${radix}.`,
  InvalidEscapeSequence: "Bad character escape sequence.",
  InvalidEscapeSequenceTemplate: "Invalid escape sequence in template.",
  InvalidEscapedReservedWord: ({ reservedWord }) => `Escape sequence in keyword ${reservedWord}.`,
  InvalidIdentifier: ({ identifierName }) => `Invalid identifier ${identifierName}.`,
  InvalidLhs: ({ ancestor }) => `Invalid left-hand side in ${to_node_description_default(ancestor)}.`,
  InvalidLhsBinding: ({ ancestor }) => `Binding invalid left-hand side in ${to_node_description_default(ancestor)}.`,
  InvalidLhsOptionalChaining: ({ ancestor }) => `Invalid optional chaining in the left-hand side of ${to_node_description_default(
    ancestor
  )}.`,
  InvalidNumber: "Invalid number.",
  InvalidOrMissingExponent: "Floating-point numbers require a valid exponent after the 'e'.",
  InvalidOrUnexpectedToken: ({ unexpected }) => `Unexpected character '${unexpected}'.`,
  InvalidParenthesizedAssignment: "Invalid parenthesized assignment pattern.",
  InvalidPrivateFieldResolution: ({
    identifierName
  }) => `Private name #${identifierName} is not defined.`,
  InvalidPropertyBindingPattern: "Binding member expression.",
  InvalidRecordProperty: "Only properties and spread elements are allowed in record definitions.",
  InvalidRestAssignmentPattern: "Invalid rest operator's argument.",
  LabelRedeclaration: ({ labelName }) => `Label '${labelName}' is already declared.`,
  LetInLexicalBinding: "'let' is disallowed as a lexically bound name.",
  LineTerminatorBeforeArrow: "No line break is allowed before '=>'.",
  MalformedRegExpFlags: "Invalid regular expression flag.",
  MissingClassName: "A class name is required.",
  MissingEqInAssignment: "Only '=' operator can be used for specifying default value.",
  MissingSemicolon: "Missing semicolon.",
  MissingPlugin: ({ missingPlugin }) => `This experimental syntax requires enabling the parser plugin: ${missingPlugin.map((name) => JSON.stringify(name)).join(", ")}.`,
  // FIXME: Would be nice to make this "missingPlugins" instead.
  // Also, seems like we can drop the "(s)" from the message and just make it "s".
  MissingOneOfPlugins: ({ missingPlugin }) => `This experimental syntax requires enabling one of the following parser plugin(s): ${missingPlugin.map((name) => JSON.stringify(name)).join(", ")}.`,
  MissingUnicodeEscape: "Expecting Unicode escape sequence \\uXXXX.",
  MixingCoalesceWithLogical: "Nullish coalescing operator(??) requires parens when mixing with logical operators.",
  ModuleAttributeDifferentFromType: "The only accepted module attribute is `type`.",
  ModuleAttributeInvalidValue: "Only string literals are allowed as module attribute values.",
  ModuleAttributesWithDuplicateKeys: ({ key }) => `Duplicate key "${key}" is not allowed in module attributes.`,
  ModuleExportNameHasLoneSurrogate: ({
    surrogateCharCode
  }) => `An export name cannot include a lone surrogate, found '\\u${surrogateCharCode.toString(
    16
  )}'.`,
  ModuleExportUndefined: ({ localName }) => `Export '${localName}' is not defined.`,
  MultipleDefaultsInSwitch: "Multiple default clauses.",
  NewlineAfterThrow: "Illegal newline after throw.",
  NoCatchOrFinally: "Missing catch or finally clause.",
  NumberIdentifier: "Identifier directly after number.",
  NumericSeparatorInEscapeSequence: "Numeric separators are not allowed inside unicode escape sequences or hex escape sequences.",
  ObsoleteAwaitStar: "'await*' has been removed from the async functions proposal. Use Promise.all() instead.",
  OptionalChainingNoNew: "Constructors in/after an Optional Chain are not allowed.",
  OptionalChainingNoTemplate: "Tagged Template Literals are not allowed in optionalChain.",
  OverrideOnConstructor: "'override' modifier cannot appear on a constructor declaration.",
  ParamDupe: "Argument name clash.",
  PatternHasAccessor: "Object pattern can't contain getter or setter.",
  PatternHasMethod: "Object pattern can't contain methods.",
  PrivateInExpectedIn: ({ identifierName }) => `Private names are only allowed in property accesses (\`obj.#${identifierName}\`) or in \`in\` expressions (\`#${identifierName} in obj\`).`,
  PrivateNameRedeclaration: ({ identifierName }) => `Duplicate private name #${identifierName}.`,
  RecordExpressionBarIncorrectEndSyntaxType: "Record expressions ending with '|}' are only allowed when the 'syntaxType' option of the 'recordAndTuple' plugin is set to 'bar'.",
  RecordExpressionBarIncorrectStartSyntaxType: "Record expressions starting with '{|' are only allowed when the 'syntaxType' option of the 'recordAndTuple' plugin is set to 'bar'.",
  RecordExpressionHashIncorrectStartSyntaxType: "Record expressions starting with '#{' are only allowed when the 'syntaxType' option of the 'recordAndTuple' plugin is set to 'hash'.",
  RecordNoProto: "'__proto__' is not allowed in Record expressions.",
  RestTrailingComma: "Unexpected trailing comma after rest element.",
  SloppyFunction: "In non-strict mode code, functions can only be declared at top level or inside a block.",
  SloppyFunctionAnnexB: "In non-strict mode code, functions can only be declared at top level, inside a block, or as the body of an if statement.",
  SourcePhaseImportRequiresDefault: 'Only `import source x from "./module"` is valid.',
  StaticPrototype: "Classes may not have static property named prototype.",
  SuperCallNotNewExpression: "Cannot use new with super(...).",
  SuperNotAllowed: "`super()` is only valid inside a class constructor of a subclass. Maybe a typo in the method name ('constructor') or not extending another class?",
  SuperPrivateField: "Private fields can't be accessed on super.",
  TrailingDecorator: "Decorators must be attached to a class element.",
  TupleExpressionBarIncorrectEndSyntaxType: "Tuple expressions ending with '|]' are only allowed when the 'syntaxType' option of the 'recordAndTuple' plugin is set to 'bar'.",
  TupleExpressionBarIncorrectStartSyntaxType: "Tuple expressions starting with '[|' are only allowed when the 'syntaxType' option of the 'recordAndTuple' plugin is set to 'bar'.",
  TupleExpressionHashIncorrectStartSyntaxType: "Tuple expressions starting with '#[' are only allowed when the 'syntaxType' option of the 'recordAndTuple' plugin is set to 'hash'.",
  UnexpectedArgumentPlaceholder: "Unexpected argument placeholder.",
  UnexpectedAwaitAfterPipelineBody: 'Unexpected "await" after pipeline body; await must have parentheses in minimal proposal.',
  UnexpectedDigitAfterHash: "Unexpected digit after hash token.",
  UnexpectedImportExport: "'import' and 'export' may only appear at the top level.",
  UnexpectedKeyword: ({ keyword }) => `Unexpected keyword '${keyword}'.`,
  UnexpectedLeadingDecorator: "Leading decorators must be attached to a class declaration.",
  UnexpectedLexicalDeclaration: "Lexical declaration cannot appear in a single-statement context.",
  UnexpectedNewTarget: "`new.target` can only be used in functions or class properties.",
  UnexpectedNumericSeparator: "A numeric separator is only allowed between two digits.",
  UnexpectedPrivateField: "Unexpected private name.",
  UnexpectedReservedWord: ({ reservedWord }) => `Unexpected reserved word '${reservedWord}'.`,
  UnexpectedSuper: "'super' is only allowed in object methods and classes.",
  UnexpectedToken: ({
    expected,
    unexpected
  }) => `Unexpected token${unexpected ? ` '${unexpected}'.` : ""}${expected ? `, expected "${expected}"` : ""}`,
  UnexpectedTokenUnaryExponentiation: "Illegal expression. Wrap left hand side or entire exponentiation in parentheses.",
  UnexpectedUsingDeclaration: "Using declaration cannot appear in the top level when source type is `script` or in the bare case statement.",
  UnexpectedVoidPattern: "Unexpected void binding.",
  UnsupportedDecoratorExport: "A decorated export must export a class declaration.",
  UnsupportedDefaultExport: "Only expressions, functions or classes are allowed as the `default` export.",
  UnsupportedImport: "`import` can only be used in `import()` or `import.meta`.",
  UnsupportedMetaProperty: ({
    target,
    onlyValidPropertyName
  }) => `The only valid meta property for ${target} is ${target}.${onlyValidPropertyName}.`,
  UnsupportedParameterDecorator: "Decorators cannot be used to decorate parameters.",
  UnsupportedPropertyDecorator: "Decorators cannot be used to decorate object literal properties.",
  UnsupportedSuper: "'super' can only be used with function calls (i.e. super()) or in property accesses (i.e. super.prop or super[prop]).",
  UnterminatedComment: "Unterminated comment.",
  UnterminatedRegExp: "Unterminated regular expression.",
  UnterminatedString: "Unterminated string constant.",
  UnterminatedTemplate: "Unterminated template.",
  UsingDeclarationExport: "Using declaration cannot be exported.",
  UsingDeclarationHasBindingPattern: "Using declaration cannot have destructuring patterns.",
  VarRedeclaration: ({ identifierName }) => `Identifier '${identifierName}' has already been declared.`,
  VoidPatternCatchClauseParam: "A void binding can not be the catch clause parameter. Use `try { ... } catch { ... }` if you want to discard the caught error.",
  VoidPatternInitializer: "A void binding may not have an initializer.",
  YieldBindingIdentifier: "Can not use 'yield' as identifier inside a generator.",
  YieldInParameter: "Yield expression is not allowed in formal parameters.",
  YieldNotInGeneratorFunction: "'yield' is only allowed within generator functions.",
  ZeroDigitNumericSeparator: "Numeric separator can not be used after leading 0."
};
var strict_mode_errors_default = {
  StrictDelete: "Deleting local variable in strict mode.",
  // `referenceName` is the StringValue[1] of an IdentifierReference[2], which
  // is represented as just an `Identifier`[3] in the Babel AST.
  // 1. https://tc39.es/ecma262/#sec-static-semantics-stringvalue
  // 2. https://tc39.es/ecma262/#prod-IdentifierReference
  // 3. https://github.com/babel/babel/blob/main/packages/babel-parser/ast/spec.md#identifier
  StrictEvalArguments: ({ referenceName }) => `Assigning to '${referenceName}' in strict mode.`,
  // `bindingName` is the StringValue[1] of a BindingIdentifier[2], which is
  // represented as just an `Identifier`[3] in the Babel AST.
  // 1. https://tc39.es/ecma262/#sec-static-semantics-stringvalue
  // 2. https://tc39.es/ecma262/#prod-BindingIdentifier
  // 3. https://github.com/babel/babel/blob/main/packages/babel-parser/ast/spec.md#identifier
  StrictEvalArgumentsBinding: ({ bindingName }) => `Binding '${bindingName}' in strict mode.`,
  StrictFunction: "In strict mode code, functions can only be declared at top level or inside a block.",
  StrictNumericEscape: "The only valid numeric escape in strict mode is '\\0'.",
  StrictOctalLiteral: "Legacy octal literals are not allowed in strict mode.",
  StrictWith: "'with' in strict mode."
};
var parse_expression_errors_default = {
  ParseExpressionEmptyInput: "Unexpected parseExpression() input: The input is empty or contains only comments.",
  ParseExpressionExpectsEOF: ({ unexpected }) => `Unexpected parseExpression() input: The input should contain exactly one expression, but the first expression is followed by the unexpected character \`${String.fromCodePoint(unexpected)}\`.`
};
var UnparenthesizedPipeBodyDescriptions = /* @__PURE__ */ new Set([
  "ArrowFunctionExpression",
  "AssignmentExpression",
  "ConditionalExpression",
  "YieldExpression"
]);
var pipeline_operator_errors_default = {
  // This error is only used by the smart-mix proposal
  PipeBodyIsTighter: "Unexpected yield after pipeline body; any yield expression acting as Hack-style pipe body must be parenthesized due to its loose operator precedence.",
  PipeTopicRequiresHackPipes: 'Topic reference is used, but the pipelineOperator plugin was not passed a "proposal": "hack" or "smart" option.',
  PipeTopicUnbound: "Topic reference is unbound; it must be inside a pipe body.",
  PipeTopicUnconfiguredToken: ({ token }) => `Invalid topic token ${token}. In order to use ${token} as a topic reference, the pipelineOperator plugin must be configured with { "proposal": "hack", "topicToken": "${token}" }.`,
  PipeTopicUnused: "Hack-style pipe body does not contain a topic reference; Hack-style pipes must use topic at least once.",
  PipeUnparenthesizedBody: ({ type }) => `Hack-style pipe body cannot be an unparenthesized ${to_node_description_default({
    type
  })}; please wrap it in parentheses.`,
  ...{
    // Messages whose codes start with “Pipeline” or “PrimaryTopic”
    // are retained for backwards compatibility
    // with the deprecated smart-mix pipe operator proposal plugin.
    // They are subject to removal in a future major version.
    PipelineBodyNoArrow: 'Unexpected arrow "=>" after pipeline body; arrow function in pipeline body must be parenthesized.',
    PipelineBodySequenceExpression: "Pipeline body may not be a comma-separated sequence expression.",
    PipelineHeadSequenceExpression: "Pipeline head should not be a comma-separated sequence expression.",
    PipelineTopicUnused: "Pipeline is in topic style but does not use topic reference.",
    PrimaryTopicNotAllowed: "Topic reference was used in a lexical context without topic binding.",
    PrimaryTopicRequiresSmartPipeline: 'Topic reference is used, but the pipelineOperator plugin was not passed a "proposal": "hack" or "smart" option.'
  }
};
var bind_operator_errors_default = {
  UnsupportedBind: "Binding should be performed on object property.",
  UnsupportedBindRHS: "The right-hand side of binding can not be super or import."
};
function defineHidden(obj, key, value) {
  Object.defineProperty(obj, key, {
    enumerable: false,
    configurable: true,
    value
  });
}
function toParseErrorConstructor({
  toMessage,
  code: code2,
  reasonCode,
  syntaxPlugin
}) {
  const hasMissingPlugin = reasonCode === "MissingPlugin" || reasonCode === "MissingOneOfPlugins";
  {
    const oldReasonCodes = {
      AccessorCannotDeclareThisParameter: "AccesorCannotDeclareThisParameter",
      AccessorCannotHaveTypeParameters: "AccesorCannotHaveTypeParameters",
      ConstInitializerMustBeStringOrNumericLiteralOrLiteralEnumReference: "ConstInitiailizerMustBeStringOrNumericLiteralOrLiteralEnumReference",
      SetAccessorCannotHaveOptionalParameter: "SetAccesorCannotHaveOptionalParameter",
      SetAccessorCannotHaveRestParameter: "SetAccesorCannotHaveRestParameter",
      SetAccessorCannotHaveReturnType: "SetAccesorCannotHaveReturnType"
    };
    if (oldReasonCodes[reasonCode]) {
      reasonCode = oldReasonCodes[reasonCode];
    }
  }
  return function constructor(loc, details) {
    const error = new SyntaxError();
    error.code = code2;
    error.reasonCode = reasonCode;
    error.loc = loc;
    error.pos = loc.index;
    error.syntaxPlugin = syntaxPlugin;
    if (hasMissingPlugin) {
      error.missingPlugin = details.missingPlugin;
    }
    defineHidden(error, "clone", function clone(overrides = {}) {
      const { line, column, index } = overrides.loc ?? loc;
      return constructor(new Position(line, column, index), {
        ...details,
        ...overrides.details
      });
    });
    defineHidden(error, "details", details);
    Object.defineProperty(error, "message", {
      configurable: true,
      get() {
        const message = `${toMessage(details)} (${loc.line}:${loc.column})`;
        this.message = message;
        return message;
      },
      set(value) {
        Object.defineProperty(this, "message", { value, writable: true });
      }
    });
    return error;
  };
}
function ParseErrorEnum(argument, syntaxPlugin) {
  if (Array.isArray(argument)) {
    return (parseErrorTemplates) => ParseErrorEnum(parseErrorTemplates, argument[0]);
  }
  const ParseErrorConstructors = {};
  for (const reasonCode of Object.keys(argument)) {
    const template = argument[reasonCode];
    const { message, ...rest } = typeof template === "string" ? { message: () => template } : typeof template === "function" ? { message: template } : template;
    const toMessage = typeof message === "string" ? () => message : message;
    ParseErrorConstructors[reasonCode] = toParseErrorConstructor({
      code: "BABEL_PARSER_SYNTAX_ERROR",
      reasonCode,
      toMessage,
      ...syntaxPlugin ? { syntaxPlugin } : {},
      ...rest
    });
  }
  return ParseErrorConstructors;
}
var Errors = {
  ...ParseErrorEnum(module_errors_default),
  ...ParseErrorEnum(standard_errors_default),
  ...ParseErrorEnum(strict_mode_errors_default),
  ...ParseErrorEnum(parse_expression_errors_default),
  ...ParseErrorEnum`pipelineOperator`(pipeline_operator_errors_default),
  ...ParseErrorEnum`functionBind`(bind_operator_errors_default)
};
var TokContext = class {
  constructor(token, preserveSpace) {
    this.token = token;
    this.preserveSpace = !!preserveSpace;
  }
  token;
  preserveSpace;
};
var types = {
  brace: new TokContext("{"),
  // normal JavaScript expression
  j_oTag: new TokContext("<tag"),
  // JSX opening tag
  j_cTag: new TokContext("</tag"),
  // JSX closing tag
  j_expr: new TokContext("<tag>...</tag>", true)
  // JSX expressions
};
{
  types.template = new TokContext("`", true);
}
var beforeExpr = true;
var startsExpr = true;
var isLoop = true;
var isAssign = true;
var prefix = true;
var postfix = true;
var ExportedTokenType = class {
  label;
  keyword;
  beforeExpr;
  startsExpr;
  rightAssociative;
  isLoop;
  isAssign;
  prefix;
  postfix;
  binop;
  constructor(label, conf = {}) {
    this.label = label;
    this.keyword = conf.keyword;
    this.beforeExpr = !!conf.beforeExpr;
    this.startsExpr = !!conf.startsExpr;
    this.rightAssociative = !!conf.rightAssociative;
    this.isLoop = !!conf.isLoop;
    this.isAssign = !!conf.isAssign;
    this.prefix = !!conf.prefix;
    this.postfix = !!conf.postfix;
    this.binop = conf.binop != null ? conf.binop : null;
    {
      this.updateContext = null;
    }
  }
};
var keywords = /* @__PURE__ */ new Map();
function createKeyword(name, options2 = {}) {
  options2.keyword = name;
  const token = createToken(name, options2);
  keywords.set(name, token);
  return token;
}
function createBinop(name, binop) {
  return createToken(name, { beforeExpr, binop });
}
var tokenTypeCounter = -1;
var tokenTypes = [];
var tokenLabels = [];
var tokenBinops = [];
var tokenBeforeExprs = [];
var tokenStartsExprs = [];
var tokenPrefixes = [];
function createToken(name, options2 = {}) {
  ++tokenTypeCounter;
  tokenLabels.push(name);
  tokenBinops.push(options2.binop ?? -1);
  tokenBeforeExprs.push(options2.beforeExpr ?? false);
  tokenStartsExprs.push(options2.startsExpr ?? false);
  tokenPrefixes.push(options2.prefix ?? false);
  tokenTypes.push(new ExportedTokenType(name, options2));
  return tokenTypeCounter;
}
function createKeywordLike(name, options2 = {}) {
  ++tokenTypeCounter;
  keywords.set(name, tokenTypeCounter);
  tokenLabels.push(name);
  tokenBinops.push(options2.binop ?? -1);
  tokenBeforeExprs.push(options2.beforeExpr ?? false);
  tokenStartsExprs.push(options2.startsExpr ?? false);
  tokenPrefixes.push(options2.prefix ?? false);
  tokenTypes.push(new ExportedTokenType("name", options2));
  return tokenTypeCounter;
}
var tt = {
  // Punctuation token types.
  bracketL: createToken("[", { beforeExpr, startsExpr }),
  // TODO: Remove this in Babel 8
  bracketHashL: createToken("#[", { beforeExpr, startsExpr }),
  // TODO: Remove this in Babel 8
  bracketBarL: createToken("[|", { beforeExpr, startsExpr }),
  bracketR: createToken("]"),
  // TODO: Remove this in Babel 8
  bracketBarR: createToken("|]"),
  braceL: createToken("{", { beforeExpr, startsExpr }),
  // TODO: Remove this in Babel 8
  braceBarL: createToken("{|", { beforeExpr, startsExpr }),
  // TODO: Remove this in Babel 8
  braceHashL: createToken("#{", { beforeExpr, startsExpr }),
  braceR: createToken("}"),
  braceBarR: createToken("|}"),
  parenL: createToken("(", { beforeExpr, startsExpr }),
  parenR: createToken(")"),
  comma: createToken(",", { beforeExpr }),
  semi: createToken(";", { beforeExpr }),
  colon: createToken(":", { beforeExpr }),
  doubleColon: createToken("::", { beforeExpr }),
  dot: createToken("."),
  question: createToken("?", { beforeExpr }),
  questionDot: createToken("?."),
  arrow: createToken("=>", { beforeExpr }),
  template: createToken("template"),
  ellipsis: createToken("...", { beforeExpr }),
  backQuote: createToken("`", { startsExpr }),
  dollarBraceL: createToken("${", { beforeExpr, startsExpr }),
  // start: isTemplate
  templateTail: createToken("...`", { startsExpr }),
  templateNonTail: createToken("...${", { beforeExpr, startsExpr }),
  // end: isTemplate
  at: createToken("@"),
  hash: createToken("#", { startsExpr }),
  // Special hashbang token.
  interpreterDirective: createToken("#!..."),
  // Operators. These carry several kinds of properties to help the
  // parser use them properly (the presence of these properties is
  // what categorizes them as operators).
  //
  // `binop`, when present, specifies that this operator is a binary
  // operator, and will refer to its precedence.
  //
  // `prefix` and `postfix` mark the operator as a prefix or postfix
  // unary operator.
  //
  // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
  // binary operators with a very low precedence, that should result
  // in AssignmentExpression nodes.
  // start: isAssign
  eq: createToken("=", { beforeExpr, isAssign }),
  assign: createToken("_=", { beforeExpr, isAssign }),
  slashAssign: createToken("_=", { beforeExpr, isAssign }),
  // These are only needed to support % and ^ as a Hack-pipe topic token.
  // When the proposal settles on a token, the others can be merged with
  // tt.assign.
  xorAssign: createToken("_=", { beforeExpr, isAssign }),
  moduloAssign: createToken("_=", { beforeExpr, isAssign }),
  // end: isAssign
  incDec: createToken("++/--", { prefix, postfix, startsExpr }),
  bang: createToken("!", { beforeExpr, prefix, startsExpr }),
  tilde: createToken("~", { beforeExpr, prefix, startsExpr }),
  // More possible topic tokens.
  // When the proposal settles on a token, at least one of these may be removed.
  doubleCaret: createToken("^^", { startsExpr }),
  doubleAt: createToken("@@", { startsExpr }),
  // start: isBinop
  pipeline: createBinop("|>", 0),
  nullishCoalescing: createBinop("??", 1),
  logicalOR: createBinop("||", 1),
  logicalAND: createBinop("&&", 2),
  bitwiseOR: createBinop("|", 3),
  bitwiseXOR: createBinop("^", 4),
  bitwiseAND: createBinop("&", 5),
  equality: createBinop("==/!=/===/!==", 6),
  lt: createBinop("</>/<=/>=", 7),
  gt: createBinop("</>/<=/>=", 7),
  relational: createBinop("</>/<=/>=", 7),
  bitShift: createBinop("<</>>/>>>", 8),
  bitShiftL: createBinop("<</>>/>>>", 8),
  bitShiftR: createBinop("<</>>/>>>", 8),
  plusMin: createToken("+/-", { beforeExpr, binop: 9, prefix, startsExpr }),
  // startsExpr: required by v8intrinsic plugin
  modulo: createToken("%", { binop: 10, startsExpr }),
  // unset `beforeExpr` as it can be `function *`
  star: createToken("*", { binop: 10 }),
  slash: createBinop("/", 10),
  exponent: createToken("**", {
    beforeExpr,
    binop: 11,
    rightAssociative: true
  }),
  // Keywords
  // Don't forget to update packages/babel-helper-validator-identifier/src/keyword.js
  // when new keywords are added
  // start: isLiteralPropertyName
  // start: isKeyword
  _in: createKeyword("in", { beforeExpr, binop: 7 }),
  _instanceof: createKeyword("instanceof", { beforeExpr, binop: 7 }),
  // end: isBinop
  _break: createKeyword("break"),
  _case: createKeyword("case", { beforeExpr }),
  _catch: createKeyword("catch"),
  _continue: createKeyword("continue"),
  _debugger: createKeyword("debugger"),
  _default: createKeyword("default", { beforeExpr }),
  _else: createKeyword("else", { beforeExpr }),
  _finally: createKeyword("finally"),
  _function: createKeyword("function", { startsExpr }),
  _if: createKeyword("if"),
  _return: createKeyword("return", { beforeExpr }),
  _switch: createKeyword("switch"),
  _throw: createKeyword("throw", { beforeExpr, prefix, startsExpr }),
  _try: createKeyword("try"),
  _var: createKeyword("var"),
  _const: createKeyword("const"),
  _with: createKeyword("with"),
  _new: createKeyword("new", { beforeExpr, startsExpr }),
  _this: createKeyword("this", { startsExpr }),
  _super: createKeyword("super", { startsExpr }),
  _class: createKeyword("class", { startsExpr }),
  _extends: createKeyword("extends", { beforeExpr }),
  _export: createKeyword("export"),
  _import: createKeyword("import", { startsExpr }),
  _null: createKeyword("null", { startsExpr }),
  _true: createKeyword("true", { startsExpr }),
  _false: createKeyword("false", { startsExpr }),
  _typeof: createKeyword("typeof", { beforeExpr, prefix, startsExpr }),
  _void: createKeyword("void", { beforeExpr, prefix, startsExpr }),
  _delete: createKeyword("delete", { beforeExpr, prefix, startsExpr }),
  // start: isLoop
  _do: createKeyword("do", { isLoop, beforeExpr }),
  _for: createKeyword("for", { isLoop }),
  _while: createKeyword("while", { isLoop }),
  // end: isLoop
  // end: isKeyword
  // Primary literals
  // start: isIdentifier
  _as: createKeywordLike("as", { startsExpr }),
  _assert: createKeywordLike("assert", { startsExpr }),
  _async: createKeywordLike("async", { startsExpr }),
  _await: createKeywordLike("await", { startsExpr }),
  _defer: createKeywordLike("defer", { startsExpr }),
  _from: createKeywordLike("from", { startsExpr }),
  _get: createKeywordLike("get", { startsExpr }),
  _let: createKeywordLike("let", { startsExpr }),
  _meta: createKeywordLike("meta", { startsExpr }),
  _of: createKeywordLike("of", { startsExpr }),
  _sent: createKeywordLike("sent", { startsExpr }),
  _set: createKeywordLike("set", { startsExpr }),
  _source: createKeywordLike("source", { startsExpr }),
  _static: createKeywordLike("static", { startsExpr }),
  _using: createKeywordLike("using", { startsExpr }),
  _yield: createKeywordLike("yield", { startsExpr }),
  // Flow and TypeScript Keywordlike
  _asserts: createKeywordLike("asserts", { startsExpr }),
  _checks: createKeywordLike("checks", { startsExpr }),
  _exports: createKeywordLike("exports", { startsExpr }),
  _global: createKeywordLike("global", { startsExpr }),
  _implements: createKeywordLike("implements", { startsExpr }),
  _intrinsic: createKeywordLike("intrinsic", { startsExpr }),
  _infer: createKeywordLike("infer", { startsExpr }),
  _is: createKeywordLike("is", { startsExpr }),
  _mixins: createKeywordLike("mixins", { startsExpr }),
  _proto: createKeywordLike("proto", { startsExpr }),
  _require: createKeywordLike("require", { startsExpr }),
  _satisfies: createKeywordLike("satisfies", { startsExpr }),
  // start: isTSTypeOperator
  _keyof: createKeywordLike("keyof", { startsExpr }),
  _readonly: createKeywordLike("readonly", { startsExpr }),
  _unique: createKeywordLike("unique", { startsExpr }),
  // end: isTSTypeOperator
  // start: isTSDeclarationStart
  _abstract: createKeywordLike("abstract", { startsExpr }),
  _declare: createKeywordLike("declare", { startsExpr }),
  _enum: createKeywordLike("enum", { startsExpr }),
  _module: createKeywordLike("module", { startsExpr }),
  _namespace: createKeywordLike("namespace", { startsExpr }),
  // start: isFlowInterfaceOrTypeOrOpaque
  _interface: createKeywordLike("interface", { startsExpr }),
  _type: createKeywordLike("type", { startsExpr }),
  // end: isTSDeclarationStart
  _opaque: createKeywordLike("opaque", { startsExpr }),
  // end: isFlowInterfaceOrTypeOrOpaque
  name: createToken("name", { startsExpr }),
  // placeholder plugin
  placeholder: createToken("%%", { startsExpr }),
  // end: isIdentifier
  string: createToken("string", { startsExpr }),
  num: createToken("num", { startsExpr }),
  bigint: createToken("bigint", { startsExpr }),
  // TODO: Remove this in Babel 8
  decimal: createToken("decimal", { startsExpr }),
  // end: isLiteralPropertyName
  regexp: createToken("regexp", { startsExpr }),
  privateName: createToken("#name", { startsExpr }),
  eof: createToken("eof"),
  // jsx plugin
  jsxName: createToken("jsxName"),
  jsxText: createToken("jsxText", { beforeExpr }),
  jsxTagStart: createToken("jsxTagStart", { startsExpr }),
  jsxTagEnd: createToken("jsxTagEnd")
};
function tokenIsIdentifier(token) {
  return token >= tt._as && token <= tt.placeholder;
}
function tokenKeywordOrIdentifierIsKeyword(token) {
  return token <= tt._while;
}
function tokenIsKeywordOrIdentifier(token) {
  return token >= tt._in && token <= tt.placeholder;
}
function tokenIsLiteralPropertyName(token) {
  return token >= tt._in && token <= tt.decimal;
}
function tokenComesBeforeExpression(token) {
  return tokenBeforeExprs[token];
}
function tokenCanStartExpression(token) {
  return tokenStartsExprs[token];
}
function tokenIsAssignment(token) {
  return token >= tt.eq && token <= tt.moduloAssign;
}
function tokenIsFlowInterfaceOrTypeOrOpaque(token) {
  return token >= tt._interface && token <= tt._opaque;
}
function tokenIsLoop(token) {
  return token >= tt._do && token <= tt._while;
}
function tokenIsKeyword(token) {
  return token >= tt._in && token <= tt._while;
}
function tokenIsOperator(token) {
  return token >= tt.pipeline && token <= tt._instanceof;
}
function tokenIsPostfix(token) {
  return token === tt.incDec;
}
function tokenIsPrefix(token) {
  return tokenPrefixes[token];
}
function tokenIsTSTypeOperator(token) {
  return token >= tt._keyof && token <= tt._unique;
}
function tokenIsTSDeclarationStart(token) {
  return token >= tt._abstract && token <= tt._type;
}
function tokenLabelName(token) {
  return tokenLabels[token];
}
function tokenOperatorPrecedence(token) {
  return tokenBinops[token];
}
function tokenIsRightAssociative(token) {
  return token === tt.exponent;
}
function tokenIsTemplate(token) {
  return token >= tt.templateTail && token <= tt.templateNonTail;
}
function getExportedToken(token) {
  return tokenTypes[token];
}
{
  tokenTypes[tt.braceR].updateContext = (context) => {
    context.pop();
  };
  tokenTypes[tt.braceL].updateContext = tokenTypes[tt.braceHashL].updateContext = tokenTypes[tt.dollarBraceL].updateContext = (context) => {
    context.push(types.brace);
  };
  tokenTypes[tt.backQuote].updateContext = (context) => {
    if (context[context.length - 1] === types.template) {
      context.pop();
    } else {
      context.push(types.template);
    }
  };
  tokenTypes[tt.jsxTagStart].updateContext = (context) => {
    context.push(types.j_expr, types.j_oTag);
  };
}
var tab = 9;
var lineFeed = 10;
var carriageReturn = 13;
var space = 32;
var exclamationMark = 33;
var quotationMark = 34;
var numberSign = 35;
var dollarSign = 36;
var percentSign = 37;
var ampersand = 38;
var apostrophe = 39;
var leftParenthesis = 40;
var rightParenthesis = 41;
var asterisk = 42;
var plusSign = 43;
var comma = 44;
var dash = 45;
var dot = 46;
var slash = 47;
var digit0 = 48;
var digit1 = 49;
var digit2 = 50;
var digit3 = 51;
var digit4 = 52;
var digit5 = 53;
var digit6 = 54;
var digit7 = 55;
var digit8 = 56;
var digit9 = 57;
var colon = 58;
var semicolon = 59;
var lessThan = 60;
var equalsTo = 61;
var greaterThan = 62;
var questionMark = 63;
var atSign = 64;
var uppercaseA = 65;
var uppercaseB = 66;
var uppercaseE = 69;
var uppercaseF = 70;
var uppercaseO = 79;
var uppercaseX = 88;
var uppercaseZ = 90;
var leftSquareBracket = 91;
var backslash = 92;
var rightSquareBracket = 93;
var caret = 94;
var underscore = 95;
var graveAccent = 96;
var lowercaseA = 97;
var lowercaseB = 98;
var lowercaseD = 100;
var lowercaseE = 101;
var lowercaseF = 102;
var lowercaseG = 103;
var lowercaseI = 105;
var lowercaseM = 109;
var lowercaseN = 110;
var lowercaseO = 111;
var lowercaseR = 114;
var lowercaseS = 115;
var lowercaseT = 116;
var lowercaseU = 117;
var lowercaseV = 118;
var lowercaseX = 120;
var lowercaseY = 121;
var lowercaseZ = 122;
var leftCurlyBrace = 123;
var verticalBar = 124;
var rightCurlyBrace = 125;
var tilde = 126;
var nonBreakingSpace = 160;
var oghamSpaceMark = 5760;
var lineSeparator = 8232;
var paragraphSeparator = 8233;
function isDigit(code2) {
  return code2 >= digit0 && code2 <= digit9;
}
var nonASCIIidentifierStartChars = "\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u05D0-\u05EA\u05EF-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u0870-\u0887\u0889-\u088F\u08A0-\u08C9\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C5C\u0C5D\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDC-\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D04-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u1711\u171F-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1878\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4C\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C8A\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u31A0-\u31BF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7DC\uA7F1-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB69\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC";
var nonASCIIidentifierChars = "\xB7\u0300-\u036F\u0387\u0483-\u0487\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u0669\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u06F0-\u06F9\u0711\u0730-\u074A\u07A6-\u07B0\u07C0-\u07C9\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u0897-\u089F\u08CA-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0966-\u096F\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09E6-\u09EF\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A66-\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AE6-\u0AEF\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B55-\u0B57\u0B62\u0B63\u0B66-\u0B6F\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0BE6-\u0BEF\u0C00-\u0C04\u0C3C\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0CE6-\u0CEF\u0CF3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D66-\u0D6F\u0D81-\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0E50-\u0E59\u0EB1\u0EB4-\u0EBC\u0EC8-\u0ECE\u0ED0-\u0ED9\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1040-\u1049\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F-\u109D\u135D-\u135F\u1369-\u1371\u1712-\u1715\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u17E0-\u17E9\u180B-\u180D\u180F-\u1819\u18A9\u1920-\u192B\u1930-\u193B\u1946-\u194F\u19D0-\u19DA\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AB0-\u1ABD\u1ABF-\u1ADD\u1AE0-\u1AEB\u1B00-\u1B04\u1B34-\u1B44\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BB0-\u1BB9\u1BE6-\u1BF3\u1C24-\u1C37\u1C40-\u1C49\u1C50-\u1C59\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DFF\u200C\u200D\u203F\u2040\u2054\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\u30FB\uA620-\uA629\uA66F\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA82C\uA880\uA881\uA8B4-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F1\uA8FF-\uA909\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9D0-\uA9D9\uA9E5\uA9F0-\uA9F9\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA50-\uAA59\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uABF0-\uABF9\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFF10-\uFF19\uFF3F\uFF65";
var nonASCIIidentifierStart = new RegExp(
  "[" + nonASCIIidentifierStartChars + "]"
);
var nonASCIIidentifier = new RegExp(
  "[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]"
);
nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;
var astralIdentifierStartCodes = [0, 11, 2, 25, 2, 18, 2, 1, 2, 14, 3, 13, 35, 122, 70, 52, 268, 28, 4, 48, 48, 31, 14, 29, 6, 37, 11, 29, 3, 35, 5, 7, 2, 4, 43, 157, 19, 35, 5, 35, 5, 39, 9, 51, 13, 10, 2, 14, 2, 6, 2, 1, 2, 10, 2, 14, 2, 6, 2, 1, 4, 51, 13, 310, 10, 21, 11, 7, 25, 5, 2, 41, 2, 8, 70, 5, 3, 0, 2, 43, 2, 1, 4, 0, 3, 22, 11, 22, 10, 30, 66, 18, 2, 1, 11, 21, 11, 25, 7, 25, 39, 55, 7, 1, 65, 0, 16, 3, 2, 2, 2, 28, 43, 28, 4, 28, 36, 7, 2, 27, 28, 53, 11, 21, 11, 18, 14, 17, 111, 72, 56, 50, 14, 50, 14, 35, 39, 27, 10, 22, 251, 41, 7, 1, 17, 5, 57, 28, 11, 0, 9, 21, 43, 17, 47, 20, 28, 22, 13, 52, 58, 1, 3, 0, 14, 44, 33, 24, 27, 35, 30, 0, 3, 0, 9, 34, 4, 0, 13, 47, 15, 3, 22, 0, 2, 0, 36, 17, 2, 24, 20, 1, 64, 6, 2, 0, 2, 3, 2, 14, 2, 9, 8, 46, 39, 7, 3, 1, 3, 21, 2, 6, 2, 1, 2, 4, 4, 0, 19, 0, 13, 4, 31, 9, 2, 0, 3, 0, 2, 37, 2, 0, 26, 0, 2, 0, 45, 52, 19, 3, 21, 2, 31, 47, 21, 1, 2, 0, 185, 46, 42, 3, 37, 47, 21, 0, 60, 42, 14, 0, 72, 26, 38, 6, 186, 43, 117, 63, 32, 7, 3, 0, 3, 7, 2, 1, 2, 23, 16, 0, 2, 0, 95, 7, 3, 38, 17, 0, 2, 0, 29, 0, 11, 39, 8, 0, 22, 0, 12, 45, 20, 0, 19, 72, 200, 32, 32, 8, 2, 36, 18, 0, 50, 29, 113, 6, 2, 1, 2, 37, 22, 0, 26, 5, 2, 1, 2, 31, 15, 0, 24, 43, 261, 18, 16, 0, 2, 12, 2, 33, 125, 0, 80, 921, 103, 110, 18, 195, 2637, 96, 16, 1071, 18, 5, 26, 3994, 6, 582, 6842, 29, 1763, 568, 8, 30, 18, 78, 18, 29, 19, 47, 17, 3, 32, 20, 6, 18, 433, 44, 212, 63, 33, 24, 3, 24, 45, 74, 6, 0, 67, 12, 65, 1, 2, 0, 15, 4, 10, 7381, 42, 31, 98, 114, 8702, 3, 2, 6, 2, 1, 2, 290, 16, 0, 30, 2, 3, 0, 15, 3, 9, 395, 2309, 106, 6, 12, 4, 8, 8, 9, 5991, 84, 2, 70, 2, 1, 3, 0, 3, 1, 3, 3, 2, 11, 2, 0, 2, 6, 2, 64, 2, 3, 3, 7, 2, 6, 2, 27, 2, 3, 2, 4, 2, 0, 4, 6, 2, 339, 3, 24, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 7, 1845, 30, 7, 5, 262, 61, 147, 44, 11, 6, 17, 0, 322, 29, 19, 43, 485, 27, 229, 29, 3, 0, 208, 30, 2, 2, 2, 1, 2, 6, 3, 4, 10, 1, 225, 6, 2, 3, 2, 1, 2, 14, 2, 196, 60, 67, 8, 0, 1205, 3, 2, 26, 2, 1, 2, 0, 3, 0, 2, 9, 2, 3, 2, 0, 2, 0, 7, 0, 5, 0, 2, 0, 2, 0, 2, 2, 2, 1, 2, 0, 3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1, 2, 0, 3, 3, 2, 6, 2, 3, 2, 3, 2, 0, 2, 9, 2, 16, 6, 2, 2, 4, 2, 16, 4421, 42719, 33, 4381, 3, 5773, 3, 7472, 16, 621, 2467, 541, 1507, 4938, 6, 8489];
var astralIdentifierCodes = [509, 0, 227, 0, 150, 4, 294, 9, 1368, 2, 2, 1, 6, 3, 41, 2, 5, 0, 166, 1, 574, 3, 9, 9, 7, 9, 32, 4, 318, 1, 78, 5, 71, 10, 50, 3, 123, 2, 54, 14, 32, 10, 3, 1, 11, 3, 46, 10, 8, 0, 46, 9, 7, 2, 37, 13, 2, 9, 6, 1, 45, 0, 13, 2, 49, 13, 9, 3, 2, 11, 83, 11, 7, 0, 3, 0, 158, 11, 6, 9, 7, 3, 56, 1, 2, 6, 3, 1, 3, 2, 10, 0, 11, 1, 3, 6, 4, 4, 68, 8, 2, 0, 3, 0, 2, 3, 2, 4, 2, 0, 15, 1, 83, 17, 10, 9, 5, 0, 82, 19, 13, 9, 214, 6, 3, 8, 28, 1, 83, 16, 16, 9, 82, 12, 9, 9, 7, 19, 58, 14, 5, 9, 243, 14, 166, 9, 71, 5, 2, 1, 3, 3, 2, 0, 2, 1, 13, 9, 120, 6, 3, 6, 4, 0, 29, 9, 41, 6, 2, 3, 9, 0, 10, 10, 47, 15, 199, 7, 137, 9, 54, 7, 2, 7, 17, 9, 57, 21, 2, 13, 123, 5, 4, 0, 2, 1, 2, 6, 2, 0, 9, 9, 49, 4, 2, 1, 2, 4, 9, 9, 55, 9, 266, 3, 10, 1, 2, 0, 49, 6, 4, 4, 14, 10, 5350, 0, 7, 14, 11465, 27, 2343, 9, 87, 9, 39, 4, 60, 6, 26, 9, 535, 9, 470, 0, 2, 54, 8, 3, 82, 0, 12, 1, 19628, 1, 4178, 9, 519, 45, 3, 22, 543, 4, 4, 5, 9, 7, 3, 6, 31, 3, 149, 2, 1418, 49, 513, 54, 5, 49, 9, 0, 15, 0, 23, 4, 2, 14, 1361, 6, 2, 16, 3, 6, 2, 1, 2, 4, 101, 0, 161, 6, 10, 9, 357, 0, 62, 13, 499, 13, 245, 1, 2, 9, 233, 0, 3, 0, 8, 1, 6, 0, 475, 6, 110, 6, 6, 9, 4759, 9, 787719, 239];
function isInAstralSet(code2, set) {
  let pos = 65536;
  for (let i = 0, length = set.length; i < length; i += 2) {
    pos += set[i];
    if (pos > code2) return false;
    pos += set[i + 1];
    if (pos >= code2) return true;
  }
  return false;
}
function isIdentifierStart(code2) {
  if (code2 < uppercaseA) return code2 === dollarSign;
  if (code2 <= uppercaseZ) return true;
  if (code2 < lowercaseA) return code2 === underscore;
  if (code2 <= lowercaseZ) return true;
  if (code2 <= 65535) {
    return code2 >= 170 && nonASCIIidentifierStart.test(String.fromCharCode(code2));
  }
  return isInAstralSet(code2, astralIdentifierStartCodes);
}
function isIdentifierChar(code2) {
  if (code2 < digit0) return code2 === dollarSign;
  if (code2 < colon) return true;
  if (code2 < uppercaseA) return false;
  if (code2 <= uppercaseZ) return true;
  if (code2 < lowercaseA) return code2 === underscore;
  if (code2 <= lowercaseZ) return true;
  if (code2 <= 65535) {
    return code2 >= 170 && nonASCIIidentifier.test(String.fromCharCode(code2));
  }
  return isInAstralSet(code2, astralIdentifierStartCodes) || isInAstralSet(code2, astralIdentifierCodes);
}
var reservedWords = {
  keyword: [
    "break",
    "case",
    "catch",
    "continue",
    "debugger",
    "default",
    "do",
    "else",
    "finally",
    "for",
    "function",
    "if",
    "return",
    "switch",
    "throw",
    "try",
    "var",
    "const",
    "while",
    "with",
    "new",
    "this",
    "super",
    "class",
    "extends",
    "export",
    "import",
    "null",
    "true",
    "false",
    "in",
    "instanceof",
    "typeof",
    "void",
    "delete"
  ],
  strict: [
    "implements",
    "interface",
    "let",
    "package",
    "private",
    "protected",
    "public",
    "static",
    "yield"
  ],
  strictBind: ["eval", "arguments"]
};
var keywords2 = new Set(reservedWords.keyword);
var reservedWordsStrictSet = new Set(reservedWords.strict);
var reservedWordsStrictBindSet = new Set(reservedWords.strictBind);
function isReservedWord(word, inModule) {
  return inModule && word === "await" || word === "enum";
}
function isStrictReservedWord(word, inModule) {
  return isReservedWord(word, inModule) || reservedWordsStrictSet.has(word);
}
function isStrictBindOnlyReservedWord(word) {
  return reservedWordsStrictBindSet.has(word);
}
function isStrictBindReservedWord(word, inModule) {
  return isStrictReservedWord(word, inModule) || isStrictBindOnlyReservedWord(word);
}
function isKeyword(word) {
  return keywords2.has(word);
}
function isIteratorStart(current, next, next2) {
  return current === atSign && next === atSign && isIdentifierStart(next2);
}
var reservedWordLikeSet = /* @__PURE__ */ new Set([
  "break",
  "case",
  "catch",
  "continue",
  "debugger",
  "default",
  "do",
  "else",
  "finally",
  "for",
  "function",
  "if",
  "return",
  "switch",
  "throw",
  "try",
  "var",
  "const",
  "while",
  "with",
  "new",
  "this",
  "super",
  "class",
  "extends",
  "export",
  "import",
  "null",
  "true",
  "false",
  "in",
  "instanceof",
  "typeof",
  "void",
  "delete",
  // strict
  "implements",
  "interface",
  "let",
  "package",
  "private",
  "protected",
  "public",
  "static",
  "yield",
  // strictBind
  "eval",
  "arguments",
  // reservedWorkLike
  "enum",
  "await"
]);
function canBeReservedWord(word) {
  return reservedWordLikeSet.has(word);
}
var ScopeFlag = /* @__PURE__ */ ((ScopeFlag2) => {
  ScopeFlag2[ScopeFlag2["OTHER"] = 0] = "OTHER";
  ScopeFlag2[ScopeFlag2["PROGRAM"] = 1] = "PROGRAM";
  ScopeFlag2[ScopeFlag2["FUNCTION_BASE"] = 2] = "FUNCTION_BASE";
  ScopeFlag2[ScopeFlag2["ARROW"] = 4] = "ARROW";
  ScopeFlag2[ScopeFlag2["SIMPLE_CATCH"] = 8] = "SIMPLE_CATCH";
  ScopeFlag2[ScopeFlag2["SUPER"] = 16] = "SUPER";
  ScopeFlag2[ScopeFlag2["DIRECT_SUPER"] = 32] = "DIRECT_SUPER";
  ScopeFlag2[ScopeFlag2["CLASS_BASE"] = 64] = "CLASS_BASE";
  ScopeFlag2[ScopeFlag2["STATIC_BLOCK"] = 128] = "STATIC_BLOCK";
  ScopeFlag2[ScopeFlag2["SWITCH"] = 256] = "SWITCH";
  ScopeFlag2[ScopeFlag2["NEW_TARGET"] = 512] = "NEW_TARGET";
  ScopeFlag2[ScopeFlag2["TS_MODULE"] = 1024] = "TS_MODULE";
  ScopeFlag2[ScopeFlag2["FUNCTION"] = 514] = "FUNCTION";
  ScopeFlag2[ScopeFlag2["CLASS"] = 576] = "CLASS";
  ScopeFlag2[ScopeFlag2["VAR"] = 1667] = "VAR";
  return ScopeFlag2;
})(ScopeFlag || {});
var BindingFlag = /* @__PURE__ */ ((BindingFlag2) => {
  BindingFlag2[BindingFlag2["KIND_VALUE"] = 1] = "KIND_VALUE";
  BindingFlag2[BindingFlag2["KIND_TYPE"] = 2] = "KIND_TYPE";
  BindingFlag2[BindingFlag2["SCOPE_VAR"] = 4] = "SCOPE_VAR";
  BindingFlag2[BindingFlag2["SCOPE_LEXICAL"] = 8] = "SCOPE_LEXICAL";
  BindingFlag2[BindingFlag2["SCOPE_FUNCTION"] = 16] = "SCOPE_FUNCTION";
  BindingFlag2[BindingFlag2["SCOPE_OUTSIDE"] = 32] = "SCOPE_OUTSIDE";
  BindingFlag2[BindingFlag2["FLAG_NONE"] = 64] = "FLAG_NONE";
  BindingFlag2[BindingFlag2["FLAG_CLASS"] = 128] = "FLAG_CLASS";
  BindingFlag2[BindingFlag2["FLAG_TS_ENUM"] = 256] = "FLAG_TS_ENUM";
  BindingFlag2[BindingFlag2["FLAG_TS_CONST_ENUM"] = 512] = "FLAG_TS_CONST_ENUM";
  BindingFlag2[BindingFlag2["FLAG_TS_EXPORT_ONLY"] = 1024] = "FLAG_TS_EXPORT_ONLY";
  BindingFlag2[BindingFlag2["FLAG_FLOW_DECLARE_FN"] = 2048] = "FLAG_FLOW_DECLARE_FN";
  BindingFlag2[BindingFlag2["FLAG_TS_IMPORT"] = 4096] = "FLAG_TS_IMPORT";
  BindingFlag2[BindingFlag2["FLAG_NO_LET_IN_LEXICAL"] = 8192] = "FLAG_NO_LET_IN_LEXICAL";
  BindingFlag2[BindingFlag2["TYPE_CLASS"] = 8331] = "TYPE_CLASS";
  BindingFlag2[BindingFlag2["TYPE_LEXICAL"] = 8201] = "TYPE_LEXICAL";
  BindingFlag2[BindingFlag2["TYPE_CATCH_PARAM"] = 9] = "TYPE_CATCH_PARAM";
  BindingFlag2[BindingFlag2["TYPE_VAR"] = 5] = "TYPE_VAR";
  BindingFlag2[BindingFlag2["TYPE_FUNCTION"] = 17] = "TYPE_FUNCTION";
  BindingFlag2[BindingFlag2["TYPE_TS_INTERFACE"] = 130] = "TYPE_TS_INTERFACE";
  BindingFlag2[BindingFlag2["TYPE_TS_TYPE"] = 2] = "TYPE_TS_TYPE";
  BindingFlag2[BindingFlag2["TYPE_TS_ENUM"] = 8459] = "TYPE_TS_ENUM";
  BindingFlag2[BindingFlag2["TYPE_TS_AMBIENT"] = 1024] = "TYPE_TS_AMBIENT";
  BindingFlag2[BindingFlag2["TYPE_NONE"] = 64] = "TYPE_NONE";
  BindingFlag2[BindingFlag2["TYPE_OUTSIDE"] = 65] = "TYPE_OUTSIDE";
  BindingFlag2[BindingFlag2["TYPE_TS_CONST_ENUM"] = 8971] = "TYPE_TS_CONST_ENUM";
  BindingFlag2[BindingFlag2["TYPE_TS_NAMESPACE"] = 1024] = "TYPE_TS_NAMESPACE";
  BindingFlag2[BindingFlag2["TYPE_TS_TYPE_IMPORT"] = 4098] = "TYPE_TS_TYPE_IMPORT";
  BindingFlag2[BindingFlag2["TYPE_TS_VALUE_IMPORT"] = 4096] = "TYPE_TS_VALUE_IMPORT";
  BindingFlag2[BindingFlag2["TYPE_FLOW_DECLARE_FN"] = 2048] = "TYPE_FLOW_DECLARE_FN";
  return BindingFlag2;
})(BindingFlag || {});
var ClassElementType = /* @__PURE__ */ ((ClassElementType2) => {
  ClassElementType2[ClassElementType2["OTHER"] = 0] = "OTHER";
  ClassElementType2[ClassElementType2["FLAG_STATIC"] = 4] = "FLAG_STATIC";
  ClassElementType2[ClassElementType2["KIND_GETTER"] = 2] = "KIND_GETTER";
  ClassElementType2[ClassElementType2["KIND_SETTER"] = 1] = "KIND_SETTER";
  ClassElementType2[ClassElementType2["KIND_ACCESSOR"] = 3] = "KIND_ACCESSOR";
  ClassElementType2[ClassElementType2["STATIC_GETTER"] = 6] = "STATIC_GETTER";
  ClassElementType2[ClassElementType2["STATIC_SETTER"] = 5] = "STATIC_SETTER";
  ClassElementType2[
    ClassElementType2["INSTANCE_GETTER"] = 2
    /* KIND_GETTER */
  ] = "INSTANCE_GETTER";
  ClassElementType2[
    ClassElementType2["INSTANCE_SETTER"] = 1
    /* KIND_SETTER */
  ] = "INSTANCE_SETTER";
  return ClassElementType2;
})(ClassElementType || {});
createRequire(import.meta.url);
var NameType = /* @__PURE__ */ ((NameType2) => {
  NameType2[NameType2["Var"] = 1] = "Var";
  NameType2[NameType2["Lexical"] = 2] = "Lexical";
  NameType2[NameType2["Function"] = 4] = "Function";
  return NameType2;
})(NameType || {});
var Scope = class {
  flags = 0;
  names = /* @__PURE__ */ new Map();
  firstLexicalName = "";
  constructor(flags) {
    this.flags = flags;
  }
};
var ScopeHandler = class {
  parser;
  scopeStack = [];
  inModule;
  undefinedExports = /* @__PURE__ */ new Map();
  constructor(parser, inModule) {
    this.parser = parser;
    this.inModule = inModule;
  }
  get inTopLevel() {
    return (this.currentScope().flags & ScopeFlag.PROGRAM) > 0;
  }
  get inFunction() {
    return (this.currentVarScopeFlags() & ScopeFlag.FUNCTION_BASE) > 0;
  }
  get allowSuper() {
    return (this.currentThisScopeFlags() & ScopeFlag.SUPER) > 0;
  }
  get allowDirectSuper() {
    return (this.currentThisScopeFlags() & ScopeFlag.DIRECT_SUPER) > 0;
  }
  get allowNewTarget() {
    return (this.currentThisScopeFlags() & ScopeFlag.NEW_TARGET) > 0;
  }
  get inClass() {
    return (this.currentThisScopeFlags() & ScopeFlag.CLASS_BASE) > 0;
  }
  get inClassAndNotInNonArrowFunction() {
    const flags = this.currentThisScopeFlags();
    return (flags & ScopeFlag.CLASS_BASE) > 0 && (flags & ScopeFlag.FUNCTION_BASE) === 0;
  }
  get inStaticBlock() {
    for (let i = this.scopeStack.length - 1; ; i--) {
      const { flags } = this.scopeStack[i];
      if (flags & ScopeFlag.STATIC_BLOCK) {
        return true;
      }
      if (flags & (ScopeFlag.VAR | ScopeFlag.CLASS_BASE)) {
        return false;
      }
    }
  }
  get inNonArrowFunction() {
    return (this.currentThisScopeFlags() & ScopeFlag.FUNCTION_BASE) > 0;
  }
  get inBareCaseStatement() {
    return (this.currentScope().flags & ScopeFlag.SWITCH) > 0;
  }
  get treatFunctionsAsVar() {
    return this.treatFunctionsAsVarInScope(this.currentScope());
  }
  createScope(flags) {
    return new Scope(flags);
  }
  enter(flags) {
    this.scopeStack.push(this.createScope(flags));
  }
  exit() {
    const scope = this.scopeStack.pop();
    return scope.flags;
  }
  // The spec says:
  // > At the top level of a function, or script, function declarations are
  // > treated like var declarations rather than like lexical declarations.
  treatFunctionsAsVarInScope(scope) {
    return !!(scope.flags & (ScopeFlag.FUNCTION_BASE | ScopeFlag.STATIC_BLOCK) || !this.parser.inModule && scope.flags & ScopeFlag.PROGRAM);
  }
  declareName(name, bindingType, loc) {
    let scope = this.currentScope();
    if (bindingType & BindingFlag.SCOPE_LEXICAL || bindingType & BindingFlag.SCOPE_FUNCTION) {
      this.checkRedeclarationInScope(scope, name, bindingType, loc);
      let type = scope.names.get(name) || 0;
      if (bindingType & BindingFlag.SCOPE_FUNCTION) {
        type = type | 4;
      } else {
        if (!scope.firstLexicalName) {
          scope.firstLexicalName = name;
        }
        type = type | 2;
      }
      scope.names.set(name, type);
      if (bindingType & BindingFlag.SCOPE_LEXICAL) {
        this.maybeExportDefined(scope, name);
      }
    } else if (bindingType & BindingFlag.SCOPE_VAR) {
      for (let i = this.scopeStack.length - 1; i >= 0; --i) {
        scope = this.scopeStack[i];
        this.checkRedeclarationInScope(scope, name, bindingType, loc);
        scope.names.set(
          name,
          (scope.names.get(name) || 0) | 1
          /* Var */
        );
        this.maybeExportDefined(scope, name);
        if (scope.flags & ScopeFlag.VAR) break;
      }
    }
    if (this.parser.inModule && scope.flags & ScopeFlag.PROGRAM) {
      this.undefinedExports.delete(name);
    }
  }
  maybeExportDefined(scope, name) {
    if (this.parser.inModule && scope.flags & ScopeFlag.PROGRAM) {
      this.undefinedExports.delete(name);
    }
  }
  checkRedeclarationInScope(scope, name, bindingType, loc) {
    if (this.isRedeclaredInScope(scope, name, bindingType)) {
      this.parser.raise(Errors.VarRedeclaration, loc, {
        identifierName: name
      });
    }
  }
  isRedeclaredInScope(scope, name, bindingType) {
    if (!(bindingType & BindingFlag.KIND_VALUE)) return false;
    if (bindingType & BindingFlag.SCOPE_LEXICAL) {
      return scope.names.has(name);
    }
    const type = scope.names.get(name) || 0;
    if (bindingType & BindingFlag.SCOPE_FUNCTION) {
      return (type & 2) > 0 || !this.treatFunctionsAsVarInScope(scope) && (type & 1) > 0;
    }
    return (type & 2) > 0 && // Annex B.3.4
    // https://tc39.es/ecma262/#sec-variablestatements-in-catch-blocks
    !(scope.flags & ScopeFlag.SIMPLE_CATCH && scope.firstLexicalName === name) || !this.treatFunctionsAsVarInScope(scope) && (type & 4) > 0;
  }
  checkLocalExport(id) {
    const { name } = id;
    const topLevelScope = this.scopeStack[0];
    if (!topLevelScope.names.has(name)) {
      this.undefinedExports.set(name, id.loc.start);
    }
  }
  currentScope() {
    return this.scopeStack[this.scopeStack.length - 1];
  }
  currentVarScopeFlags() {
    for (let i = this.scopeStack.length - 1; ; i--) {
      const { flags } = this.scopeStack[i];
      if (flags & ScopeFlag.VAR) {
        return flags;
      }
    }
  }
  // Could be useful for `arguments`, `this`, `new.target`, `super()`, `super.property`, and `super[property]`.
  currentThisScopeFlags() {
    for (let i = this.scopeStack.length - 1; ; i--) {
      const { flags } = this.scopeStack[i];
      if (flags & (ScopeFlag.VAR | ScopeFlag.CLASS_BASE) && !(flags & ScopeFlag.ARROW)) {
        return flags;
      }
    }
  }
};
createRequire(import.meta.url);
var OptionFlags = /* @__PURE__ */ ((OptionFlags2) => {
  OptionFlags2[OptionFlags2["AllowAwaitOutsideFunction"] = 1] = "AllowAwaitOutsideFunction";
  OptionFlags2[OptionFlags2["AllowReturnOutsideFunction"] = 2] = "AllowReturnOutsideFunction";
  OptionFlags2[OptionFlags2["AllowNewTargetOutsideFunction"] = 4] = "AllowNewTargetOutsideFunction";
  OptionFlags2[OptionFlags2["AllowImportExportEverywhere"] = 8] = "AllowImportExportEverywhere";
  OptionFlags2[OptionFlags2["AllowSuperOutsideMethod"] = 16] = "AllowSuperOutsideMethod";
  OptionFlags2[OptionFlags2["AllowYieldOutsideFunction"] = 32] = "AllowYieldOutsideFunction";
  OptionFlags2[OptionFlags2["AllowUndeclaredExports"] = 64] = "AllowUndeclaredExports";
  OptionFlags2[OptionFlags2["Ranges"] = 128] = "Ranges";
  OptionFlags2[OptionFlags2["Tokens"] = 256] = "Tokens";
  OptionFlags2[OptionFlags2["CreateImportExpressions"] = 512] = "CreateImportExpressions";
  OptionFlags2[OptionFlags2["CreateParenthesizedExpressions"] = 1024] = "CreateParenthesizedExpressions";
  OptionFlags2[OptionFlags2["ErrorRecovery"] = 2048] = "ErrorRecovery";
  OptionFlags2[OptionFlags2["AttachComment"] = 4096] = "AttachComment";
  OptionFlags2[OptionFlags2["AnnexB"] = 8192] = "AnnexB";
  return OptionFlags2;
})(OptionFlags || {});
function createDefaultOptions() {
  return {
    // Source type ("script" or "module") for different semantics
    sourceType: "script",
    // Source filename.
    sourceFilename: void 0,
    // Index (0-based) from which to start counting source. Useful for
    // integration with other tools.
    startIndex: 0,
    // Column (0-based) from which to start counting source. Useful for
    // integration with other tools.
    startColumn: 0,
    // Line (1-based) from which to start counting source. Useful for
    // integration with other tools.
    startLine: 1,
    // When enabled, await at the top level is not considered an
    // error.
    allowAwaitOutsideFunction: false,
    // When enabled, a return at the top level is not considered an
    // error.
    allowReturnOutsideFunction: false,
    // When enabled, new.target outside a function or class is not
    // considered an error.
    allowNewTargetOutsideFunction: false,
    // When enabled, import/export statements are not constrained to
    // appearing at the top of the program.
    allowImportExportEverywhere: false,
    // When enabled, super outside a method is not considered an error.
    allowSuperOutsideMethod: false,
    // When enabled, export statements can reference undeclared variables.
    allowUndeclaredExports: false,
    allowYieldOutsideFunction: false,
    // An array of plugins to enable
    plugins: [],
    // TODO
    strictMode: void 0,
    // Nodes have their start and end characters offsets recorded in
    // `start` and `end` properties (directly on the node, rather than
    // the `loc` object, which holds line/column data. To also add a
    // [semi-standardized][range] `range` property holding a `[start,
    // end]` array with the same numbers, set the `ranges` option to
    // `true`.
    //
    // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
    ranges: false,
    // Adds all parsed tokens to a `tokens` property on the `File` node
    tokens: false,
    // Whether to create ImportExpression AST nodes (if false
    // `import(foo)` will be parsed as CallExpression(Import, [Identifier(foo)])
    createImportExpressions: false,
    // Whether to create ParenthesizedExpression AST nodes (if false
    // the parser sets extra.parenthesized on the expression nodes instead).
    createParenthesizedExpressions: false,
    // When enabled, errors are attached to the AST instead of being directly thrown.
    // Some errors will still throw, because @babel/parser can't always recover.
    errorRecovery: false,
    // When enabled, comments will be attached to adjacent AST nodes as one of
    // `leadingComments`, `trailingComments` and `innerComments`. The comment attachment
    // is vital to preserve comments after transform. If you don't print AST back,
    // consider set this option to `false` for performance
    attachComment: true,
    // When enabled, the parser will support Annex B syntax.
    // https://tc39.es/ecma262/#sec-additional-ecmascript-features-for-web-browsers
    annexB: true
  };
}
function getOptions(opts) {
  const options2 = createDefaultOptions();
  if (opts == null) {
    return options2;
  }
  if (opts.annexB != null && opts.annexB !== false) {
    throw new Error("The `annexB` option can only be set to `false`.");
  }
  for (const key of Object.keys(options2)) {
    if (opts[key] != null) options2[key] = opts[key];
  }
  if (options2.startLine === 1) {
    if (opts.startIndex == null && options2.startColumn > 0) {
      options2.startIndex = options2.startColumn;
    } else if (opts.startColumn == null && options2.startIndex > 0) {
      options2.startColumn = options2.startIndex;
    }
  } else if (opts.startColumn == null || opts.startIndex == null) {
    if (opts.startIndex != null || false) {
      throw new Error(
        "With a `startLine > 1` you must also specify `startIndex` and `startColumn`."
      );
    }
  }
  if (options2.sourceType === "commonjs") {
    if (opts.allowAwaitOutsideFunction != null) {
      throw new Error(
        "The `allowAwaitOutsideFunction` option cannot be used with `sourceType: 'commonjs'`."
      );
    }
    if (opts.allowReturnOutsideFunction != null) {
      throw new Error(
        "`sourceType: 'commonjs'` implies `allowReturnOutsideFunction: true`, please remove the `allowReturnOutsideFunction` option or use `sourceType: 'script'`."
      );
    }
    if (opts.allowNewTargetOutsideFunction != null) {
      throw new Error(
        "`sourceType: 'commonjs'` implies `allowNewTargetOutsideFunction: true`, please remove the `allowNewTargetOutsideFunction` option or use `sourceType: 'script'`."
      );
    }
  }
  return options2;
}
var ParamKind = /* @__PURE__ */ ((ParamKind2) => {
  ParamKind2[ParamKind2["PARAM"] = 0] = "PARAM";
  ParamKind2[ParamKind2["PARAM_YIELD"] = 1] = "PARAM_YIELD";
  ParamKind2[ParamKind2["PARAM_AWAIT"] = 2] = "PARAM_AWAIT";
  ParamKind2[ParamKind2["PARAM_RETURN"] = 4] = "PARAM_RETURN";
  ParamKind2[ParamKind2["PARAM_IN"] = 8] = "PARAM_IN";
  return ParamKind2;
})(ParamKind || {});
var ProductionParameterHandler = class {
  stacks = [];
  enter(flags) {
    this.stacks.push(flags);
  }
  exit() {
    this.stacks.pop();
  }
  currentFlags() {
    return this.stacks[this.stacks.length - 1];
  }
  get hasAwait() {
    return (this.currentFlags() & 2) > 0;
  }
  get hasYield() {
    return (this.currentFlags() & 1) > 0;
  }
  get hasReturn() {
    return (this.currentFlags() & 4) > 0;
  }
  get hasIn() {
    return (this.currentFlags() & 8) > 0;
  }
};
function functionFlags(isAsync, isGenerator) {
  return (isAsync ? 2 : 0) | (isGenerator ? 1 : 0);
}
var LoopLabelKind = /* @__PURE__ */ ((LoopLabelKind2) => {
  LoopLabelKind2[LoopLabelKind2["Loop"] = 1] = "Loop";
  LoopLabelKind2[LoopLabelKind2["Switch"] = 2] = "Switch";
  return LoopLabelKind2;
})(LoopLabelKind || {});
var State = class _State {
  constructor() {
    this.flags = 1024;
    this.startIndex = void 0;
    this.curLine = void 0;
    this.lineStart = void 0;
    this.startLoc = void 0;
    this.endLoc = void 0;
    this.errors = [];
    this.potentialArrowAt = -1;
    this.noArrowAt = [];
    this.noArrowParamsConversionAt = [];
    this.topicContext = {
      maxNumOfResolvableTopics: 0,
      maxTopicIndex: null
    };
    this.labels = [];
    this.commentsLen = 0;
    this.commentStack = [];
    this.pos = 0;
    this.type = 140;
    this.value = null;
    this.start = 0;
    this.end = 0;
    this.lastTokEndLoc = null;
    this.lastTokStartLoc = null;
    this.context = [types.brace];
    this.firstInvalidTemplateEscapePos = null;
    this.strictErrors = /* @__PURE__ */ new Map();
    this.tokensLength = 0;
  }
  get strict() {
    return (this.flags & 1) > 0;
  }
  set strict(v) {
    if (v) this.flags |= 1;
    else this.flags &= -2;
  }
  init({
    strictMode,
    sourceType,
    startIndex,
    startLine,
    startColumn
  }) {
    this.strict = strictMode === false ? false : strictMode === true ? true : sourceType === "module";
    this.startIndex = startIndex;
    this.curLine = startLine;
    this.lineStart = -startColumn;
    this.startLoc = this.endLoc = new Position(startLine, startColumn, startIndex);
  }
  get maybeInArrowParameters() {
    return (this.flags & 2) > 0;
  }
  set maybeInArrowParameters(v) {
    if (v) this.flags |= 2;
    else this.flags &= -3;
  }
  get inType() {
    return (this.flags & 4) > 0;
  }
  set inType(v) {
    if (v) this.flags |= 4;
    else this.flags &= -5;
  }
  get noAnonFunctionType() {
    return (this.flags & 8) > 0;
  }
  set noAnonFunctionType(v) {
    if (v) this.flags |= 8;
    else this.flags &= -9;
  }
  get hasFlowComment() {
    return (this.flags & 16) > 0;
  }
  set hasFlowComment(v) {
    if (v) this.flags |= 16;
    else this.flags &= -17;
  }
  get isAmbientContext() {
    return (this.flags & 32) > 0;
  }
  set isAmbientContext(v) {
    if (v) this.flags |= 32;
    else this.flags &= -33;
  }
  get inAbstractClass() {
    return (this.flags & 64) > 0;
  }
  set inAbstractClass(v) {
    if (v) this.flags |= 64;
    else this.flags &= -65;
  }
  get inDisallowConditionalTypesContext() {
    return (this.flags & 128) > 0;
  }
  set inDisallowConditionalTypesContext(v) {
    if (v) this.flags |= 128;
    else this.flags &= -129;
  }
  get soloAwait() {
    return (this.flags & 256) > 0;
  }
  set soloAwait(v) {
    if (v) this.flags |= 256;
    else this.flags &= -257;
  }
  get inFSharpPipelineDirectBody() {
    return (this.flags & 512) > 0;
  }
  set inFSharpPipelineDirectBody(v) {
    if (v) this.flags |= 512;
    else this.flags &= -513;
  }
  get canStartJSXElement() {
    return (this.flags & 1024) > 0;
  }
  set canStartJSXElement(v) {
    if (v) this.flags |= 1024;
    else this.flags &= -1025;
  }
  get containsEsc() {
    return (this.flags & 2048) > 0;
  }
  set containsEsc(v) {
    if (v) this.flags |= 2048;
    else this.flags &= -2049;
  }
  get hasTopLevelAwait() {
    return (this.flags & 4096) > 0;
  }
  set hasTopLevelAwait(v) {
    if (v) this.flags |= 4096;
    else this.flags &= -4097;
  }
  curPosition() {
    return new Position(this.curLine, this.pos - this.lineStart, this.pos + this.startIndex);
  }
  clone() {
    const state = new _State();
    state.flags = this.flags;
    state.startIndex = this.startIndex;
    state.curLine = this.curLine;
    state.lineStart = this.lineStart;
    state.startLoc = this.startLoc;
    state.endLoc = this.endLoc;
    state.errors = this.errors.slice();
    state.potentialArrowAt = this.potentialArrowAt;
    state.noArrowAt = this.noArrowAt.slice();
    state.noArrowParamsConversionAt = this.noArrowParamsConversionAt.slice();
    state.topicContext = this.topicContext;
    state.labels = this.labels.slice();
    state.commentsLen = this.commentsLen;
    state.commentStack = this.commentStack.slice();
    state.pos = this.pos;
    state.type = this.type;
    state.value = this.value;
    state.start = this.start;
    state.end = this.end;
    state.lastTokEndLoc = this.lastTokEndLoc;
    state.lastTokStartLoc = this.lastTokStartLoc;
    state.context = this.context.slice();
    state.firstInvalidTemplateEscapePos = this.firstInvalidTemplateEscapePos;
    state.strictErrors = this.strictErrors;
    state.tokensLength = this.tokensLength;
    return state;
  }
};
var BaseParser = class {
  sawUnambiguousESM = false;
  ambiguousScriptDifferentAst = false;
  sourceToOffsetPos(sourcePos) {
    return sourcePos + this.startIndex;
  }
  offsetToSourcePos(offsetPos) {
    return offsetPos - this.startIndex;
  }
  // This method accepts either a string (plugin name) or an array pair
  // (plugin name and options object). If an options object is given,
  // then each value is non-recursively checked for identity with that
  // plugin’s actual option value.
  hasPlugin(pluginConfig) {
    if (typeof pluginConfig === "string") {
      return this.plugins.has(pluginConfig);
    } else {
      const [pluginName, pluginOptions] = pluginConfig;
      if (!this.hasPlugin(pluginName)) {
        return false;
      }
      const actualOptions = this.plugins.get(pluginName);
      for (const key of Object.keys(
        pluginOptions
      )) {
        if (actualOptions?.[key] !== pluginOptions[key]) {
          return false;
        }
      }
      return true;
    }
  }
  getPluginOption(plugin, name) {
    return this.plugins.get(plugin)?.[name];
  }
};
function setTrailingComments(node, comments) {
  if (node.trailingComments === void 0) {
    node.trailingComments = comments;
  } else {
    node.trailingComments.unshift(...comments);
  }
}
function setLeadingComments(node, comments) {
  if (node.leadingComments === void 0) {
    node.leadingComments = comments;
  } else {
    node.leadingComments.unshift(...comments);
  }
}
function setInnerComments(node, comments) {
  if (node.innerComments === void 0) {
    node.innerComments = comments;
  } else {
    node.innerComments.unshift(...comments);
  }
}
function adjustInnerComments(node, elements, commentWS) {
  let lastElement = null;
  let i = elements.length;
  while (lastElement === null && i > 0) {
    lastElement = elements[--i];
  }
  if (lastElement === null || lastElement.start > commentWS.start) {
    setInnerComments(node, commentWS.comments);
  } else {
    setTrailingComments(lastElement, commentWS.comments);
  }
}
var CommentsParser = class extends BaseParser {
  addComment(comment) {
    if (this.filename) comment.loc.filename = this.filename;
    const { commentsLen } = this.state;
    if (this.comments.length !== commentsLen) {
      this.comments.length = commentsLen;
    }
    this.comments.push(comment);
    this.state.commentsLen++;
  }
  /**
   * Given a newly created AST node _n_, attach _n_ to a comment whitespace _w_ if applicable
   * {@see {@link CommentWhitespace}}
   */
  processComment(node) {
    const { commentStack } = this.state;
    const commentStackLength = commentStack.length;
    if (commentStackLength === 0) return;
    let i = commentStackLength - 1;
    const lastCommentWS = commentStack[i];
    if (lastCommentWS.start === node.end) {
      lastCommentWS.leadingNode = node;
      i--;
    }
    const { start: nodeStart } = node;
    for (; i >= 0; i--) {
      const commentWS = commentStack[i];
      const commentEnd = commentWS.end;
      if (commentEnd > nodeStart) {
        commentWS.containingNode = node;
        this.finalizeComment(commentWS);
        commentStack.splice(i, 1);
      } else {
        if (commentEnd === nodeStart) {
          commentWS.trailingNode = node;
        }
        break;
      }
    }
  }
  /**
   * Assign the comments of comment whitespaces to related AST nodes.
   * Also adjust innerComments following trailing comma.
   */
  finalizeComment(commentWS) {
    const { comments } = commentWS;
    if (commentWS.leadingNode !== null || commentWS.trailingNode !== null) {
      if (commentWS.leadingNode !== null) {
        setTrailingComments(commentWS.leadingNode, comments);
      }
      if (commentWS.trailingNode !== null) {
        setLeadingComments(commentWS.trailingNode, comments);
      }
    } else {
      const node = commentWS.containingNode;
      const commentStart = commentWS.start;
      if (this.input.charCodeAt(this.offsetToSourcePos(commentStart) - 1) === comma) {
        switch (node.type) {
          case "ObjectExpression":
          case "ObjectPattern":
            adjustInnerComments(node, node.properties, commentWS);
            break;
          case "CallExpression":
          case "NewExpression":
          case "OptionalCallExpression":
            adjustInnerComments(node, node.arguments, commentWS);
            break;
          case "ImportExpression":
            adjustInnerComments(
              node,
              [node.source, node.options ?? null],
              commentWS
            );
            break;
          case "FunctionDeclaration":
          case "FunctionExpression":
          case "ArrowFunctionExpression":
          case "ObjectMethod":
          case "ClassMethod":
          case "ClassPrivateMethod":
          case "TSTypeParameterDeclaration":
            adjustInnerComments(node, node.params, commentWS);
            break;
          case "ArrayExpression":
          case "ArrayPattern":
            adjustInnerComments(node, node.elements, commentWS);
            break;
          case "ExportNamedDeclaration":
          case "ImportDeclaration":
            adjustInnerComments(node, node.specifiers, commentWS);
            break;
          case "TSEnumDeclaration":
            {
              adjustInnerComments(node, node.members, commentWS);
            }
            break;
          case "TSEnumBody":
            adjustInnerComments(node, node.members, commentWS);
            break;
          case "TSInterfaceBody":
            adjustInnerComments(node, node.body, commentWS);
            break;
          default: {
            {
              if (node.type === "RecordExpression") {
                adjustInnerComments(node, node.properties, commentWS);
                break;
              }
              if (node.type === "TupleExpression") {
                adjustInnerComments(node, node.elements, commentWS);
                break;
              }
            }
            setInnerComments(node, comments);
          }
        }
      } else {
        setInnerComments(node, comments);
      }
    }
  }
  /**
   * Drains remaining commentStack and applies finalizeComment
   * to each comment whitespace. Used only in parseExpression
   * where the top level AST node is _not_ Program
   * {@see {@link CommentsParser#finalizeComment}}
   */
  finalizeRemainingComments() {
    const { commentStack } = this.state;
    for (let i = commentStack.length - 1; i >= 0; i--) {
      this.finalizeComment(commentStack[i]);
    }
    this.state.commentStack = [];
  }
  /* eslint-disable no-irregular-whitespace */
  /**
   * Reset previous node trailing comments. Used in object / class
   * property parsing. We parse `async`, `static`, `set` and `get`
   * as an identifier but may reinterpret it into an async/static/accessor
   * method later. In this case the identifier is not part of the AST and we
   * should sync the knowledge to commentStacks
   *
   * For example, when parsing
   * ```
   * async /* 1 *​/ function f() {}
   * ```
   * the comment whitespace `/* 1 *​/` has leading node Identifier(async). When
   * we see the function token, we create a Function node and mark `/* 1 *​/` as
   * inner comments. So `/* 1 *​/` should be detached from the Identifier node.
   *
   * @param node the last finished AST node _before_ current token
   */
  /* eslint-enable no-irregular-whitespace */
  resetPreviousNodeTrailingComments(node) {
    const { commentStack } = this.state;
    const { length } = commentStack;
    if (length === 0) return;
    const commentWS = commentStack[length - 1];
    if (commentWS.leadingNode === node) {
      commentWS.leadingNode = null;
    }
  }
  /**
   * Attach a node to the comment whitespaces right before/after
   * the given range.
   *
   * This is used to properly attach comments around parenthesized
   * expressions as leading/trailing comments of the inner expression.
   */
  takeSurroundingComments(node, start, end) {
    const { commentStack } = this.state;
    const commentStackLength = commentStack.length;
    if (commentStackLength === 0) return;
    let i = commentStackLength - 1;
    for (; i >= 0; i--) {
      const commentWS = commentStack[i];
      const commentEnd = commentWS.end;
      const commentStart = commentWS.start;
      if (commentStart === end) {
        commentWS.leadingNode = node;
      } else if (commentEnd === start) {
        commentWS.trailingNode = node;
      } else if (commentEnd < start) {
        break;
      }
    }
  }
};
var lineBreak = /\r\n|[\r\n\u2028\u2029]/;
var lineBreakG = new RegExp(lineBreak.source, "g");
function isNewLine(code2) {
  switch (code2) {
    case lineFeed:
    case carriageReturn:
    case lineSeparator:
    case paragraphSeparator:
      return true;
    default:
      return false;
  }
}
function hasNewLine(input, start, end) {
  for (let i = start; i < end; i++) {
    if (isNewLine(input.charCodeAt(i))) {
      return true;
    }
  }
  return false;
}
var skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;
var skipWhiteSpaceInLine = /(?:[^\S\n\r\u2028\u2029]|\/\/.*|\/\*.*?\*\/)*/g;
function isWhitespace(code2) {
  switch (code2) {
    case 9:
    // CHARACTER TABULATION
    case 11:
    // LINE TABULATION
    case 12:
    // FORM FEED
    case space:
    case nonBreakingSpace:
    case oghamSpaceMark:
    case 8192:
    // EN QUAD
    case 8193:
    // EM QUAD
    case 8194:
    // EN SPACE
    case 8195:
    // EM SPACE
    case 8196:
    // THREE-PER-EM SPACE
    case 8197:
    // FOUR-PER-EM SPACE
    case 8198:
    // SIX-PER-EM SPACE
    case 8199:
    // FIGURE SPACE
    case 8200:
    // PUNCTUATION SPACE
    case 8201:
    // THIN SPACE
    case 8202:
    // HAIR SPACE
    case 8239:
    // NARROW NO-BREAK SPACE
    case 8287:
    // MEDIUM MATHEMATICAL SPACE
    case 12288:
    // IDEOGRAPHIC SPACE
    case 65279:
      return true;
    default:
      return false;
  }
}
var forbiddenNumericSeparatorSiblings = {
  decBinOct: /* @__PURE__ */ new Set([
    dot,
    uppercaseB,
    uppercaseE,
    uppercaseO,
    underscore,
    lowercaseB,
    lowercaseE,
    lowercaseO
  ]),
  hex: /* @__PURE__ */ new Set([
    dot,
    uppercaseX,
    underscore,
    lowercaseX
  ])
};
var isAllowedNumericSeparatorSibling = {
  // 0 - 1
  bin: (ch) => ch === digit0 || ch === digit1,
  // 0 - 7
  oct: (ch) => ch >= digit0 && ch <= digit7,
  // 0 - 9
  dec: (ch) => ch >= digit0 && ch <= digit9,
  // 0 - 9, A - F, a - f,
  hex: (ch) => ch >= digit0 && ch <= digit9 || ch >= uppercaseA && ch <= uppercaseF || ch >= lowercaseA && ch <= lowercaseF
};
function readStringContents(type, input, pos, lineStart, curLine, errors) {
  const initialPos = pos;
  const initialLineStart = lineStart;
  const initialCurLine = curLine;
  let out = "";
  let firstInvalidLoc = null;
  let chunkStart = pos;
  const { length } = input;
  for (; ; ) {
    if (pos >= length) {
      errors.unterminated(initialPos, initialLineStart, initialCurLine);
      out += input.slice(chunkStart, pos);
      break;
    }
    const ch = input.charCodeAt(pos);
    if (isStringEnd(type, ch, input, pos)) {
      out += input.slice(chunkStart, pos);
      break;
    }
    if (ch === backslash) {
      out += input.slice(chunkStart, pos);
      const res = readEscapedChar(
        input,
        pos,
        lineStart,
        curLine,
        type === "template",
        errors
      );
      if (res.ch === null && !firstInvalidLoc) {
        firstInvalidLoc = { pos, lineStart, curLine };
      } else {
        out += res.ch;
      }
      ({ pos, lineStart, curLine } = res);
      chunkStart = pos;
    } else if (ch === lineSeparator || ch === paragraphSeparator) {
      ++pos;
      ++curLine;
      lineStart = pos;
    } else if (ch === lineFeed || ch === carriageReturn) {
      if (type === "template") {
        out += input.slice(chunkStart, pos) + "\n";
        ++pos;
        if (ch === carriageReturn && input.charCodeAt(pos) === lineFeed) {
          ++pos;
        }
        ++curLine;
        chunkStart = lineStart = pos;
      } else {
        errors.unterminated(initialPos, initialLineStart, initialCurLine);
      }
    } else {
      ++pos;
    }
  }
  return {
    pos,
    str: out,
    firstInvalidLoc,
    lineStart,
    curLine,
    containsInvalid: !!firstInvalidLoc
  };
}
function isStringEnd(type, ch, input, pos) {
  if (type === "template") {
    return ch === graveAccent || ch === dollarSign && input.charCodeAt(pos + 1) === leftCurlyBrace;
  }
  return ch === (type === "double" ? quotationMark : apostrophe);
}
function readEscapedChar(input, pos, lineStart, curLine, inTemplate, errors) {
  const throwOnInvalid = !inTemplate;
  pos++;
  const res = (ch2) => ({ pos, ch: ch2, lineStart, curLine });
  const ch = input.charCodeAt(pos++);
  switch (ch) {
    case lowercaseN:
      return res("\n");
    case lowercaseR:
      return res("\r");
    case lowercaseX: {
      let code2;
      ({ code: code2, pos } = readHexChar(
        input,
        pos,
        lineStart,
        curLine,
        2,
        false,
        throwOnInvalid,
        errors
      ));
      return res(code2 === null ? null : String.fromCharCode(code2));
    }
    case lowercaseU: {
      let code2;
      ({ code: code2, pos } = readCodePoint(
        input,
        pos,
        lineStart,
        curLine,
        throwOnInvalid,
        errors
      ));
      return res(code2 === null ? null : String.fromCodePoint(code2));
    }
    case lowercaseT:
      return res("	");
    case lowercaseB:
      return res("\b");
    case lowercaseV:
      return res("\v");
    case lowercaseF:
      return res("\f");
    case carriageReturn:
      if (input.charCodeAt(pos) === lineFeed) {
        ++pos;
      }
    // fall through
    case lineFeed:
      lineStart = pos;
      ++curLine;
    // fall through
    case lineSeparator:
    case paragraphSeparator:
      return res("");
    case digit8:
    case digit9:
      if (inTemplate) {
        return res(null);
      } else {
        errors.strictNumericEscape(pos - 1, lineStart, curLine);
      }
    // fall through
    default:
      if (ch >= digit0 && ch <= digit7) {
        const startPos = pos - 1;
        const match = /^[0-7]+/.exec(input.slice(startPos, pos + 2));
        let octalStr = match[0];
        let octal = parseInt(octalStr, 8);
        if (octal > 255) {
          octalStr = octalStr.slice(0, -1);
          octal = parseInt(octalStr, 8);
        }
        pos += octalStr.length - 1;
        const next = input.charCodeAt(pos);
        if (octalStr !== "0" || next === digit8 || next === digit9) {
          if (inTemplate) {
            return res(null);
          } else {
            errors.strictNumericEscape(startPos, lineStart, curLine);
          }
        }
        return res(String.fromCharCode(octal));
      }
      return res(String.fromCharCode(ch));
  }
}
function readHexChar(input, pos, lineStart, curLine, len, forceLen, throwOnInvalid, errors) {
  const initialPos = pos;
  let n;
  ({ n, pos } = readInt(
    input,
    pos,
    lineStart,
    curLine,
    16,
    len,
    forceLen,
    false,
    errors,
    /* bailOnError */
    !throwOnInvalid
  ));
  if (n === null) {
    if (throwOnInvalid) {
      errors.invalidEscapeSequence(initialPos, lineStart, curLine);
    } else {
      pos = initialPos - 1;
    }
  }
  return { code: n, pos };
}
function readInt(input, pos, lineStart, curLine, radix, len, forceLen, allowNumSeparator, errors, bailOnError) {
  const start = pos;
  const forbiddenSiblings = radix === 16 ? forbiddenNumericSeparatorSiblings.hex : forbiddenNumericSeparatorSiblings.decBinOct;
  const isAllowedSibling = radix === 16 ? isAllowedNumericSeparatorSibling.hex : radix === 10 ? isAllowedNumericSeparatorSibling.dec : radix === 8 ? isAllowedNumericSeparatorSibling.oct : isAllowedNumericSeparatorSibling.bin;
  let invalid = false;
  let total = 0;
  for (let i = 0, e = len == null ? Infinity : len; i < e; ++i) {
    const code2 = input.charCodeAt(pos);
    let val;
    if (code2 === underscore && allowNumSeparator !== "bail") {
      const prev = input.charCodeAt(pos - 1);
      const next = input.charCodeAt(pos + 1);
      if (!allowNumSeparator) {
        if (bailOnError) return { n: null, pos };
        errors.numericSeparatorInEscapeSequence(pos, lineStart, curLine);
      } else if (Number.isNaN(next) || !isAllowedSibling(next) || forbiddenSiblings.has(prev) || forbiddenSiblings.has(next)) {
        if (bailOnError) return { n: null, pos };
        errors.unexpectedNumericSeparator(pos, lineStart, curLine);
      }
      ++pos;
      continue;
    }
    if (code2 >= lowercaseA) {
      val = code2 - lowercaseA + lineFeed;
    } else if (code2 >= uppercaseA) {
      val = code2 - uppercaseA + lineFeed;
    } else if (isDigit(code2)) {
      val = code2 - digit0;
    } else {
      val = Infinity;
    }
    if (val >= radix) {
      if (val <= 9 && bailOnError) {
        return { n: null, pos };
      } else if (val <= 9 && errors.invalidDigit(pos, lineStart, curLine, radix)) {
        val = 0;
      } else if (forceLen) {
        val = 0;
        invalid = true;
      } else {
        break;
      }
    }
    ++pos;
    total = total * radix + val;
  }
  if (pos === start || len != null && pos - start !== len || invalid) {
    return { n: null, pos };
  }
  return { n: total, pos };
}
function readCodePoint(input, pos, lineStart, curLine, throwOnInvalid, errors) {
  const ch = input.charCodeAt(pos);
  let code2;
  if (ch === leftCurlyBrace) {
    ++pos;
    ({ code: code2, pos } = readHexChar(
      input,
      pos,
      lineStart,
      curLine,
      input.indexOf("}", pos) - pos,
      true,
      throwOnInvalid,
      errors
    ));
    ++pos;
    if (code2 !== null && code2 > 1114111) {
      if (throwOnInvalid) {
        errors.invalidCodePoint(pos, lineStart, curLine);
      } else {
        return { code: null, pos };
      }
    }
  } else {
    ({ code: code2, pos } = readHexChar(
      input,
      pos,
      lineStart,
      curLine,
      4,
      false,
      throwOnInvalid,
      errors
    ));
  }
  return { code: code2, pos };
}
function buildPosition(pos, lineStart, curLine) {
  return new Position(curLine, pos - lineStart, pos);
}
var VALID_REGEX_FLAGS = /* @__PURE__ */ new Set([
  lowercaseG,
  lowercaseM,
  lowercaseS,
  lowercaseI,
  lowercaseY,
  lowercaseU,
  lowercaseD,
  lowercaseV
]);
var Token = class {
  constructor(state) {
    const startIndex = state.startIndex || 0;
    this.type = state.type;
    this.value = state.value;
    this.start = startIndex + state.start;
    this.end = startIndex + state.end;
    this.loc = new SourceLocation(state.startLoc, state.endLoc);
  }
};
var Tokenizer = class extends CommentsParser {
  isLookahead;
  // Token store.
  tokens = [];
  constructor(options2, input) {
    super();
    this.state = new State();
    this.state.init(options2);
    this.input = input;
    this.length = input.length;
    this.comments = [];
    this.isLookahead = false;
  }
  pushToken(token) {
    this.tokens.length = this.state.tokensLength;
    this.tokens.push(token);
    ++this.state.tokensLength;
  }
  // Move to the next token
  next() {
    this.checkKeywordEscapes();
    if (this.optionFlags & OptionFlags.Tokens) {
      this.pushToken(new Token(this.state));
    }
    this.state.lastTokEndLoc = this.state.endLoc;
    this.state.lastTokStartLoc = this.state.startLoc;
    this.nextToken();
  }
  eat(type) {
    if (this.match(type)) {
      this.next();
      return true;
    } else {
      return false;
    }
  }
  /**
   * Whether current token matches given type
   */
  match(type) {
    return this.state.type === type;
  }
  /**
   * Create a LookaheadState from current parser state
   */
  createLookaheadState(state) {
    return {
      pos: state.pos,
      value: null,
      type: state.type,
      start: state.start,
      end: state.end,
      context: [this.curContext()],
      inType: state.inType,
      startLoc: state.startLoc,
      lastTokEndLoc: state.lastTokEndLoc,
      curLine: state.curLine,
      lineStart: state.lineStart,
      curPosition: state.curPosition
    };
  }
  /**
   * lookahead peeks the next token, skipping changes to token context and
   * comment stack. For performance it returns a limited LookaheadState
   * instead of full parser state.
   *
   * The { column, line } Loc info is not included in lookahead since such usage
   * is rare. Although it may return other location properties e.g. `curLine` and
   * `lineStart`, these properties are not listed in the LookaheadState interface
   * and thus the returned value is _NOT_ reliable.
   *
   * The tokenizer should make best efforts to avoid using any parser state
   * other than those defined in LookaheadState
   */
  lookahead() {
    const old = this.state;
    this.state = this.createLookaheadState(old);
    this.isLookahead = true;
    this.nextToken();
    this.isLookahead = false;
    const curr = this.state;
    this.state = old;
    return curr;
  }
  nextTokenStart() {
    return this.nextTokenStartSince(this.state.pos);
  }
  nextTokenStartSince(pos) {
    skipWhiteSpace.lastIndex = pos;
    return skipWhiteSpace.test(this.input) ? skipWhiteSpace.lastIndex : pos;
  }
  lookaheadCharCode() {
    return this.lookaheadCharCodeSince(this.state.pos);
  }
  lookaheadCharCodeSince(pos) {
    return this.input.charCodeAt(this.nextTokenStartSince(pos));
  }
  /**
   * Similar to nextToken, but it will stop at line break when it is seen before the next token
   *
   * @returns {number} position of the next token start or line break, whichever is seen first.
   * @memberof Tokenizer
   */
  nextTokenInLineStart() {
    return this.nextTokenInLineStartSince(this.state.pos);
  }
  nextTokenInLineStartSince(pos) {
    skipWhiteSpaceInLine.lastIndex = pos;
    return skipWhiteSpaceInLine.test(this.input) ? skipWhiteSpaceInLine.lastIndex : pos;
  }
  /**
   * Similar to lookaheadCharCode, but it will return the char code of line break if it is
   * seen before the next token
   *
   * @returns {number} char code of the next token start or line break, whichever is seen first.
   * @memberof Tokenizer
   */
  lookaheadInLineCharCode() {
    return this.input.charCodeAt(this.nextTokenInLineStart());
  }
  codePointAtPos(pos) {
    let cp = this.input.charCodeAt(pos);
    if ((cp & 64512) === 55296 && ++pos < this.input.length) {
      const trail = this.input.charCodeAt(pos);
      if ((trail & 64512) === 56320) {
        cp = 65536 + ((cp & 1023) << 10) + (trail & 1023);
      }
    }
    return cp;
  }
  // Toggle strict mode. Re-reads the next number or string to please
  // pedantic tests (`"use strict"; 010;` should fail).
  setStrict(strict) {
    this.state.strict = strict;
    if (strict) {
      this.state.strictErrors.forEach(
        ([toParseError, at]) => this.raise(toParseError, at)
      );
      this.state.strictErrors.clear();
    }
  }
  curContext() {
    return this.state.context[this.state.context.length - 1];
  }
  // Read a single token, updating the parser object's token-related properties.
  nextToken() {
    this.skipSpace();
    this.state.start = this.state.pos;
    if (!this.isLookahead) this.state.startLoc = this.state.curPosition();
    if (this.state.pos >= this.length) {
      this.finishToken(tt.eof);
      return;
    }
    this.getTokenFromCode(this.codePointAtPos(this.state.pos));
  }
  // Skips a block comment, whose end is marked by commentEnd.
  // *-/ is used by the Flow plugin, when parsing block comments nested
  // inside Flow comments.
  skipBlockComment(commentEnd) {
    let startLoc;
    if (!this.isLookahead) startLoc = this.state.curPosition();
    const start = this.state.pos;
    const end = this.input.indexOf(commentEnd, start + 2);
    if (end === -1) {
      throw this.raise(Errors.UnterminatedComment, this.state.curPosition());
    }
    this.state.pos = end + commentEnd.length;
    lineBreakG.lastIndex = start + 2;
    while (lineBreakG.test(this.input) && lineBreakG.lastIndex <= end) {
      ++this.state.curLine;
      this.state.lineStart = lineBreakG.lastIndex;
    }
    if (this.isLookahead) return;
    const comment = {
      type: "CommentBlock",
      value: this.input.slice(start + 2, end),
      start: this.sourceToOffsetPos(start),
      end: this.sourceToOffsetPos(end + commentEnd.length),
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      loc: new SourceLocation(startLoc, this.state.curPosition())
    };
    if (this.optionFlags & OptionFlags.Tokens) this.pushToken(comment);
    return comment;
  }
  skipLineComment(startSkip) {
    const start = this.state.pos;
    let startLoc;
    if (!this.isLookahead) startLoc = this.state.curPosition();
    let ch = this.input.charCodeAt(this.state.pos += startSkip);
    if (this.state.pos < this.length) {
      while (!isNewLine(ch) && ++this.state.pos < this.length) {
        ch = this.input.charCodeAt(this.state.pos);
      }
    }
    if (this.isLookahead) return;
    const end = this.state.pos;
    const value = this.input.slice(start + startSkip, end);
    const comment = {
      type: "CommentLine",
      value,
      start: this.sourceToOffsetPos(start),
      end: this.sourceToOffsetPos(end),
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      loc: new SourceLocation(startLoc, this.state.curPosition())
    };
    if (this.optionFlags & OptionFlags.Tokens) this.pushToken(comment);
    return comment;
  }
  // Called at the start of the parse and after every token. Skips
  // whitespace and comments, and.
  skipSpace() {
    const spaceStart = this.state.pos;
    const comments = this.optionFlags & OptionFlags.AttachComment ? [] : null;
    loop: while (this.state.pos < this.length) {
      const ch = this.input.charCodeAt(this.state.pos);
      switch (ch) {
        case space:
        case nonBreakingSpace:
        case tab:
          ++this.state.pos;
          break;
        case carriageReturn:
          if (this.input.charCodeAt(this.state.pos + 1) === lineFeed) {
            ++this.state.pos;
          }
        // fall through
        case lineFeed:
        case lineSeparator:
        case paragraphSeparator:
          ++this.state.pos;
          ++this.state.curLine;
          this.state.lineStart = this.state.pos;
          break;
        case slash:
          switch (this.input.charCodeAt(this.state.pos + 1)) {
            case asterisk: {
              const comment = this.skipBlockComment("*/");
              if (comment !== void 0) {
                this.addComment(comment);
                comments?.push(comment);
              }
              break;
            }
            case slash: {
              const comment = this.skipLineComment(2);
              if (comment !== void 0) {
                this.addComment(comment);
                comments?.push(comment);
              }
              break;
            }
            default:
              break loop;
          }
          break;
        default:
          if (isWhitespace(ch)) {
            ++this.state.pos;
          } else if (ch === dash && !this.inModule && this.optionFlags & OptionFlags.AnnexB) {
            const pos = this.state.pos;
            if (this.input.charCodeAt(pos + 1) === dash && this.input.charCodeAt(pos + 2) === greaterThan && (spaceStart === 0 || this.state.lineStart > spaceStart)) {
              const comment = this.skipLineComment(3);
              if (comment !== void 0) {
                this.addComment(comment);
                comments?.push(comment);
              }
            } else {
              break loop;
            }
          } else if (ch === lessThan && !this.inModule && this.optionFlags & OptionFlags.AnnexB) {
            const pos = this.state.pos;
            if (this.input.charCodeAt(pos + 1) === exclamationMark && this.input.charCodeAt(pos + 2) === dash && this.input.charCodeAt(pos + 3) === dash) {
              const comment = this.skipLineComment(4);
              if (comment !== void 0) {
                this.addComment(comment);
                comments?.push(comment);
              }
            } else {
              break loop;
            }
          } else {
            break loop;
          }
      }
    }
    if (comments?.length > 0) {
      const end = this.state.pos;
      const commentWhitespace = {
        start: this.sourceToOffsetPos(spaceStart),
        end: this.sourceToOffsetPos(end),
        comments,
        leadingNode: null,
        trailingNode: null,
        containingNode: null
      };
      this.state.commentStack.push(commentWhitespace);
    }
  }
  // Called at the end of every token. Sets `end`, `val`, and
  // maintains `context` and `canStartJSXElement`, and skips the space after
  // the token, so that the next one's `start` will point at the
  // right position.
  finishToken(type, val) {
    this.state.end = this.state.pos;
    this.state.endLoc = this.state.curPosition();
    const prevType = this.state.type;
    this.state.type = type;
    this.state.value = val;
    if (!this.isLookahead) {
      this.updateContext(prevType);
    }
  }
  replaceToken(type) {
    this.state.type = type;
    this.updateContext();
  }
  // ### Token reading
  // This is the function that is called to fetch the next token. It
  // is somewhat obscure, because it works in character codes rather
  // than characters, and because operator parsing has been inlined
  // into it.
  //
  // All in the name of speed.
  // number sign is "#"
  readToken_numberSign() {
    if (this.state.pos === 0 && this.readToken_interpreter()) {
      return;
    }
    const nextPos = this.state.pos + 1;
    const next = this.codePointAtPos(nextPos);
    if (next >= digit0 && next <= digit9) {
      throw this.raise(
        Errors.UnexpectedDigitAfterHash,
        this.state.curPosition()
      );
    }
    if (next === leftCurlyBrace || next === leftSquareBracket && this.hasPlugin("recordAndTuple")) {
      this.expectPlugin("recordAndTuple");
      if (this.getPluginOption("recordAndTuple", "syntaxType") === "bar") {
        throw this.raise(
          next === leftCurlyBrace ? Errors.RecordExpressionHashIncorrectStartSyntaxType : Errors.TupleExpressionHashIncorrectStartSyntaxType,
          this.state.curPosition()
        );
      }
      this.state.pos += 2;
      if (next === leftCurlyBrace) {
        this.finishToken(tt.braceHashL);
      } else {
        this.finishToken(tt.bracketHashL);
      }
    } else if (isIdentifierStart(next)) {
      ++this.state.pos;
      this.finishToken(tt.privateName, this.readWord1(next));
    } else if (next === backslash) {
      ++this.state.pos;
      this.finishToken(tt.privateName, this.readWord1());
    } else {
      this.finishOp(tt.hash, 1);
    }
  }
  readToken_dot() {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next >= digit0 && next <= digit9) {
      this.readNumber(true);
      return;
    }
    if (next === dot && this.input.charCodeAt(this.state.pos + 2) === dot) {
      this.state.pos += 3;
      this.finishToken(tt.ellipsis);
    } else {
      ++this.state.pos;
      this.finishToken(tt.dot);
    }
  }
  readToken_slash() {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === equalsTo) {
      this.finishOp(tt.slashAssign, 2);
    } else {
      this.finishOp(tt.slash, 1);
    }
  }
  readToken_interpreter() {
    if (this.state.pos !== 0 || this.length < 2) return false;
    let ch = this.input.charCodeAt(this.state.pos + 1);
    if (ch !== exclamationMark) return false;
    const start = this.state.pos;
    this.state.pos += 1;
    while (!isNewLine(ch) && ++this.state.pos < this.length) {
      ch = this.input.charCodeAt(this.state.pos);
    }
    const value = this.input.slice(start + 2, this.state.pos);
    this.finishToken(tt.interpreterDirective, value);
    return true;
  }
  readToken_mult_modulo(code2) {
    let type = code2 === asterisk ? tt.star : tt.modulo;
    let width = 1;
    let next = this.input.charCodeAt(this.state.pos + 1);
    if (code2 === asterisk && next === asterisk) {
      width++;
      next = this.input.charCodeAt(this.state.pos + 2);
      type = tt.exponent;
    }
    if (next === equalsTo && !this.state.inType) {
      width++;
      type = code2 === percentSign ? tt.moduloAssign : tt.assign;
    }
    this.finishOp(type, width);
  }
  readToken_pipe_amp(code2) {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === code2) {
      if (this.input.charCodeAt(this.state.pos + 2) === equalsTo) {
        this.finishOp(tt.assign, 3);
      } else {
        this.finishOp(
          code2 === verticalBar ? tt.logicalOR : tt.logicalAND,
          2
        );
      }
      return;
    }
    if (code2 === verticalBar) {
      if (next === greaterThan) {
        this.finishOp(tt.pipeline, 2);
        return;
      }
      if (this.hasPlugin("recordAndTuple") && next === rightCurlyBrace) {
        if (this.getPluginOption("recordAndTuple", "syntaxType") !== "bar") {
          throw this.raise(
            Errors.RecordExpressionBarIncorrectEndSyntaxType,
            this.state.curPosition()
          );
        }
        this.state.pos += 2;
        this.finishToken(tt.braceBarR);
        return;
      }
      if (this.hasPlugin("recordAndTuple") && next === rightSquareBracket) {
        if (this.getPluginOption("recordAndTuple", "syntaxType") !== "bar") {
          throw this.raise(
            Errors.TupleExpressionBarIncorrectEndSyntaxType,
            this.state.curPosition()
          );
        }
        this.state.pos += 2;
        this.finishToken(tt.bracketBarR);
        return;
      }
    }
    if (next === equalsTo) {
      this.finishOp(tt.assign, 2);
      return;
    }
    this.finishOp(
      code2 === verticalBar ? tt.bitwiseOR : tt.bitwiseAND,
      1
    );
  }
  readToken_caret() {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === equalsTo && !this.state.inType) {
      this.finishOp(tt.xorAssign, 2);
    } else if (next === caret && // If the ^^ token is not enabled, we don't throw but parse two single ^s
    // because it could be a ^ hack token followed by a ^ binary operator.
    this.hasPlugin([
      "pipelineOperator",
      { proposal: "hack", topicToken: "^^" }
    ])) {
      this.finishOp(tt.doubleCaret, 2);
      const lookaheadCh = this.input.codePointAt(this.state.pos);
      if (lookaheadCh === caret) {
        this.unexpected();
      }
    } else {
      this.finishOp(tt.bitwiseXOR, 1);
    }
  }
  readToken_atSign() {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === atSign && this.hasPlugin([
      "pipelineOperator",
      { proposal: "hack", topicToken: "@@" }
    ])) {
      this.finishOp(tt.doubleAt, 2);
    } else {
      this.finishOp(tt.at, 1);
    }
  }
  readToken_plus_min(code2) {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === code2) {
      this.finishOp(tt.incDec, 2);
      return;
    }
    if (next === equalsTo) {
      this.finishOp(tt.assign, 2);
    } else {
      this.finishOp(tt.plusMin, 1);
    }
  }
  readToken_lt() {
    const { pos } = this.state;
    const next = this.input.charCodeAt(pos + 1);
    if (next === lessThan) {
      if (this.input.charCodeAt(pos + 2) === equalsTo) {
        this.finishOp(tt.assign, 3);
        return;
      }
      this.finishOp(tt.bitShiftL, 2);
      return;
    }
    if (next === equalsTo) {
      this.finishOp(tt.relational, 2);
      return;
    }
    this.finishOp(tt.lt, 1);
  }
  readToken_gt() {
    const { pos } = this.state;
    const next = this.input.charCodeAt(pos + 1);
    if (next === greaterThan) {
      const size = this.input.charCodeAt(pos + 2) === greaterThan ? 3 : 2;
      if (this.input.charCodeAt(pos + size) === equalsTo) {
        this.finishOp(tt.assign, size + 1);
        return;
      }
      this.finishOp(tt.bitShiftR, size);
      return;
    }
    if (next === equalsTo) {
      this.finishOp(tt.relational, 2);
      return;
    }
    this.finishOp(tt.gt, 1);
  }
  readToken_eq_excl(code2) {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === equalsTo) {
      this.finishOp(
        tt.equality,
        this.input.charCodeAt(this.state.pos + 2) === equalsTo ? 3 : 2
      );
      return;
    }
    if (code2 === equalsTo && next === greaterThan) {
      this.state.pos += 2;
      this.finishToken(tt.arrow);
      return;
    }
    this.finishOp(code2 === equalsTo ? tt.eq : tt.bang, 1);
  }
  readToken_question() {
    const next = this.input.charCodeAt(this.state.pos + 1);
    const next2 = this.input.charCodeAt(this.state.pos + 2);
    if (next === questionMark) {
      if (next2 === equalsTo) {
        this.finishOp(tt.assign, 3);
      } else {
        this.finishOp(tt.nullishCoalescing, 2);
      }
    } else if (next === dot && !(next2 >= digit0 && next2 <= digit9)) {
      this.state.pos += 2;
      this.finishToken(tt.questionDot);
    } else {
      ++this.state.pos;
      this.finishToken(tt.question);
    }
  }
  getTokenFromCode(code2) {
    switch (code2) {
      // The interpretation of a dot depends on whether it is followed
      // by a digit or another two dots.
      case dot:
        this.readToken_dot();
        return;
      // Punctuation tokens.
      case leftParenthesis:
        ++this.state.pos;
        this.finishToken(tt.parenL);
        return;
      case rightParenthesis:
        ++this.state.pos;
        this.finishToken(tt.parenR);
        return;
      case semicolon:
        ++this.state.pos;
        this.finishToken(tt.semi);
        return;
      case comma:
        ++this.state.pos;
        this.finishToken(tt.comma);
        return;
      case leftSquareBracket:
        if (this.hasPlugin("recordAndTuple") && this.input.charCodeAt(this.state.pos + 1) === verticalBar) {
          if (this.getPluginOption("recordAndTuple", "syntaxType") !== "bar") {
            throw this.raise(
              Errors.TupleExpressionBarIncorrectStartSyntaxType,
              this.state.curPosition()
            );
          }
          this.state.pos += 2;
          this.finishToken(tt.bracketBarL);
        } else {
          ++this.state.pos;
          this.finishToken(tt.bracketL);
        }
        return;
      case rightSquareBracket:
        ++this.state.pos;
        this.finishToken(tt.bracketR);
        return;
      case leftCurlyBrace:
        if (this.hasPlugin("recordAndTuple") && this.input.charCodeAt(this.state.pos + 1) === verticalBar) {
          if (this.getPluginOption("recordAndTuple", "syntaxType") !== "bar") {
            throw this.raise(
              Errors.RecordExpressionBarIncorrectStartSyntaxType,
              this.state.curPosition()
            );
          }
          this.state.pos += 2;
          this.finishToken(tt.braceBarL);
        } else {
          ++this.state.pos;
          this.finishToken(tt.braceL);
        }
        return;
      case rightCurlyBrace:
        ++this.state.pos;
        this.finishToken(tt.braceR);
        return;
      case colon:
        if (this.hasPlugin("functionBind") && this.input.charCodeAt(this.state.pos + 1) === colon) {
          this.finishOp(tt.doubleColon, 2);
        } else {
          ++this.state.pos;
          this.finishToken(tt.colon);
        }
        return;
      case questionMark:
        this.readToken_question();
        return;
      case graveAccent:
        this.readTemplateToken();
        return;
      case digit0: {
        const next = this.input.charCodeAt(this.state.pos + 1);
        if (next === lowercaseX || next === uppercaseX) {
          this.readRadixNumber(16);
          return;
        }
        if (next === lowercaseO || next === uppercaseO) {
          this.readRadixNumber(8);
          return;
        }
        if (next === lowercaseB || next === uppercaseB) {
          this.readRadixNumber(2);
          return;
        }
      }
      // Anything else beginning with a digit is an integer, octal
      // number, or float. (fall through)
      case digit1:
      case digit2:
      case digit3:
      case digit4:
      case digit5:
      case digit6:
      case digit7:
      case digit8:
      case digit9:
        this.readNumber(false);
        return;
      // Quotes produce strings.
      case quotationMark:
      case apostrophe:
        this.readString(code2);
        return;
      // Operators are parsed inline in tiny state machines. '=' (charCodes.equalsTo) is
      // often referred to. `finishOp` simply skips the amount of
      // characters it is given as second argument, and returns a token
      // of the type given by its first argument.
      case slash:
        this.readToken_slash();
        return;
      case percentSign:
      case asterisk:
        this.readToken_mult_modulo(code2);
        return;
      case verticalBar:
      case ampersand:
        this.readToken_pipe_amp(code2);
        return;
      case caret:
        this.readToken_caret();
        return;
      case plusSign:
      case dash:
        this.readToken_plus_min(code2);
        return;
      case lessThan:
        this.readToken_lt();
        return;
      case greaterThan:
        this.readToken_gt();
        return;
      case equalsTo:
      case exclamationMark:
        this.readToken_eq_excl(code2);
        return;
      case tilde:
        this.finishOp(tt.tilde, 1);
        return;
      case atSign:
        this.readToken_atSign();
        return;
      case numberSign:
        this.readToken_numberSign();
        return;
      case backslash:
        this.readWord();
        return;
      default:
        if (isIdentifierStart(code2)) {
          this.readWord(code2);
          return;
        }
    }
    throw this.raise(
      Errors.InvalidOrUnexpectedToken,
      this.state.curPosition(),
      {
        unexpected: String.fromCodePoint(code2)
      }
    );
  }
  finishOp(type, size) {
    const str = this.input.slice(this.state.pos, this.state.pos + size);
    this.state.pos += size;
    this.finishToken(type, str);
  }
  readRegexp() {
    const startLoc = this.state.startLoc;
    const start = this.state.start + 1;
    let escaped, inClass;
    let { pos } = this.state;
    for (; ; ++pos) {
      if (pos >= this.length) {
        throw this.raise(
          Errors.UnterminatedRegExp,
          createPositionWithColumnOffset(startLoc, 1)
        );
      }
      const ch = this.input.charCodeAt(pos);
      if (isNewLine(ch)) {
        throw this.raise(
          Errors.UnterminatedRegExp,
          createPositionWithColumnOffset(startLoc, 1)
        );
      }
      if (escaped) {
        escaped = false;
      } else {
        if (ch === leftSquareBracket) {
          inClass = true;
        } else if (ch === rightSquareBracket && inClass) {
          inClass = false;
        } else if (ch === slash && !inClass) {
          break;
        }
        escaped = ch === backslash;
      }
    }
    const content = this.input.slice(start, pos);
    ++pos;
    let mods = "";
    const nextPos = () => (
      // (pos + 1) + 1 - start
      createPositionWithColumnOffset(startLoc, pos + 2 - start)
    );
    while (pos < this.length) {
      const cp = this.codePointAtPos(pos);
      const char = String.fromCharCode(cp);
      if (VALID_REGEX_FLAGS.has(cp)) {
        if (cp === lowercaseV) {
          if (mods.includes("u")) {
            this.raise(Errors.IncompatibleRegExpUVFlags, nextPos());
          }
        } else if (cp === lowercaseU) {
          if (mods.includes("v")) {
            this.raise(Errors.IncompatibleRegExpUVFlags, nextPos());
          }
        }
        if (mods.includes(char)) {
          this.raise(Errors.DuplicateRegExpFlags, nextPos());
        }
      } else if (isIdentifierChar(cp) || cp === backslash) {
        this.raise(Errors.MalformedRegExpFlags, nextPos());
      } else {
        break;
      }
      ++pos;
      mods += char;
    }
    this.state.pos = pos;
    this.finishToken(tt.regexp, {
      pattern: content,
      flags: mods
    });
  }
  // Read an integer in the given radix. Return null if zero digits
  // were read, the integer value otherwise. When `len` is given, this
  // will return `null` unless the integer has exactly `len` digits.
  // When `forceLen` is `true`, it means that we already know that in case
  // of a malformed number we have to skip `len` characters anyway, instead
  // of bailing out early. For example, in "\u{123Z}" we want to read up to }
  // anyway, while in "\u00Z" we will stop at Z instead of consuming four
  // characters (and thus the closing quote).
  readInt(radix, len, forceLen = false, allowNumSeparator = true) {
    const { n, pos } = readInt(
      this.input,
      this.state.pos,
      this.state.lineStart,
      this.state.curLine,
      radix,
      len,
      forceLen,
      allowNumSeparator,
      this.errorHandlers_readInt,
      /* bailOnError */
      false
    );
    this.state.pos = pos;
    return n;
  }
  readRadixNumber(radix) {
    const start = this.state.pos;
    const startLoc = this.state.curPosition();
    let isBigInt = false;
    this.state.pos += 2;
    const val = this.readInt(radix);
    if (val == null) {
      this.raise(
        Errors.InvalidDigit,
        // Numeric literals can't have newlines, so this is safe to do.
        createPositionWithColumnOffset(startLoc, 2),
        {
          radix
        }
      );
    }
    const next = this.input.charCodeAt(this.state.pos);
    if (next === lowercaseN) {
      ++this.state.pos;
      isBigInt = true;
    } else if (next === lowercaseM) {
      throw this.raise(Errors.InvalidDecimal, startLoc);
    }
    if (isIdentifierStart(this.codePointAtPos(this.state.pos))) {
      throw this.raise(Errors.NumberIdentifier, this.state.curPosition());
    }
    if (isBigInt) {
      const str = this.input.slice(start, this.state.pos).replace(/[_n]/g, "");
      this.finishToken(tt.bigint, str);
      return;
    }
    this.finishToken(tt.num, val);
  }
  // Read an integer, octal integer, or floating-point number.
  readNumber(startsWithDot) {
    const start = this.state.pos;
    const startLoc = this.state.curPosition();
    let isFloat = false;
    let isBigInt = false;
    let hasExponent = false;
    let isOctal = false;
    if (!startsWithDot && this.readInt(10) === null) {
      this.raise(Errors.InvalidNumber, this.state.curPosition());
    }
    const hasLeadingZero = this.state.pos - start >= 2 && this.input.charCodeAt(start) === digit0;
    if (hasLeadingZero) {
      const integer = this.input.slice(start, this.state.pos);
      this.recordStrictModeErrors(Errors.StrictOctalLiteral, startLoc);
      if (!this.state.strict) {
        const underscorePos = integer.indexOf("_");
        if (underscorePos > 0) {
          this.raise(
            Errors.ZeroDigitNumericSeparator,
            createPositionWithColumnOffset(startLoc, underscorePos)
          );
        }
      }
      isOctal = hasLeadingZero && !/[89]/.test(integer);
    }
    let next = this.input.charCodeAt(this.state.pos);
    if (next === dot && !isOctal) {
      ++this.state.pos;
      this.readInt(10);
      isFloat = true;
      next = this.input.charCodeAt(this.state.pos);
    }
    if ((next === uppercaseE || next === lowercaseE) && !isOctal) {
      next = this.input.charCodeAt(++this.state.pos);
      if (next === plusSign || next === dash) {
        ++this.state.pos;
      }
      if (this.readInt(10) === null) {
        this.raise(Errors.InvalidOrMissingExponent, startLoc);
      }
      isFloat = true;
      hasExponent = true;
      next = this.input.charCodeAt(this.state.pos);
    }
    if (next === lowercaseN) {
      if (isFloat || hasLeadingZero) {
        this.raise(Errors.InvalidBigIntLiteral, startLoc);
      }
      ++this.state.pos;
      isBigInt = true;
    }
    if (next === lowercaseM) {
      this.expectPlugin("decimal", this.state.curPosition());
      if (hasExponent || hasLeadingZero) {
        this.raise(Errors.InvalidDecimal, startLoc);
      }
      ++this.state.pos;
      var isDecimal = true;
    }
    if (isIdentifierStart(this.codePointAtPos(this.state.pos))) {
      throw this.raise(Errors.NumberIdentifier, this.state.curPosition());
    }
    const str = this.input.slice(start, this.state.pos).replace(/[_mn]/g, "");
    if (isBigInt) {
      this.finishToken(tt.bigint, str);
      return;
    }
    if (isDecimal) {
      this.finishToken(tt.decimal, str);
      return;
    }
    const val = isOctal ? parseInt(str, 8) : parseFloat(str);
    this.finishToken(tt.num, val);
  }
  // Read a string value, interpreting backslash-escapes.
  readCodePoint(throwOnInvalid) {
    const { code: code2, pos } = readCodePoint(
      this.input,
      this.state.pos,
      this.state.lineStart,
      this.state.curLine,
      throwOnInvalid,
      this.errorHandlers_readCodePoint
    );
    this.state.pos = pos;
    return code2;
  }
  readString(quote2) {
    const { str, pos, curLine, lineStart } = readStringContents(
      quote2 === quotationMark ? "double" : "single",
      this.input,
      this.state.pos + 1,
      // skip the quote
      this.state.lineStart,
      this.state.curLine,
      this.errorHandlers_readStringContents_string
    );
    this.state.pos = pos + 1;
    this.state.lineStart = lineStart;
    this.state.curLine = curLine;
    this.finishToken(tt.string, str);
  }
  // Reads template continuation `}...`
  readTemplateContinuation() {
    if (!this.match(tt.braceR)) {
      this.unexpected(null, tt.braceR);
    }
    this.state.pos--;
    this.readTemplateToken();
  }
  // Reads template string tokens.
  readTemplateToken() {
    const opening = this.input[this.state.pos];
    const { str, firstInvalidLoc, pos, curLine, lineStart } = readStringContents(
      "template",
      this.input,
      this.state.pos + 1,
      // skip '`' or `}`
      this.state.lineStart,
      this.state.curLine,
      this.errorHandlers_readStringContents_template
    );
    this.state.pos = pos + 1;
    this.state.lineStart = lineStart;
    this.state.curLine = curLine;
    if (firstInvalidLoc) {
      this.state.firstInvalidTemplateEscapePos = new Position(
        firstInvalidLoc.curLine,
        firstInvalidLoc.pos - firstInvalidLoc.lineStart,
        this.sourceToOffsetPos(firstInvalidLoc.pos)
      );
    }
    if (this.input.codePointAt(pos) === graveAccent) {
      this.finishToken(
        tt.templateTail,
        firstInvalidLoc ? null : opening + str + "`"
      );
    } else {
      this.state.pos++;
      this.finishToken(
        tt.templateNonTail,
        firstInvalidLoc ? null : opening + str + "${"
      );
    }
  }
  recordStrictModeErrors(toParseError, at) {
    const index = at.index;
    if (this.state.strict && !this.state.strictErrors.has(index)) {
      this.raise(toParseError, at);
    } else {
      this.state.strictErrors.set(index, [toParseError, at]);
    }
  }
  // Read an identifier, and return it as a string. Sets `this.state.containsEsc`
  // to whether the word contained a '\u' escape.
  //
  // Incrementally adds only escaped chars, adding other chunks as-is
  // as a micro-optimization.
  //
  // When `firstCode` is given, it assumes it is always an identifier start and
  // will skip reading start position again
  readWord1(firstCode) {
    this.state.containsEsc = false;
    let word = "";
    const start = this.state.pos;
    let chunkStart = this.state.pos;
    if (firstCode !== void 0) {
      this.state.pos += firstCode <= 65535 ? 1 : 2;
    }
    while (this.state.pos < this.length) {
      const ch = this.codePointAtPos(this.state.pos);
      if (isIdentifierChar(ch)) {
        this.state.pos += ch <= 65535 ? 1 : 2;
      } else if (ch === backslash) {
        this.state.containsEsc = true;
        word += this.input.slice(chunkStart, this.state.pos);
        const escStart = this.state.curPosition();
        const identifierCheck = this.state.pos === start ? isIdentifierStart : isIdentifierChar;
        if (this.input.charCodeAt(++this.state.pos) !== lowercaseU) {
          this.raise(Errors.MissingUnicodeEscape, this.state.curPosition());
          chunkStart = this.state.pos - 1;
          continue;
        }
        ++this.state.pos;
        const esc = this.readCodePoint(true);
        if (esc !== null) {
          if (!identifierCheck(esc)) {
            this.raise(Errors.EscapedCharNotAnIdentifier, escStart);
          }
          word += String.fromCodePoint(esc);
        }
        chunkStart = this.state.pos;
      } else {
        break;
      }
    }
    return word + this.input.slice(chunkStart, this.state.pos);
  }
  // Read an identifier or keyword token. Will check for reserved
  // words when necessary.
  readWord(firstCode) {
    const word = this.readWord1(firstCode);
    const type = keywords.get(word);
    if (type !== void 0) {
      this.finishToken(type, tokenLabelName(type));
    } else {
      this.finishToken(tt.name, word);
    }
  }
  checkKeywordEscapes() {
    const { type } = this.state;
    if (tokenIsKeyword(type) && this.state.containsEsc) {
      this.raise(Errors.InvalidEscapedReservedWord, this.state.startLoc, {
        reservedWord: tokenLabelName(type)
      });
    }
  }
  /**
   * Raise a `ParseError` given the appropriate properties. If passed a
   * `Position` for the `at` property, raises the `ParseError` at that location.
   * Otherwise, if passed a `Node`, raises the `ParseError` at the start
   * location of that `Node`.
   *
   * If `errorRecovery` is `true`, the error is pushed to the errors array and
   * returned. If `errorRecovery` is `false`, the error is instead thrown.
   *
   * The return type is marked as `never` for simplicity, as error recovery
   * will create types in an invalid AST shape.
   */
  raise(toParseError, at, details = {}) {
    const loc = at instanceof Position ? at : at.loc.start;
    const error = toParseError(loc, details);
    if (!(this.optionFlags & OptionFlags.ErrorRecovery)) throw error;
    if (!this.isLookahead) this.state.errors.push(error);
    return error;
  }
  /**
   * If `errorRecovery` is `false`, this method behaves identically to `raise`.
   * If `errorRecovery` is `true`, this method will first see if there is
   * already an error stored at the same `Position`, and replaces it with the
   * one generated here.
   */
  raiseOverwrite(toParseError, at, details = {}) {
    const loc = at instanceof Position ? at : at.loc.start;
    const pos = loc.index;
    const errors = this.state.errors;
    for (let i = errors.length - 1; i >= 0; i--) {
      const error = errors[i];
      if (error.loc.index === pos) {
        return errors[i] = toParseError(loc, details);
      }
      if (error.loc.index < pos) break;
    }
    return this.raise(toParseError, at, details);
  }
  // updateContext is used by the jsx plugin
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateContext(prevType) {
  }
  // Raise an unexpected token error. Can take the expected token type.
  unexpected(loc, type) {
    throw this.raise(
      Errors.UnexpectedToken,
      loc != null ? loc : this.state.startLoc,
      {
        expected: type ? tokenLabelName(type) : null
      }
    );
  }
  expectPlugin(pluginName, loc) {
    if (this.hasPlugin(pluginName)) {
      return true;
    }
    throw this.raise(
      Errors.MissingPlugin,
      loc != null ? loc : this.state.startLoc,
      {
        missingPlugin: [pluginName]
      }
    );
  }
  expectOnePlugin(pluginNames) {
    if (!pluginNames.some((name) => this.hasPlugin(name))) {
      throw this.raise(Errors.MissingOneOfPlugins, this.state.startLoc, {
        missingPlugin: pluginNames
      });
    }
  }
  errorBuilder(error) {
    return (pos, lineStart, curLine) => {
      this.raise(error, buildPosition(pos, lineStart, curLine));
    };
  }
  errorHandlers_readInt = {
    invalidDigit: (pos, lineStart, curLine, radix) => {
      if (!(this.optionFlags & OptionFlags.ErrorRecovery)) return false;
      this.raise(Errors.InvalidDigit, buildPosition(pos, lineStart, curLine), {
        radix
      });
      return true;
    },
    numericSeparatorInEscapeSequence: this.errorBuilder(
      Errors.NumericSeparatorInEscapeSequence
    ),
    unexpectedNumericSeparator: this.errorBuilder(
      Errors.UnexpectedNumericSeparator
    )
  };
  errorHandlers_readCodePoint = {
    ...this.errorHandlers_readInt,
    invalidEscapeSequence: this.errorBuilder(Errors.InvalidEscapeSequence),
    invalidCodePoint: this.errorBuilder(Errors.InvalidCodePoint)
  };
  errorHandlers_readStringContents_string = {
    ...this.errorHandlers_readCodePoint,
    strictNumericEscape: (pos, lineStart, curLine) => {
      this.recordStrictModeErrors(
        Errors.StrictNumericEscape,
        buildPosition(pos, lineStart, curLine)
      );
    },
    unterminated: (pos, lineStart, curLine) => {
      throw this.raise(
        Errors.UnterminatedString,
        // Report the error at the string quote
        buildPosition(pos - 1, lineStart, curLine)
      );
    }
  };
  errorHandlers_readStringContents_template = {
    ...this.errorHandlers_readCodePoint,
    strictNumericEscape: this.errorBuilder(Errors.StrictNumericEscape),
    unterminated: (pos, lineStart, curLine) => {
      throw this.raise(
        Errors.UnterminatedTemplate,
        buildPosition(pos, lineStart, curLine)
      );
    }
  };
};
var ExpressionScope = class {
  constructor(type = 0) {
    this.type = type;
  }
  canBeArrowParameterDeclaration() {
    return this.type === 2 || this.type === 1;
  }
  isCertainlyParameterDeclaration() {
    return this.type === 3;
  }
};
var ArrowHeadParsingScope = class extends ExpressionScope {
  declarationErrors = /* @__PURE__ */ new Map();
  constructor(type) {
    super(type);
  }
  recordDeclarationError(ParsingErrorClass, at) {
    const index = at.index;
    this.declarationErrors.set(index, [ParsingErrorClass, at]);
  }
  clearDeclarationError(index) {
    this.declarationErrors.delete(index);
  }
  iterateErrors(iterator) {
    this.declarationErrors.forEach(iterator);
  }
};
var ExpressionScopeHandler = class {
  parser;
  stack = [new ExpressionScope()];
  constructor(parser) {
    this.parser = parser;
  }
  enter(scope) {
    this.stack.push(scope);
  }
  exit() {
    this.stack.pop();
  }
  /**
   * Record likely parameter initializer errors
   *
   * When current scope is a ParameterDeclaration, the error will be thrown immediately,
   * otherwise it will be recorded to any ancestry MaybeArrowParameterDeclaration and
   * MaybeAsyncArrowParameterDeclaration scope until an Expression scope is seen.
   */
  recordParameterInitializerError(toParseError, node) {
    const origin = node.loc.start;
    const { stack } = this;
    let i = stack.length - 1;
    let scope = stack[i];
    while (!scope.isCertainlyParameterDeclaration()) {
      if (scope.canBeArrowParameterDeclaration()) {
        scope.recordDeclarationError(toParseError, origin);
      } else {
        return;
      }
      scope = stack[--i];
    }
    this.parser.raise(toParseError, origin);
  }
  /**
   * Record errors that must be thrown if the current pattern ends up being an arrow
   * function parameter. This is used to record parenthesized identifiers, and to record
   * "a as T" and "<T> a" type assertions when parsing typescript.
   *
   * A parenthesized identifier (or type assertion) in LHS can be ambiguous because the assignment
   * can be transformed to an assignable later, but not vice versa:
   * For example, in `([(a) = []] = []) => {}`, we think `(a) = []` is an LHS in `[(a) = []]`,
   * an LHS within `[(a) = []] = []`. However the LHS chain is then transformed by toAssignable,
   * and we should throw assignment `(a)`, which is only valid in LHS. Hence we record the
   * location of parenthesized `(a)` to current scope if it is one of MaybeArrowParameterDeclaration
   * and MaybeAsyncArrowParameterDeclaration
   *
   * Unlike `recordParameterInitializerError`, we don't record to ancestry scope because we
   * validate arrow head parsing scope before exit, and then the LHS will be unambiguous:
   * For example, in `( x = ( [(a) = []] = [] ) ) => {}`, we should not record `(a)` in `( x = ... ) =>`
   * arrow scope because when we finish parsing `( [(a) = []] = [] )`, it is an unambiguous assignment
   * expression and can not be cast to pattern
   */
  recordArrowParameterBindingError(error, node) {
    const { stack } = this;
    const scope = stack[stack.length - 1];
    const origin = node.loc.start;
    if (scope.isCertainlyParameterDeclaration()) {
      this.parser.raise(error, origin);
    } else if (scope.canBeArrowParameterDeclaration()) {
      scope.recordDeclarationError(error, origin);
    } else {
      return;
    }
  }
  /**
   * Record likely async arrow parameter errors
   *
   * Errors will be recorded to any ancestry MaybeAsyncArrowParameterDeclaration
   * scope until an Expression scope is seen.
   */
  recordAsyncArrowParametersError(at) {
    const { stack } = this;
    let i = stack.length - 1;
    let scope = stack[i];
    while (scope.canBeArrowParameterDeclaration()) {
      if (scope.type === 2) {
        scope.recordDeclarationError(Errors.AwaitBindingIdentifier, at);
      }
      scope = stack[--i];
    }
  }
  validateAsPattern() {
    const { stack } = this;
    const currentScope = stack[stack.length - 1];
    if (!currentScope.canBeArrowParameterDeclaration()) return;
    currentScope.iterateErrors(([toParseError, loc]) => {
      this.parser.raise(toParseError, loc);
      let i = stack.length - 2;
      let scope = stack[i];
      while (scope.canBeArrowParameterDeclaration()) {
        scope.clearDeclarationError(loc.index);
        scope = stack[--i];
      }
    });
  }
};
function newParameterDeclarationScope() {
  return new ExpressionScope(
    3
    /* kParameterDeclaration */
  );
}
function newArrowHeadScope() {
  return new ArrowHeadParsingScope(
    1
    /* kMaybeArrowParameterDeclaration */
  );
}
function newAsyncArrowScope() {
  return new ArrowHeadParsingScope(
    2
    /* kMaybeAsyncArrowParameterDeclaration */
  );
}
function newExpressionScope() {
  return new ExpressionScope();
}
var ClassScope = class {
  // A list of private named declared in the current class
  privateNames = /* @__PURE__ */ new Set();
  // A list of private getters of setters without their counterpart
  loneAccessors = /* @__PURE__ */ new Map();
  // A list of private names used before being defined, mapping to
  // their position.
  undefinedPrivateNames = /* @__PURE__ */ new Map();
};
var ClassScopeHandler = class {
  parser;
  stack = [];
  undefinedPrivateNames = /* @__PURE__ */ new Map();
  constructor(parser) {
    this.parser = parser;
  }
  current() {
    return this.stack[this.stack.length - 1];
  }
  enter() {
    this.stack.push(new ClassScope());
  }
  exit() {
    const oldClassScope = this.stack.pop();
    const current = this.current();
    for (const [name, loc] of Array.from(oldClassScope.undefinedPrivateNames)) {
      if (current) {
        if (!current.undefinedPrivateNames.has(name)) {
          current.undefinedPrivateNames.set(name, loc);
        }
      } else {
        this.parser.raise(Errors.InvalidPrivateFieldResolution, loc, {
          identifierName: name
        });
      }
    }
  }
  declarePrivateName(name, elementType, loc) {
    const { privateNames, loneAccessors, undefinedPrivateNames } = this.current();
    let redefined = privateNames.has(name);
    if (elementType & ClassElementType.KIND_ACCESSOR) {
      const accessor = redefined && loneAccessors.get(name);
      if (accessor) {
        const oldStatic = accessor & ClassElementType.FLAG_STATIC;
        const newStatic = elementType & ClassElementType.FLAG_STATIC;
        const oldKind = accessor & ClassElementType.KIND_ACCESSOR;
        const newKind = elementType & ClassElementType.KIND_ACCESSOR;
        redefined = oldKind === newKind || oldStatic !== newStatic;
        if (!redefined) loneAccessors.delete(name);
      } else if (!redefined) {
        loneAccessors.set(name, elementType);
      }
    }
    if (redefined) {
      this.parser.raise(Errors.PrivateNameRedeclaration, loc, {
        identifierName: name
      });
    }
    privateNames.add(name);
    undefinedPrivateNames.delete(name);
  }
  usePrivateName(name, loc) {
    let classScope;
    for (classScope of this.stack) {
      if (classScope.privateNames.has(name)) return;
    }
    if (classScope) {
      classScope.undefinedPrivateNames.set(name, loc);
    } else {
      this.parser.raise(Errors.InvalidPrivateFieldResolution, loc, {
        identifierName: name
      });
    }
  }
};
var UtilParser = class extends Tokenizer {
  addExtra(node, key, value, enumerable = true) {
    if (!node) return;
    let { extra } = node;
    if (extra == null) {
      extra = {};
      node.extra = extra;
    }
    if (enumerable) {
      extra[key] = value;
    } else {
      Object.defineProperty(extra, key, { enumerable, value });
    }
  }
  // Tests whether parsed token is a contextual keyword.
  isContextual(token) {
    return this.state.type === token && !this.state.containsEsc;
  }
  isUnparsedContextual(nameStart, name) {
    if (this.input.startsWith(name, nameStart)) {
      const nextCh = this.input.charCodeAt(nameStart + name.length);
      return !(isIdentifierChar(nextCh) || // check if `nextCh is between 0xd800 - 0xdbff,
      // if `nextCh` is NaN, `NaN & 0xfc00` is 0, the function
      // returns true
      (nextCh & 64512) === 55296);
    }
    return false;
  }
  isLookaheadContextual(name) {
    const next = this.nextTokenStart();
    return this.isUnparsedContextual(next, name);
  }
  // Consumes contextual keyword if possible.
  eatContextual(token) {
    if (this.isContextual(token)) {
      this.next();
      return true;
    }
    return false;
  }
  // Asserts that following token is given contextual keyword.
  expectContextual(token, toParseError) {
    if (!this.eatContextual(token)) {
      if (toParseError != null) {
        throw this.raise(toParseError, this.state.startLoc);
      }
      this.unexpected(null, token);
    }
  }
  // Test whether a semicolon can be inserted at the current position.
  canInsertSemicolon() {
    return this.match(tt.eof) || this.match(tt.braceR) || this.hasPrecedingLineBreak();
  }
  hasPrecedingLineBreak() {
    return hasNewLine(
      this.input,
      this.offsetToSourcePos(this.state.lastTokEndLoc.index),
      this.state.start
    );
  }
  hasFollowingLineBreak() {
    return hasNewLine(this.input, this.state.end, this.nextTokenStart());
  }
  isLineTerminator() {
    return this.eat(tt.semi) || this.canInsertSemicolon();
  }
  // Consume a semicolon, or, failing that, see if we are allowed to
  // pretend that there is a semicolon at this position.
  semicolon(allowAsi = true) {
    if (allowAsi ? this.isLineTerminator() : this.eat(tt.semi)) return;
    this.raise(Errors.MissingSemicolon, this.state.lastTokEndLoc);
  }
  // Expect a token of a given type. If found, consume it, otherwise,
  // raise an unexpected token error at given pos.
  expect(type, loc) {
    if (!this.eat(type)) {
      this.unexpected(loc, type);
    }
  }
  // tryParse will clone parser state.
  // It is expensive and should be used with cautions
  tryParse(fn, oldState = this.state.clone()) {
    const abortSignal = { node: null };
    try {
      const node = fn((node2 = null) => {
        abortSignal.node = node2;
        throw abortSignal;
      });
      if (this.state.errors.length > oldState.errors.length) {
        const failState = this.state;
        this.state = oldState;
        this.state.tokensLength = failState.tokensLength;
        return {
          node,
          error: failState.errors[oldState.errors.length],
          thrown: false,
          aborted: false,
          failState
        };
      }
      return {
        node,
        error: null,
        thrown: false,
        aborted: false,
        failState: null
      };
    } catch (error) {
      const failState = this.state;
      this.state = oldState;
      if (error instanceof SyntaxError) {
        return { node: null, error, thrown: true, aborted: false, failState };
      }
      if (error === abortSignal) {
        return {
          node: abortSignal.node,
          error: null,
          thrown: false,
          aborted: true,
          failState
        };
      }
      throw error;
    }
  }
  checkExpressionErrors(refExpressionErrors, andThrow) {
    if (!refExpressionErrors) return false;
    const {
      shorthandAssignLoc,
      doubleProtoLoc,
      privateKeyLoc,
      optionalParametersLoc,
      voidPatternLoc
    } = refExpressionErrors;
    const hasErrors = !!shorthandAssignLoc || !!doubleProtoLoc || !!optionalParametersLoc || !!privateKeyLoc || !!voidPatternLoc;
    if (!andThrow) {
      return hasErrors;
    }
    if (shorthandAssignLoc != null) {
      this.raise(Errors.InvalidCoverInitializedName, shorthandAssignLoc);
    }
    if (doubleProtoLoc != null) {
      this.raise(Errors.DuplicateProto, doubleProtoLoc);
    }
    if (privateKeyLoc != null) {
      this.raise(Errors.UnexpectedPrivateField, privateKeyLoc);
    }
    if (optionalParametersLoc != null) {
      this.unexpected(optionalParametersLoc);
    }
    if (voidPatternLoc != null) {
      this.raise(Errors.InvalidCoverDiscardElement, voidPatternLoc);
    }
  }
  /**
   * Test if current token is a literal property name
   * https://tc39.es/ecma262/#prod-LiteralPropertyName
   * LiteralPropertyName:
   *   IdentifierName
   *   StringLiteral
   *   NumericLiteral
   *   BigIntLiteral
   */
  isLiteralPropertyName() {
    return tokenIsLiteralPropertyName(this.state.type);
  }
  /**
   * Test if given node is a PrivateName
   * will be overridden in ESTree plugin
   */
  isPrivateName(node) {
    return node.type === "PrivateName";
  }
  /**
   * Return the string value of a given private name
   * WITHOUT `#`
   * @see {@link https://tc39.es/ecma262/#sec-static-semantics-stringvalue}
   */
  getPrivateNameSV(node) {
    return node.id.name;
  }
  /**
   * Return whether the given node is a member/optional chain that
   * contains a private name as its property
   * It is overridden in ESTree plugin
   */
  hasPropertyAsPrivateName(node) {
    return (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") && this.isPrivateName(node.property);
  }
  isObjectProperty(node) {
    return node.type === "ObjectProperty";
  }
  isObjectMethod(node) {
    return node.type === "ObjectMethod";
  }
  initializeScopes(inModule = this.options.sourceType === "module") {
    const oldLabels = this.state.labels;
    this.state.labels = [];
    const oldExportedIdentifiers = this.exportedIdentifiers;
    this.exportedIdentifiers = /* @__PURE__ */ new Set();
    const oldInModule = this.inModule;
    this.inModule = inModule;
    const oldScope = this.scope;
    const ScopeHandler2 = this.getScopeHandler();
    this.scope = new ScopeHandler2(this, inModule);
    const oldProdParam = this.prodParam;
    this.prodParam = new ProductionParameterHandler();
    const oldClassScope = this.classScope;
    this.classScope = new ClassScopeHandler(this);
    const oldExpressionScope = this.expressionScope;
    this.expressionScope = new ExpressionScopeHandler(this);
    return () => {
      this.state.labels = oldLabels;
      this.exportedIdentifiers = oldExportedIdentifiers;
      this.inModule = oldInModule;
      this.scope = oldScope;
      this.prodParam = oldProdParam;
      this.classScope = oldClassScope;
      this.expressionScope = oldExpressionScope;
    };
  }
  enterInitialScopes() {
    let paramFlags = ParamKind.PARAM;
    if (this.inModule || this.optionFlags & OptionFlags.AllowAwaitOutsideFunction) {
      paramFlags |= ParamKind.PARAM_AWAIT;
    }
    if (this.optionFlags & OptionFlags.AllowYieldOutsideFunction) {
      paramFlags |= ParamKind.PARAM_YIELD;
    }
    const isCommonJS = !this.inModule && this.options.sourceType === "commonjs";
    if (isCommonJS || this.optionFlags & OptionFlags.AllowReturnOutsideFunction) {
      paramFlags |= ParamKind.PARAM_RETURN;
    }
    this.prodParam.enter(paramFlags);
    let scopeFlags = isCommonJS ? ScopeFlag.FUNCTION : ScopeFlag.PROGRAM;
    if (this.optionFlags & OptionFlags.AllowNewTargetOutsideFunction) {
      scopeFlags |= ScopeFlag.NEW_TARGET;
    }
    this.scope.enter(scopeFlags);
  }
  checkDestructuringPrivate(refExpressionErrors) {
    const { privateKeyLoc } = refExpressionErrors;
    if (privateKeyLoc !== null) {
      this.expectPlugin("destructuringPrivate", privateKeyLoc);
    }
  }
};
var ExpressionErrors = class {
  shorthandAssignLoc = null;
  doubleProtoLoc = null;
  privateKeyLoc = null;
  optionalParametersLoc = null;
  voidPatternLoc = null;
};
var Node = class {
  constructor(parser, pos, loc) {
    this.start = pos;
    this.end = 0;
    this.loc = new SourceLocation(loc);
    if (parser?.optionFlags & OptionFlags.Ranges) this.range = [pos, 0];
    if (parser?.filename) this.loc.filename = parser.filename;
  }
  type = "";
};
var NodePrototype = Node.prototype;
{
  NodePrototype.__clone = function() {
    const newNode = new Node(void 0, this.start, this.loc.start);
    const keys = Object.keys(this);
    for (let i = 0, length = keys.length; i < length; i++) {
      const key = keys[i];
      if (key !== "leadingComments" && key !== "trailingComments" && key !== "innerComments") {
        newNode[key] = this[key];
      }
    }
    return newNode;
  };
}
var NodeUtils = class extends UtilParser {
  startNode() {
    const loc = this.state.startLoc;
    return new Node(this, loc.index, loc);
  }
  startNodeAt(loc) {
    return new Node(this, loc.index, loc);
  }
  /** Start a new node with a previous node's location. */
  startNodeAtNode(type) {
    return this.startNodeAt(type.loc.start);
  }
  // Finish an AST node, adding `type` and `end` properties.
  finishNode(node, type) {
    return this.finishNodeAt(node, type, this.state.lastTokEndLoc);
  }
  // Finish node at given position
  finishNodeAt(node, type, endLoc) {
    node.type = type;
    node.end = endLoc.index;
    node.loc.end = endLoc;
    if (this.optionFlags & OptionFlags.Ranges) node.range[1] = endLoc.index;
    if (this.optionFlags & OptionFlags.AttachComment) {
      this.processComment(node);
    }
    return node;
  }
  resetStartLocation(node, startLoc) {
    node.start = startLoc.index;
    node.loc.start = startLoc;
    if (this.optionFlags & OptionFlags.Ranges) node.range[0] = startLoc.index;
  }
  resetEndLocation(node, endLoc = this.state.lastTokEndLoc) {
    node.end = endLoc.index;
    node.loc.end = endLoc;
    if (this.optionFlags & OptionFlags.Ranges) node.range[1] = endLoc.index;
  }
  /**
   * Reset the start location of node to the start location of locationNode
   */
  resetStartLocationFromNode(node, locationNode) {
    this.resetStartLocation(node, locationNode.loc.start);
  }
  castNodeTo(node, type) {
    node.type = type;
    return node;
  }
  cloneIdentifier(node) {
    const { type, start, end, loc, range, name } = node;
    const cloned = Object.create(NodePrototype);
    cloned.type = type;
    cloned.start = start;
    cloned.end = end;
    cloned.loc = loc;
    cloned.range = range;
    cloned.name = name;
    if (node.extra) cloned.extra = node.extra;
    return cloned;
  }
  cloneStringLiteral(node) {
    const { type, start, end, loc, range, extra } = node;
    const cloned = Object.create(NodePrototype);
    cloned.type = type;
    cloned.start = start;
    cloned.end = end;
    cloned.loc = loc;
    cloned.range = range;
    cloned.extra = extra;
    cloned.value = node.value;
    return cloned;
  }
};
var unwrapParenthesizedExpression = (node) => {
  return node.type === "ParenthesizedExpression" ? unwrapParenthesizedExpression(node.expression) : node;
};
var ParseBindingListFlags = /* @__PURE__ */ ((ParseBindingListFlags2) => {
  ParseBindingListFlags2[ParseBindingListFlags2["ALLOW_EMPTY"] = 1] = "ALLOW_EMPTY";
  ParseBindingListFlags2[ParseBindingListFlags2["IS_FUNCTION_PARAMS"] = 2] = "IS_FUNCTION_PARAMS";
  ParseBindingListFlags2[ParseBindingListFlags2["IS_CONSTRUCTOR_PARAMS"] = 4] = "IS_CONSTRUCTOR_PARAMS";
  return ParseBindingListFlags2;
})(ParseBindingListFlags || {});
var LValParser = class extends NodeUtils {
  /**
   * Convert existing expression atom to assignable pattern
   * if possible. Also checks invalid destructuring targets:
   *
   * - Parenthesized Destructuring patterns
   * - RestElement is not the last element
   * - Missing `=` in assignment pattern
   *
   * NOTE: There is a corresponding "isAssignable" method.
   * When this one is updated, please check if also that one needs to be updated.
   *
   * @param node The expression atom
   * @param isLHS Whether we are parsing a LeftHandSideExpression.
   *              If isLHS is `true`, the following cases are allowed: `[(a)] = [0]`, `[(a.b)] = [0]`
   *              If isLHS is `false`, we are in an arrow function parameters list.
   */
  toAssignable(node, isLHS = false) {
    let parenthesized = void 0;
    if (node.type === "ParenthesizedExpression" || node.extra?.parenthesized) {
      parenthesized = unwrapParenthesizedExpression(node);
      if (isLHS) {
        if (parenthesized.type === "Identifier") {
          this.expressionScope.recordArrowParameterBindingError(
            Errors.InvalidParenthesizedAssignment,
            node
          );
        } else if (parenthesized.type !== "CallExpression" && parenthesized.type !== "MemberExpression" && !this.isOptionalMemberExpression(parenthesized)) {
          this.raise(Errors.InvalidParenthesizedAssignment, node);
        }
      } else {
        this.raise(Errors.InvalidParenthesizedAssignment, node);
      }
    }
    switch (node.type) {
      case "Identifier":
      case "ObjectPattern":
      case "ArrayPattern":
      case "AssignmentPattern":
      case "RestElement":
      case "VoidPattern":
        break;
      case "ObjectExpression":
        this.castNodeTo(node, "ObjectPattern");
        for (let i = 0, length = node.properties.length, last = length - 1; i < length; i++) {
          const prop = node.properties[i];
          const isLast = i === last;
          this.toAssignableObjectExpressionProp(prop, isLast, isLHS);
          if (isLast && prop.type === "RestElement" && node.extra?.trailingCommaLoc) {
            this.raise(Errors.RestTrailingComma, node.extra.trailingCommaLoc);
          }
        }
        break;
      case "ObjectProperty": {
        const { key, value } = node;
        if (this.isPrivateName(key)) {
          this.classScope.usePrivateName(
            this.getPrivateNameSV(key),
            key.loc.start
          );
        }
        this.toAssignable(value, isLHS);
        break;
      }
      case "SpreadElement": {
        throw new Error(
          "Internal @babel/parser error (this is a bug, please report it). SpreadElement should be converted by .toAssignable's caller."
        );
      }
      case "ArrayExpression":
        this.castNodeTo(node, "ArrayPattern");
        this.toAssignableList(
          node.elements,
          node.extra?.trailingCommaLoc,
          isLHS
        );
        break;
      case "AssignmentExpression":
        if (node.operator !== "=") {
          this.raise(Errors.MissingEqInAssignment, node.left.loc.end);
        }
        this.castNodeTo(node, "AssignmentPattern");
        delete node.operator;
        if (node.left.type === "VoidPattern") {
          this.raise(Errors.VoidPatternInitializer, node.left);
        }
        this.toAssignable(node.left, isLHS);
        break;
      case "ParenthesizedExpression":
        this.toAssignable(parenthesized, isLHS);
        break;
    }
  }
  toAssignableObjectExpressionProp(prop, isLast, isLHS) {
    if (prop.type === "ObjectMethod") {
      this.raise(
        prop.kind === "get" || prop.kind === "set" ? Errors.PatternHasAccessor : Errors.PatternHasMethod,
        prop.key
      );
    } else if (prop.type === "SpreadElement") {
      this.castNodeTo(prop, "RestElement");
      const arg = prop.argument;
      this.checkToRestConversion(
        arg,
        /* allowPattern */
        false
      );
      this.toAssignable(arg, isLHS);
      if (!isLast) {
        this.raise(Errors.RestTrailingComma, prop);
      }
    } else {
      this.toAssignable(prop, isLHS);
    }
  }
  // Convert list of expression atoms to binding list.
  toAssignableList(exprList, trailingCommaLoc, isLHS) {
    const end = exprList.length - 1;
    for (let i = 0; i <= end; i++) {
      const elt = exprList[i];
      if (!elt) continue;
      this.toAssignableListItem(
        exprList,
        i,
        isLHS
      );
      if (elt.type === "RestElement") {
        if (i < end) {
          this.raise(Errors.RestTrailingComma, elt);
        } else if (trailingCommaLoc) {
          this.raise(Errors.RestTrailingComma, trailingCommaLoc);
        }
      }
    }
  }
  toAssignableListItem(exprList, index, isLHS) {
    const node = exprList[index];
    if (node.type === "SpreadElement") {
      this.castNodeTo(node, "RestElement");
      const arg = node.argument;
      this.checkToRestConversion(
        arg,
        /* allowPattern */
        true
      );
      this.toAssignable(arg, isLHS);
    } else {
      this.toAssignable(node, isLHS);
    }
  }
  isAssignable(node, isBinding) {
    switch (node.type) {
      case "Identifier":
      case "ObjectPattern":
      case "ArrayPattern":
      case "AssignmentPattern":
      case "RestElement":
      case "VoidPattern":
        return true;
      case "ObjectExpression": {
        const last = node.properties.length - 1;
        return node.properties.every((prop, i) => {
          return prop.type !== "ObjectMethod" && (i === last || prop.type !== "SpreadElement") && this.isAssignable(prop);
        });
      }
      case "ObjectProperty":
        return this.isAssignable(node.value);
      case "SpreadElement":
        return this.isAssignable(node.argument);
      case "ArrayExpression":
        return node.elements.every(
          (element) => element === null || this.isAssignable(element)
        );
      case "AssignmentExpression":
        return node.operator === "=";
      case "ParenthesizedExpression":
        return this.isAssignable(node.expression);
      case "MemberExpression":
      case "OptionalMemberExpression":
        return !isBinding;
      default:
        return false;
    }
  }
  // Convert list of expression atoms to a list of
  toReferencedList(exprList, isParenthesizedExpr) {
    return exprList;
  }
  toReferencedListDeep(exprList, isParenthesizedExpr) {
    this.toReferencedList(exprList, isParenthesizedExpr);
    for (const expr of exprList) {
      if (expr?.type === "ArrayExpression") {
        this.toReferencedListDeep(expr.elements);
      }
    }
  }
  // Parses spread element.
  parseSpread(refExpressionErrors) {
    const node = this.startNode();
    this.next();
    node.argument = this.parseMaybeAssignAllowIn(
      refExpressionErrors,
      void 0
    );
    return this.finishNode(node, "SpreadElement");
  }
  // https://tc39.es/ecma262/#prod-BindingRestElement
  parseRestBinding() {
    const node = this.startNode();
    this.next();
    const argument = this.parseBindingAtom();
    if (argument.type === "VoidPattern") {
      this.raise(Errors.UnexpectedVoidPattern, argument);
    }
    node.argument = argument;
    return this.finishNode(node, "RestElement");
  }
  // Parses lvalue (assignable) atom.
  parseBindingAtom() {
    switch (this.state.type) {
      case tt.bracketL: {
        const node = this.startNode();
        this.next();
        node.elements = this.parseBindingList(
          tt.bracketR,
          rightSquareBracket,
          1
          /* ALLOW_EMPTY */
        );
        return this.finishNode(node, "ArrayPattern");
      }
      case tt.braceL:
        return this.parseObjectLike(tt.braceR, true);
      case tt._void:
        return this.parseVoidPattern(null);
    }
    return this.parseIdentifier();
  }
  parseBindingList(close, closeCharCode, flags) {
    const allowEmpty = flags & 1;
    const elts = [];
    let first = true;
    while (!this.eat(close)) {
      if (first) {
        first = false;
      } else {
        this.expect(tt.comma);
      }
      if (allowEmpty && this.match(tt.comma)) {
        elts.push(null);
      } else if (this.eat(close)) {
        break;
      } else if (this.match(tt.ellipsis)) {
        let rest = this.parseRestBinding();
        if (this.hasPlugin("flow") || flags & 2) {
          rest = this.parseFunctionParamType(rest);
        }
        elts.push(rest);
        if (!this.checkCommaAfterRest(closeCharCode)) {
          this.expect(close);
          break;
        }
      } else {
        const decorators = [];
        if (flags & 2) {
          if (this.match(tt.at) && this.hasPlugin("decorators")) {
            this.raise(
              Errors.UnsupportedParameterDecorator,
              this.state.startLoc
            );
          }
          while (this.match(tt.at)) {
            decorators.push(this.parseDecorator());
          }
        }
        elts.push(this.parseBindingElement(flags, decorators));
      }
    }
    return elts;
  }
  // https://tc39.es/ecma262/#prod-BindingRestProperty
  parseBindingRestProperty(prop) {
    this.next();
    if (this.hasPlugin("discardBinding") && this.match(tt._void)) {
      prop.argument = this.parseVoidPattern(null);
      this.raise(Errors.UnexpectedVoidPattern, prop.argument);
    } else {
      prop.argument = this.parseIdentifier();
    }
    this.checkCommaAfterRest(rightCurlyBrace);
    return this.finishNode(prop, "RestElement");
  }
  // https://tc39.es/ecma262/#prod-BindingProperty
  parseBindingProperty() {
    const { type, startLoc } = this.state;
    if (type === tt.ellipsis) {
      return this.parseBindingRestProperty(this.startNode());
    }
    const prop = this.startNode();
    if (type === tt.privateName) {
      this.expectPlugin("destructuringPrivate", startLoc);
      this.classScope.usePrivateName(this.state.value, startLoc);
      prop.key = this.parsePrivateName();
    } else {
      this.parsePropertyName(prop);
    }
    prop.method = false;
    return this.parseObjPropValue(
      prop,
      startLoc,
      false,
      false,
      true,
      false
    );
  }
  // https://tc39.es/ecma262/#prod-BindingElement
  parseBindingElement(flags, decorators) {
    const left = this.parseMaybeDefault();
    if (this.hasPlugin("flow") || flags & 2) {
      this.parseFunctionParamType(left);
    }
    if (decorators.length) {
      left.decorators = decorators;
      this.resetStartLocationFromNode(left, decorators[0]);
    }
    const elt = this.parseMaybeDefault(left.loc.start, left);
    return elt;
  }
  // Used by flow/typescript plugin to add type annotations to binding elements
  parseFunctionParamType(param) {
    return param;
  }
  parseMaybeDefault(startLoc, left) {
    startLoc ??= this.state.startLoc;
    left = left ?? this.parseBindingAtom();
    if (!this.eat(tt.eq)) return left;
    const node = this.startNodeAt(startLoc);
    if (left.type === "VoidPattern") {
      this.raise(Errors.VoidPatternInitializer, left);
    }
    node.left = left;
    node.right = this.parseMaybeAssignAllowIn();
    return this.finishNode(node, "AssignmentPattern");
  }
  /**
   * Return information use in determining whether a Node of a given type is an LVal,
   * possibly given certain additional context information.
   *
   * Subclasser notes: This method has kind of a lot of mixed, but related,
   * responsibilities. If we can definitively determine with the information
   * provided that this either *is* or *isn't* a valid `LVal`, then the return
   * value is easy: just return `true` or `false`. However, if it is a valid
   * LVal *ancestor*, and thus its descendants must be subsequently visited to
   * continue the "investigation", then this method should return the relevant
   * child key as a `string`. In some special cases, you additionally want to
   * convey that this node should be treated as if it were parenthesized. In
   * that case, a tuple of [key: string, parenthesized: boolean] is returned.
   * The `string`-only return option is actually just a shorthand for:
   * `[key: string, parenthesized: false]`.
   *
   * @param type A Node `type` string
   * @param disallowCallExpression Whether to disallow `CallExpression` as an LVal.
   * @param isUnparenthesizedInAssign
   *        Whether the node in question is unparenthesized and its parent
   *        is either an assignment pattern or an assignment expression.
   * @param binding
   *        The binding operation that is being considered for this potential
   *        LVal.
   * @returns `true` or `false` if we can immediately determine whether the node
   *          type in question can be treated as an `LVal`.
   *          A `string` key to traverse if we must check this child.
   *          A `[string, boolean]` tuple if we need to check this child and
   *          treat is as parenthesized.
   */
  isValidLVal(type, disallowCallExpression, isUnparenthesizedInAssign, binding) {
    switch (type) {
      case "AssignmentPattern":
        return "left";
      case "RestElement":
        return "argument";
      case "ObjectProperty":
        return "value";
      case "ParenthesizedExpression":
        return "expression";
      case "ArrayPattern":
        return "elements";
      case "ObjectPattern":
        return "properties";
      case "VoidPattern":
        return true;
      case "CallExpression":
        if (!disallowCallExpression && !this.state.strict && this.optionFlags & OptionFlags.AnnexB) {
          return true;
        }
    }
    return false;
  }
  // Overridden by the estree plugin
  isOptionalMemberExpression(expression) {
    return expression.type === "OptionalMemberExpression";
  }
  /**
   * Verify that a target expression is an lval (something that can be assigned to).
   *
   * @param expression The expression in question to check.
   * @param ancestor
   *        The relevant ancestor to provide context information for the error
   *        if the check fails.
   * @param binding
   *        The desired binding type. If the given expression is an identifier
   *        and `binding` is not `BindingFlag.TYPE_NONE`, `checkLVal` will register binding
   *        to the parser scope See also `src/util/scopeflags.js`
   * @param checkClashes
   *        An optional string set to check if an identifier name is included.
   *        `checkLVal` will add checked identifier name to `checkClashes` It is
   *        used in tracking duplicates in function parameter lists. If it is
   *        false, `checkLVal` will skip duplicate checks
   * @param strictModeChanged
   *        Whether an identifier has been parsed in a sloppy context but should
   *        be reinterpreted as strict-mode. e.g. `(arguments) => { "use strict "}`
   * @param hasParenthesizedAncestor
   *        This is only used internally during recursive calls, and you should
   *        not have to set it yourself.
   * @param disallowCallExpression Whether to disallow `CallExpression` as an LVal.
   */
  checkLVal(expression, ancestor, binding = BindingFlag.TYPE_NONE, checkClashes = false, strictModeChanged = false, hasParenthesizedAncestor = false, disallowCallExpression = false) {
    const type = expression.type;
    if (this.isObjectMethod(expression)) return;
    const isOptionalMemberExpression = this.isOptionalMemberExpression(expression);
    if (isOptionalMemberExpression || type === "MemberExpression") {
      if (isOptionalMemberExpression) {
        this.expectPlugin("optionalChainingAssign", expression.loc.start);
        if (ancestor.type !== "AssignmentExpression") {
          this.raise(Errors.InvalidLhsOptionalChaining, expression, {
            ancestor
          });
        }
      }
      if (binding !== BindingFlag.TYPE_NONE) {
        this.raise(Errors.InvalidPropertyBindingPattern, expression);
      }
      return;
    }
    if (type === "Identifier") {
      this.checkIdentifier(expression, binding, strictModeChanged);
      const { name } = expression;
      if (checkClashes) {
        if (checkClashes.has(name)) {
          this.raise(Errors.ParamDupe, expression);
        } else {
          checkClashes.add(name);
        }
      }
      return;
    } else if (type === "VoidPattern" && ancestor.type === "CatchClause") {
      this.raise(Errors.VoidPatternCatchClauseParam, expression);
    }
    const unwrappedExpression = unwrapParenthesizedExpression(expression);
    disallowCallExpression ||= unwrappedExpression.type === "CallExpression" && (unwrappedExpression.callee.type === "Import" || unwrappedExpression.callee.type === "Super");
    const validity = this.isValidLVal(
      type,
      disallowCallExpression,
      !(hasParenthesizedAncestor || expression.extra?.parenthesized) && ancestor.type === "AssignmentExpression",
      binding
    );
    if (validity === true) return;
    if (validity === false) {
      const ParseErrorClass = binding === BindingFlag.TYPE_NONE ? Errors.InvalidLhs : Errors.InvalidLhsBinding;
      this.raise(ParseErrorClass, expression, { ancestor });
      return;
    }
    let key, isParenthesizedExpression;
    if (typeof validity === "string") {
      key = validity;
      isParenthesizedExpression = type === "ParenthesizedExpression";
    } else {
      [key, isParenthesizedExpression] = validity;
    }
    const nextAncestor = type === "ArrayPattern" || type === "ObjectPattern" ? { type } : ancestor;
    const val = expression[key];
    if (Array.isArray(val)) {
      for (const child of val) {
        if (child) {
          this.checkLVal(
            child,
            nextAncestor,
            binding,
            checkClashes,
            strictModeChanged,
            isParenthesizedExpression,
            true
          );
        }
      }
    } else if (val) {
      this.checkLVal(
        val,
        nextAncestor,
        binding,
        checkClashes,
        strictModeChanged,
        isParenthesizedExpression,
        disallowCallExpression
      );
    }
  }
  checkIdentifier(at, bindingType, strictModeChanged = false) {
    if (this.state.strict && (strictModeChanged ? isStrictBindReservedWord(at.name, this.inModule) : isStrictBindOnlyReservedWord(at.name))) {
      if (bindingType === BindingFlag.TYPE_NONE) {
        this.raise(Errors.StrictEvalArguments, at, { referenceName: at.name });
      } else {
        this.raise(Errors.StrictEvalArgumentsBinding, at, {
          bindingName: at.name
        });
      }
    }
    if (bindingType & BindingFlag.FLAG_NO_LET_IN_LEXICAL && at.name === "let") {
      this.raise(Errors.LetInLexicalBinding, at);
    }
    if (!(bindingType & BindingFlag.TYPE_NONE)) {
      this.declareNameFromIdentifier(at, bindingType);
    }
  }
  declareNameFromIdentifier(identifier, binding) {
    this.scope.declareName(identifier.name, binding, identifier.loc.start);
  }
  checkToRestConversion(node, allowPattern) {
    switch (node.type) {
      case "ParenthesizedExpression":
        this.checkToRestConversion(node.expression, allowPattern);
        break;
      case "Identifier":
      case "MemberExpression":
        break;
      case "ArrayExpression":
      case "ObjectExpression":
        if (allowPattern) break;
      /* falls through */
      default:
        this.raise(Errors.InvalidRestAssignmentPattern, node);
    }
  }
  checkCommaAfterRest(close) {
    if (!this.match(tt.comma)) {
      return false;
    }
    this.raise(
      this.lookaheadCharCode() === close ? Errors.RestTrailingComma : Errors.ElementAfterRest,
      this.state.startLoc
    );
    return true;
  }
};
export {
  newParameterDeclarationScope as $,
  quotationMark as A,
  BindingFlag as B,
  apostrophe as C,
  ScopeHandler as D,
  Errors as E,
  Scope as F,
  tokenIsLiteralPropertyName as G,
  tokenIsKeyword as H,
  tokenLabelName as I,
  tokenIsFlowInterfaceOrTypeOrOpaque as J,
  verticalBar as K,
  isIteratorStart as L,
  slash as M,
  NameType as N,
  rightCurlyBrace as O,
  ParseErrorEnum as P,
  space as Q,
  tab as R,
  ScopeFlag as S,
  LoopLabelKind as T,
  OptionFlags as U,
  createPositionWithColumnOffset as V,
  semicolon as W,
  leftSquareBracket as X,
  ExpressionErrors as Y,
  tokenIsLoop as Z,
  functionFlags as _,
  tt as a,
  ClassElementType as a0,
  newExpressionScope as a1,
  lowercaseF as a2,
  LValParser as a3,
  tokenIsAssignment as a4,
  tokenIsOperator as a5,
  tokenIsRightAssociative as a6,
  UnparenthesizedPipeBodyDescriptions as a7,
  tokenIsPrefix as a8,
  tokenIsPostfix as a9,
  tableQuotaError as aA,
  TableQuotaError as aB,
  COMPONENT_FX_GUIDANCE as aC,
  prepareSqlDiscoveryQueries as aD,
  newAsyncArrowScope as aa,
  setInnerComments as ab,
  newArrowHeadScope as ac,
  canBeReservedWord as ad,
  isKeyword as ae,
  isReservedWord as af,
  isStrictBindReservedWord as ag,
  isStrictReservedWord as ah,
  Token as ai,
  getExportedToken as aj,
  graveAccent as ak,
  tokenKeywordOrIdentifierIsKeyword as al,
  getOptions as am,
  percentSign as an,
  isNewLine as ao,
  ampersand as ap,
  carriageReturn as aq,
  lineFeed as ar,
  numberSign as as,
  lowercaseX as at,
  dash as au,
  exclamationMark as av,
  tokenComesBeforeExpression as aw,
  fail as ax,
  ok as ay,
  COMPONENT_FX_UPDATE_GUIDANCE as az,
  ParseBindingListFlags as b,
  tokenIsKeywordOrIdentifier as c,
  colon as d,
  dot as e,
  tokenIsTSTypeOperator as f,
  rightSquareBracket as g,
  types as h,
  ParamKind as i,
  tokenIsTSDeclarationStart as j,
  lessThan as k,
  leftParenthesis as l,
  tokenIsTemplate as m,
  tokenCanStartExpression as n,
  tokenOperatorPrecedence as o,
  leftCurlyBrace as p,
  questionMark as q,
  rightParenthesis as r,
  asterisk as s,
  tokenIsIdentifier as t,
  equalsTo as u,
  comma as v,
  greaterThan as w,
  isIdentifierStart as x,
  isIdentifierChar as y,
  backslash as z
};
