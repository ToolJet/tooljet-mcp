import { createRequire } from "node:module";
import { E as Errors, t as tt, r as rightSquareBracket, a as rightCurlyBrace, B as BindingFlag, i as isStrictBindReservedWord, b as isStrictBindOnlyReservedWord, S as SourceLocation, c as isIdentifierChar, d as tokenIsLiteralPropertyName, e as ScopeFlag, f as dash, g as greaterThan, l as lessThan, h as exclamationMark, s as slash, j as asterisk, p as paragraphSeparator, k as lineSeparator, m as lineFeed, n as carriageReturn, o as tab, q as nonBreakingSpace, u as space, v as digit0, w as digit9, x as leftCurlyBrace, y as leftSquareBracket, z as isIdentifierStart, A as backslash, C as dot, D as equalsTo, F as verticalBar, G as caret, H as atSign, I as questionMark, J as numberSign, K as tilde, L as plusSign, M as ampersand, N as percentSign, O as apostrophe, P as quotationMark, Q as digit8, R as digit7, T as digit6, U as digit5, V as digit4, W as digit3, X as digit2, Y as digit1, Z as lowercaseX, _ as uppercaseX, $ as lowercaseO, a0 as uppercaseO, a1 as lowercaseB, a2 as uppercaseB, a3 as graveAccent, a4 as colon, a5 as comma, a6 as semicolon, a7 as rightParenthesis, a8 as leftParenthesis, a9 as createPositionWithColumnOffset, aa as lowercaseV, ab as lowercaseU, ac as lowercaseN, ad as lowercaseM, ae as uppercaseE, af as lowercaseE, ag as Position, ah as keywords, ai as tokenLabelName, aj as tokenIsKeyword, ak as ClassElementType, al as types, am as oghamSpaceMark, an as lowercaseG, ao as lowercaseS, ap as lowercaseI, aq as lowercaseY, ar as lowercaseD, as as underscore, at as dollarSign, au as lowercaseF, av as lowercaseT, aw as lowercaseR, ax as uppercaseA, ay as uppercaseF, az as lowercaseA, aA as isDigit, aB as ParseErrorEnum, aC as tokenIsIdentifier, aD as tokenIsKeywordOrIdentifier, aE as tokenIsTSTypeOperator, aF as tokenIsTSDeclarationStart, aG as tokenIsTemplate, aH as tokenCanStartExpression, aI as tokenOperatorPrecedence, aJ as ScopeHandler, aK as NameType, aL as Scope } from "./chunk-CPO3lpSy.js";
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
  const options = createDefaultOptions();
  if (opts == null) {
    return options;
  }
  if (opts.annexB != null && opts.annexB !== false) {
    throw new Error("The `annexB` option can only be set to `false`.");
  }
  for (const key of Object.keys(options)) {
    if (opts[key] != null) options[key] = opts[key];
  }
  if (options.startLine === 1) {
    if (opts.startIndex == null && options.startColumn > 0) {
      options.startIndex = options.startColumn;
    } else if (opts.startColumn == null && options.startIndex > 0) {
      options.startColumn = options.startIndex;
    }
  } else if (opts.startColumn == null || opts.startIndex == null) {
    if (opts.startIndex != null || false) {
      throw new Error(
        "With a `startLine > 1` you must also specify `startIndex` and `startColumn`."
      );
    }
  }
  if (options.sourceType === "commonjs") {
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
  return options;
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
function isNewLine(code) {
  switch (code) {
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
function isWhitespace(code) {
  switch (code) {
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
      let code;
      ({ code, pos } = readHexChar(
        input,
        pos,
        lineStart,
        curLine,
        2,
        false,
        throwOnInvalid,
        errors
      ));
      return res(code === null ? null : String.fromCharCode(code));
    }
    case lowercaseU: {
      let code;
      ({ code, pos } = readCodePoint(
        input,
        pos,
        lineStart,
        curLine,
        throwOnInvalid,
        errors
      ));
      return res(code === null ? null : String.fromCodePoint(code));
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
    const code = input.charCodeAt(pos);
    let val;
    if (code === underscore && allowNumSeparator !== "bail") {
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
    if (code >= lowercaseA) {
      val = code - lowercaseA + lineFeed;
    } else if (code >= uppercaseA) {
      val = code - uppercaseA + lineFeed;
    } else if (isDigit(code)) {
      val = code - digit0;
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
  let code;
  if (ch === leftCurlyBrace) {
    ++pos;
    ({ code, pos } = readHexChar(
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
    if (code !== null && code > 1114111) {
      if (throwOnInvalid) {
        errors.invalidCodePoint(pos, lineStart, curLine);
      } else {
        return { code: null, pos };
      }
    }
  } else {
    ({ code, pos } = readHexChar(
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
  return { code, pos };
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
  constructor(options, input) {
    super();
    this.state = new State();
    this.state.init(options);
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
  readToken_mult_modulo(code) {
    let type = code === asterisk ? tt.star : tt.modulo;
    let width = 1;
    let next = this.input.charCodeAt(this.state.pos + 1);
    if (code === asterisk && next === asterisk) {
      width++;
      next = this.input.charCodeAt(this.state.pos + 2);
      type = tt.exponent;
    }
    if (next === equalsTo && !this.state.inType) {
      width++;
      type = code === percentSign ? tt.moduloAssign : tt.assign;
    }
    this.finishOp(type, width);
  }
  readToken_pipe_amp(code) {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === code) {
      if (this.input.charCodeAt(this.state.pos + 2) === equalsTo) {
        this.finishOp(tt.assign, 3);
      } else {
        this.finishOp(
          code === verticalBar ? tt.logicalOR : tt.logicalAND,
          2
        );
      }
      return;
    }
    if (code === verticalBar) {
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
      code === verticalBar ? tt.bitwiseOR : tt.bitwiseAND,
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
  readToken_plus_min(code) {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === code) {
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
  readToken_eq_excl(code) {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === equalsTo) {
      this.finishOp(
        tt.equality,
        this.input.charCodeAt(this.state.pos + 2) === equalsTo ? 3 : 2
      );
      return;
    }
    if (code === equalsTo && next === greaterThan) {
      this.state.pos += 2;
      this.finishToken(tt.arrow);
      return;
    }
    this.finishOp(code === equalsTo ? tt.eq : tt.bang, 1);
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
  getTokenFromCode(code) {
    switch (code) {
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
        this.readString(code);
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
        this.readToken_mult_modulo(code);
        return;
      case verticalBar:
      case ampersand:
        this.readToken_pipe_amp(code);
        return;
      case caret:
        this.readToken_caret();
        return;
      case plusSign:
      case dash:
        this.readToken_plus_min(code);
        return;
      case lessThan:
        this.readToken_lt();
        return;
      case greaterThan:
        this.readToken_gt();
        return;
      case equalsTo:
      case exclamationMark:
        this.readToken_eq_excl(code);
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
        if (isIdentifierStart(code)) {
          this.readWord(code);
          return;
        }
    }
    throw this.raise(
      Errors.InvalidOrUnexpectedToken,
      this.state.curPosition(),
      {
        unexpected: String.fromCodePoint(code)
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
    const { code, pos } = readCodePoint(
      this.input,
      this.state.pos,
      this.state.lineStart,
      this.state.curLine,
      throwOnInvalid,
      this.errorHandlers_readCodePoint
    );
    this.state.pos = pos;
    return code;
  }
  readString(quote) {
    const { str, pos, curLine, lineStart } = readStringContents(
      quote === quotationMark ? "double" : "single",
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
    if (flags === ScopeFlag.TS_MODULE) {
      this.importsStack.push(/* @__PURE__ */ new Set());
    }
    super.enter(flags);
  }
  exit() {
    const flags = super.exit();
    if (flags === ScopeFlag.TS_MODULE) {
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
    if (bindingType & BindingFlag.FLAG_TS_IMPORT) {
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
    if (bindingType & BindingFlag.FLAG_TS_EXPORT_ONLY) {
      this.maybeExportDefined(scope, name);
      scope.tsNames.set(
        name,
        type | 16
        /* ExportOnlyBindings */
      );
      return;
    }
    super.declareName(name, bindingType, loc);
    if (bindingType & BindingFlag.KIND_TYPE) {
      if (!(bindingType & BindingFlag.KIND_VALUE)) {
        this.checkRedeclarationInScope(scope, name, bindingType, loc);
        this.maybeExportDefined(scope, name);
      }
      type = type | 1;
    }
    if (bindingType & BindingFlag.FLAG_TS_ENUM) {
      type = type | 2;
    }
    if (bindingType & BindingFlag.FLAG_TS_CONST_ENUM) {
      type = type | 4;
    }
    if (bindingType & BindingFlag.FLAG_CLASS) {
      type = type | 8;
    }
    if (type) scope.tsNames.set(name, type);
  }
  isRedeclaredInScope(scope, name, bindingType) {
    const type = scope.tsNames.get(name);
    if ((type & 2) > 0) {
      if (bindingType & BindingFlag.FLAG_TS_ENUM) {
        const isConst = !!(bindingType & BindingFlag.FLAG_TS_CONST_ENUM);
        const wasConst = (type & 4) > 0;
        return isConst !== wasConst;
      }
      return true;
    }
    if (bindingType & BindingFlag.FLAG_CLASS && (type & 8) > 0) {
      if (scope.names.get(name) & NameType.Lexical) {
        return !!(bindingType & BindingFlag.KIND_VALUE);
      } else {
        return false;
      }
    }
    if (bindingType & BindingFlag.KIND_TYPE && (type & 1) > 0) {
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
      rightParenthesis,
      ParseBindingListFlags.IS_FUNCTION_PARAMS
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
    if (chAfterWord === colon) {
      labeled = true;
      optional = false;
      label = this.parseIdentifier(true);
      this.expect(tt.colon);
      type = this.tsParseType();
    } else if (chAfterWord === questionMark) {
      optional = true;
      const wordName = this.state.value;
      const typeOrLabel = this.tsParseNonArrayType();
      if (this.lookaheadCharCode() === colon) {
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
          if (nodeType !== void 0 && this.lookaheadCharCode() !== dot) {
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
          rightSquareBracket,
          ParseBindingListFlags.ALLOW_EMPTY
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
      this.checkIdentifier(node.id, BindingFlag.TYPE_TS_INTERFACE);
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
    this.checkIdentifier(node.id, BindingFlag.TYPE_TS_TYPE);
    node.typeAnnotation = this.tsInType(() => {
      node.typeParameters = this.tsTryParseTypeParameters(
        this.tsParseInOutModifiers
      );
      this.expect(tt.eq);
      if (this.isContextual(tt._intrinsic) && this.lookaheadCharCode() !== dot) {
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
      node.const ? BindingFlag.TYPE_TS_CONST_ENUM : BindingFlag.TYPE_TS_ENUM
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
    this.scope.enter(ScopeFlag.OTHER);
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
      this.checkIdentifier(node.id, BindingFlag.TYPE_TS_NAMESPACE);
    }
    if (this.eat(tt.dot)) {
      const inner = this.startNode();
      this.tsParseModuleOrNamespaceDeclaration(inner, true);
      node.body = inner;
    } else {
      this.scope.enter(ScopeFlag.TS_MODULE);
      this.prodParam.enter(ParamKind.PARAM);
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
      this.scope.enter(ScopeFlag.TS_MODULE);
      this.prodParam.enter(ParamKind.PARAM);
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
    this.checkIdentifier(node.id, BindingFlag.TYPE_TS_VALUE_IMPORT);
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
    return this.isContextual(tt._require) && this.lookaheadCharCode() === leftParenthesis;
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
    if (!(flags & ParseBindingListFlags.IS_CONSTRUCTOR_PARAMS) && (accessibility || readonly || override)) {
      this.raise(TSErrors.UnexpectedParameterModifier, startLoc);
    }
    const left = this.parseMaybeDefault();
    if (flags & ParseBindingListFlags.IS_FUNCTION_PARAMS) {
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
      this.checkIdentifier(node.id, BindingFlag.TYPE_TS_AMBIENT);
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
    if (this.match(tt.questionDot) && this.lookaheadCharCode() === lessThan) {
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
          if (this.match(tt.dot) || this.match(tt.questionDot) && this.lookaheadCharCode() !== leftParenthesis) {
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
      return isExport ? ch === leftCurlyBrace || ch === asterisk : ch !== equalsTo;
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
    if (tokenIsIdentifier(this.state.type) && this.lookaheadCharCode() === equalsTo) {
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
      if (this.lookaheadCharCode() === equalsTo) {
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
          if (nextCh === leftCurlyBrace) {
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
    return this.isContextual(tt._static) && this.lookaheadCharCode() === leftCurlyBrace;
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
      if (nextCh === comma || // (a?, b) => c
      nextCh === equalsTo || // (a? = b) => c
      nextCh === colon || // (a?: b) => c
      nextCh === rightParenthesis) {
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
      node.declare ? BindingFlag.TYPE_TS_AMBIENT : BindingFlag.TYPE_CLASS
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
        return (binding !== BindingFlag.TYPE_NONE || !isUnparenthesizedInAssign) && ["expression", true];
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
      if (code === greaterThan) {
        this.finishOp(tt.gt, 1);
        return;
      }
      if (code === lessThan) {
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
      isInTypeOnlyImport ? BindingFlag.TYPE_TS_TYPE_IMPORT : BindingFlag.TYPE_TS_VALUE_IMPORT
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
        hasTypeSpecifier ? BindingFlag.TYPE_TS_TYPE_IMPORT : BindingFlag.TYPE_TS_VALUE_IMPORT
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
        if (!isIdentifierChar(endCh) && endCh !== backslash) {
          return false;
        }
      }
      return true;
    } else if (ch === backslash) {
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
    return this.chStartsBindingIdentifier(nextCh, next) || nextCh === quotationMark || nextCh === apostrophe;
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
export {
  ExpressionErrors as E,
  LoopLabelKind as L,
  OptionFlags as O,
  ParseBindingListFlags as P,
  Token as T,
  ParamKind as a,
  newExpressionScope as b,
  LValParser as c,
  newAsyncArrowScope as d,
  newArrowHeadScope as e,
  functionFlags as f,
  getOptions as g,
  isNewLine as i,
  newParameterDeclarationScope as n,
  setInnerComments as s,
  typescript_default as t
};
