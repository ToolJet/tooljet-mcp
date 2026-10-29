import { createRequire } from "node:module";
import { r as require_lib, E as Errors, a as tt, q as isStrictBindReservedWord, s as isStrictBindOnlyReservedWord, u as SourceLocation, j as isIdentifierChar, l as tokenIsLiteralPropertyName, i as isIdentifierStart, v as createPositionWithColumnOffset, w as Position, x as keywords, n as tokenLabelName, m as tokenIsKeyword, d as types } from "./chunk-DrLKaGjO.js";
import { _ as __toESM } from "./chunk-D0rVi1EZ.js";
createRequire(import.meta.url);
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
var charCodes = __toESM(require_lib());
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
      if (this.input.charCodeAt(this.offsetToSourcePos(commentStart) - 1) === charCodes.comma) {
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
var charCodes4 = __toESM(require_lib());
var charCodes2 = __toESM(require_lib());
var lineBreak = /\r\n|[\r\n\u2028\u2029]/;
var lineBreakG = new RegExp(lineBreak.source, "g");
function isNewLine(code) {
  switch (code) {
    case charCodes2.lineFeed:
    case charCodes2.carriageReturn:
    case charCodes2.lineSeparator:
    case charCodes2.paragraphSeparator:
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
    case charCodes2.space:
    case charCodes2.nonBreakingSpace:
    case charCodes2.oghamSpaceMark:
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
var charCodes3 = __toESM(require_lib());
var forbiddenNumericSeparatorSiblings = {
  decBinOct: /* @__PURE__ */ new Set([
    charCodes3.dot,
    charCodes3.uppercaseB,
    charCodes3.uppercaseE,
    charCodes3.uppercaseO,
    charCodes3.underscore,
    charCodes3.lowercaseB,
    charCodes3.lowercaseE,
    charCodes3.lowercaseO
  ]),
  hex: /* @__PURE__ */ new Set([
    charCodes3.dot,
    charCodes3.uppercaseX,
    charCodes3.underscore,
    charCodes3.lowercaseX
  ])
};
var isAllowedNumericSeparatorSibling = {
  // 0 - 1
  bin: (ch) => ch === charCodes3.digit0 || ch === charCodes3.digit1,
  // 0 - 7
  oct: (ch) => ch >= charCodes3.digit0 && ch <= charCodes3.digit7,
  // 0 - 9
  dec: (ch) => ch >= charCodes3.digit0 && ch <= charCodes3.digit9,
  // 0 - 9, A - F, a - f,
  hex: (ch) => ch >= charCodes3.digit0 && ch <= charCodes3.digit9 || ch >= charCodes3.uppercaseA && ch <= charCodes3.uppercaseF || ch >= charCodes3.lowercaseA && ch <= charCodes3.lowercaseF
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
    if (ch === charCodes3.backslash) {
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
    } else if (ch === charCodes3.lineSeparator || ch === charCodes3.paragraphSeparator) {
      ++pos;
      ++curLine;
      lineStart = pos;
    } else if (ch === charCodes3.lineFeed || ch === charCodes3.carriageReturn) {
      if (type === "template") {
        out += input.slice(chunkStart, pos) + "\n";
        ++pos;
        if (ch === charCodes3.carriageReturn && input.charCodeAt(pos) === charCodes3.lineFeed) {
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
    return ch === charCodes3.graveAccent || ch === charCodes3.dollarSign && input.charCodeAt(pos + 1) === charCodes3.leftCurlyBrace;
  }
  return ch === (type === "double" ? charCodes3.quotationMark : charCodes3.apostrophe);
}
function readEscapedChar(input, pos, lineStart, curLine, inTemplate, errors) {
  const throwOnInvalid = !inTemplate;
  pos++;
  const res = (ch2) => ({ pos, ch: ch2, lineStart, curLine });
  const ch = input.charCodeAt(pos++);
  switch (ch) {
    case charCodes3.lowercaseN:
      return res("\n");
    case charCodes3.lowercaseR:
      return res("\r");
    case charCodes3.lowercaseX: {
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
    case charCodes3.lowercaseU: {
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
    case charCodes3.lowercaseT:
      return res("	");
    case charCodes3.lowercaseB:
      return res("\b");
    case charCodes3.lowercaseV:
      return res("\v");
    case charCodes3.lowercaseF:
      return res("\f");
    case charCodes3.carriageReturn:
      if (input.charCodeAt(pos) === charCodes3.lineFeed) {
        ++pos;
      }
    // fall through
    case charCodes3.lineFeed:
      lineStart = pos;
      ++curLine;
    // fall through
    case charCodes3.lineSeparator:
    case charCodes3.paragraphSeparator:
      return res("");
    case charCodes3.digit8:
    case charCodes3.digit9:
      if (inTemplate) {
        return res(null);
      } else {
        errors.strictNumericEscape(pos - 1, lineStart, curLine);
      }
    // fall through
    default:
      if (ch >= charCodes3.digit0 && ch <= charCodes3.digit7) {
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
        if (octalStr !== "0" || next === charCodes3.digit8 || next === charCodes3.digit9) {
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
    if (code === charCodes3.underscore && allowNumSeparator !== "bail") {
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
    if (code >= charCodes3.lowercaseA) {
      val = code - charCodes3.lowercaseA + charCodes3.lineFeed;
    } else if (code >= charCodes3.uppercaseA) {
      val = code - charCodes3.uppercaseA + charCodes3.lineFeed;
    } else if (charCodes3.isDigit(code)) {
      val = code - charCodes3.digit0;
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
  if (ch === charCodes3.leftCurlyBrace) {
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
  charCodes4.lowercaseG,
  charCodes4.lowercaseM,
  charCodes4.lowercaseS,
  charCodes4.lowercaseI,
  charCodes4.lowercaseY,
  charCodes4.lowercaseU,
  charCodes4.lowercaseD,
  charCodes4.lowercaseV
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
    if (this.optionFlags & 256) {
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
    if (this.optionFlags & 256) this.pushToken(comment);
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
    if (this.optionFlags & 256) this.pushToken(comment);
    return comment;
  }
  // Called at the start of the parse and after every token. Skips
  // whitespace and comments, and.
  skipSpace() {
    const spaceStart = this.state.pos;
    const comments = this.optionFlags & 4096 ? [] : null;
    loop: while (this.state.pos < this.length) {
      const ch = this.input.charCodeAt(this.state.pos);
      switch (ch) {
        case charCodes4.space:
        case charCodes4.nonBreakingSpace:
        case charCodes4.tab:
          ++this.state.pos;
          break;
        case charCodes4.carriageReturn:
          if (this.input.charCodeAt(this.state.pos + 1) === charCodes4.lineFeed) {
            ++this.state.pos;
          }
        // fall through
        case charCodes4.lineFeed:
        case charCodes4.lineSeparator:
        case charCodes4.paragraphSeparator:
          ++this.state.pos;
          ++this.state.curLine;
          this.state.lineStart = this.state.pos;
          break;
        case charCodes4.slash:
          switch (this.input.charCodeAt(this.state.pos + 1)) {
            case charCodes4.asterisk: {
              const comment = this.skipBlockComment("*/");
              if (comment !== void 0) {
                this.addComment(comment);
                comments?.push(comment);
              }
              break;
            }
            case charCodes4.slash: {
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
          } else if (ch === charCodes4.dash && !this.inModule && this.optionFlags & 8192) {
            const pos = this.state.pos;
            if (this.input.charCodeAt(pos + 1) === charCodes4.dash && this.input.charCodeAt(pos + 2) === charCodes4.greaterThan && (spaceStart === 0 || this.state.lineStart > spaceStart)) {
              const comment = this.skipLineComment(3);
              if (comment !== void 0) {
                this.addComment(comment);
                comments?.push(comment);
              }
            } else {
              break loop;
            }
          } else if (ch === charCodes4.lessThan && !this.inModule && this.optionFlags & 8192) {
            const pos = this.state.pos;
            if (this.input.charCodeAt(pos + 1) === charCodes4.exclamationMark && this.input.charCodeAt(pos + 2) === charCodes4.dash && this.input.charCodeAt(pos + 3) === charCodes4.dash) {
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
    if (next >= charCodes4.digit0 && next <= charCodes4.digit9) {
      throw this.raise(
        Errors.UnexpectedDigitAfterHash,
        this.state.curPosition()
      );
    }
    if (next === charCodes4.leftCurlyBrace || next === charCodes4.leftSquareBracket && this.hasPlugin("recordAndTuple")) {
      this.expectPlugin("recordAndTuple");
      if (this.getPluginOption("recordAndTuple", "syntaxType") === "bar") {
        throw this.raise(
          next === charCodes4.leftCurlyBrace ? Errors.RecordExpressionHashIncorrectStartSyntaxType : Errors.TupleExpressionHashIncorrectStartSyntaxType,
          this.state.curPosition()
        );
      }
      this.state.pos += 2;
      if (next === charCodes4.leftCurlyBrace) {
        this.finishToken(tt.braceHashL);
      } else {
        this.finishToken(tt.bracketHashL);
      }
    } else if (isIdentifierStart(next)) {
      ++this.state.pos;
      this.finishToken(tt.privateName, this.readWord1(next));
    } else if (next === charCodes4.backslash) {
      ++this.state.pos;
      this.finishToken(tt.privateName, this.readWord1());
    } else {
      this.finishOp(tt.hash, 1);
    }
  }
  readToken_dot() {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next >= charCodes4.digit0 && next <= charCodes4.digit9) {
      this.readNumber(true);
      return;
    }
    if (next === charCodes4.dot && this.input.charCodeAt(this.state.pos + 2) === charCodes4.dot) {
      this.state.pos += 3;
      this.finishToken(tt.ellipsis);
    } else {
      ++this.state.pos;
      this.finishToken(tt.dot);
    }
  }
  readToken_slash() {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === charCodes4.equalsTo) {
      this.finishOp(tt.slashAssign, 2);
    } else {
      this.finishOp(tt.slash, 1);
    }
  }
  readToken_interpreter() {
    if (this.state.pos !== 0 || this.length < 2) return false;
    let ch = this.input.charCodeAt(this.state.pos + 1);
    if (ch !== charCodes4.exclamationMark) return false;
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
    let type = code === charCodes4.asterisk ? tt.star : tt.modulo;
    let width = 1;
    let next = this.input.charCodeAt(this.state.pos + 1);
    if (code === charCodes4.asterisk && next === charCodes4.asterisk) {
      width++;
      next = this.input.charCodeAt(this.state.pos + 2);
      type = tt.exponent;
    }
    if (next === charCodes4.equalsTo && !this.state.inType) {
      width++;
      type = code === charCodes4.percentSign ? tt.moduloAssign : tt.assign;
    }
    this.finishOp(type, width);
  }
  readToken_pipe_amp(code) {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === code) {
      if (this.input.charCodeAt(this.state.pos + 2) === charCodes4.equalsTo) {
        this.finishOp(tt.assign, 3);
      } else {
        this.finishOp(
          code === charCodes4.verticalBar ? tt.logicalOR : tt.logicalAND,
          2
        );
      }
      return;
    }
    if (code === charCodes4.verticalBar) {
      if (next === charCodes4.greaterThan) {
        this.finishOp(tt.pipeline, 2);
        return;
      }
      if (this.hasPlugin("recordAndTuple") && next === charCodes4.rightCurlyBrace) {
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
      if (this.hasPlugin("recordAndTuple") && next === charCodes4.rightSquareBracket) {
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
    if (next === charCodes4.equalsTo) {
      this.finishOp(tt.assign, 2);
      return;
    }
    this.finishOp(
      code === charCodes4.verticalBar ? tt.bitwiseOR : tt.bitwiseAND,
      1
    );
  }
  readToken_caret() {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === charCodes4.equalsTo && !this.state.inType) {
      this.finishOp(tt.xorAssign, 2);
    } else if (next === charCodes4.caret && // If the ^^ token is not enabled, we don't throw but parse two single ^s
    // because it could be a ^ hack token followed by a ^ binary operator.
    this.hasPlugin([
      "pipelineOperator",
      { proposal: "hack", topicToken: "^^" }
    ])) {
      this.finishOp(tt.doubleCaret, 2);
      const lookaheadCh = this.input.codePointAt(this.state.pos);
      if (lookaheadCh === charCodes4.caret) {
        this.unexpected();
      }
    } else {
      this.finishOp(tt.bitwiseXOR, 1);
    }
  }
  readToken_atSign() {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === charCodes4.atSign && this.hasPlugin([
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
    if (next === charCodes4.equalsTo) {
      this.finishOp(tt.assign, 2);
    } else {
      this.finishOp(tt.plusMin, 1);
    }
  }
  readToken_lt() {
    const { pos } = this.state;
    const next = this.input.charCodeAt(pos + 1);
    if (next === charCodes4.lessThan) {
      if (this.input.charCodeAt(pos + 2) === charCodes4.equalsTo) {
        this.finishOp(tt.assign, 3);
        return;
      }
      this.finishOp(tt.bitShiftL, 2);
      return;
    }
    if (next === charCodes4.equalsTo) {
      this.finishOp(tt.relational, 2);
      return;
    }
    this.finishOp(tt.lt, 1);
  }
  readToken_gt() {
    const { pos } = this.state;
    const next = this.input.charCodeAt(pos + 1);
    if (next === charCodes4.greaterThan) {
      const size = this.input.charCodeAt(pos + 2) === charCodes4.greaterThan ? 3 : 2;
      if (this.input.charCodeAt(pos + size) === charCodes4.equalsTo) {
        this.finishOp(tt.assign, size + 1);
        return;
      }
      this.finishOp(tt.bitShiftR, size);
      return;
    }
    if (next === charCodes4.equalsTo) {
      this.finishOp(tt.relational, 2);
      return;
    }
    this.finishOp(tt.gt, 1);
  }
  readToken_eq_excl(code) {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === charCodes4.equalsTo) {
      this.finishOp(
        tt.equality,
        this.input.charCodeAt(this.state.pos + 2) === charCodes4.equalsTo ? 3 : 2
      );
      return;
    }
    if (code === charCodes4.equalsTo && next === charCodes4.greaterThan) {
      this.state.pos += 2;
      this.finishToken(tt.arrow);
      return;
    }
    this.finishOp(code === charCodes4.equalsTo ? tt.eq : tt.bang, 1);
  }
  readToken_question() {
    const next = this.input.charCodeAt(this.state.pos + 1);
    const next2 = this.input.charCodeAt(this.state.pos + 2);
    if (next === charCodes4.questionMark) {
      if (next2 === charCodes4.equalsTo) {
        this.finishOp(tt.assign, 3);
      } else {
        this.finishOp(tt.nullishCoalescing, 2);
      }
    } else if (next === charCodes4.dot && !(next2 >= charCodes4.digit0 && next2 <= charCodes4.digit9)) {
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
      case charCodes4.dot:
        this.readToken_dot();
        return;
      // Punctuation tokens.
      case charCodes4.leftParenthesis:
        ++this.state.pos;
        this.finishToken(tt.parenL);
        return;
      case charCodes4.rightParenthesis:
        ++this.state.pos;
        this.finishToken(tt.parenR);
        return;
      case charCodes4.semicolon:
        ++this.state.pos;
        this.finishToken(tt.semi);
        return;
      case charCodes4.comma:
        ++this.state.pos;
        this.finishToken(tt.comma);
        return;
      case charCodes4.leftSquareBracket:
        if (this.hasPlugin("recordAndTuple") && this.input.charCodeAt(this.state.pos + 1) === charCodes4.verticalBar) {
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
      case charCodes4.rightSquareBracket:
        ++this.state.pos;
        this.finishToken(tt.bracketR);
        return;
      case charCodes4.leftCurlyBrace:
        if (this.hasPlugin("recordAndTuple") && this.input.charCodeAt(this.state.pos + 1) === charCodes4.verticalBar) {
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
      case charCodes4.rightCurlyBrace:
        ++this.state.pos;
        this.finishToken(tt.braceR);
        return;
      case charCodes4.colon:
        if (this.hasPlugin("functionBind") && this.input.charCodeAt(this.state.pos + 1) === charCodes4.colon) {
          this.finishOp(tt.doubleColon, 2);
        } else {
          ++this.state.pos;
          this.finishToken(tt.colon);
        }
        return;
      case charCodes4.questionMark:
        this.readToken_question();
        return;
      case charCodes4.graveAccent:
        this.readTemplateToken();
        return;
      case charCodes4.digit0: {
        const next = this.input.charCodeAt(this.state.pos + 1);
        if (next === charCodes4.lowercaseX || next === charCodes4.uppercaseX) {
          this.readRadixNumber(16);
          return;
        }
        if (next === charCodes4.lowercaseO || next === charCodes4.uppercaseO) {
          this.readRadixNumber(8);
          return;
        }
        if (next === charCodes4.lowercaseB || next === charCodes4.uppercaseB) {
          this.readRadixNumber(2);
          return;
        }
      }
      // Anything else beginning with a digit is an integer, octal
      // number, or float. (fall through)
      case charCodes4.digit1:
      case charCodes4.digit2:
      case charCodes4.digit3:
      case charCodes4.digit4:
      case charCodes4.digit5:
      case charCodes4.digit6:
      case charCodes4.digit7:
      case charCodes4.digit8:
      case charCodes4.digit9:
        this.readNumber(false);
        return;
      // Quotes produce strings.
      case charCodes4.quotationMark:
      case charCodes4.apostrophe:
        this.readString(code);
        return;
      // Operators are parsed inline in tiny state machines. '=' (charCodes.equalsTo) is
      // often referred to. `finishOp` simply skips the amount of
      // characters it is given as second argument, and returns a token
      // of the type given by its first argument.
      case charCodes4.slash:
        this.readToken_slash();
        return;
      case charCodes4.percentSign:
      case charCodes4.asterisk:
        this.readToken_mult_modulo(code);
        return;
      case charCodes4.verticalBar:
      case charCodes4.ampersand:
        this.readToken_pipe_amp(code);
        return;
      case charCodes4.caret:
        this.readToken_caret();
        return;
      case charCodes4.plusSign:
      case charCodes4.dash:
        this.readToken_plus_min(code);
        return;
      case charCodes4.lessThan:
        this.readToken_lt();
        return;
      case charCodes4.greaterThan:
        this.readToken_gt();
        return;
      case charCodes4.equalsTo:
      case charCodes4.exclamationMark:
        this.readToken_eq_excl(code);
        return;
      case charCodes4.tilde:
        this.finishOp(tt.tilde, 1);
        return;
      case charCodes4.atSign:
        this.readToken_atSign();
        return;
      case charCodes4.numberSign:
        this.readToken_numberSign();
        return;
      case charCodes4.backslash:
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
        if (ch === charCodes4.leftSquareBracket) {
          inClass = true;
        } else if (ch === charCodes4.rightSquareBracket && inClass) {
          inClass = false;
        } else if (ch === charCodes4.slash && !inClass) {
          break;
        }
        escaped = ch === charCodes4.backslash;
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
        if (cp === charCodes4.lowercaseV) {
          if (mods.includes("u")) {
            this.raise(Errors.IncompatibleRegExpUVFlags, nextPos());
          }
        } else if (cp === charCodes4.lowercaseU) {
          if (mods.includes("v")) {
            this.raise(Errors.IncompatibleRegExpUVFlags, nextPos());
          }
        }
        if (mods.includes(char)) {
          this.raise(Errors.DuplicateRegExpFlags, nextPos());
        }
      } else if (isIdentifierChar(cp) || cp === charCodes4.backslash) {
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
    if (next === charCodes4.lowercaseN) {
      ++this.state.pos;
      isBigInt = true;
    } else if (next === charCodes4.lowercaseM) {
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
    const hasLeadingZero = this.state.pos - start >= 2 && this.input.charCodeAt(start) === charCodes4.digit0;
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
    if (next === charCodes4.dot && !isOctal) {
      ++this.state.pos;
      this.readInt(10);
      isFloat = true;
      next = this.input.charCodeAt(this.state.pos);
    }
    if ((next === charCodes4.uppercaseE || next === charCodes4.lowercaseE) && !isOctal) {
      next = this.input.charCodeAt(++this.state.pos);
      if (next === charCodes4.plusSign || next === charCodes4.dash) {
        ++this.state.pos;
      }
      if (this.readInt(10) === null) {
        this.raise(Errors.InvalidOrMissingExponent, startLoc);
      }
      isFloat = true;
      hasExponent = true;
      next = this.input.charCodeAt(this.state.pos);
    }
    if (next === charCodes4.lowercaseN) {
      if (isFloat || hasLeadingZero) {
        this.raise(Errors.InvalidBigIntLiteral, startLoc);
      }
      ++this.state.pos;
      isBigInt = true;
    }
    if (next === charCodes4.lowercaseM) {
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
      quote === charCodes4.quotationMark ? "double" : "single",
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
    if (this.input.codePointAt(pos) === charCodes4.graveAccent) {
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
      } else if (ch === charCodes4.backslash) {
        this.state.containsEsc = true;
        word += this.input.slice(chunkStart, this.state.pos);
        const escStart = this.state.curPosition();
        const identifierCheck = this.state.pos === start ? isIdentifierStart : isIdentifierChar;
        if (this.input.charCodeAt(++this.state.pos) !== charCodes4.lowercaseU) {
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
    if (!(this.optionFlags & 2048)) throw error;
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
      if (!(this.optionFlags & 2048)) return false;
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
    if (elementType & 3) {
      const accessor = redefined && loneAccessors.get(name);
      if (accessor) {
        const oldStatic = accessor & 4;
        const newStatic = elementType & 4;
        const oldKind = accessor & 3;
        const newKind = elementType & 3;
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
    const ScopeHandler = this.getScopeHandler();
    this.scope = new ScopeHandler(this, inModule);
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
    let paramFlags = 0;
    if (this.inModule || this.optionFlags & 1) {
      paramFlags |= 2;
    }
    if (this.optionFlags & 32) {
      paramFlags |= 1;
    }
    const isCommonJS = !this.inModule && this.options.sourceType === "commonjs";
    if (isCommonJS || this.optionFlags & 2) {
      paramFlags |= 4;
    }
    this.prodParam.enter(paramFlags);
    let scopeFlags = isCommonJS ? 514 : 1;
    if (this.optionFlags & 4) {
      scopeFlags |= 512;
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
var charCodes5 = __toESM(require_lib());
var Node = class {
  constructor(parser, pos, loc) {
    this.start = pos;
    this.end = 0;
    this.loc = new SourceLocation(loc);
    if (parser?.optionFlags & 128) this.range = [pos, 0];
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
    if (process.env.NODE_ENV !== "production" && node.end > 0) {
      throw new Error(
        "Do not call finishNode*() twice on the same node. Instead use resetEndLocation() or change type directly."
      );
    }
    node.type = type;
    node.end = endLoc.index;
    node.loc.end = endLoc;
    if (this.optionFlags & 128) node.range[1] = endLoc.index;
    if (this.optionFlags & 4096) {
      this.processComment(node);
    }
    return node;
  }
  resetStartLocation(node, startLoc) {
    node.start = startLoc.index;
    node.loc.start = startLoc;
    if (this.optionFlags & 128) node.range[0] = startLoc.index;
  }
  resetEndLocation(node, endLoc = this.state.lastTokEndLoc) {
    node.end = endLoc.index;
    node.loc.end = endLoc;
    if (this.optionFlags & 128) node.range[1] = endLoc.index;
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
          charCodes5.rightSquareBracket,
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
    this.checkCommaAfterRest(charCodes5.rightCurlyBrace);
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
        if (!disallowCallExpression && !this.state.strict && this.optionFlags & 8192) {
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
  checkLVal(expression, ancestor, binding = 64, checkClashes = false, strictModeChanged = false, hasParenthesizedAncestor = false, disallowCallExpression = false) {
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
      if (binding !== 64) {
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
      const ParseErrorClass = binding === 64 ? Errors.InvalidLhs : Errors.InvalidLhsBinding;
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
      if (bindingType === 64) {
        this.raise(Errors.StrictEvalArguments, at, { referenceName: at.name });
      } else {
        this.raise(Errors.StrictEvalArgumentsBinding, at, {
          bindingName: at.name
        });
      }
    }
    if (bindingType & 8192 && at.name === "let") {
      this.raise(Errors.LetInLexicalBinding, at);
    }
    if (!(bindingType & 64)) {
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
  ExpressionErrors as E,
  LValParser as L,
  Token as T,
  newExpressionScope as a,
  newAsyncArrowScope as b,
  newArrowHeadScope as c,
  functionFlags as f,
  getOptions as g,
  isNewLine as i,
  newParameterDeclarationScope as n,
  setInnerComments as s
};
