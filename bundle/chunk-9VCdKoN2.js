import { createRequire } from "node:module";
import { r as require_lib, P as ParseErrorEnum, t as tokenIsIdentifier, a as tt, E as Errors, b as tokenIsKeywordOrIdentifier, c as tokenIsTSTypeOperator, d as types, e as tokenIsTSDeclarationStart, f as tokenIsTemplate, g as tokenCanStartExpression, h as tokenOperatorPrecedence, i as isIdentifierStart, j as isIdentifierChar, S as ScopeHandler, k as Scope, l as tokenIsLiteralPropertyName, m as tokenIsKeyword, n as tokenLabelName, o as tokenIsFlowInterfaceOrTypeOrOpaque, p as isIteratorStart } from "./chunk-DrLKaGjO.js";
import { _ as __toESM } from "./chunk-D0rVi1EZ.js";
createRequire(import.meta.url);
var TypeScriptScope = class extends Scope {
  tsNames = /* @__PURE__ */ new Map();
};
var TypeScriptScopeHandler = class extends ScopeHandler {
  importsStack = [];
  createScope(flags) {
    this.importsStack.push(/* @__PURE__ */ new Set());
    return new TypeScriptScope(flags);
  }
  enter(flags) {
    if (flags === 1024) {
      this.importsStack.push(/* @__PURE__ */ new Set());
    }
    super.enter(flags);
  }
  exit() {
    const flags = super.exit();
    if (flags === 1024) {
      this.importsStack.pop();
    }
    return flags;
  }
  hasImport(name, allowShadow) {
    const len = this.importsStack.length;
    if (this.importsStack[len - 1].has(name)) {
      return true;
    }
    if (!allowShadow && len > 1) {
      for (let i = 0; i < len - 1; i++) {
        if (this.importsStack[i].has(name)) return true;
      }
    }
    return false;
  }
  declareName(name, bindingType, loc) {
    if (bindingType & 4096) {
      if (this.hasImport(name, true)) {
        this.parser.raise(Errors.VarRedeclaration, loc, {
          identifierName: name
        });
      }
      this.importsStack[this.importsStack.length - 1].add(name);
      return;
    }
    const scope = this.currentScope();
    let type = scope.tsNames.get(name) || 0;
    if (bindingType & 1024) {
      this.maybeExportDefined(scope, name);
      scope.tsNames.set(
        name,
        type | 16
        /* ExportOnlyBindings */
      );
      return;
    }
    super.declareName(name, bindingType, loc);
    if (bindingType & 2) {
      if (!(bindingType & 1)) {
        this.checkRedeclarationInScope(scope, name, bindingType, loc);
        this.maybeExportDefined(scope, name);
      }
      type = type | 1;
    }
    if (bindingType & 256) {
      type = type | 2;
    }
    if (bindingType & 512) {
      type = type | 4;
    }
    if (bindingType & 128) {
      type = type | 8;
    }
    if (type) scope.tsNames.set(name, type);
  }
  isRedeclaredInScope(scope, name, bindingType) {
    const type = scope.tsNames.get(name);
    if ((type & 2) > 0) {
      if (bindingType & 256) {
        const isConst = !!(bindingType & 512);
        const wasConst = (type & 4) > 0;
        return isConst !== wasConst;
      }
      return true;
    }
    if (bindingType & 128 && (type & 8) > 0) {
      if (scope.names.get(name) & 2) {
        return !!(bindingType & 1);
      } else {
        return false;
      }
    }
    if (bindingType & 2 && (type & 1) > 0) {
      return true;
    }
    return super.isRedeclaredInScope(scope, name, bindingType);
  }
  checkLocalExport(id) {
    const { name } = id;
    if (this.hasImport(name)) return;
    const len = this.scopeStack.length;
    for (let i = len - 1; i >= 0; i--) {
      const scope = this.scopeStack[i];
      const type = scope.tsNames.get(name);
      if ((type & 1) > 0 || (type & 16) > 0) {
        return;
      }
    }
    super.checkLocalExport(id);
  }
};
var charCodes$1 = __toESM(require_lib());
var keywordAndTSRelationalOperator = /in(?:stanceof)?|as|satisfies/y;
function nonNull(x) {
  if (x == null) {
    throw new Error(`Unexpected ${x} value.`);
  }
  return x;
}
function assert(x) {
  if (!x) {
    throw new Error("Assert fail");
  }
}
var TSErrors = ParseErrorEnum`typescript`({
  AbstractMethodHasImplementation: ({ methodName }) => `Method '${methodName}' cannot have an implementation because it is marked abstract.`,
  AbstractPropertyHasInitializer: ({
    propertyName
  }) => `Property '${propertyName}' cannot have an initializer because it is marked abstract.`,
  AccessorCannotBeOptional: "An 'accessor' property cannot be declared optional.",
  AccessorCannotDeclareThisParameter: "'get' and 'set' accessors cannot declare 'this' parameters.",
  AccessorCannotHaveTypeParameters: "An accessor cannot have type parameters.",
  ClassMethodHasDeclare: "Class methods cannot have the 'declare' modifier.",
  ClassMethodHasReadonly: "Class methods cannot have the 'readonly' modifier.",
  ConstInitializerMustBeStringOrNumericLiteralOrLiteralEnumReference: "A 'const' initializer in an ambient context must be a string or numeric literal or literal enum reference.",
  ConstructorHasTypeParameters: "Type parameters cannot appear on a constructor declaration.",
  DeclareAccessor: ({ kind }) => `'declare' is not allowed in ${kind}ters.`,
  DeclareClassFieldHasInitializer: "Initializers are not allowed in ambient contexts.",
  DeclareFunctionHasImplementation: "An implementation cannot be declared in ambient contexts.",
  DuplicateAccessibilityModifier: ({
    modifier
  }) => `Accessibility modifier already seen: '${modifier}'.`,
  DuplicateModifier: ({ modifier }) => `Duplicate modifier: '${modifier}'.`,
  // `token` matches the terminology used by typescript:
  // https://github.com/microsoft/TypeScript/blob/main/src/compiler/types.ts#L2915
  EmptyHeritageClauseType: ({ token }) => `'${token}' list cannot be empty.`,
  EmptyTypeArguments: "Type argument list cannot be empty.",
  EmptyTypeParameters: "Type parameter list cannot be empty.",
  ExpectedAmbientAfterExportDeclare: "'export declare' must be followed by an ambient declaration.",
  ImportAliasHasImportType: "An import alias can not use 'import type'.",
  ImportReflectionHasImportType: "An `import module` declaration can not use `type` modifier",
  IncompatibleModifiers: ({
    modifiers
  }) => `'${modifiers[0]}' modifier cannot be used with '${modifiers[1]}' modifier.`,
  IndexSignatureHasAbstract: "Index signatures cannot have the 'abstract' modifier.",
  IndexSignatureHasAccessibility: ({
    modifier
  }) => `Index signatures cannot have an accessibility modifier ('${modifier}').`,
  IndexSignatureHasDeclare: "Index signatures cannot have the 'declare' modifier.",
  IndexSignatureHasOverride: "'override' modifier cannot appear on an index signature.",
  IndexSignatureHasStatic: "Index signatures cannot have the 'static' modifier.",
  InitializerNotAllowedInAmbientContext: "Initializers are not allowed in ambient contexts.",
  InvalidHeritageClauseType: ({ token }) => `'${token}' list can only include identifiers or qualified-names with optional type arguments.`,
  InvalidModifierOnAwaitUsingDeclaration: (modifier) => `'${modifier}' modifier cannot appear on an await using declaration.`,
  InvalidModifierOnTypeMember: ({ modifier }) => `'${modifier}' modifier cannot appear on a type member.`,
  InvalidModifierOnTypeParameter: ({ modifier }) => `'${modifier}' modifier cannot appear on a type parameter.`,
  InvalidModifierOnTypeParameterPositions: ({
    modifier
  }) => `'${modifier}' modifier can only appear on a type parameter of a class, interface or type alias.`,
  InvalidModifierOnUsingDeclaration: (modifier) => `'${modifier}' modifier cannot appear on a using declaration.`,
  InvalidModifiersOrder: ({
    orderedModifiers
  }) => `'${orderedModifiers[0]}' modifier must precede '${orderedModifiers[1]}' modifier.`,
  InvalidPropertyAccessAfterInstantiationExpression: "Invalid property access after an instantiation expression. You can either wrap the instantiation expression in parentheses, or delete the type arguments.",
  InvalidTupleMemberLabel: "Tuple members must be labeled with a simple identifier.",
  MissingInterfaceName: "'interface' declarations must be followed by an identifier.",
  NonAbstractClassHasAbstractMethod: "Abstract methods can only appear within an abstract class.",
  NonClassMethodPropertyHasAbstractModifier: "'abstract' modifier can only appear on a class, method, or property declaration.",
  OptionalTypeBeforeRequired: "A required element cannot follow an optional element.",
  OverrideNotInSubClass: "This member cannot have an 'override' modifier because its containing class does not extend another class.",
  PatternIsOptional: "A binding pattern parameter cannot be optional in an implementation signature.",
  PrivateElementHasAbstract: "Private elements cannot have the 'abstract' modifier.",
  PrivateElementHasAccessibility: ({
    modifier
  }) => `Private elements cannot have an accessibility modifier ('${modifier}').`,
  ReadonlyForMethodSignature: "'readonly' modifier can only appear on a property declaration or index signature.",
  ReservedArrowTypeParam: "This syntax is reserved in files with the .mts or .cts extension. Add a trailing comma, as in `<T,>() => ...`.",
  ReservedTypeAssertion: "This syntax is reserved in files with the .mts or .cts extension. Use an `as` expression instead.",
  SetAccessorCannotHaveOptionalParameter: "A 'set' accessor cannot have an optional parameter.",
  SetAccessorCannotHaveRestParameter: "A 'set' accessor cannot have rest parameter.",
  SetAccessorCannotHaveReturnType: "A 'set' accessor cannot have a return type annotation.",
  SingleTypeParameterWithoutTrailingComma: ({
    typeParameterName
  }) => `Single type parameter ${typeParameterName} should have a trailing comma. Example usage: <${typeParameterName},>.`,
  StaticBlockCannotHaveModifier: "Static class blocks cannot have any modifier.",
  TupleOptionalAfterType: "A labeled tuple optional element must be declared using a question mark after the name and before the colon (`name?: type`), rather than after the type (`name: type?`).",
  TypeAnnotationAfterAssign: "Type annotations must come before default assignments, e.g. instead of `age = 25: number` use `age: number = 25`.",
  TypeImportCannotSpecifyDefaultAndNamed: "A type-only import can specify a default import or named bindings, but not both.",
  TypeModifierIsUsedInTypeExports: "The 'type' modifier cannot be used on a named export when 'export type' is used on its export statement.",
  TypeModifierIsUsedInTypeImports: "The 'type' modifier cannot be used on a named import when 'import type' is used on its import statement.",
  UnexpectedParameterModifier: "A parameter property is only allowed in a constructor implementation.",
  UnexpectedReadonly: "'readonly' type modifier is only permitted on array and tuple literal types.",
  UnexpectedTypeAnnotation: "Did not expect a type annotation here.",
  UnexpectedTypeCastInParameter: "Unexpected type cast in parameter position.",
  UnsupportedImportTypeArgument: "Argument in a type import must be a string literal.",
  UnsupportedParameterPropertyKind: "A parameter property may not be declared using a binding pattern.",
  UnsupportedSignatureParameterKind: ({ type }) => `Name in a signature must be an Identifier, ObjectPattern or ArrayPattern, instead got ${type}.`,
  UsingDeclarationInAmbientContext: (kind) => `'${kind}' declarations are not allowed in ambient contexts.`
});
function keywordTypeFromName(value) {
  switch (value) {
    case "any":
      return "TSAnyKeyword";
    case "boolean":
      return "TSBooleanKeyword";
    case "bigint":
      return "TSBigIntKeyword";
    case "never":
      return "TSNeverKeyword";
    case "number":
      return "TSNumberKeyword";
    case "object":
      return "TSObjectKeyword";
    case "string":
      return "TSStringKeyword";
    case "symbol":
      return "TSSymbolKeyword";
    case "undefined":
      return "TSUndefinedKeyword";
    case "unknown":
      return "TSUnknownKeyword";
    default:
      return void 0;
  }
}
function tsIsAccessModifier(modifier) {
  return modifier === "private" || modifier === "public" || modifier === "protected";
}
function tsIsVarianceAnnotations(modifier) {
  return modifier === "in" || modifier === "out";
}
var typescript_default = (superClass) => class TypeScriptParserMixin extends superClass {
  getScopeHandler() {
    return TypeScriptScopeHandler;
  }
  tsIsIdentifier() {
    return tokenIsIdentifier(this.state.type);
  }
  tsTokenCanFollowModifier() {
    return this.match(tt.bracketL) || this.match(tt.braceL) || this.match(tt.star) || this.match(tt.ellipsis) || this.match(tt.privateName) || this.isLiteralPropertyName();
  }
  tsNextTokenOnSameLineAndCanFollowModifier() {
    this.next();
    if (this.hasPrecedingLineBreak()) {
      return false;
    }
    return this.tsTokenCanFollowModifier();
  }
  tsNextTokenCanFollowModifier() {
    if (this.match(tt._static)) {
      this.next();
      return this.tsTokenCanFollowModifier();
    }
    return this.tsNextTokenOnSameLineAndCanFollowModifier();
  }
  /** Parses a modifier matching one the given modifier names. */
  tsParseModifier(allowedModifiers, stopOnStartOfClassStaticBlock, hasSeenStaticModifier) {
    if (!tokenIsIdentifier(this.state.type) && this.state.type !== tt._in && this.state.type !== tt._const) {
      return void 0;
    }
    const modifier = this.state.value;
    if (allowedModifiers.includes(modifier)) {
      if (hasSeenStaticModifier && this.match(tt._static)) {
        return void 0;
      }
      if (stopOnStartOfClassStaticBlock && this.tsIsStartOfStaticBlocks()) {
        return void 0;
      }
      if (this.tsTryParse(this.tsNextTokenCanFollowModifier.bind(this))) {
        return modifier;
      }
    }
    return void 0;
  }
  /** Parses a list of modifiers, in any order.
   *  If you need a specific order, you must call this function multiple times:
   *    this.tsParseModifiers({ modified: node, allowedModifiers: ["public"] });
   *    this.tsParseModifiers({ modified: node, allowedModifiers: ["abstract", "readonly"] });
   */
  tsParseModifiers({
    allowedModifiers,
    disallowedModifiers,
    stopOnStartOfClassStaticBlock,
    errorTemplate = TSErrors.InvalidModifierOnTypeMember
  }, modified) {
    const enforceOrder = (loc, modifier, before, after) => {
      if (modifier === before && modified[after]) {
        this.raise(TSErrors.InvalidModifiersOrder, loc, {
          orderedModifiers: [before, after]
        });
      }
    };
    const incompatible = (loc, modifier, mod1, mod2) => {
      if (modified[mod1] && modifier === mod2 || modified[mod2] && modifier === mod1) {
        this.raise(TSErrors.IncompatibleModifiers, loc, {
          modifiers: [mod1, mod2]
        });
      }
    };
    for (; ; ) {
      const { startLoc } = this.state;
      const modifier = this.tsParseModifier(
        allowedModifiers.concat(disallowedModifiers ?? []),
        stopOnStartOfClassStaticBlock,
        modified.static
      );
      if (!modifier) break;
      if (tsIsAccessModifier(modifier)) {
        if (modified.accessibility) {
          this.raise(TSErrors.DuplicateAccessibilityModifier, startLoc, {
            modifier
          });
        } else {
          enforceOrder(startLoc, modifier, modifier, "override");
          enforceOrder(startLoc, modifier, modifier, "static");
          enforceOrder(startLoc, modifier, modifier, "readonly");
          modified.accessibility = modifier;
        }
      } else if (tsIsVarianceAnnotations(modifier)) {
        if (modified[modifier]) {
          this.raise(TSErrors.DuplicateModifier, startLoc, { modifier });
        }
        modified[modifier] = true;
        enforceOrder(startLoc, modifier, "in", "out");
      } else {
        if (Object.hasOwn(modified, modifier)) {
          this.raise(TSErrors.DuplicateModifier, startLoc, { modifier });
        } else {
          enforceOrder(startLoc, modifier, "static", "readonly");
          enforceOrder(startLoc, modifier, "static", "override");
          enforceOrder(startLoc, modifier, "override", "readonly");
          enforceOrder(startLoc, modifier, "abstract", "override");
          incompatible(startLoc, modifier, "declare", "override");
          incompatible(startLoc, modifier, "static", "abstract");
        }
        modified[modifier] = true;
      }
      if (disallowedModifiers?.includes(modifier)) {
        this.raise(errorTemplate, startLoc, {
          modifier
        });
      }
    }
  }
  tsIsListTerminator(kind) {
    switch (kind) {
      case "EnumMembers":
      case "TypeMembers":
        return this.match(tt.braceR);
      case "HeritageClauseElement":
        return this.match(tt.braceL);
      case "TupleElementTypes":
        return this.match(tt.bracketR);
      case "TypeParametersOrArguments":
        return this.match(tt.gt);
    }
  }
  tsParseList(kind, parseElement) {
    const result = [];
    while (!this.tsIsListTerminator(kind)) {
      result.push(parseElement());
    }
    return result;
  }
  tsParseDelimitedList(kind, parseElement, refTrailingCommaPos) {
    return nonNull(
      this.tsParseDelimitedListWorker(
        kind,
        parseElement,
        /* expectSuccess */
        true,
        refTrailingCommaPos
      )
    );
  }
  /**
   * If !expectSuccess, returns undefined instead of failing to parse.
   * If expectSuccess, parseElement should always return a defined value.
   */
  tsParseDelimitedListWorker(kind, parseElement, expectSuccess, refTrailingCommaPos) {
    const result = [];
    let trailingCommaPos = -1;
    for (; ; ) {
      if (this.tsIsListTerminator(kind)) {
        break;
      }
      trailingCommaPos = -1;
      const element = parseElement();
      if (element == null) {
        return void 0;
      }
      result.push(element);
      if (this.eat(tt.comma)) {
        trailingCommaPos = this.state.lastTokStartLoc.index;
        continue;
      }
      if (this.tsIsListTerminator(kind)) {
        break;
      }
      if (expectSuccess) {
        this.expect(tt.comma);
      }
      return void 0;
    }
    if (refTrailingCommaPos) {
      refTrailingCommaPos.value = trailingCommaPos;
    }
    return result;
  }
  tsParseBracketedList(kind, parseElement, bracket, skipFirstToken, refTrailingCommaPos) {
    if (!skipFirstToken) {
      if (bracket) {
        this.expect(tt.bracketL);
      } else {
        this.expect(tt.lt);
      }
    }
    const result = this.tsParseDelimitedList(
      kind,
      parseElement,
      refTrailingCommaPos
    );
    if (bracket) {
      this.expect(tt.bracketR);
    } else {
      this.expect(tt.gt);
    }
    return result;
  }
  tsParseImportType() {
    const node = this.startNode();
    this.expect(tt._import);
    this.expect(tt.parenL);
    if (!this.match(tt.string)) {
      this.raise(TSErrors.UnsupportedImportTypeArgument, this.state.startLoc);
      {
        node.argument = super.parseExprAtom();
      }
    } else {
      {
        node.argument = this.parseStringLiteral(this.state.value);
      }
    }
    if (this.eat(tt.comma)) {
      node.options = this.tsParseImportTypeOptions();
    } else {
      node.options = null;
    }
    this.expect(tt.parenR);
    if (this.eat(tt.dot)) {
      node.qualifier = this.tsParseEntityName(
        1 | 2
        /* LEADING_THIS_AS_IDENTIFIER */
      );
    }
    if (this.match(tt.lt)) {
      {
        node.typeParameters = this.tsParseTypeArguments();
      }
    }
    return this.finishNode(node, "TSImportType");
  }
  tsParseImportTypeOptions() {
    const node = this.startNode();
    this.expect(tt.braceL);
    const withProperty = this.startNode();
    if (this.isContextual(tt._with)) {
      withProperty.method = false;
      withProperty.key = this.parseIdentifier(true);
      withProperty.computed = false;
      withProperty.shorthand = false;
    } else {
      this.unexpected(null, tt._with);
    }
    this.expect(tt.colon);
    withProperty.value = this.tsParseImportTypeWithPropertyValue();
    node.properties = [this.finishObjectProperty(withProperty)];
    this.eat(tt.comma);
    this.expect(tt.braceR);
    return this.finishNode(node, "ObjectExpression");
  }
  tsParseImportTypeWithPropertyValue() {
    const node = this.startNode();
    const properties = [];
    this.expect(tt.braceL);
    while (!this.match(tt.braceR)) {
      const type = this.state.type;
      if (tokenIsIdentifier(type) || type === tt.string) {
        properties.push(super.parsePropertyDefinition(null));
      } else {
        this.unexpected();
      }
      this.eat(tt.comma);
    }
    node.properties = properties;
    this.next();
    return this.finishNode(node, "ObjectExpression");
  }
  tsParseEntityName(flags) {
    let entity;
    if (flags & 1 && this.match(tt._this)) {
      if (flags & 2) {
        entity = this.parseIdentifier(true);
      } else {
        const node = this.startNode();
        this.next();
        entity = this.finishNode(node, "ThisExpression");
      }
    } else {
      entity = this.parseIdentifier(
        !!(flags & 1)
      );
    }
    while (this.eat(tt.dot)) {
      const node = this.startNodeAtNode(entity);
      node.left = entity;
      node.right = this.parseIdentifier(
        !!(flags & 1)
      );
      entity = this.finishNode(node, "TSQualifiedName");
    }
    return entity;
  }
  tsParseTypeReference() {
    const node = this.startNode();
    node.typeName = this.tsParseEntityName(
      1
      /* ALLOW_RESERVED_WORDS */
    );
    if (!this.hasPrecedingLineBreak() && this.match(tt.lt)) {
      {
        node.typeParameters = this.tsParseTypeArguments();
      }
    }
    return this.finishNode(node, "TSTypeReference");
  }
  tsParseThisTypePredicate(lhs) {
    this.next();
    const node = this.startNodeAtNode(lhs);
    node.parameterName = lhs;
    node.typeAnnotation = this.tsParseTypeAnnotation(
      /* eatColon */
      false
    );
    node.asserts = false;
    return this.finishNode(node, "TSTypePredicate");
  }
  tsParseThisTypeNode() {
    const node = this.startNode();
    this.next();
    return this.finishNode(node, "TSThisType");
  }
  tsParseTypeQuery() {
    const node = this.startNode();
    this.expect(tt._typeof);
    if (this.match(tt._import)) {
      node.exprName = this.tsParseImportType();
    } else {
      {
        node.exprName = this.tsParseEntityName(
          1 | 2
          /* LEADING_THIS_AS_IDENTIFIER */
        );
      }
    }
    if (!this.hasPrecedingLineBreak() && this.match(tt.lt)) {
      {
        node.typeParameters = this.tsParseTypeArguments();
      }
    }
    return this.finishNode(node, "TSTypeQuery");
  }
  tsParseInOutModifiers = this.tsParseModifiers.bind(this, {
    allowedModifiers: ["in", "out"],
    disallowedModifiers: [
      "const",
      "public",
      "private",
      "protected",
      "readonly",
      "declare",
      "abstract",
      "override"
    ],
    errorTemplate: TSErrors.InvalidModifierOnTypeParameter
  });
  tsParseConstModifier = this.tsParseModifiers.bind(this, {
    allowedModifiers: ["const"],
    // for better error recovery
    disallowedModifiers: ["in", "out"],
    errorTemplate: TSErrors.InvalidModifierOnTypeParameterPositions
  });
  tsParseInOutConstModifiers = this.tsParseModifiers.bind(this, {
    allowedModifiers: ["in", "out", "const"],
    disallowedModifiers: [
      "public",
      "private",
      "protected",
      "readonly",
      "declare",
      "abstract",
      "override"
    ],
    errorTemplate: TSErrors.InvalidModifierOnTypeParameter
  });
  tsParseTypeParameter(parseModifiers) {
    const node = this.startNode();
    parseModifiers(node);
    node.name = this.tsParseTypeParameterName();
    node.constraint = this.tsEatThenParseType(tt._extends);
    node.default = this.tsEatThenParseType(tt.eq);
    return this.finishNode(node, "TSTypeParameter");
  }
  tsTryParseTypeParameters(parseModifiers) {
    if (this.match(tt.lt)) {
      return this.tsParseTypeParameters(parseModifiers);
    }
  }
  tsParseTypeParameters(parseModifiers) {
    const node = this.startNode();
    if (this.match(tt.lt) || this.match(tt.jsxTagStart)) {
      this.next();
    } else {
      this.unexpected();
    }
    const refTrailingCommaPos = { value: -1 };
    node.params = this.tsParseBracketedList(
      "TypeParametersOrArguments",
      this.tsParseTypeParameter.bind(this, parseModifiers),
      /* bracket */
      false,
      /* skipFirstToken */
      true,
      refTrailingCommaPos
    );
    if (node.params.length === 0) {
      this.raise(TSErrors.EmptyTypeParameters, node);
    }
    if (refTrailingCommaPos.value !== -1) {
      this.addExtra(node, "trailingComma", refTrailingCommaPos.value);
    }
    return this.finishNode(node, "TSTypeParameterDeclaration");
  }
  // Note: In TypeScript implementation we must provide `yieldContext` and `awaitContext`,
  // but here it's always false, because this is only used for types.
  tsFillSignature(returnToken, signature) {
    const returnTokenRequired = returnToken === tt.arrow;
    const paramsKey = "parameters";
    const returnTypeKey = "typeAnnotation";
    signature.typeParameters = this.tsTryParseTypeParameters(
      this.tsParseConstModifier
    );
    this.expect(tt.parenL);
    signature[paramsKey] = this.tsParseBindingListForSignature();
    if (returnTokenRequired) {
      signature[returnTypeKey] = this.tsParseTypeOrTypePredicateAnnotation(returnToken);
    } else if (this.match(returnToken)) {
      signature[returnTypeKey] = this.tsParseTypeOrTypePredicateAnnotation(returnToken);
    }
  }
  tsParseBindingListForSignature() {
    const list = super.parseBindingList(
      tt.parenR,
      charCodes$1.rightParenthesis,
      2
      /* IS_FUNCTION_PARAMS */
    );
    for (const pattern of list) {
      const { type } = pattern;
      if (type === "AssignmentPattern" || type === "TSParameterProperty") {
        this.raise(TSErrors.UnsupportedSignatureParameterKind, pattern, {
          type
        });
      }
    }
    return list;
  }
  tsParseTypeMemberSemicolon() {
    if (!this.eat(tt.comma) && !this.isLineTerminator()) {
      this.expect(tt.semi);
    }
  }
  tsParseSignatureMember(kind, node) {
    this.tsFillSignature(tt.colon, node);
    this.tsParseTypeMemberSemicolon();
    return this.finishNode(node, kind);
  }
  tsIsUnambiguouslyIndexSignature() {
    this.next();
    if (tokenIsIdentifier(this.state.type)) {
      this.next();
      return this.match(tt.colon);
    }
    return false;
  }
  tsTryParseIndexSignature(node) {
    if (!(this.match(tt.bracketL) && this.tsLookAhead(this.tsIsUnambiguouslyIndexSignature.bind(this)))) {
      return;
    }
    this.expect(tt.bracketL);
    const id = this.parseIdentifier();
    id.typeAnnotation = this.tsParseTypeAnnotation();
    this.resetEndLocation(id);
    this.expect(tt.bracketR);
    node.parameters = [id];
    const type = this.tsTryParseTypeAnnotation();
    if (type) node.typeAnnotation = type;
    this.tsParseTypeMemberSemicolon();
    return this.finishNode(node, "TSIndexSignature");
  }
  tsParsePropertyOrMethodSignature(node, readonly) {
    if (this.eat(tt.question)) node.optional = true;
    if (this.match(tt.parenL) || this.match(tt.lt)) {
      if (readonly) {
        this.raise(TSErrors.ReadonlyForMethodSignature, node);
      }
      const method = node;
      if (method.kind && this.match(tt.lt)) {
        this.raise(
          TSErrors.AccessorCannotHaveTypeParameters,
          this.state.curPosition()
        );
      }
      this.tsFillSignature(tt.colon, method);
      this.tsParseTypeMemberSemicolon();
      const paramsKey = "parameters";
      const returnTypeKey = "typeAnnotation";
      if (method.kind === "get") {
        if (method[paramsKey].length > 0) {
          this.raise(Errors.BadGetterArity, this.state.curPosition());
          if (this.isThisParam(method[paramsKey][0])) {
            this.raise(
              TSErrors.AccessorCannotDeclareThisParameter,
              this.state.curPosition()
            );
          }
        }
      } else if (method.kind === "set") {
        if (method[paramsKey].length !== 1) {
          this.raise(Errors.BadSetterArity, this.state.curPosition());
        } else {
          const firstParameter = method[paramsKey][0];
          if (this.isThisParam(firstParameter)) {
            this.raise(
              TSErrors.AccessorCannotDeclareThisParameter,
              this.state.curPosition()
            );
          }
          if (firstParameter.type === "Identifier" && firstParameter.optional) {
            this.raise(
              TSErrors.SetAccessorCannotHaveOptionalParameter,
              this.state.curPosition()
            );
          }
          if (firstParameter.type === "RestElement") {
            this.raise(
              TSErrors.SetAccessorCannotHaveRestParameter,
              this.state.curPosition()
            );
          }
        }
        if (method[returnTypeKey]) {
          this.raise(
            TSErrors.SetAccessorCannotHaveReturnType,
            method[returnTypeKey]
          );
        }
      } else {
        method.kind = "method";
      }
      return this.finishNode(method, "TSMethodSignature");
    } else {
      const property = node;
      if (readonly) property.readonly = true;
      const type = this.tsTryParseTypeAnnotation();
      if (type) property.typeAnnotation = type;
      this.tsParseTypeMemberSemicolon();
      return this.finishNode(property, "TSPropertySignature");
    }
  }
  tsParseTypeMember() {
    const node = this.startNode();
    if (this.match(tt.parenL) || this.match(tt.lt)) {
      return this.tsParseSignatureMember("TSCallSignatureDeclaration", node);
    }
    if (this.match(tt._new)) {
      const id = this.startNode();
      this.next();
      if (this.match(tt.parenL) || this.match(tt.lt)) {
        return this.tsParseSignatureMember(
          "TSConstructSignatureDeclaration",
          node
        );
      } else {
        node.key = this.createIdentifier(id, "new");
        return this.tsParsePropertyOrMethodSignature(node, false);
      }
    }
    this.tsParseModifiers(
      {
        allowedModifiers: ["readonly"],
        disallowedModifiers: [
          "declare",
          "abstract",
          "private",
          "protected",
          "public",
          "static",
          "override"
        ]
      },
      node
    );
    const idx = this.tsTryParseIndexSignature(node);
    if (idx) {
      return idx;
    }
    super.parsePropertyName(node);
    if (!node.computed && node.key.type === "Identifier" && (node.key.name === "get" || node.key.name === "set") && this.tsTokenCanFollowModifier()) {
      node.kind = node.key.name;
      super.parsePropertyName(node);
      if (!this.match(tt.parenL) && !this.match(tt.lt)) {
        this.unexpected(null, tt.parenL);
      }
    }
    return this.tsParsePropertyOrMethodSignature(node, !!node.readonly);
  }
  tsParseTypeLiteral() {
    const node = this.startNode();
    node.members = this.tsParseObjectTypeMembers();
    return this.finishNode(node, "TSTypeLiteral");
  }
  tsParseObjectTypeMembers() {
    this.expect(tt.braceL);
    const members = this.tsParseList(
      "TypeMembers",
      this.tsParseTypeMember.bind(this)
    );
    this.expect(tt.braceR);
    return members;
  }
  tsIsStartOfMappedType() {
    this.next();
    if (this.eat(tt.plusMin)) {
      return this.isContextual(tt._readonly);
    }
    if (this.isContextual(tt._readonly)) {
      this.next();
    }
    if (!this.match(tt.bracketL)) {
      return false;
    }
    this.next();
    if (!this.tsIsIdentifier()) {
      return false;
    }
    this.next();
    return this.match(tt._in);
  }
  tsParseMappedType() {
    const node = this.startNode();
    this.expect(tt.braceL);
    if (this.match(tt.plusMin)) {
      node.readonly = this.state.value;
      this.next();
      this.expectContextual(tt._readonly);
    } else if (this.eatContextual(tt._readonly)) {
      node.readonly = true;
    }
    this.expect(tt.bracketL);
    {
      const typeParameter = this.startNode();
      typeParameter.name = this.tsParseTypeParameterName();
      typeParameter.constraint = this.tsExpectThenParseType(tt._in);
      node.typeParameter = this.finishNode(typeParameter, "TSTypeParameter");
    }
    node.nameType = this.eatContextual(tt._as) ? this.tsParseType() : null;
    this.expect(tt.bracketR);
    if (this.match(tt.plusMin)) {
      node.optional = this.state.value;
      this.next();
      this.expect(tt.question);
    } else if (this.eat(tt.question)) {
      node.optional = true;
    }
    node.typeAnnotation = this.tsTryParseType();
    this.semicolon();
    this.expect(tt.braceR);
    return this.finishNode(node, "TSMappedType");
  }
  tsParseTupleType() {
    const node = this.startNode();
    node.elementTypes = this.tsParseBracketedList(
      "TupleElementTypes",
      this.tsParseTupleElementType.bind(this),
      /* bracket */
      true,
      /* skipFirstToken */
      false
    );
    let seenOptionalElement = false;
    node.elementTypes.forEach((elementNode) => {
      const { type } = elementNode;
      if (seenOptionalElement && type !== "TSRestType" && type !== "TSOptionalType" && !(type === "TSNamedTupleMember" && elementNode.optional)) {
        this.raise(TSErrors.OptionalTypeBeforeRequired, elementNode);
      }
      seenOptionalElement ||= type === "TSNamedTupleMember" && elementNode.optional || type === "TSOptionalType";
    });
    return this.finishNode(node, "TSTupleType");
  }
  tsParseTupleElementType() {
    const restStartLoc = this.state.startLoc;
    const rest = this.eat(tt.ellipsis);
    const { startLoc } = this.state;
    let labeled;
    let label;
    let optional;
    let type;
    const isWord = tokenIsKeywordOrIdentifier(this.state.type);
    const chAfterWord = isWord ? this.lookaheadCharCode() : null;
    if (chAfterWord === charCodes$1.colon) {
      labeled = true;
      optional = false;
      label = this.parseIdentifier(true);
      this.expect(tt.colon);
      type = this.tsParseType();
    } else if (chAfterWord === charCodes$1.questionMark) {
      optional = true;
      const wordName = this.state.value;
      const typeOrLabel = this.tsParseNonArrayType();
      if (this.lookaheadCharCode() === charCodes$1.colon) {
        labeled = true;
        label = this.createIdentifier(
          this.startNodeAt(startLoc),
          wordName
        );
        this.expect(tt.question);
        this.expect(tt.colon);
        type = this.tsParseType();
      } else {
        labeled = false;
        type = typeOrLabel;
        this.expect(tt.question);
      }
    } else {
      type = this.tsParseType();
      optional = this.eat(tt.question);
      labeled = this.eat(tt.colon);
    }
    if (labeled) {
      let labeledNode;
      if (label) {
        labeledNode = this.startNodeAt(startLoc);
        labeledNode.optional = optional;
        labeledNode.label = label;
        labeledNode.elementType = type;
        if (this.eat(tt.question)) {
          labeledNode.optional = true;
          this.raise(
            TSErrors.TupleOptionalAfterType,
            this.state.lastTokStartLoc
          );
        }
      } else {
        labeledNode = this.startNodeAt(startLoc);
        labeledNode.optional = optional;
        this.raise(TSErrors.InvalidTupleMemberLabel, type);
        labeledNode.label = type;
        labeledNode.elementType = this.tsParseType();
      }
      type = this.finishNode(labeledNode, "TSNamedTupleMember");
    } else if (optional) {
      const optionalTypeNode = this.startNodeAt(startLoc);
      optionalTypeNode.typeAnnotation = type;
      type = this.finishNode(optionalTypeNode, "TSOptionalType");
    }
    if (rest) {
      const restNode = this.startNodeAt(restStartLoc);
      restNode.typeAnnotation = type;
      type = this.finishNode(restNode, "TSRestType");
    }
    return type;
  }
  tsParseParenthesizedType() {
    const node = this.startNode();
    this.expect(tt.parenL);
    node.typeAnnotation = this.tsParseType();
    this.expect(tt.parenR);
    return this.finishNode(node, "TSParenthesizedType");
  }
  tsParseFunctionOrConstructorType(type, abstract) {
    const node = this.startNode();
    if (type === "TSConstructorType") {
      node.abstract = !!abstract;
      if (abstract) this.next();
      this.next();
    }
    this.tsInAllowConditionalTypesContext(
      () => this.tsFillSignature(tt.arrow, node)
    );
    return this.finishNode(node, type);
  }
  tsParseLiteralTypeNode() {
    const node = this.startNode();
    switch (this.state.type) {
      case tt.num:
      case tt.bigint:
      case tt.string:
      case tt._true:
      case tt._false:
        node.literal = super.parseExprAtom();
        break;
      default:
        this.unexpected();
    }
    return this.finishNode(node, "TSLiteralType");
  }
  tsParseTemplateLiteralType() {
    {
      const node = this.startNode();
      node.literal = super.parseTemplate(false);
      return this.finishNode(node, "TSLiteralType");
    }
  }
  parseTemplateSubstitution() {
    if (this.state.inType) return this.tsParseType();
    return super.parseTemplateSubstitution();
  }
  tsParseThisTypeOrThisTypePredicate() {
    const thisKeyword = this.tsParseThisTypeNode();
    if (this.isContextual(tt._is) && !this.hasPrecedingLineBreak()) {
      return this.tsParseThisTypePredicate(thisKeyword);
    } else {
      return thisKeyword;
    }
  }
  tsParseNonArrayType() {
    switch (this.state.type) {
      case tt.string:
      case tt.num:
      case tt.bigint:
      case tt._true:
      case tt._false:
        return this.tsParseLiteralTypeNode();
      case tt.plusMin:
        if (this.state.value === "-") {
          const node = this.startNode();
          const nextToken = this.lookahead();
          if (nextToken.type !== tt.num && nextToken.type !== tt.bigint) {
            this.unexpected();
          }
          node.literal = this.parseMaybeUnary();
          return this.finishNode(node, "TSLiteralType");
        }
        break;
      case tt._this:
        return this.tsParseThisTypeOrThisTypePredicate();
      case tt._typeof:
        return this.tsParseTypeQuery();
      case tt._import:
        return this.tsParseImportType();
      case tt.braceL:
        return this.tsLookAhead(this.tsIsStartOfMappedType.bind(this)) ? this.tsParseMappedType() : this.tsParseTypeLiteral();
      case tt.bracketL:
        return this.tsParseTupleType();
      case tt.parenL:
        return this.tsParseParenthesizedType();
      case tt.templateNonTail:
      case tt.templateTail:
        return this.tsParseTemplateLiteralType();
      default: {
        const { type } = this.state;
        if (tokenIsIdentifier(type) || type === tt._void || type === tt._null) {
          const nodeType = type === tt._void ? "TSVoidKeyword" : type === tt._null ? "TSNullKeyword" : keywordTypeFromName(this.state.value);
          if (nodeType !== void 0 && this.lookaheadCharCode() !== charCodes$1.dot) {
            const node = this.startNode();
            this.next();
            return this.finishNode(node, nodeType);
          }
          return this.tsParseTypeReference();
        }
      }
    }
    throw this.unexpected();
  }
  tsParseArrayTypeOrHigher() {
    const { startLoc } = this.state;
    let type = this.tsParseNonArrayType();
    while (!this.hasPrecedingLineBreak() && this.eat(tt.bracketL)) {
      if (this.match(tt.bracketR)) {
        const node = this.startNodeAt(startLoc);
        node.elementType = type;
        this.expect(tt.bracketR);
        type = this.finishNode(node, "TSArrayType");
      } else {
        const node = this.startNodeAt(startLoc);
        node.objectType = type;
        node.indexType = this.tsParseType();
        this.expect(tt.bracketR);
        type = this.finishNode(node, "TSIndexedAccessType");
      }
    }
    return type;
  }
  tsParseTypeOperator() {
    const node = this.startNode();
    const operator = this.state.value;
    this.next();
    node.operator = operator;
    node.typeAnnotation = this.tsParseTypeOperatorOrHigher();
    if (operator === "readonly") {
      this.tsCheckTypeAnnotationForReadOnly(node);
    }
    return this.finishNode(node, "TSTypeOperator");
  }
  tsCheckTypeAnnotationForReadOnly(node) {
    switch (node.typeAnnotation.type) {
      case "TSTupleType":
      case "TSArrayType":
        return;
      default:
        this.raise(TSErrors.UnexpectedReadonly, node);
    }
  }
  tsParseInferType() {
    const node = this.startNode();
    this.expectContextual(tt._infer);
    const typeParameter = this.startNode();
    typeParameter.name = this.tsParseTypeParameterName();
    typeParameter.constraint = this.tsTryParse(
      () => this.tsParseConstraintForInferType()
    );
    node.typeParameter = this.finishNode(typeParameter, "TSTypeParameter");
    return this.finishNode(node, "TSInferType");
  }
  tsParseConstraintForInferType() {
    if (this.eat(tt._extends)) {
      const constraint = this.tsInDisallowConditionalTypesContext(
        () => this.tsParseType()
      );
      if (this.state.inDisallowConditionalTypesContext || !this.match(tt.question)) {
        return constraint;
      }
    }
  }
  tsParseTypeOperatorOrHigher() {
    const isTypeOperator = tokenIsTSTypeOperator(this.state.type) && !this.state.containsEsc;
    return isTypeOperator ? this.tsParseTypeOperator() : this.isContextual(tt._infer) ? this.tsParseInferType() : this.tsInAllowConditionalTypesContext(
      () => this.tsParseArrayTypeOrHigher()
    );
  }
  tsParseUnionOrIntersectionType(kind, parseConstituentType, operator) {
    const node = this.startNode();
    const hasLeadingOperator = this.eat(operator);
    const types2 = [];
    do {
      types2.push(parseConstituentType());
    } while (this.eat(operator));
    if (types2.length === 1 && !hasLeadingOperator) {
      return types2[0];
    }
    node.types = types2;
    return this.finishNode(node, kind);
  }
  tsParseIntersectionTypeOrHigher() {
    return this.tsParseUnionOrIntersectionType(
      "TSIntersectionType",
      this.tsParseTypeOperatorOrHigher.bind(this),
      tt.bitwiseAND
    );
  }
  tsParseUnionTypeOrHigher() {
    return this.tsParseUnionOrIntersectionType(
      "TSUnionType",
      this.tsParseIntersectionTypeOrHigher.bind(this),
      tt.bitwiseOR
    );
  }
  tsIsStartOfFunctionType() {
    if (this.match(tt.lt)) {
      return true;
    }
    return this.match(tt.parenL) && this.tsLookAhead(this.tsIsUnambiguouslyStartOfFunctionType.bind(this));
  }
  tsSkipParameterStart() {
    if (tokenIsIdentifier(this.state.type) || this.match(tt._this)) {
      this.next();
      return true;
    }
    if (this.match(tt.braceL)) {
      const { errors } = this.state;
      const previousErrorCount = errors.length;
      try {
        this.parseObjectLike(tt.braceR, true);
        return errors.length === previousErrorCount;
      } catch {
        return false;
      }
    }
    if (this.match(tt.bracketL)) {
      this.next();
      const { errors } = this.state;
      const previousErrorCount = errors.length;
      try {
        super.parseBindingList(
          tt.bracketR,
          charCodes$1.rightSquareBracket,
          1
          /* ALLOW_EMPTY */
        );
        return errors.length === previousErrorCount;
      } catch {
        return false;
      }
    }
    return false;
  }
  tsIsUnambiguouslyStartOfFunctionType() {
    this.next();
    if (this.match(tt.parenR) || this.match(tt.ellipsis)) {
      return true;
    }
    if (this.tsSkipParameterStart()) {
      if (this.match(tt.colon) || this.match(tt.comma) || this.match(tt.question) || this.match(tt.eq)) {
        return true;
      }
      if (this.match(tt.parenR)) {
        this.next();
        if (this.match(tt.arrow)) {
          return true;
        }
      }
    }
    return false;
  }
  tsParseTypeOrTypePredicateAnnotation(returnToken) {
    return this.tsInType(() => {
      const t = this.startNode();
      this.expect(returnToken);
      const node = this.startNode();
      const asserts = !!this.tsTryParse(
        this.tsParseTypePredicateAsserts.bind(this)
      );
      if (asserts && this.match(tt._this)) {
        let thisTypePredicate = this.tsParseThisTypeOrThisTypePredicate();
        if (thisTypePredicate.type === "TSThisType") {
          node.parameterName = thisTypePredicate;
          node.asserts = true;
          node.typeAnnotation = null;
          thisTypePredicate = this.finishNode(node, "TSTypePredicate");
        } else {
          this.resetStartLocationFromNode(thisTypePredicate, node);
          thisTypePredicate.asserts = true;
        }
        t.typeAnnotation = thisTypePredicate;
        return this.finishNode(t, "TSTypeAnnotation");
      }
      const typePredicateVariable = this.tsIsIdentifier() && this.tsTryParse(this.tsParseTypePredicatePrefix.bind(this));
      if (!typePredicateVariable) {
        if (!asserts) {
          return this.tsParseTypeAnnotation(
            /* eatColon */
            false,
            t
          );
        }
        node.parameterName = this.parseIdentifier();
        node.asserts = asserts;
        node.typeAnnotation = null;
        t.typeAnnotation = this.finishNode(node, "TSTypePredicate");
        return this.finishNode(t, "TSTypeAnnotation");
      }
      const type = this.tsParseTypeAnnotation(
        /* eatColon */
        false
      );
      node.parameterName = typePredicateVariable;
      node.typeAnnotation = type;
      node.asserts = asserts;
      t.typeAnnotation = this.finishNode(node, "TSTypePredicate");
      return this.finishNode(t, "TSTypeAnnotation");
    });
  }
  tsTryParseTypeOrTypePredicateAnnotation() {
    if (this.match(tt.colon)) {
      return this.tsParseTypeOrTypePredicateAnnotation(tt.colon);
    }
  }
  tsTryParseTypeAnnotation() {
    if (this.match(tt.colon)) {
      return this.tsParseTypeAnnotation();
    }
  }
  tsTryParseType() {
    return this.tsEatThenParseType(tt.colon);
  }
  tsParseTypePredicatePrefix() {
    const id = this.parseIdentifier();
    if (this.isContextual(tt._is) && !this.hasPrecedingLineBreak()) {
      this.next();
      return id;
    }
  }
  tsParseTypePredicateAsserts() {
    if (this.state.type !== tt._asserts) {
      return false;
    }
    const containsEsc = this.state.containsEsc;
    this.next();
    if (!tokenIsIdentifier(this.state.type) && !this.match(tt._this)) {
      return false;
    }
    if (containsEsc) {
      this.raise(
        Errors.InvalidEscapedReservedWord,
        this.state.lastTokStartLoc,
        {
          reservedWord: "asserts"
        }
      );
    }
    return true;
  }
  tsParseTypeAnnotation(eatColon = true, t = this.startNode()) {
    this.tsInType(() => {
      if (eatColon) this.expect(tt.colon);
      t.typeAnnotation = this.tsParseType();
    });
    return this.finishNode(t, "TSTypeAnnotation");
  }
  /** Be sure to be in a type context before calling this, using `tsInType`. */
  tsParseType() {
    assert(this.state.inType);
    const type = this.tsParseNonConditionalType();
    if (this.state.inDisallowConditionalTypesContext || this.hasPrecedingLineBreak() || !this.eat(tt._extends)) {
      return type;
    }
    const node = this.startNodeAtNode(type);
    node.checkType = type;
    node.extendsType = this.tsInDisallowConditionalTypesContext(
      () => this.tsParseNonConditionalType()
    );
    this.expect(tt.question);
    node.trueType = this.tsInAllowConditionalTypesContext(
      () => this.tsParseType()
    );
    this.expect(tt.colon);
    node.falseType = this.tsInAllowConditionalTypesContext(
      () => this.tsParseType()
    );
    return this.finishNode(node, "TSConditionalType");
  }
  isAbstractConstructorSignature() {
    return this.isContextual(tt._abstract) && this.isLookaheadContextual("new");
  }
  tsParseNonConditionalType() {
    if (this.tsIsStartOfFunctionType()) {
      return this.tsParseFunctionOrConstructorType("TSFunctionType");
    }
    if (this.match(tt._new)) {
      return this.tsParseFunctionOrConstructorType("TSConstructorType");
    } else if (this.isAbstractConstructorSignature()) {
      return this.tsParseFunctionOrConstructorType(
        "TSConstructorType",
        /* abstract */
        true
      );
    }
    return this.tsParseUnionTypeOrHigher();
  }
  tsParseTypeAssertion() {
    if (this.getPluginOption("typescript", "disallowAmbiguousJSXLike")) {
      this.raise(TSErrors.ReservedTypeAssertion, this.state.startLoc);
    }
    const node = this.startNode();
    node.typeAnnotation = this.tsInType(() => {
      this.next();
      return this.match(tt._const) ? this.tsParseTypeReference() : this.tsParseType();
    });
    this.expect(tt.gt);
    node.expression = this.parseMaybeUnary();
    return this.finishNode(node, "TSTypeAssertion");
  }
  tsParseHeritageClause(token) {
    const originalStartLoc = this.state.startLoc;
    const delimitedList = this.tsParseDelimitedList(
      "HeritageClauseElement",
      () => {
        {
          const node = this.startNode();
          node.expression = this.tsParseEntityName(
            1 | 2
            /* LEADING_THIS_AS_IDENTIFIER */
          );
          if (this.match(tt.lt)) {
            node.typeParameters = this.tsParseTypeArguments();
          }
          return this.finishNode(
            node,
            // @ts-expect-error Babel 7 vs Babel 8
            "TSExpressionWithTypeArguments"
          );
        }
      }
    );
    if (!delimitedList.length) {
      this.raise(TSErrors.EmptyHeritageClauseType, originalStartLoc, {
        token
      });
    }
    return delimitedList;
  }
  tsParseInterfaceDeclaration(node, properties = {}) {
    if (this.hasFollowingLineBreak()) return null;
    this.expectContextual(tt._interface);
    if (properties.declare) node.declare = true;
    if (tokenIsIdentifier(this.state.type)) {
      node.id = this.parseIdentifier();
      this.checkIdentifier(
        node.id,
        130
        /* TYPE_TS_INTERFACE */
      );
    } else {
      node.id = null;
      this.raise(TSErrors.MissingInterfaceName, this.state.startLoc);
    }
    node.typeParameters = this.tsTryParseTypeParameters(
      this.tsParseInOutConstModifiers
    );
    if (this.eat(tt._extends)) {
      node.extends = this.tsParseHeritageClause("extends");
    }
    const body = this.startNode();
    body.body = this.tsInType(this.tsParseObjectTypeMembers.bind(this));
    node.body = this.finishNode(body, "TSInterfaceBody");
    return this.finishNode(node, "TSInterfaceDeclaration");
  }
  tsParseTypeAliasDeclaration(node) {
    node.id = this.parseIdentifier();
    this.checkIdentifier(
      node.id,
      2
      /* TYPE_TS_TYPE */
    );
    node.typeAnnotation = this.tsInType(() => {
      node.typeParameters = this.tsTryParseTypeParameters(
        this.tsParseInOutModifiers
      );
      this.expect(tt.eq);
      if (this.isContextual(tt._intrinsic) && this.lookaheadCharCode() !== charCodes$1.dot) {
        const node2 = this.startNode();
        this.next();
        return this.finishNode(node2, "TSIntrinsicKeyword");
      }
      return this.tsParseType();
    });
    this.semicolon();
    return this.finishNode(node, "TSTypeAliasDeclaration");
  }
  // Parse in top level normal context if we are in a JSX context
  tsInTopLevelContext(cb) {
    if (this.curContext() !== types.brace) {
      const oldContext = this.state.context;
      this.state.context = [oldContext[0]];
      try {
        return cb();
      } finally {
        this.state.context = oldContext;
      }
    } else {
      return cb();
    }
  }
  /**
   * Runs `cb` in a type context.
   * This should be called one token *before* the first type token,
   * so that the call to `next()` is run in type context.
   */
  tsInType(cb) {
    const oldInType = this.state.inType;
    this.state.inType = true;
    try {
      return cb();
    } finally {
      this.state.inType = oldInType;
    }
  }
  tsInDisallowConditionalTypesContext(cb) {
    const oldInDisallowConditionalTypesContext = this.state.inDisallowConditionalTypesContext;
    this.state.inDisallowConditionalTypesContext = true;
    try {
      return cb();
    } finally {
      this.state.inDisallowConditionalTypesContext = oldInDisallowConditionalTypesContext;
    }
  }
  tsInAllowConditionalTypesContext(cb) {
    const oldInDisallowConditionalTypesContext = this.state.inDisallowConditionalTypesContext;
    this.state.inDisallowConditionalTypesContext = false;
    try {
      return cb();
    } finally {
      this.state.inDisallowConditionalTypesContext = oldInDisallowConditionalTypesContext;
    }
  }
  tsEatThenParseType(token) {
    if (this.match(token)) {
      return this.tsNextThenParseType();
    }
  }
  tsExpectThenParseType(token) {
    return this.tsInType(() => {
      this.expect(token);
      return this.tsParseType();
    });
  }
  tsNextThenParseType() {
    return this.tsInType(() => {
      this.next();
      return this.tsParseType();
    });
  }
  tsParseEnumMember() {
    const node = this.startNode();
    node.id = this.match(tt.string) ? super.parseStringLiteral(this.state.value) : this.parseIdentifier(
      /* liberal */
      true
    );
    if (this.eat(tt.eq)) {
      node.initializer = super.parseMaybeAssignAllowIn();
    }
    return this.finishNode(node, "TSEnumMember");
  }
  tsParseEnumDeclaration(node, properties = {}) {
    if (properties.const) node.const = true;
    if (properties.declare) node.declare = true;
    this.expectContextual(tt._enum);
    node.id = this.parseIdentifier();
    this.checkIdentifier(
      node.id,
      node.const ? 8971 : 8459
      /* TYPE_TS_ENUM */
    );
    {
      this.expect(tt.braceL);
      node.members = this.tsParseDelimitedList(
        "EnumMembers",
        this.tsParseEnumMember.bind(this)
      );
      this.expect(tt.braceR);
    }
    return this.finishNode(node, "TSEnumDeclaration");
  }
  tsParseEnumBody() {
    const node = this.startNode();
    this.expect(tt.braceL);
    node.members = this.tsParseDelimitedList(
      "EnumMembers",
      this.tsParseEnumMember.bind(this)
    );
    this.expect(tt.braceR);
    return this.finishNode(node, "TSEnumBody");
  }
  tsParseModuleBlock() {
    const node = this.startNode();
    this.scope.enter(
      0
      /* OTHER */
    );
    this.expect(tt.braceL);
    super.parseBlockOrModuleBlockBody(
      node.body = [],
      /* directives */
      void 0,
      /* topLevel */
      true,
      /* end */
      tt.braceR
    );
    this.scope.exit();
    return this.finishNode(node, "TSModuleBlock");
  }
  tsParseModuleOrNamespaceDeclaration(node, nested = false) {
    node.id = this.parseIdentifier();
    if (!nested) {
      this.checkIdentifier(
        node.id,
        1024
        /* TYPE_TS_NAMESPACE */
      );
    }
    if (this.eat(tt.dot)) {
      const inner = this.startNode();
      this.tsParseModuleOrNamespaceDeclaration(inner, true);
      node.body = inner;
    } else {
      this.scope.enter(
        1024
        /* TS_MODULE */
      );
      this.prodParam.enter(
        0
        /* PARAM */
      );
      node.body = this.tsParseModuleBlock();
      this.prodParam.exit();
      this.scope.exit();
    }
    return this.finishNode(node, "TSModuleDeclaration");
  }
  tsParseAmbientExternalModuleDeclaration(node) {
    if (this.isContextual(tt._global)) {
      node.kind = "global";
      {
        node.global = true;
      }
      node.id = this.parseIdentifier();
    } else if (this.match(tt.string)) {
      node.kind = "module";
      node.id = super.parseStringLiteral(this.state.value);
    } else {
      this.unexpected();
    }
    if (this.match(tt.braceL)) {
      this.scope.enter(
        1024
        /* TS_MODULE */
      );
      this.prodParam.enter(
        0
        /* PARAM */
      );
      node.body = this.tsParseModuleBlock();
      this.prodParam.exit();
      this.scope.exit();
    } else {
      this.semicolon();
    }
    return this.finishNode(node, "TSModuleDeclaration");
  }
  tsParseImportEqualsDeclaration(node, maybeDefaultIdentifier, isExport) {
    {
      node.isExport = isExport || false;
    }
    node.id = maybeDefaultIdentifier || this.parseIdentifier();
    this.checkIdentifier(
      node.id,
      4096
      /* TYPE_TS_VALUE_IMPORT */
    );
    this.expect(tt.eq);
    const moduleReference = this.tsParseModuleReference();
    if (node.importKind === "type" && moduleReference.type !== "TSExternalModuleReference") {
      this.raise(TSErrors.ImportAliasHasImportType, moduleReference);
    }
    node.moduleReference = moduleReference;
    this.semicolon();
    return this.finishNode(node, "TSImportEqualsDeclaration");
  }
  tsIsExternalModuleReference() {
    return this.isContextual(tt._require) && this.lookaheadCharCode() === charCodes$1.leftParenthesis;
  }
  tsParseModuleReference() {
    return this.tsIsExternalModuleReference() ? this.tsParseExternalModuleReference() : this.tsParseEntityName(
      0
      /* NONE */
    );
  }
  tsParseExternalModuleReference() {
    const node = this.startNode();
    this.expectContextual(tt._require);
    this.expect(tt.parenL);
    if (!this.match(tt.string)) {
      this.unexpected();
    }
    node.expression = super.parseExprAtom();
    this.expect(tt.parenR);
    this.sawUnambiguousESM = true;
    return this.finishNode(node, "TSExternalModuleReference");
  }
  // Utilities
  tsLookAhead(f) {
    const state = this.state.clone();
    const res = f();
    this.state = state;
    return res;
  }
  tsTryParseAndCatch(f) {
    const result = this.tryParse(
      (abort) => (
        // @ts-expect-error todo(flow->ts)
        f() || abort()
      )
    );
    if (result.aborted || !result.node) return;
    if (result.error) this.state = result.failState;
    return result.node;
  }
  tsTryParse(f) {
    const state = this.state.clone();
    const result = f();
    if (result !== void 0 && result !== false) {
      return result;
    }
    this.state = state;
  }
  tsTryParseDeclare(node) {
    if (this.isLineTerminator()) {
      return;
    }
    const startType = this.state.type;
    return this.tsInAmbientContext(() => {
      switch (startType) {
        case tt._function:
          node.declare = true;
          return super.parseFunctionStatement(
            node,
            /* async */
            false,
            /* isHangingDeclaration */
            false
          );
        case tt._class:
          node.declare = true;
          return this.parseClass(
            node,
            /* isStatement */
            true,
            /* optionalId */
            false
          );
        case tt._enum:
          return this.tsParseEnumDeclaration(node, { declare: true });
        case tt._global:
          return this.tsParseAmbientExternalModuleDeclaration(node);
        case tt._let:
          if (this.state.containsEsc) {
            return;
          }
        // fallthrough
        case tt._const:
        case tt._var:
          if (!this.match(tt._const) || !this.isLookaheadContextual("enum")) {
            node.declare = true;
            return this.parseVarStatement(node, this.state.value, true);
          }
          this.expect(tt._const);
          return this.tsParseEnumDeclaration(node, {
            const: true,
            declare: true
          });
        case tt._using:
          if (this.isUsing()) {
            this.raise(
              TSErrors.InvalidModifierOnUsingDeclaration,
              this.state.startLoc,
              "declare"
            );
            node.declare = true;
            return this.parseVarStatement(node, "using", true);
          }
          break;
        case tt._await:
          if (this.isAwaitUsing()) {
            this.raise(
              TSErrors.InvalidModifierOnAwaitUsingDeclaration,
              this.state.startLoc,
              "declare"
            );
            node.declare = true;
            this.next();
            return this.parseVarStatement(node, "await using", true);
          }
          break;
        case tt._interface: {
          const result = this.tsParseInterfaceDeclaration(node, {
            declare: true
          });
          if (result) return result;
        }
        // fallthrough
        default:
          if (tokenIsIdentifier(startType)) {
            return this.tsParseDeclaration(
              node,
              this.state.type,
              /* next */
              true,
              /* decorators */
              null
            );
          }
      }
    });
  }
  // Note: this won't be called unless the keyword is allowed in `shouldParseExportDeclaration`.
  tsTryParseExportDeclaration() {
    return this.tsParseDeclaration(
      this.startNode(),
      this.state.type,
      /* next */
      true,
      /* decorators */
      null
    );
  }
  // Common to tsTryParseDeclare and tsTryParseExportDeclaration.
  tsParseDeclaration(node, type, next, decorators) {
    switch (type) {
      case tt._abstract:
        if (this.tsCheckLineTerminator(next) && (this.match(tt._class) || tokenIsIdentifier(this.state.type))) {
          return this.tsParseAbstractDeclaration(node, decorators);
        }
        break;
      case tt._module:
        if (this.tsCheckLineTerminator(next)) {
          if (this.match(tt.string)) {
            return this.tsParseAmbientExternalModuleDeclaration(node);
          } else if (tokenIsIdentifier(this.state.type)) {
            node.kind = "module";
            return this.tsParseModuleOrNamespaceDeclaration(node);
          }
        }
        break;
      case tt._namespace:
        if (this.tsCheckLineTerminator(next) && tokenIsIdentifier(this.state.type)) {
          node.kind = "namespace";
          return this.tsParseModuleOrNamespaceDeclaration(node);
        }
        break;
      case tt._type:
        if (this.tsCheckLineTerminator(next) && tokenIsIdentifier(this.state.type)) {
          return this.tsParseTypeAliasDeclaration(node);
        }
        break;
    }
  }
  tsCheckLineTerminator(next) {
    if (next) {
      if (this.hasFollowingLineBreak()) return false;
      this.next();
      return true;
    }
    return !this.isLineTerminator();
  }
  tsTryParseGenericAsyncArrowFunction(startLoc) {
    if (!this.match(tt.lt)) return;
    const oldMaybeInArrowParameters = this.state.maybeInArrowParameters;
    this.state.maybeInArrowParameters = true;
    const res = this.tsTryParseAndCatch(() => {
      const node = this.startNodeAt(startLoc);
      node.typeParameters = this.tsParseTypeParameters(
        this.tsParseConstModifier
      );
      super.parseFunctionParams(node);
      node.returnType = this.tsTryParseTypeOrTypePredicateAnnotation();
      this.expect(tt.arrow);
      return node;
    });
    this.state.maybeInArrowParameters = oldMaybeInArrowParameters;
    if (!res) return;
    return super.parseArrowExpression(
      res,
      /* params are already set */
      null,
      /* async */
      true
    );
  }
  // Used when parsing type arguments from ES or JSX productions, where the first token
  // has been created without state.inType. Thus we need to re-scan the lt token.
  tsParseTypeArgumentsInExpression() {
    if (this.reScan_lt() !== tt.lt) return;
    return this.tsParseTypeArguments();
  }
  tsParseTypeArguments() {
    const node = this.startNode();
    node.params = this.tsInType(
      () => this.tsInTopLevelContext(() => {
        this.expect(tt.lt);
        return this.tsParseDelimitedList(
          "TypeParametersOrArguments",
          this.tsParseType.bind(this)
        );
      })
    );
    if (node.params.length === 0) {
      this.raise(TSErrors.EmptyTypeArguments, node);
    } else if (!this.state.inType && this.curContext() === types.brace) {
      this.reScan_lt_gt();
    }
    this.expect(tt.gt);
    return this.finishNode(node, "TSTypeParameterInstantiation");
  }
  tsIsDeclarationStart() {
    return tokenIsTSDeclarationStart(this.state.type);
  }
  // ======================================================
  // OVERRIDES
  // ======================================================
  isExportDefaultSpecifier() {
    if (this.tsIsDeclarationStart()) return false;
    return super.isExportDefaultSpecifier();
  }
  parseBindingElement(flags, decorators) {
    const startLoc = decorators.length ? decorators[0].loc.start : this.state.startLoc;
    const modified = {};
    this.tsParseModifiers(
      {
        allowedModifiers: [
          "public",
          "private",
          "protected",
          "override",
          "readonly"
        ]
      },
      modified
    );
    const accessibility = modified.accessibility;
    const override = modified.override;
    const readonly = modified.readonly;
    if (!(flags & 4) && (accessibility || readonly || override)) {
      this.raise(TSErrors.UnexpectedParameterModifier, startLoc);
    }
    const left = this.parseMaybeDefault();
    if (flags & 2) {
      this.parseFunctionParamType(left);
    }
    const elt = this.parseMaybeDefault(left.loc.start, left);
    if (accessibility || readonly || override) {
      const pp = this.startNodeAt(startLoc);
      if (decorators.length) {
        pp.decorators = decorators;
      }
      if (accessibility) pp.accessibility = accessibility;
      if (readonly) pp.readonly = readonly;
      if (override) pp.override = override;
      if (elt.type !== "Identifier" && elt.type !== "AssignmentPattern") {
        this.raise(TSErrors.UnsupportedParameterPropertyKind, pp);
      }
      pp.parameter = elt;
      return this.finishNode(pp, "TSParameterProperty");
    }
    if (decorators.length) {
      left.decorators = decorators;
    }
    return elt;
  }
  isSimpleParameter(node) {
    return node.type === "TSParameterProperty" && super.isSimpleParameter(node.parameter) || super.isSimpleParameter(node);
  }
  tsDisallowOptionalPattern(node) {
    for (const param of node.params) {
      if (param.type !== "Identifier" && param.optional && !this.state.isAmbientContext) {
        this.raise(TSErrors.PatternIsOptional, param);
      }
    }
  }
  setArrowFunctionParameters(node, params, trailingCommaLoc) {
    super.setArrowFunctionParameters(node, params, trailingCommaLoc);
    this.tsDisallowOptionalPattern(node);
  }
  parseFunctionBodyAndFinish(node, type, isMethod = false) {
    if (this.match(tt.colon)) {
      node.returnType = this.tsParseTypeOrTypePredicateAnnotation(tt.colon);
    }
    const bodilessType = type === "FunctionDeclaration" ? "TSDeclareFunction" : type === "ClassMethod" || type === "ClassPrivateMethod" ? "TSDeclareMethod" : void 0;
    if (bodilessType && !this.match(tt.braceL) && this.isLineTerminator()) {
      return this.finishNode(node, bodilessType);
    }
    if (bodilessType === "TSDeclareFunction" && this.state.isAmbientContext) {
      this.raise(TSErrors.DeclareFunctionHasImplementation, node);
      if (node.declare) {
        return super.parseFunctionBodyAndFinish(node, bodilessType, isMethod);
      }
    }
    this.tsDisallowOptionalPattern(node);
    return super.parseFunctionBodyAndFinish(node, type, isMethod);
  }
  registerFunctionStatementId(node) {
    if (!node.body && node.id) {
      this.checkIdentifier(
        node.id,
        1024
        /* TYPE_TS_AMBIENT */
      );
    } else {
      super.registerFunctionStatementId(node);
    }
  }
  tsCheckForInvalidTypeCasts(items) {
    items.forEach((node) => {
      if (node?.type === "TSTypeCastExpression") {
        this.raise(TSErrors.UnexpectedTypeAnnotation, node.typeAnnotation);
      }
    });
  }
  toReferencedList(exprList, isInParens) {
    this.tsCheckForInvalidTypeCasts(exprList);
    return exprList;
  }
  parseArrayLike(close, isTuple, refExpressionErrors) {
    const node = super.parseArrayLike(close, isTuple, refExpressionErrors);
    if (node.type === "ArrayExpression") {
      this.tsCheckForInvalidTypeCasts(node.elements);
    }
    return node;
  }
  parseSubscript(base, startLoc, noCalls, state) {
    if (!this.hasPrecedingLineBreak() && this.match(tt.bang)) {
      this.state.canStartJSXElement = false;
      this.next();
      const nonNullExpression = this.startNodeAt(startLoc);
      nonNullExpression.expression = base;
      return this.finishNode(nonNullExpression, "TSNonNullExpression");
    }
    let isOptionalCall = false;
    if (this.match(tt.questionDot) && this.lookaheadCharCode() === charCodes$1.lessThan) {
      if (noCalls) {
        state.stop = true;
        return base;
      }
      state.optionalChainMember = isOptionalCall = true;
      this.next();
    }
    if (this.match(tt.lt) || this.match(tt.bitShiftL)) {
      let missingParenErrorLoc;
      const result = this.tsTryParseAndCatch(() => {
        if (!noCalls && this.atPossibleAsyncArrow(base)) {
          const asyncArrowFn = this.tsTryParseGenericAsyncArrowFunction(startLoc);
          if (asyncArrowFn) {
            state.stop = true;
            return asyncArrowFn;
          }
        }
        const typeArguments = this.tsParseTypeArgumentsInExpression();
        if (!typeArguments) return;
        if (isOptionalCall && !this.match(tt.parenL)) {
          missingParenErrorLoc = this.state.curPosition();
          return;
        }
        if (tokenIsTemplate(this.state.type)) {
          const result2 = super.parseTaggedTemplateExpression(
            base,
            startLoc,
            state
          );
          {
            result2.typeParameters = typeArguments;
          }
          return result2;
        }
        if (!noCalls && this.eat(tt.parenL)) {
          const node2 = this.startNodeAt(startLoc);
          node2.callee = base;
          node2.arguments = this.parseCallExpressionArguments();
          this.tsCheckForInvalidTypeCasts(node2.arguments);
          {
            node2.typeParameters = typeArguments;
          }
          if (state.optionalChainMember) {
            node2.optional = isOptionalCall;
          }
          return this.finishCallExpression(node2, state.optionalChainMember);
        }
        const tokenType = this.state.type;
        if (
          // a<b>>c is not (a<b>)>c, but a<(b>>c)
          tokenType === tt.gt || // a<b>>>c is not (a<b>)>>c, but a<(b>>>c)
          tokenType === tt.bitShiftR || // a<b>c is (a<b)>c
          tokenType !== tt.parenL && tokenType !== tt._as && tokenType !== tt._satisfies && tokenCanStartExpression(tokenType) && !this.hasPrecedingLineBreak()
        ) {
          return;
        }
        const node = this.startNodeAt(startLoc);
        node.expression = base;
        {
          node.typeParameters = typeArguments;
        }
        return this.finishNode(node, "TSInstantiationExpression");
      });
      if (missingParenErrorLoc) {
        this.unexpected(missingParenErrorLoc, tt.parenL);
      }
      if (result) {
        if (result.type === "TSInstantiationExpression") {
          if (this.match(tt.dot) || this.match(tt.questionDot) && this.lookaheadCharCode() !== charCodes$1.leftParenthesis) {
            this.raise(
              TSErrors.InvalidPropertyAccessAfterInstantiationExpression,
              this.state.startLoc
            );
          }
          if (!this.match(tt.dot) && !this.match(tt.questionDot)) {
            result.expression = super.stopParseSubscript(base, state);
          }
        }
        return result;
      }
    }
    return super.parseSubscript(base, startLoc, noCalls, state);
  }
  parseNewCallee(node) {
    super.parseNewCallee(node);
    const { callee } = node;
    if (callee.type === "TSInstantiationExpression" && !callee.extra?.parenthesized) {
      {
        node.typeParameters = callee.typeParameters;
      }
      node.callee = callee.expression;
    }
  }
  parseExprOp(left, leftStartLoc, minPrec) {
    let isSatisfies;
    if (tokenOperatorPrecedence(tt._in) > minPrec && !this.hasPrecedingLineBreak() && (this.isContextual(tt._as) || (isSatisfies = this.isContextual(tt._satisfies)))) {
      const node = this.startNodeAt(leftStartLoc);
      node.expression = left;
      node.typeAnnotation = this.tsInType(() => {
        this.next();
        if (this.match(tt._const)) {
          if (isSatisfies) {
            this.raise(Errors.UnexpectedKeyword, this.state.startLoc, {
              keyword: "const"
            });
          }
          return this.tsParseTypeReference();
        }
        return this.tsParseType();
      });
      this.finishNode(
        node,
        isSatisfies ? "TSSatisfiesExpression" : "TSAsExpression"
      );
      this.reScan_lt_gt();
      return this.parseExprOp(
        // @ts-expect-error todo(flow->ts)
        node,
        leftStartLoc,
        minPrec
      );
    }
    return super.parseExprOp(left, leftStartLoc, minPrec);
  }
  checkReservedWord(word, startLoc, checkKeywords, isBinding) {
    if (!this.state.isAmbientContext) {
      super.checkReservedWord(word, startLoc, checkKeywords, isBinding);
    }
  }
  checkImportReflection(node) {
    super.checkImportReflection(node);
    if (node.module && node.importKind !== "value") {
      this.raise(
        TSErrors.ImportReflectionHasImportType,
        node.specifiers[0].loc.start
      );
    }
  }
  /*
  Don't bother doing this check in TypeScript code because:
  1. We may have a nested export statement with the same name:
    export const x = 0;
    export namespace N {
      export const x = 1;
    }
  2. We have a type checker to warn us about this sort of thing.
  */
  checkDuplicateExports() {
  }
  isPotentialImportPhase(isExport) {
    if (super.isPotentialImportPhase(isExport)) return true;
    if (this.isContextual(tt._type)) {
      const ch = this.lookaheadCharCode();
      return isExport ? ch === charCodes$1.leftCurlyBrace || ch === charCodes$1.asterisk : ch !== charCodes$1.equalsTo;
    }
    return !isExport && this.isContextual(tt._typeof);
  }
  applyImportPhase(node, isExport, phase, loc) {
    super.applyImportPhase(node, isExport, phase, loc);
    if (isExport) {
      node.exportKind = phase === "type" ? "type" : "value";
    } else {
      node.importKind = phase === "type" || phase === "typeof" ? phase : "value";
    }
  }
  parseImport(node) {
    if (this.match(tt.string)) {
      node.importKind = "value";
      return super.parseImport(node);
    }
    let importNode;
    if (tokenIsIdentifier(this.state.type) && this.lookaheadCharCode() === charCodes$1.equalsTo) {
      node.importKind = "value";
      return this.tsParseImportEqualsDeclaration(
        node
      );
    } else if (this.isContextual(tt._type)) {
      const maybeDefaultIdentifier = this.parseMaybeImportPhase(
        node,
        /* isExport */
        false
      );
      if (this.lookaheadCharCode() === charCodes$1.equalsTo) {
        return this.tsParseImportEqualsDeclaration(
          node,
          maybeDefaultIdentifier
        );
      } else {
        importNode = super.parseImportSpecifiersAndAfter(
          node,
          maybeDefaultIdentifier
        );
      }
    } else {
      importNode = super.parseImport(node);
    }
    if (importNode.importKind === "type" && // @ts-expect-error refine typings
    importNode.specifiers.length > 1 && // @ts-expect-error refine typings
    importNode.specifiers[0].type === "ImportDefaultSpecifier") {
      this.raise(TSErrors.TypeImportCannotSpecifyDefaultAndNamed, importNode);
    }
    return importNode;
  }
  parseExport(node, decorators) {
    if (this.match(tt._import)) {
      const nodeImportEquals = node;
      this.next();
      let maybeDefaultIdentifier = null;
      if (this.isContextual(tt._type) && // We pass false here, because we are parsing an `import ... =`
      this.isPotentialImportPhase(
        /* isExport */
        false
      )) {
        maybeDefaultIdentifier = this.parseMaybeImportPhase(
          nodeImportEquals,
          /* isExport */
          false
        );
      } else {
        nodeImportEquals.importKind = "value";
      }
      const declaration = this.tsParseImportEqualsDeclaration(
        nodeImportEquals,
        maybeDefaultIdentifier,
        /* isExport */
        true
      );
      {
        return declaration;
      }
    } else if (this.eat(tt.eq)) {
      const assign = node;
      assign.expression = super.parseExpression();
      this.semicolon();
      this.sawUnambiguousESM = true;
      return this.finishNode(assign, "TSExportAssignment");
    } else if (this.eatContextual(tt._as)) {
      const decl = node;
      this.expectContextual(tt._namespace);
      decl.id = this.parseIdentifier();
      this.semicolon();
      return this.finishNode(decl, "TSNamespaceExportDeclaration");
    } else {
      return super.parseExport(
        node,
        decorators
      );
    }
  }
  isAbstractClass() {
    return this.isContextual(tt._abstract) && this.isLookaheadContextual("class");
  }
  parseExportDefaultExpression() {
    if (this.isAbstractClass()) {
      const cls = this.startNode();
      this.next();
      cls.abstract = true;
      return this.parseClass(cls, true, true);
    }
    if (this.match(tt._interface)) {
      const result = this.tsParseInterfaceDeclaration(
        this.startNode()
      );
      if (result) return result;
    }
    return super.parseExportDefaultExpression();
  }
  parseVarStatement(node, kind, allowMissingInitializer = false) {
    const { isAmbientContext } = this.state;
    const declaration = super.parseVarStatement(
      node,
      kind,
      allowMissingInitializer || isAmbientContext
    );
    if (!isAmbientContext) return declaration;
    if (!node.declare && (kind === "using" || kind === "await using")) {
      this.raiseOverwrite(
        TSErrors.UsingDeclarationInAmbientContext,
        node,
        kind
      );
      return declaration;
    }
    for (const { id, init } of declaration.declarations) {
      if (!init) continue;
      if (kind === "var" || kind === "let" || !!id.typeAnnotation) {
        this.raise(TSErrors.InitializerNotAllowedInAmbientContext, init);
      } else if (!isValidAmbientConstInitializer(init, this.hasPlugin("estree"))) {
        this.raise(
          TSErrors.ConstInitializerMustBeStringOrNumericLiteralOrLiteralEnumReference,
          init
        );
      }
    }
    return declaration;
  }
  parseStatementContent(flags, decorators) {
    if (!this.state.containsEsc) {
      switch (this.state.type) {
        case tt._const: {
          if (this.isLookaheadContextual("enum")) {
            const node = this.startNode();
            this.expect(tt._const);
            return this.tsParseEnumDeclaration(node, { const: true });
          }
          break;
        }
        case tt._abstract:
        case tt._declare: {
          if (this.nextTokenIsIdentifierAndNotTSRelationalOperatorOnSameLine()) {
            const token = this.state.type;
            const node = this.startNode();
            this.next();
            const declaration = token === tt._declare ? this.tsTryParseDeclare(node) : this.tsParseAbstractDeclaration(node, decorators);
            if (declaration) {
              if (token === tt._declare) {
                declaration.declare = true;
              }
              return declaration;
            } else {
              node.expression = this.createIdentifier(
                this.startNodeAt(node.loc.start),
                token === tt._declare ? "declare" : "abstract"
              );
              this.semicolon(false);
              return this.finishNode(node, "ExpressionStatement");
            }
          }
          break;
        }
        case tt._enum:
          return this.tsParseEnumDeclaration(
            this.startNode()
          );
        case tt._global: {
          const nextCh = this.lookaheadCharCode();
          if (nextCh === charCodes$1.leftCurlyBrace) {
            const node = this.startNode();
            return this.tsParseAmbientExternalModuleDeclaration(node);
          }
          break;
        }
        case tt._interface: {
          const result = this.tsParseInterfaceDeclaration(this.startNode());
          if (result) return result;
          break;
        }
        case tt._module: {
          if (this.nextTokenIsIdentifierOrStringLiteralOnSameLine()) {
            const node = this.startNode();
            this.next();
            return this.tsParseDeclaration(
              node,
              tt._module,
              false,
              decorators
            );
          }
          break;
        }
        case tt._namespace: {
          if (this.nextTokenIsIdentifierOnSameLine()) {
            const node = this.startNode();
            this.next();
            return this.tsParseDeclaration(
              node,
              tt._namespace,
              false,
              decorators
            );
          }
          break;
        }
        case tt._type: {
          if (this.nextTokenIsIdentifierOnSameLine()) {
            const node = this.startNode();
            this.next();
            return this.tsParseTypeAliasDeclaration(node);
          }
          break;
        }
      }
    }
    return super.parseStatementContent(flags, decorators);
  }
  parseAccessModifier() {
    return this.tsParseModifier(["public", "protected", "private"]);
  }
  tsHasSomeModifiers(member, modifiers) {
    return modifiers.some((modifier) => {
      if (tsIsAccessModifier(modifier)) {
        return member.accessibility === modifier;
      }
      return !!member[modifier];
    });
  }
  tsIsStartOfStaticBlocks() {
    return this.isContextual(tt._static) && this.lookaheadCharCode() === charCodes$1.leftCurlyBrace;
  }
  parseClassMember(classBody, member, state) {
    const modifiers = [
      "declare",
      "private",
      "public",
      "protected",
      "override",
      "abstract",
      "readonly",
      "static"
    ];
    this.tsParseModifiers(
      {
        allowedModifiers: modifiers,
        disallowedModifiers: ["in", "out"],
        stopOnStartOfClassStaticBlock: true,
        errorTemplate: TSErrors.InvalidModifierOnTypeParameterPositions
      },
      member
    );
    const callParseClassMemberWithIsStatic = () => {
      if (this.tsIsStartOfStaticBlocks()) {
        this.next();
        this.next();
        if (this.tsHasSomeModifiers(member, modifiers)) {
          this.raise(
            TSErrors.StaticBlockCannotHaveModifier,
            this.state.curPosition()
          );
        }
        super.parseClassStaticBlock(classBody, member);
      } else {
        this.parseClassMemberWithIsStatic(
          classBody,
          member,
          state,
          !!member.static
        );
      }
    };
    if (member.declare) {
      this.tsInAmbientContext(callParseClassMemberWithIsStatic);
    } else {
      callParseClassMemberWithIsStatic();
    }
  }
  parseClassMemberWithIsStatic(classBody, member, state, isStatic) {
    const idx = this.tsTryParseIndexSignature(
      member
    );
    if (idx) {
      classBody.body.push(idx);
      if (member.abstract) {
        this.raise(TSErrors.IndexSignatureHasAbstract, member);
      }
      if (member.accessibility) {
        this.raise(TSErrors.IndexSignatureHasAccessibility, member, {
          modifier: member.accessibility
        });
      }
      if (member.declare) {
        this.raise(TSErrors.IndexSignatureHasDeclare, member);
      }
      if (member.override) {
        this.raise(TSErrors.IndexSignatureHasOverride, member);
      }
      return;
    }
    if (!this.state.inAbstractClass && member.abstract) {
      this.raise(TSErrors.NonAbstractClassHasAbstractMethod, member);
    }
    if (member.override) {
      if (!state.hadSuperClass) {
        this.raise(TSErrors.OverrideNotInSubClass, member);
      }
    }
    super.parseClassMemberWithIsStatic(
      classBody,
      member,
      state,
      isStatic
    );
  }
  parsePostMemberNameModifiers(methodOrProp) {
    const optional = this.eat(tt.question);
    if (optional) methodOrProp.optional = true;
    if (methodOrProp.readonly && this.match(tt.parenL)) {
      this.raise(TSErrors.ClassMethodHasReadonly, methodOrProp);
    }
    if (methodOrProp.declare && this.match(tt.parenL)) {
      this.raise(TSErrors.ClassMethodHasDeclare, methodOrProp);
    }
  }
  // export type
  // Should be true for anything parsed by `tsTryParseExportDeclaration`.
  shouldParseExportDeclaration() {
    if (this.tsIsDeclarationStart()) return true;
    return super.shouldParseExportDeclaration();
  }
  // An apparent conditional expression could actually be an optional parameter in an arrow function.
  parseConditional(expr, startLoc, refExpressionErrors) {
    if (!this.match(tt.question)) return expr;
    if (this.state.maybeInArrowParameters) {
      const nextCh = this.lookaheadCharCode();
      if (nextCh === charCodes$1.comma || // (a?, b) => c
      nextCh === charCodes$1.equalsTo || // (a? = b) => c
      nextCh === charCodes$1.colon || // (a?: b) => c
      nextCh === charCodes$1.rightParenthesis) {
        this.setOptionalParametersError(refExpressionErrors);
        return expr;
      }
    }
    return super.parseConditional(expr, startLoc, refExpressionErrors);
  }
  // Note: These "type casts" are *not* valid TS expressions.
  // But we parse them here and change them when completing the arrow function.
  parseParenItem(node, startLoc) {
    const newNode = super.parseParenItem(node, startLoc);
    if (this.eat(tt.question)) {
      newNode.optional = true;
      this.resetEndLocation(node);
    }
    if (this.match(tt.colon)) {
      const typeCastNode = this.startNodeAt(startLoc);
      typeCastNode.expression = node;
      typeCastNode.typeAnnotation = this.tsParseTypeAnnotation();
      return this.finishNode(typeCastNode, "TSTypeCastExpression");
    }
    return node;
  }
  parseExportDeclaration(node) {
    if (!this.state.isAmbientContext && this.isContextual(tt._declare)) {
      return this.tsInAmbientContext(() => this.parseExportDeclaration(node));
    }
    const startLoc = this.state.startLoc;
    const isDeclare = this.eatContextual(tt._declare);
    if (isDeclare && (this.isContextual(tt._declare) || !this.shouldParseExportDeclaration())) {
      throw this.raise(
        TSErrors.ExpectedAmbientAfterExportDeclare,
        this.state.startLoc
      );
    }
    const isIdentifier = tokenIsIdentifier(this.state.type);
    const declaration = isIdentifier && this.tsTryParseExportDeclaration() || super.parseExportDeclaration(node);
    if (!declaration) return null;
    if (declaration.type === "TSInterfaceDeclaration" || declaration.type === "TSTypeAliasDeclaration" || isDeclare) {
      node.exportKind = "type";
    }
    if (isDeclare && declaration.type !== "TSImportEqualsDeclaration") {
      this.resetStartLocation(declaration, startLoc);
      declaration.declare = true;
    }
    return declaration;
  }
  parseClassId(node, isStatement, optionalId, bindingType) {
    if ((!isStatement || optionalId) && this.isContextual(tt._implements)) {
      return;
    }
    super.parseClassId(
      node,
      isStatement,
      optionalId,
      node.declare ? 1024 : 8331
      /* TYPE_CLASS */
    );
    const typeParameters = this.tsTryParseTypeParameters(
      this.tsParseInOutConstModifiers
    );
    if (typeParameters) node.typeParameters = typeParameters;
  }
  parseClassPropertyAnnotation(node) {
    if (!node.optional) {
      if (this.eat(tt.bang)) {
        node.definite = true;
      } else if (this.eat(tt.question)) {
        node.optional = true;
      }
    }
    const type = this.tsTryParseTypeAnnotation();
    if (type) node.typeAnnotation = type;
  }
  parseClassProperty(node) {
    this.parseClassPropertyAnnotation(node);
    if (this.state.isAmbientContext && !(node.readonly && !node.typeAnnotation) && this.match(tt.eq)) {
      this.raise(
        TSErrors.DeclareClassFieldHasInitializer,
        this.state.startLoc
      );
    }
    if (node.abstract && this.match(tt.eq)) {
      const { key } = node;
      this.raise(
        TSErrors.AbstractPropertyHasInitializer,
        this.state.startLoc,
        {
          propertyName: key.type === "Identifier" && !node.computed ? key.name : `[${this.input.slice(this.offsetToSourcePos(key.start), this.offsetToSourcePos(key.end))}]`
        }
      );
    }
    return super.parseClassProperty(node);
  }
  parseClassPrivateProperty(node) {
    if (node.abstract) {
      this.raise(TSErrors.PrivateElementHasAbstract, node);
    }
    if (node.accessibility) {
      this.raise(TSErrors.PrivateElementHasAccessibility, node, {
        modifier: node.accessibility
      });
    }
    this.parseClassPropertyAnnotation(node);
    return super.parseClassPrivateProperty(node);
  }
  parseClassAccessorProperty(node) {
    this.parseClassPropertyAnnotation(node);
    if (node.optional) {
      this.raise(TSErrors.AccessorCannotBeOptional, node);
    }
    return super.parseClassAccessorProperty(node);
  }
  pushClassMethod(classBody, method, isGenerator, isAsync, isConstructor, allowsDirectSuper) {
    const typeParameters = this.tsTryParseTypeParameters(
      this.tsParseConstModifier
    );
    if (typeParameters && isConstructor) {
      this.raise(TSErrors.ConstructorHasTypeParameters, typeParameters);
    }
    const { declare = false, kind } = method;
    if (declare && (kind === "get" || kind === "set")) {
      this.raise(TSErrors.DeclareAccessor, method, { kind });
    }
    if (typeParameters) method.typeParameters = typeParameters;
    super.pushClassMethod(
      classBody,
      method,
      isGenerator,
      isAsync,
      isConstructor,
      allowsDirectSuper
    );
  }
  pushClassPrivateMethod(classBody, method, isGenerator, isAsync) {
    const typeParameters = this.tsTryParseTypeParameters(
      this.tsParseConstModifier
    );
    if (typeParameters) method.typeParameters = typeParameters;
    super.pushClassPrivateMethod(classBody, method, isGenerator, isAsync);
  }
  declareClassPrivateMethodInScope(node, kind) {
    if (node.type === "TSDeclareMethod") return;
    if (node.type === "MethodDefinition" && node.value.body == null) {
      return;
    }
    super.declareClassPrivateMethodInScope(node, kind);
  }
  parseClassSuper(node) {
    super.parseClassSuper(node);
    if (node.superClass) {
      if (node.superClass.type === "TSInstantiationExpression") {
        const tsInstantiationExpression = node.superClass;
        const superClass2 = tsInstantiationExpression.expression;
        this.takeSurroundingComments(
          superClass2,
          superClass2.start,
          superClass2.end
        );
        const superTypeArguments = tsInstantiationExpression.typeParameters;
        this.takeSurroundingComments(
          superTypeArguments,
          superTypeArguments.start,
          superTypeArguments.end
        );
        node.superClass = superClass2;
        node.superTypeParameters = superTypeArguments;
      } else if (this.match(tt.lt) || this.match(tt.bitShiftL)) {
        {
          node.superTypeParameters = this.tsParseTypeArgumentsInExpression();
        }
      }
    }
    if (this.eatContextual(tt._implements)) {
      node.implements = this.tsParseHeritageClause("implements");
    }
  }
  parseObjPropValue(prop, startLoc, isGenerator, isAsync, isPattern, isAccessor, refExpressionErrors) {
    const typeParameters = this.tsTryParseTypeParameters(
      this.tsParseConstModifier
    );
    if (typeParameters) prop.typeParameters = typeParameters;
    return super.parseObjPropValue(
      prop,
      startLoc,
      isGenerator,
      isAsync,
      isPattern,
      isAccessor,
      refExpressionErrors
    );
  }
  parseFunctionParams(node, isConstructor) {
    const typeParameters = this.tsTryParseTypeParameters(
      this.tsParseConstModifier
    );
    if (typeParameters) node.typeParameters = typeParameters;
    super.parseFunctionParams(node, isConstructor);
  }
  // `let x: number;`
  parseVarId(decl, kind) {
    super.parseVarId(decl, kind);
    if (decl.id.type === "Identifier" && !this.hasPrecedingLineBreak() && this.eat(tt.bang)) {
      decl.definite = true;
    }
    const type = this.tsTryParseTypeAnnotation();
    if (type) {
      decl.id.typeAnnotation = type;
      this.resetEndLocation(decl.id);
    }
  }
  // parse the return type of an async arrow function - let foo = (async (): number => {});
  parseAsyncArrowFromCallExpression(node, call) {
    if (this.match(tt.colon)) {
      node.returnType = this.tsParseTypeAnnotation();
    }
    return super.parseAsyncArrowFromCallExpression(node, call);
  }
  parseMaybeAssign(refExpressionErrors, afterLeftParse) {
    let state;
    let jsx;
    let typeCast;
    if (this.hasPlugin("jsx") && (this.match(tt.jsxTagStart) || this.match(tt.lt))) {
      state = this.state.clone();
      jsx = this.tryParse(
        () => super.parseMaybeAssign(refExpressionErrors, afterLeftParse),
        state
      );
      if (!jsx.error) return jsx.node;
      const { context } = this.state;
      const currentContext = context[context.length - 1];
      if (currentContext === types.j_oTag || currentContext === types.j_expr) {
        context.pop();
      }
    }
    if (!jsx?.error && !this.match(tt.lt)) {
      return super.parseMaybeAssign(refExpressionErrors, afterLeftParse);
    }
    if (!state || state === this.state) state = this.state.clone();
    let typeParameters;
    const arrow = this.tryParse((abort) => {
      typeParameters = this.tsParseTypeParameters(this.tsParseConstModifier);
      const expr = super.parseMaybeAssign(
        refExpressionErrors,
        afterLeftParse
      );
      if (expr.type !== "ArrowFunctionExpression" || expr.extra?.parenthesized) {
        abort();
      }
      if (typeParameters?.params.length !== 0) {
        this.resetStartLocationFromNode(expr, typeParameters);
      }
      expr.typeParameters = typeParameters;
      return expr;
    }, state);
    if (!arrow.error && !arrow.aborted) {
      if (typeParameters) this.reportReservedArrowTypeParam(typeParameters);
      return arrow.node;
    }
    if (!jsx) {
      assert(!this.hasPlugin("jsx"));
      typeCast = this.tryParse(
        () => super.parseMaybeAssign(refExpressionErrors, afterLeftParse),
        state
      );
      if (!typeCast.error) return typeCast.node;
    }
    if (jsx?.node) {
      this.state = jsx.failState;
      return jsx.node;
    }
    if (arrow.node) {
      this.state = arrow.failState;
      if (typeParameters) this.reportReservedArrowTypeParam(typeParameters);
      return arrow.node;
    }
    if (typeCast?.node) {
      this.state = typeCast.failState;
      return typeCast.node;
    }
    throw jsx?.error || arrow.error || typeCast?.error;
  }
  reportReservedArrowTypeParam(node) {
    if (node.params.length === 1 && !node.params[0].constraint && !node.extra?.trailingComma && this.getPluginOption("typescript", "disallowAmbiguousJSXLike")) {
      this.raise(TSErrors.ReservedArrowTypeParam, node);
    }
  }
  // Handle type assertions
  parseMaybeUnary(refExpressionErrors, sawUnary) {
    if (!this.hasPlugin("jsx") && this.match(tt.lt)) {
      return this.tsParseTypeAssertion();
    }
    return super.parseMaybeUnary(refExpressionErrors, sawUnary);
  }
  parseArrow(node) {
    if (this.match(tt.colon)) {
      const result = this.tryParse((abort) => {
        const returnType = this.tsParseTypeOrTypePredicateAnnotation(
          tt.colon
        );
        if (this.canInsertSemicolon() || !this.match(tt.arrow)) abort();
        return returnType;
      });
      if (result.aborted) return;
      if (!result.thrown) {
        if (result.error) this.state = result.failState;
        node.returnType = result.node;
      }
    }
    return super.parseArrow(node);
  }
  // Allow type annotations inside of a parameter list.
  parseFunctionParamType(param) {
    if (this.eat(tt.question)) {
      param.optional = true;
    }
    const type = this.tsTryParseTypeAnnotation();
    if (type) param.typeAnnotation = type;
    this.resetEndLocation(param);
    return param;
  }
  isAssignable(node, isBinding) {
    switch (node.type) {
      case "TSTypeCastExpression":
        return this.isAssignable(node.expression, isBinding);
      case "TSParameterProperty":
        return true;
      default:
        return super.isAssignable(node, isBinding);
    }
  }
  toAssignable(node, isLHS = false) {
    switch (node.type) {
      case "ParenthesizedExpression":
        this.toAssignableParenthesizedExpression(node, isLHS);
        break;
      case "TSAsExpression":
      case "TSSatisfiesExpression":
      case "TSNonNullExpression":
      case "TSTypeAssertion":
        if (isLHS) {
          this.expressionScope.recordArrowParameterBindingError(
            TSErrors.UnexpectedTypeCastInParameter,
            node
          );
        } else {
          this.raise(TSErrors.UnexpectedTypeCastInParameter, node);
        }
        this.toAssignable(node.expression, isLHS);
        break;
      case "AssignmentExpression":
        if (!isLHS && node.left.type === "TSTypeCastExpression") {
          node.left = this.typeCastToParameter(node.left);
        }
      /* fall through */
      default:
        super.toAssignable(node, isLHS);
    }
  }
  toAssignableParenthesizedExpression(node, isLHS) {
    switch (node.expression.type) {
      case "TSAsExpression":
      case "TSSatisfiesExpression":
      case "TSNonNullExpression":
      case "TSTypeAssertion":
      case "ParenthesizedExpression":
        this.toAssignable(node.expression, isLHS);
        break;
      default:
        super.toAssignable(node, isLHS);
    }
  }
  checkToRestConversion(node, allowPattern) {
    switch (node.type) {
      case "TSAsExpression":
      case "TSSatisfiesExpression":
      case "TSTypeAssertion":
      case "TSNonNullExpression":
        this.checkToRestConversion(node.expression, false);
        break;
      default:
        super.checkToRestConversion(node, allowPattern);
    }
  }
  isValidLVal(type, disallowCallExpression, isUnparenthesizedInAssign, binding) {
    switch (type) {
      // Allow "typecasts" to appear on the left of assignment expressions,
      // because it may be in an arrow function.
      // e.g. `const f = (foo: number = 0) => foo;`
      case "TSTypeCastExpression":
        return true;
      case "TSParameterProperty":
        return "parameter";
      case "TSNonNullExpression":
        return "expression";
      case "TSAsExpression":
      case "TSSatisfiesExpression":
      case "TSTypeAssertion":
        return (binding !== 64 || !isUnparenthesizedInAssign) && ["expression", true];
      default:
        return super.isValidLVal(
          type,
          disallowCallExpression,
          isUnparenthesizedInAssign,
          binding
        );
    }
  }
  parseBindingAtom() {
    if (this.state.type === tt._this) {
      return this.parseIdentifier(
        /* liberal */
        true
      );
    }
    return super.parseBindingAtom();
  }
  parseMaybeDecoratorArguments(expr, startLoc) {
    if (this.match(tt.lt) || this.match(tt.bitShiftL)) {
      const typeArguments = this.tsParseTypeArgumentsInExpression();
      if (this.match(tt.parenL)) {
        const call = super.parseMaybeDecoratorArguments(
          expr,
          startLoc
        );
        {
          call.typeParameters = typeArguments;
        }
        return call;
      }
      this.unexpected(null, tt.parenL);
    }
    return super.parseMaybeDecoratorArguments(expr, startLoc);
  }
  checkCommaAfterRest(close) {
    if (this.state.isAmbientContext && this.match(tt.comma) && this.lookaheadCharCode() === close) {
      this.next();
      return false;
    }
    return super.checkCommaAfterRest(close);
  }
  // === === === === === === === === === === === === === === === ===
  // Note: All below methods are duplicates of something in flow.js.
  // Not sure what the best way to combine these is.
  // === === === === === === === === === === === === === === === ===
  isClassMethod() {
    return this.match(tt.lt) || super.isClassMethod();
  }
  isClassProperty() {
    return this.match(tt.bang) || this.match(tt.colon) || super.isClassProperty();
  }
  parseMaybeDefault(startLoc, left) {
    const node = super.parseMaybeDefault(startLoc, left);
    if (node.type === "AssignmentPattern" && node.typeAnnotation && node.right.start < node.typeAnnotation.start) {
      this.raise(TSErrors.TypeAnnotationAfterAssign, node.typeAnnotation);
    }
    return node;
  }
  // ensure that inside types, we bypass the jsx parser plugin
  getTokenFromCode(code) {
    if (this.state.inType) {
      if (code === charCodes$1.greaterThan) {
        this.finishOp(tt.gt, 1);
        return;
      }
      if (code === charCodes$1.lessThan) {
        this.finishOp(tt.lt, 1);
        return;
      }
    }
    super.getTokenFromCode(code);
  }
  // used after we have finished parsing types
  reScan_lt_gt() {
    const { type } = this.state;
    if (type === tt.lt) {
      this.state.pos -= 1;
      this.readToken_lt();
    } else if (type === tt.gt) {
      this.state.pos -= 1;
      this.readToken_gt();
    }
  }
  reScan_lt() {
    const { type } = this.state;
    if (type === tt.bitShiftL) {
      this.state.pos -= 2;
      this.finishOp(tt.lt, 1);
      return tt.lt;
    }
    return type;
  }
  toAssignableListItem(exprList, index, isLHS) {
    const node = exprList[index];
    if (node.type === "TSTypeCastExpression") {
      exprList[index] = this.typeCastToParameter(node);
    }
    super.toAssignableListItem(exprList, index, isLHS);
  }
  typeCastToParameter(node) {
    node.expression.typeAnnotation = node.typeAnnotation;
    this.resetEndLocation(node.expression, node.typeAnnotation.loc.end);
    return node.expression;
  }
  shouldParseArrow(params) {
    if (this.match(tt.colon)) {
      return params.every((expr) => this.isAssignable(expr, true));
    }
    return super.shouldParseArrow(params);
  }
  shouldParseAsyncArrow() {
    return this.match(tt.colon) || super.shouldParseAsyncArrow();
  }
  canHaveLeadingDecorator() {
    return super.canHaveLeadingDecorator() || this.isAbstractClass();
  }
  jsxParseOpeningElementAfterName(node) {
    if (this.match(tt.lt) || this.match(tt.bitShiftL)) {
      const typeArguments = this.tsTryParseAndCatch(
        () => this.tsParseTypeArgumentsInExpression()
      );
      if (typeArguments) {
        {
          node.typeParameters = typeArguments;
        }
      }
    }
    return super.jsxParseOpeningElementAfterName(node);
  }
  getGetterSetterExpectedParamCount(method) {
    const baseCount = super.getGetterSetterExpectedParamCount(method);
    const params = this.getObjectOrClassMethodParams(method);
    const firstParam = params[0];
    const hasContextParam = firstParam && this.isThisParam(firstParam);
    return hasContextParam ? baseCount + 1 : baseCount;
  }
  parseCatchClauseParam() {
    const param = super.parseCatchClauseParam();
    const type = this.tsTryParseTypeAnnotation();
    if (type) {
      param.typeAnnotation = type;
      this.resetEndLocation(param);
    }
    return param;
  }
  tsInAmbientContext(cb) {
    const { isAmbientContext: oldIsAmbientContext, strict: oldStrict } = this.state;
    this.state.isAmbientContext = true;
    this.state.strict = false;
    try {
      return cb();
    } finally {
      this.state.isAmbientContext = oldIsAmbientContext;
      this.state.strict = oldStrict;
    }
  }
  parseClass(node, isStatement, optionalId) {
    const oldInAbstractClass = this.state.inAbstractClass;
    this.state.inAbstractClass = !!node.abstract;
    try {
      return super.parseClass(node, isStatement, optionalId);
    } finally {
      this.state.inAbstractClass = oldInAbstractClass;
    }
  }
  tsParseAbstractDeclaration(node, decorators) {
    if (this.match(tt._class)) {
      node.abstract = true;
      return this.maybeTakeDecorators(
        decorators,
        this.parseClass(
          node,
          /* isStatement */
          true,
          /* optionalId */
          false
        )
      );
    } else if (this.isContextual(tt._interface)) {
      if (!this.hasFollowingLineBreak()) {
        node.abstract = true;
        this.raise(TSErrors.NonClassMethodPropertyHasAbstractModifier, node);
        return this.tsParseInterfaceDeclaration(
          node
        );
      } else {
        return null;
      }
    }
    throw this.unexpected(null, tt._class);
  }
  parseMethod(node, isGenerator, isAsync, isConstructor, allowDirectSuper, type, inClassScope) {
    const method = super.parseMethod(
      node,
      isGenerator,
      isAsync,
      isConstructor,
      allowDirectSuper,
      type,
      inClassScope
    );
    if (method.abstract || method.type === "TSAbstractMethodDefinition") {
      const hasEstreePlugin = this.hasPlugin("estree");
      const methodFn = hasEstreePlugin ? (
        // @ts-expect-error estree typings
        method.value
      ) : method;
      if (methodFn.body) {
        const { key } = method;
        this.raise(TSErrors.AbstractMethodHasImplementation, method, {
          methodName: key.type === "Identifier" && !method.computed ? key.name : `[${this.input.slice(this.offsetToSourcePos(key.start), this.offsetToSourcePos(key.end))}]`
        });
      }
    }
    return method;
  }
  tsParseTypeParameterName() {
    const typeName = this.parseIdentifier();
    return typeName.name;
  }
  shouldParseAsAmbientContext() {
    return !!this.getPluginOption("typescript", "dts");
  }
  parse() {
    if (this.shouldParseAsAmbientContext()) {
      this.state.isAmbientContext = true;
    }
    return super.parse();
  }
  getExpression() {
    if (this.shouldParseAsAmbientContext()) {
      this.state.isAmbientContext = true;
    }
    return super.getExpression();
  }
  parseExportSpecifier(node, isString, isInTypeExport, isMaybeTypeOnly) {
    if (!isString && isMaybeTypeOnly) {
      this.parseTypeOnlyImportExportSpecifier(
        node,
        /* isImport */
        false,
        isInTypeExport
      );
      return this.finishNode(node, "ExportSpecifier");
    }
    node.exportKind = "value";
    return super.parseExportSpecifier(
      node,
      isString,
      isInTypeExport,
      isMaybeTypeOnly
    );
  }
  parseImportSpecifier(specifier, importedIsString, isInTypeOnlyImport, isMaybeTypeOnly, bindingType) {
    if (!importedIsString && isMaybeTypeOnly) {
      this.parseTypeOnlyImportExportSpecifier(
        specifier,
        /* isImport */
        true,
        isInTypeOnlyImport
      );
      return this.finishNode(specifier, "ImportSpecifier");
    }
    specifier.importKind = "value";
    return super.parseImportSpecifier(
      specifier,
      importedIsString,
      isInTypeOnlyImport,
      isMaybeTypeOnly,
      isInTypeOnlyImport ? 4098 : 4096
      /* TYPE_TS_VALUE_IMPORT */
    );
  }
  parseTypeOnlyImportExportSpecifier(node, isImport, isInTypeOnlyImportExport) {
    const leftOfAsKey = isImport ? "imported" : "local";
    const rightOfAsKey = isImport ? "local" : "exported";
    let leftOfAs = node[leftOfAsKey];
    let rightOfAs;
    let hasTypeSpecifier = false;
    let canParseAsKeyword = true;
    const loc = leftOfAs.loc.start;
    if (this.isContextual(tt._as)) {
      const firstAs = this.parseIdentifier();
      if (this.isContextual(tt._as)) {
        const secondAs = this.parseIdentifier();
        if (tokenIsKeywordOrIdentifier(this.state.type)) {
          hasTypeSpecifier = true;
          leftOfAs = firstAs;
          rightOfAs = isImport ? this.parseIdentifier() : this.parseModuleExportName();
          canParseAsKeyword = false;
        } else {
          rightOfAs = secondAs;
          canParseAsKeyword = false;
        }
      } else if (tokenIsKeywordOrIdentifier(this.state.type)) {
        canParseAsKeyword = false;
        rightOfAs = isImport ? this.parseIdentifier() : this.parseModuleExportName();
      } else {
        hasTypeSpecifier = true;
        leftOfAs = firstAs;
      }
    } else if (tokenIsKeywordOrIdentifier(this.state.type)) {
      hasTypeSpecifier = true;
      if (isImport) {
        leftOfAs = this.parseIdentifier(true);
        if (!this.isContextual(tt._as)) {
          this.checkReservedWord(
            leftOfAs.name,
            leftOfAs.loc.start,
            true,
            true
          );
        }
      } else {
        leftOfAs = this.parseModuleExportName();
      }
    }
    if (hasTypeSpecifier && isInTypeOnlyImportExport) {
      this.raise(
        isImport ? TSErrors.TypeModifierIsUsedInTypeImports : TSErrors.TypeModifierIsUsedInTypeExports,
        loc
      );
    }
    node[leftOfAsKey] = leftOfAs;
    node[rightOfAsKey] = rightOfAs;
    const kindKey = isImport ? "importKind" : "exportKind";
    node[kindKey] = hasTypeSpecifier ? "type" : "value";
    if (canParseAsKeyword && this.eatContextual(tt._as)) {
      node[rightOfAsKey] = isImport ? this.parseIdentifier() : this.parseModuleExportName();
    }
    if (!node[rightOfAsKey]) {
      node[rightOfAsKey] = this.cloneIdentifier(node[leftOfAsKey]);
    }
    if (isImport) {
      this.checkIdentifier(
        node[rightOfAsKey],
        hasTypeSpecifier ? 4098 : 4096
        /* TYPE_TS_VALUE_IMPORT */
      );
    }
  }
  /**
   * This hook is defined in the ESTree plugin.
   * The TS-ESLint always define optional AST properties, here we provide the
   * default value for such properties immediately after `finishNode` was invoked.
   *
   * @param node The AST node finished by finishNode
   * @returns
   */
  fillOptionalPropertiesForTSESLint(node) {
    switch (node.type) {
      case "ExpressionStatement":
        node.directive ??= void 0;
        return;
      case "RestElement":
        node.value = void 0;
      /* fallthrough */
      case "Identifier":
      case "ArrayPattern":
      case "AssignmentPattern":
      case "ObjectPattern":
        node.decorators ??= [];
        node.optional ??= false;
        node.typeAnnotation ??= void 0;
        return;
      case "TSParameterProperty":
        node.accessibility ??= void 0;
        node.decorators ??= [];
        node.override ??= false;
        node.readonly ??= false;
        node.static ??= false;
        return;
      case "TSEmptyBodyFunctionExpression":
        node.body = null;
      /* fallthrough */
      case "TSDeclareFunction":
      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ClassMethod":
      case "ClassPrivateMethod":
        node.declare ??= false;
        node.returnType ??= void 0;
        node.typeParameters ??= void 0;
        return;
      case "Property":
        node.optional ??= false;
        return;
      case "TSMethodSignature":
      case "TSPropertySignature":
        node.optional ??= false;
      /* fallthrough */
      case "TSIndexSignature":
        node.accessibility ??= void 0;
        node.readonly ??= false;
        node.static ??= false;
        return;
      case "TSAbstractPropertyDefinition":
      case "PropertyDefinition":
      case "TSAbstractAccessorProperty":
      case "AccessorProperty":
        node.declare ??= false;
        node.definite ??= false;
        node.readonly ??= false;
        node.typeAnnotation ??= void 0;
      /* fallthrough */
      case "TSAbstractMethodDefinition":
      case "MethodDefinition":
        node.accessibility ??= void 0;
        node.decorators ??= [];
        node.override ??= false;
        node.optional ??= false;
        return;
      case "ClassExpression":
        node.id ??= null;
      /* fallthrough */
      case "ClassDeclaration":
        node.abstract ??= false;
        node.declare ??= false;
        node.decorators ??= [];
        node.implements ??= [];
        node.superTypeArguments ??= void 0;
        node.typeParameters ??= void 0;
        return;
      case "TSTypeAliasDeclaration":
      case "VariableDeclaration":
        node.declare ??= false;
        return;
      case "VariableDeclarator":
        node.definite ??= false;
        return;
      case "TSEnumDeclaration":
        node.const ??= false;
        node.declare ??= false;
        return;
      case "TSEnumMember":
        node.computed ??= false;
        return;
      case "TSImportType":
        node.qualifier ??= null;
        node.options ??= null;
        return;
      case "TSInterfaceDeclaration":
        node.declare ??= false;
        node.extends ??= [];
        return;
      case "TSMappedType":
        node.optional ??= false;
        node.readonly ??= void 0;
        return;
      case "TSModuleDeclaration":
        node.declare ??= false;
        node.global ??= node.kind === "global";
        return;
      case "TSTypeParameter":
        node.const ??= false;
        node.in ??= false;
        node.out ??= false;
        return;
    }
  }
  chStartsBindingIdentifierAndNotRelationalOperator(ch, pos) {
    if (isIdentifierStart(ch)) {
      keywordAndTSRelationalOperator.lastIndex = pos;
      if (keywordAndTSRelationalOperator.test(this.input)) {
        const endCh = this.codePointAtPos(
          keywordAndTSRelationalOperator.lastIndex
        );
        if (!isIdentifierChar(endCh) && endCh !== charCodes$1.backslash) {
          return false;
        }
      }
      return true;
    } else if (ch === charCodes$1.backslash) {
      return true;
    } else {
      return false;
    }
  }
  nextTokenIsIdentifierAndNotTSRelationalOperatorOnSameLine() {
    const next = this.nextTokenInLineStart();
    const nextCh = this.codePointAtPos(next);
    return this.chStartsBindingIdentifierAndNotRelationalOperator(
      nextCh,
      next
    );
  }
  nextTokenIsIdentifierOrStringLiteralOnSameLine() {
    const next = this.nextTokenInLineStart();
    const nextCh = this.codePointAtPos(next);
    return this.chStartsBindingIdentifier(nextCh, next) || nextCh === charCodes$1.quotationMark || nextCh === charCodes$1.apostrophe;
  }
};
function isPossiblyLiteralEnum(expression) {
  if (expression.type !== "MemberExpression") return false;
  const { computed, property } = expression;
  if (computed && property.type !== "StringLiteral" && (property.type !== "TemplateLiteral" || property.expressions.length > 0)) {
    return false;
  }
  return isUncomputedMemberExpressionChain(expression.object);
}
function isValidAmbientConstInitializer(expression, estree) {
  const { type } = expression;
  if (expression.extra?.parenthesized) {
    return false;
  }
  if (estree) {
    if (type === "Literal") {
      const { value } = expression;
      if (typeof value === "string" || typeof value === "boolean") {
        return true;
      }
    }
  } else {
    if (type === "StringLiteral" || type === "BooleanLiteral") {
      return true;
    }
  }
  if (isNumber(expression, estree) || isNegativeNumber(expression, estree)) {
    return true;
  }
  if (type === "TemplateLiteral" && expression.expressions.length === 0) {
    return true;
  }
  if (isPossiblyLiteralEnum(expression)) {
    return true;
  }
  return false;
}
function isNumber(expression, estree) {
  if (estree) {
    return expression.type === "Literal" && (typeof expression.value === "number" || "bigint" in expression);
  }
  return expression.type === "NumericLiteral" || expression.type === "BigIntLiteral";
}
function isNegativeNumber(expression, estree) {
  if (expression.type === "UnaryExpression") {
    const { operator, argument } = expression;
    if (operator === "-" && isNumber(argument, estree)) {
      return true;
    }
  }
  return false;
}
function isUncomputedMemberExpressionChain(expression) {
  if (expression.type === "Identifier") return true;
  if (expression.type !== "MemberExpression" || expression.computed) {
    return false;
  }
  return isUncomputedMemberExpressionChain(expression.object);
}
createRequire(import.meta.url);
var charCodes = __toESM(require_lib());
var FlowScope = class extends Scope {
  // declare function foo(): type;
  declareFunctions = /* @__PURE__ */ new Set();
};
var FlowScopeHandler = class extends ScopeHandler {
  createScope(flags) {
    return new FlowScope(flags);
  }
  declareName(name, bindingType, loc) {
    const scope = this.currentScope();
    if (bindingType & 2048) {
      this.checkRedeclarationInScope(scope, name, bindingType, loc);
      this.maybeExportDefined(scope, name);
      scope.declareFunctions.add(name);
      return;
    }
    super.declareName(name, bindingType, loc);
  }
  isRedeclaredInScope(scope, name, bindingType) {
    if (super.isRedeclaredInScope(scope, name, bindingType)) return true;
    if (bindingType & 2048 && !scope.declareFunctions.has(name)) {
      const type = scope.names.get(name);
      return (type & 4) > 0 || (type & 2) > 0;
    }
    return false;
  }
  checkLocalExport(id) {
    if (!this.scopeStack[0].declareFunctions.has(id.name)) {
      super.checkLocalExport(id);
    }
  }
};
var reservedTypes = /* @__PURE__ */ new Set([
  "_",
  "any",
  "bool",
  "boolean",
  "empty",
  "extends",
  "false",
  "interface",
  "mixed",
  "null",
  "number",
  "static",
  "string",
  "true",
  "typeof",
  "void"
]);
var FlowErrors = ParseErrorEnum`flow`({
  AmbiguousConditionalArrow: "Ambiguous expression: wrap the arrow functions in parentheses to disambiguate.",
  AmbiguousDeclareModuleKind: "Found both `declare module.exports` and `declare export` in the same module. Modules can only have 1 since they are either an ES module or they are a CommonJS module.",
  // TODO: When we get proper string enums in typescript make this ReservedType.
  // Not really worth it to do the whole $Values dance with reservedTypes set.
  AssignReservedType: ({ reservedType }) => `Cannot overwrite reserved type ${reservedType}.`,
  DeclareClassElement: "The `declare` modifier can only appear on class fields.",
  DeclareClassFieldInitializer: "Initializers are not allowed in fields with the `declare` modifier.",
  DuplicateDeclareModuleExports: "Duplicate `declare module.exports` statement.",
  EnumBooleanMemberNotInitialized: ({
    memberName,
    enumName
  }) => `Boolean enum members need to be initialized. Use either \`${memberName} = true,\` or \`${memberName} = false,\` in enum \`${enumName}\`.`,
  EnumDuplicateMemberName: ({
    memberName,
    enumName
  }) => `Enum member names need to be unique, but the name \`${memberName}\` has already been used before in enum \`${enumName}\`.`,
  EnumInconsistentMemberValues: ({ enumName }) => `Enum \`${enumName}\` has inconsistent member initializers. Either use no initializers, or consistently use literals (either booleans, numbers, or strings) for all member initializers.`,
  EnumInvalidExplicitType: ({
    invalidEnumType,
    enumName
  }) => `Enum type \`${invalidEnumType}\` is not valid. Use one of \`boolean\`, \`number\`, \`string\`, or \`symbol\` in enum \`${enumName}\`.`,
  EnumInvalidExplicitTypeUnknownSupplied: ({
    enumName
  }) => `Supplied enum type is not valid. Use one of \`boolean\`, \`number\`, \`string\`, or \`symbol\` in enum \`${enumName}\`.`,
  // TODO: When moving to typescript, we should either have each of the
  // following errors only accept the specific strings they want:
  //
  // ...PrimaryType: explicitType: "string" | "number" | "boolean"
  // ...SymbolType: explicitType: "symbol"
  // ...UnknownType: explicitType: null
  //
  // Or, alternatively, merge these three errors together into one
  // `EnumInvalidMemberInitializer` error that can accept `EnumExplicitType`
  // without alteration, and then just have its message change based on the
  // explicitType.
  EnumInvalidMemberInitializerPrimaryType: ({
    enumName,
    memberName,
    explicitType
  }) => `Enum \`${enumName}\` has type \`${explicitType}\`, so the initializer of \`${memberName}\` needs to be a ${explicitType} literal.`,
  EnumInvalidMemberInitializerSymbolType: ({
    enumName,
    memberName
  }) => `Symbol enum members cannot be initialized. Use \`${memberName},\` in enum \`${enumName}\`.`,
  EnumInvalidMemberInitializerUnknownType: ({
    enumName,
    memberName
  }) => `The enum member initializer for \`${memberName}\` needs to be a literal (either a boolean, number, or string) in enum \`${enumName}\`.`,
  EnumInvalidMemberName: ({
    enumName,
    memberName,
    suggestion
  }) => `Enum member names cannot start with lowercase 'a' through 'z'. Instead of using \`${memberName}\`, consider using \`${suggestion}\`, in enum \`${enumName}\`.`,
  EnumNumberMemberNotInitialized: ({
    enumName,
    memberName
  }) => `Number enum members need to be initialized, e.g. \`${memberName} = 1\` in enum \`${enumName}\`.`,
  EnumStringMemberInconsistentlyInitialized: ({
    enumName
  }) => `String enum members need to consistently either all use initializers, or use no initializers, in enum \`${enumName}\`.`,
  GetterMayNotHaveThisParam: "A getter cannot have a `this` parameter.",
  ImportReflectionHasImportType: "An `import module` declaration can not use `type` or `typeof` keyword.",
  ImportTypeShorthandOnlyInPureImport: "The `type` and `typeof` keywords on named imports can only be used on regular `import` statements. It cannot be used with `import type` or `import typeof` statements.",
  InexactInsideExact: "Explicit inexact syntax cannot appear inside an explicit exact object type.",
  InexactInsideNonObject: "Explicit inexact syntax cannot appear in class or interface definitions.",
  InexactVariance: "Explicit inexact syntax cannot have variance.",
  InvalidNonTypeImportInDeclareModule: "Imports within a `declare module` body must always be `import type` or `import typeof`.",
  MissingTypeParamDefault: "Type parameter declaration needs a default, since a preceding type parameter declaration has a default.",
  NestedDeclareModule: "`declare module` cannot be used inside another `declare module`.",
  NestedFlowComment: "Cannot have a flow comment inside another flow comment.",
  PatternIsOptional: {
    message: "A binding pattern parameter cannot be optional in an implementation signature.",
    // For consistency in TypeScript and Flow error codes
    ...{ reasonCode: "OptionalBindingPattern" }
  },
  SetterMayNotHaveThisParam: "A setter cannot have a `this` parameter.",
  SpreadVariance: "Spread properties cannot have variance.",
  ThisParamAnnotationRequired: "A type annotation is required for the `this` parameter.",
  ThisParamBannedInConstructor: "Constructors cannot have a `this` parameter; constructors don't bind `this` like other functions.",
  ThisParamMayNotBeOptional: "The `this` parameter cannot be optional.",
  ThisParamMustBeFirst: "The `this` parameter must be the first function parameter.",
  ThisParamNoDefault: "The `this` parameter may not have a default value.",
  TypeBeforeInitializer: "Type annotations must come before default assignments, e.g. instead of `age = 25: number` use `age: number = 25`.",
  TypeCastInPattern: "The type cast expression is expected to be wrapped with parenthesis.",
  UnexpectedExplicitInexactInObject: "Explicit inexact syntax must appear at the end of an inexact object.",
  UnexpectedReservedType: ({ reservedType }) => `Unexpected reserved type ${reservedType}.`,
  UnexpectedReservedUnderscore: "`_` is only allowed as a type argument to call or new.",
  UnexpectedSpaceBetweenModuloChecks: "Spaces between `%` and `checks` are not allowed here.",
  UnexpectedSpreadType: "Spread operator cannot appear in class or interface definitions.",
  UnexpectedSubtractionOperand: 'Unexpected token, expected "number" or "bigint".',
  UnexpectedTokenAfterTypeParameter: "Expected an arrow function after this type parameter declaration.",
  UnexpectedTypeParameterBeforeAsyncArrowFunction: "Type parameters must come after the async keyword, e.g. instead of `<T> async () => {}`, use `async <T>() => {}`.",
  UnsupportedDeclareExportKind: ({
    unsupportedExportKind,
    suggestion
  }) => `\`declare export ${unsupportedExportKind}\` is not supported. Use \`${suggestion}\` instead.`,
  UnsupportedStatementInDeclareModule: "Only declares and type imports are allowed inside declare module.",
  UnterminatedFlowComment: "Unterminated flow-comment."
});
function isEsModuleType(bodyElement) {
  return bodyElement.type === "DeclareExportAllDeclaration" || bodyElement.type === "DeclareExportDeclaration" && (!bodyElement.declaration || bodyElement.declaration.type !== "TypeAlias" && bodyElement.declaration.type !== "InterfaceDeclaration");
}
function hasTypeImportKind(node) {
  return node.importKind === "type" || node.importKind === "typeof";
}
var exportSuggestions = {
  const: "declare export var",
  let: "declare export var",
  type: "export type",
  interface: "export interface"
};
function partition(list, test) {
  const list1 = [];
  const list2 = [];
  for (let i = 0; i < list.length; i++) {
    (test(list[i], i, list) ? list1 : list2).push(list[i]);
  }
  return [list1, list2];
}
var FLOW_PRAGMA_REGEX = /\*?\s*@((?:no)?flow)\b/;
var flow_default = (superClass) => class FlowParserMixin extends superClass {
  // The value of the @flow/@noflow pragma. Initially undefined, transitions
  // to "@flow" or "@noflow" if we see a pragma. Transitions to null if we are
  // past the initial comment.
  flowPragma = void 0;
  getScopeHandler() {
    return FlowScopeHandler;
  }
  shouldParseTypes() {
    return this.getPluginOption("flow", "all") || this.flowPragma === "flow";
  }
  finishToken(type, val) {
    if (type !== tt.string && type !== tt.semi && type !== tt.interpreterDirective) {
      if (this.flowPragma === void 0) {
        this.flowPragma = null;
      }
    }
    super.finishToken(type, val);
  }
  addComment(comment) {
    if (this.flowPragma === void 0) {
      const matches = FLOW_PRAGMA_REGEX.exec(comment.value);
      if (!matches) ;
      else if (matches[1] === "flow") {
        this.flowPragma = "flow";
      } else if (matches[1] === "noflow") {
        this.flowPragma = "noflow";
      } else {
        throw new Error("Unexpected flow pragma");
      }
    }
    super.addComment(comment);
  }
  flowParseTypeInitialiser(tok) {
    const oldInType = this.state.inType;
    this.state.inType = true;
    this.expect(tok || tt.colon);
    const type = this.flowParseType();
    this.state.inType = oldInType;
    return type;
  }
  flowParsePredicate() {
    const node = this.startNode();
    const moduloLoc = this.state.startLoc;
    this.next();
    this.expectContextual(tt._checks);
    if (this.state.lastTokStartLoc.index > moduloLoc.index + 1) {
      this.raise(FlowErrors.UnexpectedSpaceBetweenModuloChecks, moduloLoc);
    }
    if (this.eat(tt.parenL)) {
      node.value = super.parseExpression();
      this.expect(tt.parenR);
      return this.finishNode(node, "DeclaredPredicate");
    } else {
      return this.finishNode(node, "InferredPredicate");
    }
  }
  flowParseTypeAndPredicateInitialiser() {
    const oldInType = this.state.inType;
    this.state.inType = true;
    this.expect(tt.colon);
    let type = null;
    let predicate = null;
    if (this.match(tt.modulo)) {
      this.state.inType = oldInType;
      predicate = this.flowParsePredicate();
    } else {
      type = this.flowParseType();
      this.state.inType = oldInType;
      if (this.match(tt.modulo)) {
        predicate = this.flowParsePredicate();
      }
    }
    return [type, predicate];
  }
  flowParseDeclareClass(node) {
    this.next();
    this.flowParseInterfaceish(
      node,
      /*isClass*/
      true
    );
    return this.finishNode(node, "DeclareClass");
  }
  flowParseDeclareFunction(node) {
    this.next();
    const id = node.id = this.parseIdentifier();
    const typeNode = this.startNode();
    const typeContainer = this.startNode();
    if (this.match(tt.lt)) {
      typeNode.typeParameters = this.flowParseTypeParameterDeclaration();
    } else {
      typeNode.typeParameters = null;
    }
    this.expect(tt.parenL);
    const tmp = this.flowParseFunctionTypeParams();
    typeNode.params = tmp.params;
    typeNode.rest = tmp.rest;
    typeNode.this = tmp._this;
    this.expect(tt.parenR);
    [typeNode.returnType, node.predicate] = this.flowParseTypeAndPredicateInitialiser();
    typeContainer.typeAnnotation = this.finishNode(
      typeNode,
      "FunctionTypeAnnotation"
    );
    id.typeAnnotation = this.finishNode(typeContainer, "TypeAnnotation");
    this.resetEndLocation(id);
    this.semicolon();
    this.scope.declareName(
      node.id.name,
      2048,
      node.id.loc.start
    );
    return this.finishNode(node, "DeclareFunction");
  }
  flowParseDeclare(node, insideModule) {
    if (this.match(tt._class)) {
      return this.flowParseDeclareClass(node);
    } else if (this.match(tt._function)) {
      return this.flowParseDeclareFunction(node);
    } else if (this.match(tt._var)) {
      return this.flowParseDeclareVariable(node);
    } else if (this.eatContextual(tt._module)) {
      if (this.match(tt.dot)) {
        return this.flowParseDeclareModuleExports(node);
      } else {
        if (insideModule) {
          this.raise(
            FlowErrors.NestedDeclareModule,
            this.state.lastTokStartLoc
          );
        }
        return this.flowParseDeclareModule(node);
      }
    } else if (this.isContextual(tt._type)) {
      return this.flowParseDeclareTypeAlias(node);
    } else if (this.isContextual(tt._opaque)) {
      return this.flowParseDeclareOpaqueType(node);
    } else if (this.isContextual(tt._interface)) {
      return this.flowParseDeclareInterface(node);
    } else if (this.match(tt._export)) {
      return this.flowParseDeclareExportDeclaration(node, insideModule);
    }
    throw this.unexpected();
  }
  flowParseDeclareVariable(node) {
    this.next();
    node.id = this.flowParseTypeAnnotatableIdentifier();
    this.scope.declareName(
      node.id.name,
      5,
      node.id.loc.start
    );
    this.semicolon();
    return this.finishNode(node, "DeclareVariable");
  }
  flowParseDeclareModule(node) {
    this.scope.enter(
      0
      /* OTHER */
    );
    if (this.match(tt.string)) {
      node.id = super.parseExprAtom();
    } else {
      node.id = this.parseIdentifier();
    }
    const bodyNode = node.body = this.startNode();
    const body = bodyNode.body = [];
    this.expect(tt.braceL);
    while (!this.match(tt.braceR)) {
      const bodyNode2 = this.startNode();
      if (this.match(tt._import)) {
        this.next();
        if (!this.isContextual(tt._type) && !this.match(tt._typeof)) {
          this.raise(
            FlowErrors.InvalidNonTypeImportInDeclareModule,
            this.state.lastTokStartLoc
          );
        }
        body.push(super.parseImport(bodyNode2));
      } else {
        this.expectContextual(
          tt._declare,
          FlowErrors.UnsupportedStatementInDeclareModule
        );
        body.push(this.flowParseDeclare(bodyNode2, true));
      }
    }
    this.scope.exit();
    this.expect(tt.braceR);
    this.finishNode(bodyNode, "BlockStatement");
    let kind = null;
    let hasModuleExport = false;
    body.forEach((bodyElement) => {
      if (isEsModuleType(bodyElement)) {
        if (kind === "CommonJS") {
          this.raise(FlowErrors.AmbiguousDeclareModuleKind, bodyElement);
        }
        kind = "ES";
      } else if (bodyElement.type === "DeclareModuleExports") {
        if (hasModuleExport) {
          this.raise(FlowErrors.DuplicateDeclareModuleExports, bodyElement);
        }
        if (kind === "ES") {
          this.raise(FlowErrors.AmbiguousDeclareModuleKind, bodyElement);
        }
        kind = "CommonJS";
        hasModuleExport = true;
      }
    });
    node.kind = kind || "CommonJS";
    return this.finishNode(node, "DeclareModule");
  }
  flowParseDeclareExportDeclaration(node, insideModule) {
    this.expect(tt._export);
    if (this.eat(tt._default)) {
      if (this.match(tt._function) || this.match(tt._class)) {
        node.declaration = this.flowParseDeclare(this.startNode());
      } else {
        node.declaration = this.flowParseType();
        this.semicolon();
      }
      node.default = true;
      return this.finishNode(node, "DeclareExportDeclaration");
    } else {
      if (this.match(tt._const) || this.isLet() || (this.isContextual(tt._type) || this.isContextual(tt._interface)) && !insideModule) {
        const label = this.state.value;
        throw this.raise(
          FlowErrors.UnsupportedDeclareExportKind,
          this.state.startLoc,
          {
            unsupportedExportKind: label,
            suggestion: exportSuggestions[label]
          }
        );
      }
      if (this.match(tt._var) || // declare export var ...
      this.match(tt._function) || // declare export function ...
      this.match(tt._class) || // declare export class ...
      this.isContextual(tt._opaque)) {
        node.declaration = this.flowParseDeclare(this.startNode());
        node.default = false;
        return this.finishNode(node, "DeclareExportDeclaration");
      } else if (this.match(tt.star) || // declare export * from ''
      this.match(tt.braceL) || // declare export {} ...
      this.isContextual(tt._interface) || // declare export interface ...
      this.isContextual(tt._type) || // declare export type ...
      this.isContextual(tt._opaque)) {
        node = this.parseExport(
          node,
          /* decorators */
          null
        );
        if (node.type === "ExportNamedDeclaration") {
          node.default = false;
          delete node.exportKind;
          return this.castNodeTo(
            node,
            "DeclareExportDeclaration"
          );
        } else {
          return this.castNodeTo(
            node,
            "DeclareExportAllDeclaration"
          );
        }
      }
    }
    throw this.unexpected();
  }
  flowParseDeclareModuleExports(node) {
    this.next();
    this.expectContextual(tt._exports);
    node.typeAnnotation = this.flowParseTypeAnnotation();
    this.semicolon();
    return this.finishNode(node, "DeclareModuleExports");
  }
  flowParseDeclareTypeAlias(node) {
    this.next();
    const finished = this.flowParseTypeAlias(
      node
    );
    this.castNodeTo(finished, "DeclareTypeAlias");
    return finished;
  }
  flowParseDeclareOpaqueType(node) {
    this.next();
    const finished = this.flowParseOpaqueType(
      node,
      true
    );
    this.castNodeTo(finished, "DeclareOpaqueType");
    return finished;
  }
  flowParseDeclareInterface(node) {
    this.next();
    this.flowParseInterfaceish(
      node,
      /* isClass */
      false
    );
    return this.finishNode(node, "DeclareInterface");
  }
  // Interfaces
  flowParseInterfaceish(node, isClass) {
    node.id = this.flowParseRestrictedIdentifier(
      /* liberal */
      !isClass,
      /* declaration */
      true
    );
    this.scope.declareName(
      node.id.name,
      isClass ? 17 : 8201,
      node.id.loc.start
    );
    if (this.match(tt.lt)) {
      node.typeParameters = this.flowParseTypeParameterDeclaration();
    } else {
      node.typeParameters = null;
    }
    node.extends = [];
    if (this.eat(tt._extends)) {
      do {
        node.extends.push(this.flowParseInterfaceExtends());
      } while (!isClass && this.eat(tt.comma));
    }
    if (isClass) {
      node.implements = [];
      node.mixins = [];
      if (this.eatContextual(tt._mixins)) {
        do {
          node.mixins.push(this.flowParseInterfaceExtends());
        } while (this.eat(tt.comma));
      }
      if (this.eatContextual(tt._implements)) {
        do {
          node.implements.push(this.flowParseInterfaceExtends());
        } while (this.eat(tt.comma));
      }
    }
    node.body = this.flowParseObjectType({
      allowStatic: isClass,
      allowExact: false,
      allowSpread: false,
      allowProto: isClass,
      allowInexact: false
    });
  }
  flowParseInterfaceExtends() {
    const node = this.startNode();
    node.id = this.flowParseQualifiedTypeIdentifier();
    if (this.match(tt.lt)) {
      node.typeParameters = this.flowParseTypeParameterInstantiation();
    } else {
      node.typeParameters = null;
    }
    return this.finishNode(node, "InterfaceExtends");
  }
  flowParseInterface(node) {
    this.flowParseInterfaceish(
      node,
      /* isClass */
      false
    );
    return this.finishNode(node, "InterfaceDeclaration");
  }
  checkNotUnderscore(word) {
    if (word === "_") {
      this.raise(
        FlowErrors.UnexpectedReservedUnderscore,
        this.state.startLoc
      );
    }
  }
  checkReservedType(word, startLoc, declaration) {
    if (!reservedTypes.has(word)) return;
    this.raise(
      declaration ? FlowErrors.AssignReservedType : FlowErrors.UnexpectedReservedType,
      startLoc,
      {
        reservedType: word
      }
    );
  }
  flowParseRestrictedIdentifierName(liberal, declaration) {
    this.checkReservedType(
      this.state.value,
      this.state.startLoc,
      declaration
    );
    return this.parseIdentifierName(liberal);
  }
  flowParseRestrictedIdentifier(liberal, declaration) {
    const node = this.startNode();
    const name = this.flowParseRestrictedIdentifierName(liberal, declaration);
    return this.createIdentifier(node, name);
  }
  // Type aliases
  flowParseTypeAlias(node) {
    node.id = this.flowParseRestrictedIdentifier(
      /* liberal */
      false,
      /* declaration */
      true
    );
    this.scope.declareName(
      node.id.name,
      8201,
      node.id.loc.start
    );
    if (this.match(tt.lt)) {
      node.typeParameters = this.flowParseTypeParameterDeclaration();
    } else {
      node.typeParameters = null;
    }
    node.right = this.flowParseTypeInitialiser(tt.eq);
    this.semicolon();
    return this.finishNode(node, "TypeAlias");
  }
  flowParseOpaqueType(node, declare) {
    this.expectContextual(tt._type);
    node.id = this.flowParseRestrictedIdentifier(
      /* liberal */
      true,
      /* declaration */
      true
    );
    this.scope.declareName(
      node.id.name,
      8201,
      node.id.loc.start
    );
    if (this.match(tt.lt)) {
      node.typeParameters = this.flowParseTypeParameterDeclaration();
    } else {
      node.typeParameters = null;
    }
    node.supertype = null;
    if (this.match(tt.colon)) {
      node.supertype = this.flowParseTypeInitialiser(tt.colon);
    }
    node.impltype = null;
    if (!declare) {
      node.impltype = this.flowParseTypeInitialiser(tt.eq);
    }
    this.semicolon();
    return this.finishNode(node, "OpaqueType");
  }
  // Type annotations
  flowParseTypeParameterBound() {
    if (this.match(tt.colon) || this.isContextual(tt._extends)) {
      const node = this.startNode();
      this.next();
      node.typeAnnotation = this.flowParseType();
      return this.finishNode(node, "TypeAnnotation");
    }
  }
  flowParseTypeParameter(requireDefault = false) {
    const nodeStartLoc = this.state.startLoc;
    const node = this.startNode();
    const variance = this.flowParseVariance();
    node.name = this.flowParseRestrictedIdentifierName();
    node.variance = variance;
    node.bound = this.flowParseTypeParameterBound();
    if (this.match(tt.eq)) {
      this.eat(tt.eq);
      node.default = this.flowParseType();
    } else {
      if (requireDefault) {
        this.raise(FlowErrors.MissingTypeParamDefault, nodeStartLoc);
      }
    }
    return this.finishNode(node, "TypeParameter");
  }
  flowParseTypeParameterDeclaration() {
    const oldInType = this.state.inType;
    const node = this.startNode();
    node.params = [];
    this.state.inType = true;
    if (this.match(tt.lt) || this.match(tt.jsxTagStart)) {
      this.next();
    } else {
      this.unexpected();
    }
    let defaultRequired = false;
    do {
      const typeParameter = this.flowParseTypeParameter(defaultRequired);
      node.params.push(typeParameter);
      if (typeParameter.default) {
        defaultRequired = true;
      }
      if (!this.match(tt.gt)) {
        this.expect(tt.comma);
      }
    } while (!this.match(tt.gt));
    this.expect(tt.gt);
    this.state.inType = oldInType;
    return this.finishNode(node, "TypeParameterDeclaration");
  }
  // Parse in top level normal context if we are in a JSX context
  flowInTopLevelContext(cb) {
    if (this.curContext() !== types.brace) {
      const oldContext = this.state.context;
      this.state.context = [oldContext[0]];
      try {
        return cb();
      } finally {
        this.state.context = oldContext;
      }
    } else {
      return cb();
    }
  }
  // Used when parsing type arguments from ES or JSX productions, where the first token
  // has been created without state.inType. Thus we need to re-scan the lt token.
  flowParseTypeParameterInstantiationInExpression() {
    if (this.reScan_lt() !== tt.lt) return;
    return this.flowParseTypeParameterInstantiation();
  }
  flowParseTypeParameterInstantiation() {
    const node = this.startNode();
    const oldInType = this.state.inType;
    this.state.inType = true;
    node.params = [];
    this.flowInTopLevelContext(() => {
      this.expect(tt.lt);
      const oldNoAnonFunctionType = this.state.noAnonFunctionType;
      this.state.noAnonFunctionType = false;
      while (!this.match(tt.gt)) {
        node.params.push(this.flowParseType());
        if (!this.match(tt.gt)) {
          this.expect(tt.comma);
        }
      }
      this.state.noAnonFunctionType = oldNoAnonFunctionType;
    });
    this.state.inType = oldInType;
    if (!this.state.inType && this.curContext() === types.brace) {
      this.reScan_lt_gt();
    }
    this.expect(tt.gt);
    return this.finishNode(node, "TypeParameterInstantiation");
  }
  flowParseTypeParameterInstantiationCallOrNew() {
    if (this.reScan_lt() !== tt.lt) return null;
    const node = this.startNode();
    const oldInType = this.state.inType;
    node.params = [];
    this.state.inType = true;
    this.expect(tt.lt);
    while (!this.match(tt.gt)) {
      node.params.push(this.flowParseTypeOrImplicitInstantiation());
      if (!this.match(tt.gt)) {
        this.expect(tt.comma);
      }
    }
    this.expect(tt.gt);
    this.state.inType = oldInType;
    return this.finishNode(node, "TypeParameterInstantiation");
  }
  flowParseInterfaceType() {
    const node = this.startNode();
    this.expectContextual(tt._interface);
    node.extends = [];
    if (this.eat(tt._extends)) {
      do {
        node.extends.push(this.flowParseInterfaceExtends());
      } while (this.eat(tt.comma));
    }
    node.body = this.flowParseObjectType({
      allowStatic: false,
      allowExact: false,
      allowSpread: false,
      allowProto: false,
      allowInexact: false
    });
    return this.finishNode(node, "InterfaceTypeAnnotation");
  }
  flowParseObjectPropertyKey() {
    return this.match(tt.num) || this.match(tt.string) ? super.parseExprAtom() : this.parseIdentifier(true);
  }
  flowParseObjectTypeIndexer(node, isStatic, variance) {
    node.static = isStatic;
    if (this.lookahead().type === tt.colon) {
      node.id = this.flowParseObjectPropertyKey();
      node.key = this.flowParseTypeInitialiser();
    } else {
      node.id = null;
      node.key = this.flowParseType();
    }
    this.expect(tt.bracketR);
    node.value = this.flowParseTypeInitialiser();
    node.variance = variance;
    return this.finishNode(node, "ObjectTypeIndexer");
  }
  flowParseObjectTypeInternalSlot(node, isStatic) {
    node.static = isStatic;
    node.id = this.flowParseObjectPropertyKey();
    this.expect(tt.bracketR);
    this.expect(tt.bracketR);
    if (this.match(tt.lt) || this.match(tt.parenL)) {
      node.method = true;
      node.optional = false;
      node.value = this.flowParseObjectTypeMethodish(
        this.startNodeAt(node.loc.start)
      );
    } else {
      node.method = false;
      if (this.eat(tt.question)) {
        node.optional = true;
      }
      node.value = this.flowParseTypeInitialiser();
    }
    return this.finishNode(node, "ObjectTypeInternalSlot");
  }
  flowParseObjectTypeMethodish(node) {
    node.params = [];
    node.rest = null;
    node.typeParameters = null;
    node.this = null;
    if (this.match(tt.lt)) {
      node.typeParameters = this.flowParseTypeParameterDeclaration();
    }
    this.expect(tt.parenL);
    if (this.match(tt._this)) {
      node.this = this.flowParseFunctionTypeParam(
        /* first */
        true
      );
      node.this.name = null;
      if (!this.match(tt.parenR)) {
        this.expect(tt.comma);
      }
    }
    while (!this.match(tt.parenR) && !this.match(tt.ellipsis)) {
      node.params.push(this.flowParseFunctionTypeParam(false));
      if (!this.match(tt.parenR)) {
        this.expect(tt.comma);
      }
    }
    if (this.eat(tt.ellipsis)) {
      node.rest = this.flowParseFunctionTypeParam(false);
    }
    this.expect(tt.parenR);
    node.returnType = this.flowParseTypeInitialiser();
    return this.finishNode(node, "FunctionTypeAnnotation");
  }
  flowParseObjectTypeCallProperty(node, isStatic) {
    const valueNode = this.startNode();
    node.static = isStatic;
    node.value = this.flowParseObjectTypeMethodish(valueNode);
    return this.finishNode(node, "ObjectTypeCallProperty");
  }
  flowParseObjectType({
    allowStatic,
    allowExact,
    allowSpread,
    allowProto,
    allowInexact
  }) {
    const oldInType = this.state.inType;
    this.state.inType = true;
    const nodeStart = this.startNode();
    nodeStart.callProperties = [];
    nodeStart.properties = [];
    nodeStart.indexers = [];
    nodeStart.internalSlots = [];
    let endDelim;
    let exact;
    let inexact = false;
    if (allowExact && this.match(tt.braceBarL)) {
      this.expect(tt.braceBarL);
      endDelim = tt.braceBarR;
      exact = true;
    } else {
      this.expect(tt.braceL);
      endDelim = tt.braceR;
      exact = false;
    }
    nodeStart.exact = exact;
    while (!this.match(endDelim)) {
      let isStatic = false;
      let protoStartLoc = null;
      let inexactStartLoc = null;
      const node = this.startNode();
      if (allowProto && this.isContextual(tt._proto)) {
        const lookahead = this.lookahead();
        if (lookahead.type !== tt.colon && lookahead.type !== tt.question) {
          this.next();
          protoStartLoc = this.state.startLoc;
          allowStatic = false;
        }
      }
      if (allowStatic && this.isContextual(tt._static)) {
        const lookahead = this.lookahead();
        if (lookahead.type !== tt.colon && lookahead.type !== tt.question) {
          this.next();
          isStatic = true;
        }
      }
      const variance = this.flowParseVariance();
      if (this.eat(tt.bracketL)) {
        if (protoStartLoc != null) {
          this.unexpected(protoStartLoc);
        }
        if (this.eat(tt.bracketL)) {
          if (variance) {
            this.unexpected(variance.loc.start);
          }
          nodeStart.internalSlots.push(
            this.flowParseObjectTypeInternalSlot(node, isStatic)
          );
        } else {
          nodeStart.indexers.push(
            this.flowParseObjectTypeIndexer(node, isStatic, variance)
          );
        }
      } else if (this.match(tt.parenL) || this.match(tt.lt)) {
        if (protoStartLoc != null) {
          this.unexpected(protoStartLoc);
        }
        if (variance) {
          this.unexpected(variance.loc.start);
        }
        nodeStart.callProperties.push(
          this.flowParseObjectTypeCallProperty(node, isStatic)
        );
      } else {
        let kind = "init";
        if (this.isContextual(tt._get) || this.isContextual(tt._set)) {
          const lookahead = this.lookahead();
          if (tokenIsLiteralPropertyName(lookahead.type)) {
            kind = this.state.value;
            this.next();
          }
        }
        const propOrInexact = this.flowParseObjectTypeProperty(
          node,
          isStatic,
          protoStartLoc,
          variance,
          kind,
          allowSpread,
          allowInexact ?? !exact
        );
        if (propOrInexact === null) {
          inexact = true;
          inexactStartLoc = this.state.lastTokStartLoc;
        } else {
          nodeStart.properties.push(propOrInexact);
        }
      }
      this.flowObjectTypeSemicolon();
      if (inexactStartLoc && !this.match(tt.braceR) && !this.match(tt.braceBarR)) {
        this.raise(
          FlowErrors.UnexpectedExplicitInexactInObject,
          inexactStartLoc
        );
      }
    }
    this.expect(endDelim);
    if (allowSpread) {
      nodeStart.inexact = inexact;
    }
    const out = this.finishNode(nodeStart, "ObjectTypeAnnotation");
    this.state.inType = oldInType;
    return out;
  }
  flowParseObjectTypeProperty(node, isStatic, protoStartLoc, variance, kind, allowSpread, allowInexact) {
    if (this.eat(tt.ellipsis)) {
      const isInexactToken = this.match(tt.comma) || this.match(tt.semi) || this.match(tt.braceR) || this.match(tt.braceBarR);
      if (isInexactToken) {
        if (!allowSpread) {
          this.raise(
            FlowErrors.InexactInsideNonObject,
            this.state.lastTokStartLoc
          );
        } else if (!allowInexact) {
          this.raise(
            FlowErrors.InexactInsideExact,
            this.state.lastTokStartLoc
          );
        }
        if (variance) {
          this.raise(FlowErrors.InexactVariance, variance);
        }
        return null;
      }
      if (!allowSpread) {
        this.raise(
          FlowErrors.UnexpectedSpreadType,
          this.state.lastTokStartLoc
        );
      }
      if (protoStartLoc != null) {
        this.unexpected(protoStartLoc);
      }
      if (variance) {
        this.raise(FlowErrors.SpreadVariance, variance);
      }
      node.argument = this.flowParseType();
      return this.finishNode(node, "ObjectTypeSpreadProperty");
    } else {
      node.key = this.flowParseObjectPropertyKey();
      node.static = isStatic;
      node.proto = protoStartLoc != null;
      node.kind = kind;
      let optional = false;
      if (this.match(tt.lt) || this.match(tt.parenL)) {
        node.method = true;
        if (protoStartLoc != null) {
          this.unexpected(protoStartLoc);
        }
        if (variance) {
          this.unexpected(variance.loc.start);
        }
        node.value = this.flowParseObjectTypeMethodish(
          this.startNodeAt(node.loc.start)
        );
        if (kind === "get" || kind === "set") {
          this.flowCheckGetterSetterParams(node);
        }
        if (!allowSpread && node.key.name === "constructor" && node.value.this) {
          this.raise(
            FlowErrors.ThisParamBannedInConstructor,
            node.value.this
          );
        }
      } else {
        if (kind !== "init") this.unexpected();
        node.method = false;
        if (this.eat(tt.question)) {
          optional = true;
        }
        node.value = this.flowParseTypeInitialiser();
        node.variance = variance;
      }
      node.optional = optional;
      return this.finishNode(node, "ObjectTypeProperty");
    }
  }
  // This is similar to checkGetterSetterParams, but as
  // @babel/parser uses non estree properties we cannot reuse it here
  flowCheckGetterSetterParams(property) {
    const paramCount = property.kind === "get" ? 0 : 1;
    const length = property.value.params.length + (property.value.rest ? 1 : 0);
    if (property.value.this) {
      this.raise(
        property.kind === "get" ? FlowErrors.GetterMayNotHaveThisParam : FlowErrors.SetterMayNotHaveThisParam,
        property.value.this
      );
    }
    if (length !== paramCount) {
      this.raise(
        property.kind === "get" ? Errors.BadGetterArity : Errors.BadSetterArity,
        property
      );
    }
    if (property.kind === "set" && property.value.rest) {
      this.raise(Errors.BadSetterRestParameter, property);
    }
  }
  flowObjectTypeSemicolon() {
    if (!this.eat(tt.semi) && !this.eat(tt.comma) && !this.match(tt.braceR) && !this.match(tt.braceBarR)) {
      this.unexpected();
    }
  }
  flowParseQualifiedTypeIdentifier(startLoc, id) {
    startLoc ??= this.state.startLoc;
    let node = id || this.flowParseRestrictedIdentifier(true);
    while (this.eat(tt.dot)) {
      const node2 = this.startNodeAt(startLoc);
      node2.qualification = node;
      node2.id = this.flowParseRestrictedIdentifier(true);
      node = this.finishNode(node2, "QualifiedTypeIdentifier");
    }
    return node;
  }
  flowParseGenericType(startLoc, id) {
    const node = this.startNodeAt(startLoc);
    node.typeParameters = null;
    node.id = this.flowParseQualifiedTypeIdentifier(startLoc, id);
    if (this.match(tt.lt)) {
      node.typeParameters = this.flowParseTypeParameterInstantiation();
    }
    return this.finishNode(node, "GenericTypeAnnotation");
  }
  flowParseTypeofType() {
    const node = this.startNode();
    this.expect(tt._typeof);
    node.argument = this.flowParsePrimaryType();
    return this.finishNode(node, "TypeofTypeAnnotation");
  }
  flowParseTupleType() {
    const node = this.startNode();
    node.types = [];
    this.expect(tt.bracketL);
    while (this.state.pos < this.length && !this.match(tt.bracketR)) {
      node.types.push(this.flowParseType());
      if (this.match(tt.bracketR)) break;
      this.expect(tt.comma);
    }
    this.expect(tt.bracketR);
    return this.finishNode(node, "TupleTypeAnnotation");
  }
  flowParseFunctionTypeParam(first) {
    let name = null;
    let optional = false;
    let typeAnnotation = null;
    const node = this.startNode();
    const lh = this.lookahead();
    const isThis = this.state.type === tt._this;
    if (lh.type === tt.colon || lh.type === tt.question) {
      if (isThis && !first) {
        this.raise(FlowErrors.ThisParamMustBeFirst, node);
      }
      name = this.parseIdentifier(isThis);
      if (this.eat(tt.question)) {
        optional = true;
        if (isThis) {
          this.raise(FlowErrors.ThisParamMayNotBeOptional, node);
        }
      }
      typeAnnotation = this.flowParseTypeInitialiser();
    } else {
      typeAnnotation = this.flowParseType();
    }
    node.name = name;
    node.optional = optional;
    node.typeAnnotation = typeAnnotation;
    return this.finishNode(node, "FunctionTypeParam");
  }
  reinterpretTypeAsFunctionTypeParam(type) {
    const node = this.startNodeAt(type.loc.start);
    node.name = null;
    node.optional = false;
    node.typeAnnotation = type;
    return this.finishNode(node, "FunctionTypeParam");
  }
  flowParseFunctionTypeParams(params = []) {
    let rest = null;
    let _this = null;
    if (this.match(tt._this)) {
      _this = this.flowParseFunctionTypeParam(
        /* first */
        true
      );
      _this.name = null;
      if (!this.match(tt.parenR)) {
        this.expect(tt.comma);
      }
    }
    while (!this.match(tt.parenR) && !this.match(tt.ellipsis)) {
      params.push(this.flowParseFunctionTypeParam(false));
      if (!this.match(tt.parenR)) {
        this.expect(tt.comma);
      }
    }
    if (this.eat(tt.ellipsis)) {
      rest = this.flowParseFunctionTypeParam(false);
    }
    return { params, rest, _this };
  }
  flowIdentToTypeAnnotation(startLoc, node, id) {
    switch (id.name) {
      case "any":
        return this.finishNode(node, "AnyTypeAnnotation");
      case "bool":
      case "boolean":
        return this.finishNode(node, "BooleanTypeAnnotation");
      case "mixed":
        return this.finishNode(node, "MixedTypeAnnotation");
      case "empty":
        return this.finishNode(node, "EmptyTypeAnnotation");
      case "number":
        return this.finishNode(node, "NumberTypeAnnotation");
      case "string":
        return this.finishNode(node, "StringTypeAnnotation");
      case "symbol":
        return this.finishNode(node, "SymbolTypeAnnotation");
      default:
        this.checkNotUnderscore(id.name);
        return this.flowParseGenericType(startLoc, id);
    }
  }
  // The parsing of types roughly parallels the parsing of expressions, and
  // primary types are kind of like primary expressions...they're the
  // primitives with which other types are constructed.
  flowParsePrimaryType() {
    const startLoc = this.state.startLoc;
    const node = this.startNode();
    let tmp;
    let type;
    let isGroupedType = false;
    const oldNoAnonFunctionType = this.state.noAnonFunctionType;
    switch (this.state.type) {
      case tt.braceL:
        return this.flowParseObjectType({
          allowStatic: false,
          allowExact: false,
          allowSpread: true,
          allowProto: false,
          allowInexact: true
        });
      case tt.braceBarL:
        return this.flowParseObjectType({
          allowStatic: false,
          allowExact: true,
          allowSpread: true,
          allowProto: false,
          allowInexact: false
        });
      case tt.bracketL:
        this.state.noAnonFunctionType = false;
        type = this.flowParseTupleType();
        this.state.noAnonFunctionType = oldNoAnonFunctionType;
        return type;
      case tt.lt: {
        const node2 = this.startNode();
        node2.typeParameters = this.flowParseTypeParameterDeclaration();
        this.expect(tt.parenL);
        tmp = this.flowParseFunctionTypeParams();
        node2.params = tmp.params;
        node2.rest = tmp.rest;
        node2.this = tmp._this;
        this.expect(tt.parenR);
        this.expect(tt.arrow);
        node2.returnType = this.flowParseType();
        return this.finishNode(node2, "FunctionTypeAnnotation");
      }
      case tt.parenL: {
        const node2 = this.startNode();
        this.next();
        if (!this.match(tt.parenR) && !this.match(tt.ellipsis)) {
          if (tokenIsIdentifier(this.state.type) || this.match(tt._this)) {
            const token = this.lookahead().type;
            isGroupedType = token !== tt.question && token !== tt.colon;
          } else {
            isGroupedType = true;
          }
        }
        if (isGroupedType) {
          this.state.noAnonFunctionType = false;
          type = this.flowParseType();
          this.state.noAnonFunctionType = oldNoAnonFunctionType;
          if (this.state.noAnonFunctionType || !(this.match(tt.comma) || this.match(tt.parenR) && this.lookahead().type === tt.arrow)) {
            this.expect(tt.parenR);
            return type;
          } else {
            this.eat(tt.comma);
          }
        }
        if (type) {
          tmp = this.flowParseFunctionTypeParams([
            this.reinterpretTypeAsFunctionTypeParam(type)
          ]);
        } else {
          tmp = this.flowParseFunctionTypeParams();
        }
        node2.params = tmp.params;
        node2.rest = tmp.rest;
        node2.this = tmp._this;
        this.expect(tt.parenR);
        this.expect(tt.arrow);
        node2.returnType = this.flowParseType();
        node2.typeParameters = null;
        return this.finishNode(node2, "FunctionTypeAnnotation");
      }
      case tt.string:
        return this.parseLiteral(
          this.state.value,
          "StringLiteralTypeAnnotation"
        );
      case tt._true:
      case tt._false:
        node.value = this.match(tt._true);
        this.next();
        return this.finishNode(
          node,
          "BooleanLiteralTypeAnnotation"
        );
      case tt.plusMin:
        if (this.state.value === "-") {
          this.next();
          if (this.match(tt.num)) {
            return this.parseLiteralAtNode(
              -this.state.value,
              "NumberLiteralTypeAnnotation",
              node
            );
          }
          if (this.match(tt.bigint)) {
            return this.parseLiteralAtNode(
              -this.state.value,
              "BigIntLiteralTypeAnnotation",
              node
            );
          }
          throw this.raise(
            FlowErrors.UnexpectedSubtractionOperand,
            this.state.startLoc
          );
        }
        throw this.unexpected();
      case tt.num:
        return this.parseLiteral(
          this.state.value,
          "NumberLiteralTypeAnnotation"
        );
      case tt.bigint:
        return this.parseLiteral(
          this.state.value,
          "BigIntLiteralTypeAnnotation"
        );
      case tt._void:
        this.next();
        return this.finishNode(node, "VoidTypeAnnotation");
      case tt._null:
        this.next();
        return this.finishNode(node, "NullLiteralTypeAnnotation");
      case tt._this:
        this.next();
        return this.finishNode(node, "ThisTypeAnnotation");
      case tt.star:
        this.next();
        return this.finishNode(node, "ExistsTypeAnnotation");
      case tt._typeof:
        return this.flowParseTypeofType();
      default:
        if (tokenIsKeyword(this.state.type)) {
          const label = tokenLabelName(this.state.type);
          this.next();
          return super.createIdentifier(node, label);
        } else if (tokenIsIdentifier(this.state.type)) {
          if (this.isContextual(tt._interface)) {
            return this.flowParseInterfaceType();
          }
          return this.flowIdentToTypeAnnotation(
            startLoc,
            node,
            this.parseIdentifier()
          );
        }
    }
    throw this.unexpected();
  }
  flowParsePostfixType() {
    const startLoc = this.state.startLoc;
    let type = this.flowParsePrimaryType();
    let seenOptionalIndexedAccess = false;
    while ((this.match(tt.bracketL) || this.match(tt.questionDot)) && !this.canInsertSemicolon()) {
      const node = this.startNodeAt(startLoc);
      const optional = this.eat(tt.questionDot);
      seenOptionalIndexedAccess = seenOptionalIndexedAccess || optional;
      this.expect(tt.bracketL);
      if (!optional && this.match(tt.bracketR)) {
        node.elementType = type;
        this.next();
        type = this.finishNode(node, "ArrayTypeAnnotation");
      } else {
        node.objectType = type;
        node.indexType = this.flowParseType();
        this.expect(tt.bracketR);
        if (seenOptionalIndexedAccess) {
          node.optional = optional;
          type = this.finishNode(
            // @ts-expect-error todo(flow->ts)
            node,
            "OptionalIndexedAccessType"
          );
        } else {
          type = this.finishNode(
            // @ts-expect-error todo(flow->ts)
            node,
            "IndexedAccessType"
          );
        }
      }
    }
    return type;
  }
  flowParsePrefixType() {
    const node = this.startNode();
    if (this.eat(tt.question)) {
      node.typeAnnotation = this.flowParsePrefixType();
      return this.finishNode(node, "NullableTypeAnnotation");
    } else {
      return this.flowParsePostfixType();
    }
  }
  flowParseAnonFunctionWithoutParens() {
    const param = this.flowParsePrefixType();
    if (!this.state.noAnonFunctionType && this.eat(tt.arrow)) {
      const node = this.startNodeAt(
        param.loc.start
      );
      node.params = [this.reinterpretTypeAsFunctionTypeParam(param)];
      node.rest = null;
      node.this = null;
      node.returnType = this.flowParseType();
      node.typeParameters = null;
      return this.finishNode(node, "FunctionTypeAnnotation");
    }
    return param;
  }
  flowParseIntersectionType() {
    const node = this.startNode();
    this.eat(tt.bitwiseAND);
    const type = this.flowParseAnonFunctionWithoutParens();
    node.types = [type];
    while (this.eat(tt.bitwiseAND)) {
      node.types.push(this.flowParseAnonFunctionWithoutParens());
    }
    return node.types.length === 1 ? type : this.finishNode(node, "IntersectionTypeAnnotation");
  }
  flowParseUnionType() {
    const node = this.startNode();
    this.eat(tt.bitwiseOR);
    const type = this.flowParseIntersectionType();
    node.types = [type];
    while (this.eat(tt.bitwiseOR)) {
      node.types.push(this.flowParseIntersectionType());
    }
    return node.types.length === 1 ? type : this.finishNode(node, "UnionTypeAnnotation");
  }
  flowParseType() {
    const oldInType = this.state.inType;
    this.state.inType = true;
    const type = this.flowParseUnionType();
    this.state.inType = oldInType;
    return type;
  }
  flowParseTypeOrImplicitInstantiation() {
    if (this.state.type === tt.name && this.state.value === "_") {
      const startLoc = this.state.startLoc;
      const node = this.parseIdentifier();
      return this.flowParseGenericType(startLoc, node);
    } else {
      return this.flowParseType();
    }
  }
  flowParseTypeAnnotation() {
    const node = this.startNode();
    node.typeAnnotation = this.flowParseTypeInitialiser();
    return this.finishNode(node, "TypeAnnotation");
  }
  flowParseTypeAnnotatableIdentifier() {
    const node = this.startNode();
    const name = this.parseIdentifierName();
    if (this.match(tt.colon)) {
      node.typeAnnotation = this.flowParseTypeAnnotation();
    }
    return this.createIdentifier(node, name);
  }
  typeCastToParameter(node) {
    node.expression.typeAnnotation = node.typeAnnotation;
    this.resetEndLocation(node.expression, node.typeAnnotation.loc.end);
    return node.expression;
  }
  flowParseVariance() {
    let variance = null;
    if (this.match(tt.plusMin)) {
      variance = this.startNode();
      if (this.state.value === "+") {
        variance.kind = "plus";
      } else {
        variance.kind = "minus";
      }
      this.next();
      return this.finishNode(variance, "Variance");
    }
    return variance;
  }
  // ==================================
  // Overrides
  // ==================================
  parseFunctionBody(node, allowExpressionBody, isMethod = false) {
    if (allowExpressionBody) {
      this.forwardNoArrowParamsConversionAt(
        node,
        () => super.parseFunctionBody(node, true, isMethod)
      );
      return;
    }
    super.parseFunctionBody(node, false, isMethod);
  }
  parseFunctionBodyAndFinish(node, type, isMethod = false) {
    if (this.match(tt.colon)) {
      const typeNode = this.startNode();
      [
        typeNode.typeAnnotation,
        // @ts-expect-error predicate may not exist
        node.predicate
      ] = this.flowParseTypeAndPredicateInitialiser();
      node.returnType = typeNode.typeAnnotation ? this.finishNode(typeNode, "TypeAnnotation") : null;
    }
    return super.parseFunctionBodyAndFinish(node, type, isMethod);
  }
  // interfaces and enums
  parseStatementLike(flags) {
    if (this.state.strict && this.isContextual(tt._interface)) {
      const lookahead = this.lookahead();
      if (tokenIsKeywordOrIdentifier(lookahead.type)) {
        const node = this.startNode();
        this.next();
        return this.flowParseInterface(node);
      }
    } else if (this.isContextual(tt._enum)) {
      const node = this.startNode();
      this.next();
      return this.flowParseEnumDeclaration(node);
    }
    const stmt = super.parseStatementLike(flags);
    if (this.flowPragma === void 0 && !this.isValidDirective(stmt)) {
      this.flowPragma = null;
    }
    return stmt;
  }
  // declares, interfaces and type aliases
  parseExpressionStatement(node, expr, decorators) {
    if (expr.type === "Identifier") {
      if (expr.name === "declare") {
        if (this.match(tt._class) || tokenIsIdentifier(this.state.type) || this.match(tt._function) || this.match(tt._var) || this.match(tt._export)) {
          return this.flowParseDeclare(node);
        }
      } else if (tokenIsIdentifier(this.state.type)) {
        if (expr.name === "interface") {
          return this.flowParseInterface(node);
        } else if (expr.name === "type") {
          return this.flowParseTypeAlias(node);
        } else if (expr.name === "opaque") {
          return this.flowParseOpaqueType(node, false);
        }
      }
    }
    return super.parseExpressionStatement(node, expr, decorators);
  }
  // export type
  shouldParseExportDeclaration() {
    const { type } = this.state;
    if (type === tt._enum || tokenIsFlowInterfaceOrTypeOrOpaque(type)) {
      return !this.state.containsEsc;
    }
    return super.shouldParseExportDeclaration();
  }
  isExportDefaultSpecifier() {
    const { type } = this.state;
    if (type === tt._enum || tokenIsFlowInterfaceOrTypeOrOpaque(type)) {
      return this.state.containsEsc;
    }
    return super.isExportDefaultSpecifier();
  }
  parseExportDefaultExpression() {
    if (this.isContextual(tt._enum)) {
      const node = this.startNode();
      this.next();
      return this.flowParseEnumDeclaration(node);
    }
    return super.parseExportDefaultExpression();
  }
  parseConditional(expr, startLoc, refExpressionErrors) {
    if (!this.match(tt.question)) return expr;
    if (this.state.maybeInArrowParameters) {
      const nextCh = this.lookaheadCharCode();
      if (nextCh === charCodes.comma || // (a?, b) => c
      nextCh === charCodes.equalsTo || // (a? = b) => c
      nextCh === charCodes.colon || // (a?: b) => c
      nextCh === charCodes.rightParenthesis) {
        this.setOptionalParametersError(refExpressionErrors);
        return expr;
      }
    }
    this.expect(tt.question);
    const state = this.state.clone();
    const originalNoArrowAt = this.state.noArrowAt;
    const node = this.startNodeAt(startLoc);
    let { consequent, failed } = this.tryParseConditionalConsequent();
    let [valid, invalid] = this.getArrowLikeExpressions(consequent);
    if (failed || invalid.length > 0) {
      const noArrowAt = [...originalNoArrowAt];
      if (invalid.length > 0) {
        this.state = state;
        this.state.noArrowAt = noArrowAt;
        for (let i = 0; i < invalid.length; i++) {
          noArrowAt.push(invalid[i].start);
        }
        ({ consequent, failed } = this.tryParseConditionalConsequent());
        [valid, invalid] = this.getArrowLikeExpressions(consequent);
      }
      if (failed && valid.length > 1) {
        this.raise(FlowErrors.AmbiguousConditionalArrow, state.startLoc);
      }
      if (failed && valid.length === 1) {
        this.state = state;
        noArrowAt.push(valid[0].start);
        this.state.noArrowAt = noArrowAt;
        ({ consequent, failed } = this.tryParseConditionalConsequent());
      }
    }
    this.getArrowLikeExpressions(consequent, true);
    this.state.noArrowAt = originalNoArrowAt;
    this.expect(tt.colon);
    node.test = expr;
    node.consequent = consequent;
    node.alternate = this.forwardNoArrowParamsConversionAt(
      node,
      () => this.parseMaybeAssign(void 0, void 0)
    );
    return this.finishNode(node, "ConditionalExpression");
  }
  tryParseConditionalConsequent() {
    this.state.noArrowParamsConversionAt.push(this.state.start);
    const consequent = this.parseMaybeAssignAllowIn();
    const failed = !this.match(tt.colon);
    this.state.noArrowParamsConversionAt.pop();
    return { consequent, failed };
  }
  // Given an expression, walks through out its arrow functions whose body is
  // an expression and through out conditional expressions. It returns every
  // function which has been parsed with a return type but could have been
  // parenthesized expressions.
  // These functions are separated into two arrays: one containing the ones
  // whose parameters can be converted to assignable lists, one containing the
  // others.
  getArrowLikeExpressions(node, disallowInvalid) {
    const stack = [node];
    const arrows = [];
    while (stack.length !== 0) {
      const node2 = stack.pop();
      if (node2.type === "ArrowFunctionExpression" && node2.body.type !== "BlockStatement") {
        if (node2.typeParameters || !node2.returnType) {
          this.finishArrowValidation(node2);
        } else {
          arrows.push(node2);
        }
        stack.push(node2.body);
      } else if (node2.type === "ConditionalExpression") {
        stack.push(node2.consequent);
        stack.push(node2.alternate);
      }
    }
    if (disallowInvalid) {
      arrows.forEach((node2) => this.finishArrowValidation(node2));
      return [arrows, []];
    }
    return partition(
      arrows,
      (node2) => node2.params.every((param) => this.isAssignable(param, true))
    );
  }
  finishArrowValidation(node) {
    this.toAssignableList(
      // node.params is Expression[] instead of $ReadOnlyArray<Pattern> because it
      // has not been converted yet.
      node.params,
      node.extra?.trailingCommaLoc,
      /* isLHS */
      false
    );
    this.scope.enter(
      514 | 4
      /* ARROW */
    );
    super.checkParams(node, false, true);
    this.scope.exit();
  }
  forwardNoArrowParamsConversionAt(node, parse) {
    let result;
    if (this.state.noArrowParamsConversionAt.includes(
      this.offsetToSourcePos(node.start)
    )) {
      this.state.noArrowParamsConversionAt.push(this.state.start);
      result = parse();
      this.state.noArrowParamsConversionAt.pop();
    } else {
      result = parse();
    }
    return result;
  }
  parseParenItem(node, startLoc) {
    const newNode = super.parseParenItem(node, startLoc);
    if (this.eat(tt.question)) {
      newNode.optional = true;
      this.resetEndLocation(node);
    }
    if (this.match(tt.colon)) {
      const typeCastNode = this.startNodeAt(startLoc);
      typeCastNode.expression = newNode;
      typeCastNode.typeAnnotation = this.flowParseTypeAnnotation();
      return this.finishNode(typeCastNode, "TypeCastExpression");
    }
    return newNode;
  }
  assertModuleNodeAllowed(node) {
    if (node.type === "ImportDeclaration" && (node.importKind === "type" || node.importKind === "typeof") || node.type === "ExportNamedDeclaration" && node.exportKind === "type" || node.type === "ExportAllDeclaration" && node.exportKind === "type") {
      return;
    }
    super.assertModuleNodeAllowed(node);
  }
  parseExportDeclaration(node) {
    if (this.isContextual(tt._type)) {
      node.exportKind = "type";
      const declarationNode = this.startNode();
      this.next();
      if (this.match(tt.braceL)) {
        node.specifiers = this.parseExportSpecifiers(
          /* isInTypeExport */
          true
        );
        super.parseExportFrom(node);
        return null;
      } else {
        return this.flowParseTypeAlias(declarationNode);
      }
    } else if (this.isContextual(tt._opaque)) {
      node.exportKind = "type";
      const declarationNode = this.startNode();
      this.next();
      return this.flowParseOpaqueType(declarationNode, false);
    } else if (this.isContextual(tt._interface)) {
      node.exportKind = "type";
      const declarationNode = this.startNode();
      this.next();
      return this.flowParseInterface(declarationNode);
    } else if (this.isContextual(tt._enum)) {
      node.exportKind = "value";
      const declarationNode = this.startNode();
      this.next();
      return this.flowParseEnumDeclaration(declarationNode);
    } else {
      return super.parseExportDeclaration(node);
    }
  }
  eatExportStar(node) {
    if (super.eatExportStar(node)) return true;
    if (this.isContextual(tt._type) && this.lookahead().type === tt.star) {
      node.exportKind = "type";
      this.next();
      this.next();
      return true;
    }
    return false;
  }
  maybeParseExportNamespaceSpecifier(node) {
    const { startLoc } = this.state;
    const hasNamespace = super.maybeParseExportNamespaceSpecifier(node);
    if (hasNamespace && node.exportKind === "type") {
      this.unexpected(startLoc);
    }
    return hasNamespace;
  }
  parseClassId(node, isStatement, optionalId) {
    super.parseClassId(node, isStatement, optionalId);
    if (this.match(tt.lt)) {
      node.typeParameters = this.flowParseTypeParameterDeclaration();
    }
  }
  parseClassMember(classBody, member, state) {
    const { startLoc } = this.state;
    if (this.isContextual(tt._declare)) {
      if (super.parseClassMemberFromModifier(classBody, member)) {
        return;
      }
      member.declare = true;
    }
    super.parseClassMember(classBody, member, state);
    if (member.declare) {
      if (member.type !== "ClassProperty" && member.type !== "ClassPrivateProperty" && member.type !== "PropertyDefinition") {
        this.raise(FlowErrors.DeclareClassElement, startLoc);
      } else if (member.value) {
        this.raise(FlowErrors.DeclareClassFieldInitializer, member.value);
      }
    }
  }
  isIterator(word) {
    return word === "iterator" || word === "asyncIterator";
  }
  readIterator() {
    const word = super.readWord1();
    const fullWord = "@@" + word;
    if (!this.isIterator(word) || !this.state.inType) {
      this.raise(Errors.InvalidIdentifier, this.state.curPosition(), {
        identifierName: fullWord
      });
    }
    this.finishToken(tt.name, fullWord);
  }
  // ensure that inside flow types, we bypass the jsx parser plugin
  getTokenFromCode(code) {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (code === charCodes.leftCurlyBrace && next === charCodes.verticalBar) {
      this.finishOp(tt.braceBarL, 2);
    } else if (this.state.inType && (code === charCodes.greaterThan || code === charCodes.lessThan)) {
      this.finishOp(code === charCodes.greaterThan ? tt.gt : tt.lt, 1);
    } else if (this.state.inType && code === charCodes.questionMark) {
      if (next === charCodes.dot) {
        this.finishOp(tt.questionDot, 2);
      } else {
        this.finishOp(tt.question, 1);
      }
    } else if (isIteratorStart(code, next, this.input.charCodeAt(this.state.pos + 2))) {
      this.state.pos += 2;
      this.readIterator();
    } else {
      super.getTokenFromCode(code);
    }
  }
  isAssignable(node, isBinding) {
    if (node.type === "TypeCastExpression") {
      return this.isAssignable(node.expression, isBinding);
    } else {
      return super.isAssignable(node, isBinding);
    }
  }
  toAssignable(node, isLHS = false) {
    if (!isLHS && node.type === "AssignmentExpression" && node.left.type === "TypeCastExpression") {
      node.left = this.typeCastToParameter(node.left);
    }
    super.toAssignable(node, isLHS);
  }
  // turn type casts that we found in function parameter head into type annotated params
  toAssignableList(exprList, trailingCommaLoc, isLHS) {
    for (let i = 0; i < exprList.length; i++) {
      const expr = exprList[i];
      if (expr?.type === "TypeCastExpression") {
        exprList[i] = this.typeCastToParameter(expr);
      }
    }
    super.toAssignableList(exprList, trailingCommaLoc, isLHS);
  }
  // this is a list of nodes, from something like a call expression, we need to filter the
  // type casts that we've found that are illegal in this context
  toReferencedList(exprList, isParenthesizedExpr) {
    for (let i = 0; i < exprList.length; i++) {
      const expr = exprList[i];
      if (expr && expr.type === "TypeCastExpression" && !expr.extra?.parenthesized && (exprList.length > 1 || !isParenthesizedExpr)) {
        this.raise(FlowErrors.TypeCastInPattern, expr.typeAnnotation);
      }
    }
    return exprList;
  }
  parseArrayLike(close, isTuple, refExpressionErrors) {
    const node = super.parseArrayLike(close, isTuple, refExpressionErrors);
    if (refExpressionErrors != null && !this.state.maybeInArrowParameters) {
      this.toReferencedList(node.elements);
    }
    return node;
  }
  isValidLVal(type, disallowCallExpression, isParenthesized, binding) {
    return type === "TypeCastExpression" || super.isValidLVal(
      type,
      disallowCallExpression,
      isParenthesized,
      binding
    );
  }
  // parse class property type annotations
  parseClassProperty(node) {
    if (this.match(tt.colon)) {
      node.typeAnnotation = this.flowParseTypeAnnotation();
    }
    return super.parseClassProperty(node);
  }
  parseClassPrivateProperty(node) {
    if (this.match(tt.colon)) {
      node.typeAnnotation = this.flowParseTypeAnnotation();
    }
    return super.parseClassPrivateProperty(node);
  }
  // determine whether or not we're currently in the position where a class method would appear
  isClassMethod() {
    return this.match(tt.lt) || super.isClassMethod();
  }
  // determine whether or not we're currently in the position where a class property would appear
  isClassProperty() {
    return this.match(tt.colon) || super.isClassProperty();
  }
  isNonstaticConstructor(method) {
    return !this.match(tt.colon) && super.isNonstaticConstructor(method);
  }
  // parse type parameters for class methods
  pushClassMethod(classBody, method, isGenerator, isAsync, isConstructor, allowsDirectSuper) {
    if (method.variance) {
      this.unexpected(method.variance.loc.start);
    }
    delete method.variance;
    if (this.match(tt.lt)) {
      method.typeParameters = this.flowParseTypeParameterDeclaration();
    }
    super.pushClassMethod(
      classBody,
      method,
      isGenerator,
      isAsync,
      isConstructor,
      allowsDirectSuper
    );
    if (method.params && isConstructor) {
      const params = method.params;
      if (params.length > 0 && this.isThisParam(params[0])) {
        this.raise(FlowErrors.ThisParamBannedInConstructor, method);
      }
    } else if (
      // @ts-expect-error TS does not know about the fact that estree can replace ClassMethod with MethodDefinition
      method.type === "MethodDefinition" && isConstructor && // @ts-expect-error estree
      method.value.params
    ) {
      const params = method.value.params;
      if (params.length > 0 && this.isThisParam(params[0])) {
        this.raise(FlowErrors.ThisParamBannedInConstructor, method);
      }
    }
  }
  pushClassPrivateMethod(classBody, method, isGenerator, isAsync) {
    if (method.variance) {
      this.unexpected(method.variance.loc.start);
    }
    delete method.variance;
    if (this.match(tt.lt)) {
      method.typeParameters = this.flowParseTypeParameterDeclaration();
    }
    super.pushClassPrivateMethod(classBody, method, isGenerator, isAsync);
  }
  // parse a the super class type parameters and implements
  parseClassSuper(node) {
    super.parseClassSuper(node);
    if (node.superClass && (this.match(tt.lt) || // handles `class extends C<<T>`
    this.match(tt.bitShiftL))) {
      {
        node.superTypeParameters = this.flowParseTypeParameterInstantiationInExpression();
      }
    }
    if (this.isContextual(tt._implements)) {
      this.next();
      const implemented = node.implements = [];
      do {
        const node2 = this.startNode();
        node2.id = this.flowParseRestrictedIdentifier(
          /*liberal*/
          true
        );
        if (this.match(tt.lt)) {
          node2.typeParameters = this.flowParseTypeParameterInstantiation();
        } else {
          node2.typeParameters = null;
        }
        implemented.push(this.finishNode(node2, "ClassImplements"));
      } while (this.eat(tt.comma));
    }
  }
  checkGetterSetterParams(method) {
    super.checkGetterSetterParams(method);
    const params = this.getObjectOrClassMethodParams(method);
    if (params.length > 0) {
      const param = params[0];
      if (this.isThisParam(param) && method.kind === "get") {
        this.raise(FlowErrors.GetterMayNotHaveThisParam, param);
      } else if (this.isThisParam(param)) {
        this.raise(FlowErrors.SetterMayNotHaveThisParam, param);
      }
    }
  }
  parsePropertyNamePrefixOperator(node) {
    node.variance = this.flowParseVariance();
  }
  // parse type parameters for object method shorthand
  parseObjPropValue(prop, startLoc, isGenerator, isAsync, isPattern, isAccessor, refExpressionErrors) {
    if (prop.variance) {
      this.unexpected(prop.variance.loc.start);
    }
    delete prop.variance;
    let typeParameters;
    if (this.match(tt.lt) && !isAccessor) {
      typeParameters = this.flowParseTypeParameterDeclaration();
      if (!this.match(tt.parenL)) this.unexpected();
    }
    const result = super.parseObjPropValue(
      prop,
      startLoc,
      isGenerator,
      isAsync,
      isPattern,
      isAccessor,
      refExpressionErrors
    );
    if (typeParameters) {
      (result.value || result).typeParameters = typeParameters;
    }
    return result;
  }
  parseFunctionParamType(param) {
    if (this.eat(tt.question)) {
      if (param.type !== "Identifier") {
        this.raise(FlowErrors.PatternIsOptional, param);
      }
      if (this.isThisParam(param)) {
        this.raise(FlowErrors.ThisParamMayNotBeOptional, param);
      }
      param.optional = true;
    }
    if (this.match(tt.colon)) {
      param.typeAnnotation = this.flowParseTypeAnnotation();
    } else if (this.isThisParam(param)) {
      this.raise(FlowErrors.ThisParamAnnotationRequired, param);
    }
    if (this.match(tt.eq) && this.isThisParam(param)) {
      this.raise(FlowErrors.ThisParamNoDefault, param);
    }
    this.resetEndLocation(param);
    return param;
  }
  parseMaybeDefault(startLoc, left) {
    const node = super.parseMaybeDefault(startLoc, left);
    if (node.type === "AssignmentPattern" && node.typeAnnotation && node.right.start < node.typeAnnotation.start) {
      this.raise(FlowErrors.TypeBeforeInitializer, node.typeAnnotation);
    }
    return node;
  }
  checkImportReflection(node) {
    super.checkImportReflection(node);
    if (node.module && node.importKind !== "value") {
      this.raise(
        FlowErrors.ImportReflectionHasImportType,
        node.specifiers[0].loc.start
      );
    }
  }
  parseImportSpecifierLocal(node, specifier, type) {
    specifier.local = hasTypeImportKind(node) ? this.flowParseRestrictedIdentifier(
      /* liberal */
      true,
      /* declaration */
      true
    ) : this.parseIdentifier();
    node.specifiers.push(this.finishImportSpecifier(specifier, type));
  }
  isPotentialImportPhase(isExport) {
    if (super.isPotentialImportPhase(isExport)) return true;
    if (this.isContextual(tt._type)) {
      if (!isExport) return true;
      const ch = this.lookaheadCharCode();
      return ch === charCodes.leftCurlyBrace || ch === charCodes.asterisk;
    }
    return !isExport && this.isContextual(tt._typeof);
  }
  applyImportPhase(node, isExport, phase, loc) {
    super.applyImportPhase(node, isExport, phase, loc);
    if (isExport) {
      if (!phase && this.match(tt._default)) {
        return;
      }
      node.exportKind = phase === "type" ? phase : "value";
    } else {
      if (phase === "type" && this.match(tt.star)) this.unexpected();
      node.importKind = phase === "type" || phase === "typeof" ? phase : "value";
    }
  }
  // parse import-type/typeof shorthand
  parseImportSpecifier(specifier, importedIsString, isInTypeOnlyImport, isMaybeTypeOnly, bindingType) {
    const firstIdent = specifier.imported;
    let specifierTypeKind = null;
    if (firstIdent.type === "Identifier") {
      if (firstIdent.name === "type") {
        specifierTypeKind = "type";
      } else if (firstIdent.name === "typeof") {
        specifierTypeKind = "typeof";
      }
    }
    let isBinding = false;
    if (this.isContextual(tt._as) && !this.isLookaheadContextual("as")) {
      const as_ident = this.parseIdentifier(true);
      if (specifierTypeKind !== null && !tokenIsKeywordOrIdentifier(this.state.type)) {
        specifier.imported = as_ident;
        specifier.importKind = specifierTypeKind;
        specifier.local = this.cloneIdentifier(as_ident);
      } else {
        specifier.imported = firstIdent;
        specifier.importKind = null;
        specifier.local = this.parseIdentifier();
      }
    } else {
      if (specifierTypeKind !== null && tokenIsKeywordOrIdentifier(this.state.type)) {
        specifier.imported = this.parseIdentifier(true);
        specifier.importKind = specifierTypeKind;
      } else {
        if (importedIsString) {
          throw this.raise(Errors.ImportBindingIsString, specifier, {
            importName: firstIdent.value
          });
        }
        specifier.imported = firstIdent;
        specifier.importKind = null;
      }
      if (this.eatContextual(tt._as)) {
        specifier.local = this.parseIdentifier();
      } else {
        isBinding = true;
        specifier.local = this.cloneIdentifier(specifier.imported);
      }
    }
    const specifierIsTypeImport = hasTypeImportKind(specifier);
    if (isInTypeOnlyImport && specifierIsTypeImport) {
      this.raise(FlowErrors.ImportTypeShorthandOnlyInPureImport, specifier);
    }
    if (isInTypeOnlyImport || specifierIsTypeImport) {
      this.checkReservedType(
        specifier.local.name,
        specifier.local.loc.start,
        /* declaration */
        true
      );
    }
    if (isBinding && !isInTypeOnlyImport && !specifierIsTypeImport) {
      this.checkReservedWord(
        specifier.local.name,
        specifier.loc.start,
        true,
        true
      );
    }
    return this.finishImportSpecifier(specifier, "ImportSpecifier");
  }
  parseBindingAtom() {
    switch (this.state.type) {
      case tt._this:
        return this.parseIdentifier(
          /* liberal */
          true
        );
      default:
        return super.parseBindingAtom();
    }
  }
  // parse function type parameters - function foo<T>() {}
  parseFunctionParams(node, isConstructor) {
    const kind = node.kind;
    if (kind !== "get" && kind !== "set" && this.match(tt.lt)) {
      node.typeParameters = this.flowParseTypeParameterDeclaration();
    }
    super.parseFunctionParams(node, isConstructor);
  }
  // parse flow type annotations on variable declarator heads - let foo: string = bar
  parseVarId(decl, kind) {
    super.parseVarId(decl, kind);
    if (this.match(tt.colon)) {
      decl.id.typeAnnotation = this.flowParseTypeAnnotation();
      this.resetEndLocation(decl.id);
    }
  }
  // parse the return type of an async arrow function - let foo = (async (): number => {});
  parseAsyncArrowFromCallExpression(node, call) {
    if (this.match(tt.colon)) {
      const oldNoAnonFunctionType = this.state.noAnonFunctionType;
      this.state.noAnonFunctionType = true;
      node.returnType = this.flowParseTypeAnnotation();
      this.state.noAnonFunctionType = oldNoAnonFunctionType;
    }
    return super.parseAsyncArrowFromCallExpression(node, call);
  }
  // todo description
  shouldParseAsyncArrow() {
    return this.match(tt.colon) || super.shouldParseAsyncArrow();
  }
  // We need to support type parameter declarations for arrow functions. This
  // is tricky. There are three situations we need to handle
  //
  // 1. This is either JSX or an arrow function. We'll try JSX first. If that
  //    fails, we'll try an arrow function. If that fails, we'll throw the JSX
  //    error.
  // 2. This is an arrow function. We'll parse the type parameter declaration,
  //    parse the rest, make sure the rest is an arrow function, and go from
  //    there
  // 3. This is neither. Just call the super method
  parseMaybeAssign(refExpressionErrors, afterLeftParse) {
    let state = null;
    let jsx;
    if (this.hasPlugin("jsx") && (this.match(tt.jsxTagStart) || this.match(tt.lt))) {
      state = this.state.clone();
      jsx = this.tryParse(
        () => super.parseMaybeAssign(refExpressionErrors, afterLeftParse),
        state
      );
      if (!jsx.error) return jsx.node;
      const { context } = this.state;
      const currentContext = context[context.length - 1];
      if (currentContext === types.j_oTag || currentContext === types.j_expr) {
        context.pop();
      }
    }
    if (jsx?.error || this.match(tt.lt)) {
      state = state || this.state.clone();
      let typeParameters;
      const arrow = this.tryParse((abort) => {
        typeParameters = this.flowParseTypeParameterDeclaration();
        const arrowExpression2 = this.forwardNoArrowParamsConversionAt(
          typeParameters,
          () => {
            const result = super.parseMaybeAssign(
              refExpressionErrors,
              afterLeftParse
            );
            this.resetStartLocationFromNode(result, typeParameters);
            return result;
          }
        );
        if (arrowExpression2.extra?.parenthesized) abort();
        const expr = this.maybeUnwrapTypeCastExpression(arrowExpression2);
        if (expr.type !== "ArrowFunctionExpression") abort();
        expr.typeParameters = typeParameters;
        this.resetStartLocationFromNode(expr, typeParameters);
        return arrowExpression2;
      }, state);
      let arrowExpression = null;
      if (arrow.node && this.maybeUnwrapTypeCastExpression(arrow.node).type === "ArrowFunctionExpression") {
        if (!arrow.error && !arrow.aborted) {
          if (arrow.node.async) {
            this.raise(
              FlowErrors.UnexpectedTypeParameterBeforeAsyncArrowFunction,
              typeParameters
            );
          }
          return arrow.node;
        }
        arrowExpression = arrow.node;
      }
      if (jsx?.node) {
        this.state = jsx.failState;
        return jsx.node;
      }
      if (arrowExpression) {
        this.state = arrow.failState;
        return arrowExpression;
      }
      if (jsx?.thrown) throw jsx.error;
      if (arrow.thrown) throw arrow.error;
      throw this.raise(
        FlowErrors.UnexpectedTokenAfterTypeParameter,
        typeParameters
      );
    }
    return super.parseMaybeAssign(refExpressionErrors, afterLeftParse);
  }
  // handle return types for arrow functions
  parseArrow(node) {
    if (this.match(tt.colon)) {
      const result = this.tryParse(() => {
        const oldNoAnonFunctionType = this.state.noAnonFunctionType;
        this.state.noAnonFunctionType = true;
        const typeNode = this.startNode();
        [
          typeNode.typeAnnotation,
          // @ts-expect-error (destructuring not supported yet)
          node.predicate
        ] = this.flowParseTypeAndPredicateInitialiser();
        this.state.noAnonFunctionType = oldNoAnonFunctionType;
        if (this.canInsertSemicolon()) this.unexpected();
        if (!this.match(tt.arrow)) this.unexpected();
        return typeNode;
      });
      if (result.thrown) return null;
      if (result.error) this.state = result.failState;
      node.returnType = result.node.typeAnnotation ? this.finishNode(result.node, "TypeAnnotation") : null;
    }
    return super.parseArrow(node);
  }
  shouldParseArrow(params) {
    return this.match(tt.colon) || super.shouldParseArrow(params);
  }
  setArrowFunctionParameters(node, params) {
    if (this.state.noArrowParamsConversionAt.includes(
      this.offsetToSourcePos(node.start)
    )) {
      node.params = params;
    } else {
      super.setArrowFunctionParameters(node, params);
    }
  }
  checkParams(node, allowDuplicates, isArrowFunction, strictModeChanged = true) {
    if (isArrowFunction && this.state.noArrowParamsConversionAt.includes(
      this.offsetToSourcePos(node.start)
    )) {
      return;
    }
    for (let i = 0; i < node.params.length; i++) {
      if (this.isThisParam(node.params[i]) && i > 0) {
        this.raise(FlowErrors.ThisParamMustBeFirst, node.params[i]);
      }
    }
    super.checkParams(
      node,
      allowDuplicates,
      isArrowFunction,
      strictModeChanged
    );
  }
  parseParenAndDistinguishExpression(canBeArrow) {
    return super.parseParenAndDistinguishExpression(
      canBeArrow && !this.state.noArrowAt.includes(
        this.sourceToOffsetPos(this.state.start)
      )
    );
  }
  parseSubscripts(base, startLoc, noCalls) {
    if (base.type === "Identifier" && base.name === "async" && this.state.noArrowAt.includes(startLoc.index)) {
      this.next();
      const node = this.startNodeAt(startLoc);
      node.callee = base;
      node.arguments = super.parseCallExpressionArguments();
      base = this.finishNode(node, "CallExpression");
    } else if (base.type === "Identifier" && base.name === "async" && this.match(tt.lt)) {
      const state = this.state.clone();
      const arrow = this.tryParse(
        (abort) => this.parseAsyncArrowWithTypeParameters(startLoc) || abort(),
        state
      );
      if (!arrow.error && !arrow.aborted) return arrow.node;
      const result = this.tryParse(
        () => super.parseSubscripts(base, startLoc, noCalls),
        state
      );
      if (result.node && !result.error) return result.node;
      if (arrow.node) {
        this.state = arrow.failState;
        return arrow.node;
      }
      if (result.node) {
        this.state = result.failState;
        return result.node;
      }
      throw arrow.error || result.error;
    }
    return super.parseSubscripts(base, startLoc, noCalls);
  }
  parseSubscript(base, startLoc, noCalls, subscriptState) {
    if (this.match(tt.questionDot) && this.isLookaheadToken_lt()) {
      subscriptState.optionalChainMember = true;
      if (noCalls) {
        subscriptState.stop = true;
        return base;
      }
      this.next();
      const node = this.startNodeAt(startLoc);
      node.callee = base;
      node.typeArguments = this.flowParseTypeParameterInstantiationInExpression();
      this.expect(tt.parenL);
      node.arguments = this.parseCallExpressionArguments();
      node.optional = true;
      return this.finishCallExpression(
        node,
        /* optional */
        true
      );
    } else if (!noCalls && this.shouldParseTypes() && (this.match(tt.lt) || // also handles `new C<<T>`
    this.match(tt.bitShiftL))) {
      const node = this.startNodeAt(startLoc);
      node.callee = base;
      const result = this.tryParse(() => {
        node.typeArguments = this.flowParseTypeParameterInstantiationCallOrNew();
        this.expect(tt.parenL);
        node.arguments = super.parseCallExpressionArguments();
        if (subscriptState.optionalChainMember) {
          node.optional = false;
        }
        return this.finishCallExpression(
          node,
          subscriptState.optionalChainMember
        );
      });
      if (result.node) {
        if (result.error) this.state = result.failState;
        return result.node;
      }
    }
    return super.parseSubscript(base, startLoc, noCalls, subscriptState);
  }
  parseNewCallee(node) {
    super.parseNewCallee(node);
    let targs = null;
    if (this.shouldParseTypes() && this.match(tt.lt)) {
      targs = this.tryParse(
        () => this.flowParseTypeParameterInstantiationCallOrNew()
      ).node;
    }
    node.typeArguments = targs;
  }
  parseAsyncArrowWithTypeParameters(startLoc) {
    const node = this.startNodeAt(startLoc);
    this.parseFunctionParams(node, false);
    if (!this.parseArrow(node)) return;
    return super.parseArrowExpression(
      node,
      /* params */
      void 0,
      /* isAsync */
      true
    );
  }
  readToken_mult_modulo(code) {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (code === charCodes.asterisk && next === charCodes.slash && this.state.hasFlowComment) {
      this.state.hasFlowComment = false;
      this.state.pos += 2;
      this.nextToken();
      return;
    }
    super.readToken_mult_modulo(code);
  }
  readToken_pipe_amp(code) {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (code === charCodes.verticalBar && next === charCodes.rightCurlyBrace) {
      this.finishOp(tt.braceBarR, 2);
      return;
    }
    super.readToken_pipe_amp(code);
  }
  parseTopLevel(file, program) {
    const fileNode = super.parseTopLevel(file, program);
    if (this.state.hasFlowComment) {
      this.raise(
        FlowErrors.UnterminatedFlowComment,
        this.state.curPosition()
      );
    }
    return fileNode;
  }
  skipBlockComment() {
    if (this.hasPlugin("flowComments") && this.skipFlowComment()) {
      if (this.state.hasFlowComment) {
        throw this.raise(FlowErrors.NestedFlowComment, this.state.startLoc);
      }
      this.hasFlowCommentCompletion();
      const commentSkip = this.skipFlowComment();
      if (commentSkip) {
        this.state.pos += commentSkip;
        this.state.hasFlowComment = true;
      }
      return;
    }
    return super.skipBlockComment(this.state.hasFlowComment ? "*-/" : "*/");
  }
  skipFlowComment() {
    const { pos } = this.state;
    let shiftToFirstNonWhiteSpace = 2;
    while ([charCodes.space, charCodes.tab].includes(
      // @ts-expect-error testing whether a number is included
      this.input.charCodeAt(pos + shiftToFirstNonWhiteSpace)
    )) {
      shiftToFirstNonWhiteSpace++;
    }
    const ch2 = this.input.charCodeAt(shiftToFirstNonWhiteSpace + pos);
    const ch3 = this.input.charCodeAt(shiftToFirstNonWhiteSpace + pos + 1);
    if (ch2 === charCodes.colon && ch3 === charCodes.colon) {
      return shiftToFirstNonWhiteSpace + 2;
    }
    if (this.input.slice(
      shiftToFirstNonWhiteSpace + pos,
      shiftToFirstNonWhiteSpace + pos + 12
    ) === "flow-include") {
      return shiftToFirstNonWhiteSpace + 12;
    }
    if (ch2 === charCodes.colon && ch3 !== charCodes.colon) {
      return shiftToFirstNonWhiteSpace;
    }
    return false;
  }
  hasFlowCommentCompletion() {
    const end = this.input.indexOf("*/", this.state.pos);
    if (end === -1) {
      throw this.raise(Errors.UnterminatedComment, this.state.curPosition());
    }
  }
  // Flow enum parsing
  flowEnumErrorBooleanMemberNotInitialized(loc, {
    enumName,
    memberName
  }) {
    this.raise(FlowErrors.EnumBooleanMemberNotInitialized, loc, {
      memberName,
      enumName
    });
  }
  flowEnumErrorInvalidMemberInitializer(loc, enumContext) {
    return this.raise(
      !enumContext.explicitType ? FlowErrors.EnumInvalidMemberInitializerUnknownType : enumContext.explicitType === "symbol" ? FlowErrors.EnumInvalidMemberInitializerSymbolType : FlowErrors.EnumInvalidMemberInitializerPrimaryType,
      loc,
      enumContext
    );
  }
  flowEnumErrorNumberMemberNotInitialized(loc, details) {
    this.raise(FlowErrors.EnumNumberMemberNotInitialized, loc, details);
  }
  flowEnumErrorStringMemberInconsistentlyInitialized(node, details) {
    this.raise(
      FlowErrors.EnumStringMemberInconsistentlyInitialized,
      node,
      details
    );
  }
  flowEnumMemberInit() {
    const startLoc = this.state.startLoc;
    const endOfInit = () => this.match(tt.comma) || this.match(tt.braceR);
    switch (this.state.type) {
      case tt.num: {
        const literal = this.parseNumericLiteral(this.state.value);
        if (endOfInit()) {
          return { type: "number", loc: literal.loc.start, value: literal };
        }
        return { type: "invalid", loc: startLoc };
      }
      case tt.string: {
        const literal = this.parseStringLiteral(this.state.value);
        if (endOfInit()) {
          return { type: "string", loc: literal.loc.start, value: literal };
        }
        return { type: "invalid", loc: startLoc };
      }
      case tt._true:
      case tt._false: {
        const literal = this.parseBooleanLiteral(this.match(tt._true));
        if (endOfInit()) {
          return {
            type: "boolean",
            loc: literal.loc.start,
            value: literal
          };
        }
        return { type: "invalid", loc: startLoc };
      }
      default:
        return { type: "invalid", loc: startLoc };
    }
  }
  flowEnumMemberRaw() {
    const loc = this.state.startLoc;
    const id = this.parseIdentifier(true);
    const init = this.eat(tt.eq) ? this.flowEnumMemberInit() : { type: "none", loc };
    return { id, init };
  }
  flowEnumCheckExplicitTypeMismatch(loc, context, expectedType) {
    const { explicitType } = context;
    if (explicitType === null) {
      return;
    }
    if (explicitType !== expectedType) {
      this.flowEnumErrorInvalidMemberInitializer(loc, context);
    }
  }
  flowEnumMembers({
    enumName,
    explicitType
  }) {
    const seenNames = /* @__PURE__ */ new Set();
    const members = {
      booleanMembers: [],
      numberMembers: [],
      stringMembers: [],
      defaultedMembers: []
    };
    let hasUnknownMembers = false;
    while (!this.match(tt.braceR)) {
      if (this.eat(tt.ellipsis)) {
        hasUnknownMembers = true;
        break;
      }
      const memberNode = this.startNode();
      const { id, init } = this.flowEnumMemberRaw();
      const memberName = id.name;
      if (memberName === "") {
        continue;
      }
      if (/^[a-z]/.test(memberName)) {
        this.raise(FlowErrors.EnumInvalidMemberName, id, {
          memberName,
          suggestion: memberName[0].toUpperCase() + memberName.slice(1),
          enumName
        });
      }
      if (seenNames.has(memberName)) {
        this.raise(FlowErrors.EnumDuplicateMemberName, id, {
          memberName,
          enumName
        });
      }
      seenNames.add(memberName);
      const context = { enumName, explicitType, memberName };
      memberNode.id = id;
      switch (init.type) {
        case "boolean": {
          this.flowEnumCheckExplicitTypeMismatch(
            init.loc,
            context,
            "boolean"
          );
          memberNode.init = init.value;
          members.booleanMembers.push(
            // @ts-expect-error NodeAny not supported
            this.finishNode(memberNode, "EnumBooleanMember")
          );
          break;
        }
        case "number": {
          this.flowEnumCheckExplicitTypeMismatch(init.loc, context, "number");
          memberNode.init = init.value;
          members.numberMembers.push(
            // @ts-expect-error NodeAny not supported
            this.finishNode(memberNode, "EnumNumberMember")
          );
          break;
        }
        case "string": {
          this.flowEnumCheckExplicitTypeMismatch(init.loc, context, "string");
          memberNode.init = init.value;
          members.stringMembers.push(
            // @ts-expect-error NodeAny not supported
            this.finishNode(memberNode, "EnumStringMember")
          );
          break;
        }
        case "invalid": {
          throw this.flowEnumErrorInvalidMemberInitializer(init.loc, context);
        }
        case "none": {
          switch (explicitType) {
            case "boolean":
              this.flowEnumErrorBooleanMemberNotInitialized(
                init.loc,
                context
              );
              break;
            case "number":
              this.flowEnumErrorNumberMemberNotInitialized(init.loc, context);
              break;
            default:
              members.defaultedMembers.push(
                // @ts-expect-error NodeAny not supported
                this.finishNode(memberNode, "EnumDefaultedMember")
              );
          }
        }
      }
      if (!this.match(tt.braceR)) {
        this.expect(tt.comma);
      }
    }
    return { members, hasUnknownMembers };
  }
  flowEnumStringMembers(initializedMembers, defaultedMembers, {
    enumName
  }) {
    if (initializedMembers.length === 0) {
      return defaultedMembers;
    } else if (defaultedMembers.length === 0) {
      return initializedMembers;
    } else if (defaultedMembers.length > initializedMembers.length) {
      for (const member of initializedMembers) {
        this.flowEnumErrorStringMemberInconsistentlyInitialized(member, {
          enumName
        });
      }
      return defaultedMembers;
    } else {
      for (const member of defaultedMembers) {
        this.flowEnumErrorStringMemberInconsistentlyInitialized(member, {
          enumName
        });
      }
      return initializedMembers;
    }
  }
  flowEnumParseExplicitType({
    enumName
  }) {
    if (!this.eatContextual(tt._of)) return null;
    if (!tokenIsIdentifier(this.state.type)) {
      throw this.raise(
        FlowErrors.EnumInvalidExplicitTypeUnknownSupplied,
        this.state.startLoc,
        {
          enumName
        }
      );
    }
    const { value } = this.state;
    this.next();
    if (value !== "boolean" && value !== "number" && value !== "string" && value !== "symbol") {
      this.raise(FlowErrors.EnumInvalidExplicitType, this.state.startLoc, {
        enumName,
        invalidEnumType: value
      });
    }
    return value;
  }
  flowEnumBody(node, id) {
    const enumName = id.name;
    const nameLoc = id.loc.start;
    const explicitType = this.flowEnumParseExplicitType({ enumName });
    this.expect(tt.braceL);
    const { members, hasUnknownMembers } = this.flowEnumMembers({
      enumName,
      explicitType
    });
    node.hasUnknownMembers = hasUnknownMembers;
    switch (explicitType) {
      case "boolean":
        node.explicitType = true;
        node.members = members.booleanMembers;
        this.expect(tt.braceR);
        return this.finishNode(node, "EnumBooleanBody");
      case "number":
        node.explicitType = true;
        node.members = members.numberMembers;
        this.expect(tt.braceR);
        return this.finishNode(node, "EnumNumberBody");
      case "string":
        node.explicitType = true;
        node.members = this.flowEnumStringMembers(
          members.stringMembers,
          members.defaultedMembers,
          { enumName }
        );
        this.expect(tt.braceR);
        return this.finishNode(node, "EnumStringBody");
      case "symbol":
        node.members = members.defaultedMembers;
        this.expect(tt.braceR);
        return this.finishNode(node, "EnumSymbolBody");
      default: {
        const empty = () => {
          node.members = [];
          this.expect(tt.braceR);
          return this.finishNode(node, "EnumStringBody");
        };
        node.explicitType = false;
        const boolsLen = members.booleanMembers.length;
        const numsLen = members.numberMembers.length;
        const strsLen = members.stringMembers.length;
        const defaultedLen = members.defaultedMembers.length;
        if (!boolsLen && !numsLen && !strsLen && !defaultedLen) {
          return empty();
        } else if (!boolsLen && !numsLen) {
          node.members = this.flowEnumStringMembers(
            members.stringMembers,
            members.defaultedMembers,
            { enumName }
          );
          this.expect(tt.braceR);
          return this.finishNode(node, "EnumStringBody");
        } else if (!numsLen && !strsLen && boolsLen >= defaultedLen) {
          for (const member of members.defaultedMembers) {
            this.flowEnumErrorBooleanMemberNotInitialized(member.loc.start, {
              enumName,
              memberName: member.id.name
            });
          }
          node.members = members.booleanMembers;
          this.expect(tt.braceR);
          return this.finishNode(node, "EnumBooleanBody");
        } else if (!boolsLen && !strsLen && numsLen >= defaultedLen) {
          for (const member of members.defaultedMembers) {
            this.flowEnumErrorNumberMemberNotInitialized(member.loc.start, {
              enumName,
              memberName: member.id.name
            });
          }
          node.members = members.numberMembers;
          this.expect(tt.braceR);
          return this.finishNode(node, "EnumNumberBody");
        } else {
          this.raise(FlowErrors.EnumInconsistentMemberValues, nameLoc, {
            enumName
          });
          return empty();
        }
      }
    }
  }
  flowParseEnumDeclaration(node) {
    const id = this.parseIdentifier();
    node.id = id;
    node.body = this.flowEnumBody(this.startNode(), id);
    return this.finishNode(node, "EnumDeclaration");
  }
  jsxParseOpeningElementAfterName(node) {
    if (this.shouldParseTypes()) {
      if (this.match(tt.lt) || this.match(tt.bitShiftL)) {
        node.typeArguments = this.flowParseTypeParameterInstantiationInExpression();
      }
    }
    return super.jsxParseOpeningElementAfterName(node);
  }
  // check if the next token is a tt.lt
  isLookaheadToken_lt() {
    const next = this.nextTokenStart();
    if (this.input.charCodeAt(next) === charCodes.lessThan) {
      const afterNext = this.input.charCodeAt(next + 1);
      return afterNext !== charCodes.lessThan && afterNext !== charCodes.equalsTo;
    }
    return false;
  }
  // used after we have finished parsing types
  reScan_lt_gt() {
    const { type } = this.state;
    if (type === tt.lt) {
      this.state.pos -= 1;
      this.readToken_lt();
    } else if (type === tt.gt) {
      this.state.pos -= 1;
      this.readToken_gt();
    }
  }
  reScan_lt() {
    const { type } = this.state;
    if (type === tt.bitShiftL) {
      this.state.pos -= 2;
      this.finishOp(tt.lt, 1);
      return tt.lt;
    }
    return type;
  }
  maybeUnwrapTypeCastExpression(node) {
    return node.type === "TypeCastExpression" ? node.expression : node;
  }
};
export {
  flow_default as f,
  typescript_default as t
};
