import { createRequire } from "node:module";
import { aF as ParseErrorEnum, b0 as getOptions, O as OptionFlags, a_ as getExportedToken, t as tt, b1 as jsx_default, b2 as estree_default, U as percentSign, ao as tokenLabelName, aG as tokenIsIdentifier, b3 as external_exports, b4 as nodeCatalog, b5 as validateGraph, b6 as specSchema, b7 as compileGraph, b8 as assertWorkflowJavaScript, b9 as controlFlowEdges, r as readCatalog } from "./chunk-CSMyw4Vw.mjs";
import { r as require_parse, a as require_util, h as hubspotQueryIssues, s as singleSpecRef, b as apiEndpointQueryIssues, g as getDatasourceQuerySchema, C as COMMON_QUERY_OPTION_FIELDS, S as SPEC_DISCOVERY_NOTE } from "./chunk-C3n37ePc.mjs";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { r as require_moment, a as ScopeHandler } from "./chunk-DW9m0IHz.mjs";
import { t as typescript_default } from "./chunk-BrOZjXs6.mjs";
import { f as flow_default } from "./chunk-BX4Jqaqv.mjs";
import { S as StatementParser } from "./chunk-cQw4_eTk.mjs";
import { e7 as __toESM, e5 as __commonJS } from "./chunk-DcxxRLvp.mjs";
createRequire(import.meta.url);
var require_stringify = __commonJS({
  "node_modules/json5/lib/stringify.js"(exports, module) {
    var util = require_util();
    module.exports = function stringify(value, replacer, space) {
      const stack = [];
      let indent = "";
      let propertyList;
      let replacerFunc;
      let gap = "";
      let quote;
      if (replacer != null && typeof replacer === "object" && !Array.isArray(replacer)) {
        space = replacer.space;
        quote = replacer.quote;
        replacer = replacer.replacer;
      }
      if (typeof replacer === "function") {
        replacerFunc = replacer;
      } else if (Array.isArray(replacer)) {
        propertyList = [];
        for (const v of replacer) {
          let item;
          if (typeof v === "string") {
            item = v;
          } else if (typeof v === "number" || v instanceof String || v instanceof Number) {
            item = String(v);
          }
          if (item !== void 0 && propertyList.indexOf(item) < 0) {
            propertyList.push(item);
          }
        }
      }
      if (space instanceof Number) {
        space = Number(space);
      } else if (space instanceof String) {
        space = String(space);
      }
      if (typeof space === "number") {
        if (space > 0) {
          space = Math.min(10, Math.floor(space));
          gap = "          ".substr(0, space);
        }
      } else if (typeof space === "string") {
        gap = space.substr(0, 10);
      }
      return serializeProperty("", { "": value });
      function serializeProperty(key, holder) {
        let value2 = holder[key];
        if (value2 != null) {
          if (typeof value2.toJSON5 === "function") {
            value2 = value2.toJSON5(key);
          } else if (typeof value2.toJSON === "function") {
            value2 = value2.toJSON(key);
          }
        }
        if (replacerFunc) {
          value2 = replacerFunc.call(holder, key, value2);
        }
        if (value2 instanceof Number) {
          value2 = Number(value2);
        } else if (value2 instanceof String) {
          value2 = String(value2);
        } else if (value2 instanceof Boolean) {
          value2 = value2.valueOf();
        }
        switch (value2) {
          case null:
            return "null";
          case true:
            return "true";
          case false:
            return "false";
        }
        if (typeof value2 === "string") {
          return quoteString(value2);
        }
        if (typeof value2 === "number") {
          return String(value2);
        }
        if (typeof value2 === "object") {
          return Array.isArray(value2) ? serializeArray(value2) : serializeObject(value2);
        }
        return void 0;
      }
      function quoteString(value2) {
        const quotes = {
          "'": 0.1,
          '"': 0.2
        };
        const replacements = {
          "'": "\\'",
          '"': '\\"',
          "\\": "\\\\",
          "\b": "\\b",
          "\f": "\\f",
          "\n": "\\n",
          "\r": "\\r",
          "	": "\\t",
          "\v": "\\v",
          "\0": "\\0",
          "\u2028": "\\u2028",
          "\u2029": "\\u2029"
        };
        let product = "";
        for (let i = 0; i < value2.length; i++) {
          const c = value2[i];
          switch (c) {
            case "'":
            case '"':
              quotes[c]++;
              product += c;
              continue;
            case "\0":
              if (util.isDigit(value2[i + 1])) {
                product += "\\x00";
                continue;
              }
          }
          if (replacements[c]) {
            product += replacements[c];
            continue;
          }
          if (c < " ") {
            let hexString = c.charCodeAt(0).toString(16);
            product += "\\x" + ("00" + hexString).substring(hexString.length);
            continue;
          }
          product += c;
        }
        const quoteChar = quote || Object.keys(quotes).reduce((a, b) => quotes[a] < quotes[b] ? a : b);
        product = product.replace(new RegExp(quoteChar, "g"), replacements[quoteChar]);
        return quoteChar + product + quoteChar;
      }
      function serializeObject(value2) {
        if (stack.indexOf(value2) >= 0) {
          throw TypeError("Converting circular structure to JSON5");
        }
        stack.push(value2);
        let stepback = indent;
        indent = indent + gap;
        let keys = propertyList || Object.keys(value2);
        let partial = [];
        for (const key of keys) {
          const propertyString = serializeProperty(key, value2);
          if (propertyString !== void 0) {
            let member = serializeKey(key) + ":";
            if (gap !== "") {
              member += " ";
            }
            member += propertyString;
            partial.push(member);
          }
        }
        let final;
        if (partial.length === 0) {
          final = "{}";
        } else {
          let properties;
          if (gap === "") {
            properties = partial.join(",");
            final = "{" + properties + "}";
          } else {
            let separator = ",\n" + indent;
            properties = partial.join(separator);
            final = "{\n" + indent + properties + ",\n" + stepback + "}";
          }
        }
        stack.pop();
        indent = stepback;
        return final;
      }
      function serializeKey(key) {
        if (key.length === 0) {
          return quoteString(key);
        }
        const firstChar = String.fromCodePoint(key.codePointAt(0));
        if (!util.isIdStartChar(firstChar)) {
          return quoteString(key);
        }
        for (let i = firstChar.length; i < key.length; i++) {
          if (!util.isIdContinueChar(String.fromCodePoint(key.codePointAt(i)))) {
            return quoteString(key);
          }
        }
        return key;
      }
      function serializeArray(value2) {
        if (stack.indexOf(value2) >= 0) {
          throw TypeError("Converting circular structure to JSON5");
        }
        stack.push(value2);
        let stepback = indent;
        indent = indent + gap;
        let partial = [];
        for (let i = 0; i < value2.length; i++) {
          const propertyString = serializeProperty(String(i), value2);
          partial.push(propertyString !== void 0 ? propertyString : "null");
        }
        let final;
        if (partial.length === 0) {
          final = "[]";
        } else {
          if (gap === "") {
            let properties = partial.join(",");
            final = "[" + properties + "]";
          } else {
            let separator = ",\n" + indent;
            let properties = partial.join(separator);
            final = "[\n" + indent + properties + ",\n" + stepback + "]";
          }
        }
        stack.pop();
        indent = stepback;
        return final;
      }
    };
  }
});
var require_lib = __commonJS({
  "node_modules/json5/lib/index.js"(exports, module) {
    var parse2 = require_parse();
    var stringify = require_stringify();
    var JSON52 = {
      parse: parse2,
      stringify
    };
    module.exports = JSON52;
  }
});
function assessRedisRead(options, datasourceId) {
  const base = {
    datasourceKind: "redis",
    ...datasourceId ? { datasourceId } : {},
    provenRead: false,
    directSafe: false,
    countOnly: false,
    selectStar: false,
    requiresCountPreflight: false
  };
  const query = options.query;
  if (typeof query !== "string" || !query || query.includes("{{") || /[\r\n\t\0]/.test(query)) {
    return { ...base, reason: "Redis needs one static space-delimited command in options.query." };
  }
  const [raw, ...args] = query.split(" ");
  if (!raw || args.some((arg) => !arg)) {
    return { ...base, reason: "Redis commands must use single spaces, matching the plugin parser." };
  }
  const command = raw.toUpperCase();
  const scalarArity = {
    PING: 0,
    DBSIZE: 0,
    GET: 1,
    TYPE: 1,
    TTL: 1,
    PTTL: 1,
    STRLEN: 1,
    HLEN: 1,
    LLEN: 1,
    SCARD: 1,
    ZCARD: 1,
    HGET: 2,
    HEXISTS: 2,
    SISMEMBER: 2,
    ZSCORE: 2
  };
  if (Object.hasOwn(scalarArity, command) && args.length === scalarArity[command]) {
    return { ...base, provenRead: true, directSafe: true, maxRows: 1 };
  }
  if (["MGET", "EXISTS", "HMGET"].includes(command)) {
    const fields = args.length - (command === "HMGET" ? 1 : 0);
    if (fields > 0 && fields <= 1e3) {
      return { ...base, provenRead: true, directSafe: true, maxRows: command === "EXISTS" ? 1 : fields };
    }
  }
  if (["LRANGE", "ZRANGE"].includes(command) && args.length === 3 && /^\d+$/.test(args[1]) && /^\d+$/.test(args[2])) {
    const start = Number(args[1]);
    const end = Number(args[2]);
    const maxRows = end - start + 1;
    if (Number.isSafeInteger(start) && Number.isSafeInteger(end) && maxRows > 0 && maxRows <= 1e3) {
      return { ...base, provenRead: true, directSafe: true, maxRows };
    }
  }
  const scanOffset = command === "SCAN" ? 0 : ["HSCAN", "SSCAN", "ZSCAN"].includes(command) ? 1 : -1;
  let scan = scanOffset >= 0 && args.length > scanOffset && /^\d+$/.test(args[scanOffset]);
  const seen = /* @__PURE__ */ new Set();
  if (scan) {
    for (let i = scanOffset + 1; i < args.length; i += 2) {
      const option = args[i].toUpperCase();
      const value = args[i + 1];
      if (!value || seen.has(option) || !["MATCH", "COUNT", ...command === "SCAN" ? ["TYPE"] : []].includes(option) || option === "COUNT" && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 1e3)) {
        scan = false;
        break;
      }
      seen.add(option);
    }
  }
  if (scan || ["HGETALL", "HKEYS", "HVALS", "SMEMBERS"].includes(command) && args.length === 1) {
    return {
      ...base,
      provenRead: true,
      requiresRemoteReadConfirmation: true,
      reason: "Redis collection/scan reads have no hard result bound. Use singular run_query with confirmed read access; SCAN COUNT is only a hint."
    };
  }
  return { ...base, reason: `Redis command ${command} is not a supported bounded read. Writes, scripts, KEYS and administrative commands are not automatically executed.` };
}
var import_json5 = __toESM(require_lib());
var import_moment = __toESM(require_moment(), 1);
var PlaceholderErrors = ParseErrorEnum`placeholders`({
  ClassNameIsRequired: "A class name is required.",
  UnexpectedSpace: "Unexpected space in placeholder."
});
var placeholders_default = (superClass) => class PlaceholdersParserMixin extends superClass {
  parsePlaceholder(expectedNode) {
    if (this.match(tt.placeholder)) {
      const node = this.startNode();
      this.next();
      this.assertNoSpace();
      node.name = super.parseIdentifier(
        /* liberal */
        true
      );
      this.assertNoSpace();
      this.expect(tt.placeholder);
      return this.finishPlaceholder(node, expectedNode);
    }
  }
  finishPlaceholder(node, expectedNode) {
    let placeholder = node;
    if (!placeholder.expectedNode || !placeholder.type) {
      placeholder = this.finishNode(
        placeholder,
        "Placeholder"
      );
    }
    placeholder.expectedNode = expectedNode;
    return placeholder;
  }
  /* ============================================================ *
   * tokenizer/index.ts                                           *
   * ============================================================ */
  getTokenFromCode(code) {
    if (code === percentSign && this.input.charCodeAt(this.state.pos + 1) === percentSign) {
      this.finishOp(tt.placeholder, 2);
    } else {
      super.getTokenFromCode(code);
    }
  }
  /* ============================================================ *
   * parser/expression.ts                                         *
   * ============================================================ */
  parseExprAtom(refExpressionErrors) {
    return this.parsePlaceholder("Expression") || super.parseExprAtom(refExpressionErrors);
  }
  parseIdentifier(liberal) {
    return this.parsePlaceholder("Identifier") || super.parseIdentifier(liberal);
  }
  checkReservedWord(word, startLoc, checkKeywords, isBinding) {
    if (word !== void 0) {
      super.checkReservedWord(word, startLoc, checkKeywords, isBinding);
    }
  }
  /* ============================================================ *
   * parser/node.ts                                               *
   * ============================================================ */
  cloneIdentifier(node) {
    const cloned = super.cloneIdentifier(node);
    if (cloned.type === "Placeholder") {
      cloned.expectedNode = node.expectedNode;
    }
    return cloned;
  }
  cloneStringLiteral(node) {
    if (node.type === "Placeholder") {
      return this.cloneIdentifier(node);
    }
    return super.cloneStringLiteral(node);
  }
  /* ============================================================ *
   * parser/lval.ts                                               *
   * ============================================================ */
  parseBindingAtom() {
    return this.parsePlaceholder("Pattern") || super.parseBindingAtom();
  }
  isValidLVal(type, disallowCallExpression, isParenthesized, binding) {
    return type === "Placeholder" || super.isValidLVal(
      type,
      disallowCallExpression,
      isParenthesized,
      binding
    );
  }
  toAssignable(node, isLHS) {
    if (node && node.type === "Placeholder" && node.expectedNode === "Expression") {
      node.expectedNode = "Pattern";
    } else {
      super.toAssignable(node, isLHS);
    }
  }
  /* ============================================================ *
   * parser/statement.ts                                          *
   * ============================================================ */
  chStartsBindingIdentifier(ch, pos) {
    if (super.chStartsBindingIdentifier(ch, pos)) {
      return true;
    }
    const next = this.nextTokenStart();
    if (this.input.charCodeAt(next) === percentSign && this.input.charCodeAt(next + 1) === percentSign) {
      return true;
    }
    return false;
  }
  verifyBreakContinue(node, isBreak) {
    if (node.label?.type === "Placeholder") return;
    super.verifyBreakContinue(node, isBreak);
  }
  // @ts-expect-error Plugin will override parser interface
  parseExpressionStatement(node, expr) {
    if (expr.type !== "Placeholder" || expr.extra?.parenthesized) {
      return super.parseExpressionStatement(node, expr);
    }
    if (this.match(tt.colon)) {
      const stmt = node;
      stmt.label = this.finishPlaceholder(expr, "Identifier");
      this.next();
      stmt.body = super.parseStatementOrSloppyAnnexBFunctionDeclaration();
      return this.finishNode(stmt, "LabeledStatement");
    }
    this.semicolon();
    const stmtPlaceholder = node;
    stmtPlaceholder.name = expr.name;
    return this.finishPlaceholder(stmtPlaceholder, "Statement");
  }
  parseBlock(allowDirectives, createNewLexicalScope, afterBlockParse) {
    return this.parsePlaceholder("BlockStatement") || super.parseBlock(
      allowDirectives,
      createNewLexicalScope,
      afterBlockParse
    );
  }
  parseFunctionId(requireId) {
    return this.parsePlaceholder("Identifier") || super.parseFunctionId(requireId);
  }
  // @ts-expect-error Plugin will override parser interface
  parseClass(node, isStatement, optionalId) {
    const type = isStatement ? "ClassDeclaration" : "ClassExpression";
    this.next();
    const oldStrict = this.state.strict;
    const placeholder = this.parsePlaceholder("Identifier");
    if (placeholder) {
      if (this.match(tt._extends) || this.match(tt.placeholder) || this.match(tt.braceL)) {
        node.id = placeholder;
      } else if (optionalId || !isStatement) {
        node.id = null;
        node.body = this.finishPlaceholder(placeholder, "ClassBody");
        return this.finishNode(node, type);
      } else {
        throw this.raise(
          PlaceholderErrors.ClassNameIsRequired,
          this.state.startLoc
        );
      }
    } else {
      this.parseClassId(node, isStatement, optionalId);
    }
    super.parseClassSuper(node);
    node.body = this.parsePlaceholder("ClassBody") || super.parseClassBody(!!node.superClass, oldStrict);
    return this.finishNode(node, type);
  }
  parseExport(node, decorators) {
    const placeholder = this.parsePlaceholder("Identifier");
    if (!placeholder) return super.parseExport(node, decorators);
    const node2 = node;
    if (!this.isContextual(tt._from) && !this.match(tt.comma)) {
      node2.specifiers = [];
      node2.source = null;
      node2.declaration = this.finishPlaceholder(placeholder, "Declaration");
      return this.finishNode(node2, "ExportNamedDeclaration");
    }
    this.expectPlugin("exportDefaultFrom");
    const specifier = this.startNode();
    specifier.exported = placeholder;
    node2.specifiers = [this.finishNode(specifier, "ExportDefaultSpecifier")];
    return super.parseExport(node2, decorators);
  }
  isExportDefaultSpecifier() {
    if (this.match(tt._default)) {
      const next = this.nextTokenStart();
      if (this.isUnparsedContextual(next, "from")) {
        if (this.input.startsWith(
          tokenLabelName(tt.placeholder),
          this.nextTokenStartSince(next + 4)
        )) {
          return true;
        }
      }
    }
    return super.isExportDefaultSpecifier();
  }
  maybeParseExportDefaultSpecifier(node, maybeDefaultIdentifier) {
    if (node.specifiers?.length) {
      return true;
    }
    return super.maybeParseExportDefaultSpecifier(
      node,
      maybeDefaultIdentifier
    );
  }
  checkExport(node) {
    const { specifiers } = node;
    if (specifiers?.length) {
      node.specifiers = specifiers.filter(
        // @ts-expect-error placeholder typings
        (node2) => node2.exported.type === "Placeholder"
      );
    }
    super.checkExport(node);
    node.specifiers = specifiers;
  }
  parseImport(node) {
    const placeholder = this.parsePlaceholder("Identifier");
    if (!placeholder) return super.parseImport(node);
    node.specifiers = [];
    if (!this.isContextual(tt._from) && !this.match(tt.comma)) {
      node.source = this.finishPlaceholder(placeholder, "StringLiteral");
      this.semicolon();
      return this.finishNode(node, "ImportDeclaration");
    }
    const specifier = this.startNodeAtNode(placeholder);
    specifier.local = placeholder;
    node.specifiers.push(
      this.finishNode(specifier, "ImportDefaultSpecifier")
    );
    if (this.eat(tt.comma)) {
      const hasStarImport = this.maybeParseStarImportSpecifier(node);
      if (!hasStarImport) this.parseNamedImportSpecifiers(node);
    }
    this.expectContextual(tt._from);
    node.source = this.parseImportSource();
    this.semicolon();
    return this.finishNode(node, "ImportDeclaration");
  }
  parseImportSource() {
    return this.parsePlaceholder("StringLiteral") || super.parseImportSource();
  }
  // Throws if the current token and the prev one are separated by a space.
  assertNoSpace() {
    if (this.state.start > this.offsetToSourcePos(this.state.lastTokEndLoc.index)) {
      this.raise(
        PlaceholderErrors.UnexpectedSpace,
        this.state.lastTokEndLoc
      );
    }
  }
};
var v8intrinsic_default = (superClass) => class V8IntrinsicMixin extends superClass {
  parseV8Intrinsic() {
    if (this.match(tt.modulo)) {
      const v8IntrinsicStartLoc = this.state.startLoc;
      const node = this.startNode();
      this.next();
      if (tokenIsIdentifier(this.state.type)) {
        const name2 = this.parseIdentifierName();
        const identifier = this.createIdentifier(node, name2);
        this.castNodeTo(identifier, "V8IntrinsicIdentifier");
        if (this.match(tt.parenL)) {
          return identifier;
        }
      }
      this.unexpected(v8IntrinsicStartLoc);
    }
  }
  /* ============================================================ *
   * parser/expression.js                                         *
   * ============================================================ */
  parseExprAtom(refExpressionErrors) {
    return this.parseV8Intrinsic() || super.parseExprAtom(refExpressionErrors);
  }
};
var PIPELINE_PROPOSALS = ["minimal", "fsharp", "hack", "smart"];
var TOPIC_TOKENS = ["^^", "@@", "^", "%", "#"];
function validatePlugins(pluginsMap) {
  if (pluginsMap.has("decorators")) {
    if (pluginsMap.has("decorators-legacy")) {
      throw new Error(
        "Cannot use the decorators and decorators-legacy plugin together"
      );
    }
    const decoratorsBeforeExport = pluginsMap.get("decorators").decoratorsBeforeExport;
    if (decoratorsBeforeExport != null && typeof decoratorsBeforeExport !== "boolean") {
      throw new Error(
        "'decoratorsBeforeExport' must be a boolean, if specified."
      );
    }
    const allowCallParenthesized = pluginsMap.get("decorators").allowCallParenthesized;
    if (allowCallParenthesized != null && typeof allowCallParenthesized !== "boolean") {
      throw new Error("'allowCallParenthesized' must be a boolean.");
    }
  }
  if (pluginsMap.has("flow") && pluginsMap.has("typescript")) {
    throw new Error("Cannot combine flow and typescript plugins.");
  }
  if (pluginsMap.has("placeholders") && pluginsMap.has("v8intrinsic")) {
    throw new Error("Cannot combine placeholders and v8intrinsic plugins.");
  }
  if (pluginsMap.has("pipelineOperator")) {
    const proposal = pluginsMap.get("pipelineOperator").proposal;
    if (!PIPELINE_PROPOSALS.includes(proposal)) {
      const proposalList = PIPELINE_PROPOSALS.map((p) => `"${p}"`).join(", ");
      throw new Error(
        `"pipelineOperator" requires "proposal" option whose value must be one of: ${proposalList}.`
      );
    }
    if (proposal === "hack") {
      if (pluginsMap.has("placeholders")) {
        throw new Error(
          "Cannot combine placeholders plugin and Hack-style pipes."
        );
      }
      if (pluginsMap.has("v8intrinsic")) {
        throw new Error(
          "Cannot combine v8intrinsic plugin and Hack-style pipes."
        );
      }
      const topicToken = pluginsMap.get("pipelineOperator").topicToken;
      if (!TOPIC_TOKENS.includes(topicToken)) {
        const tokenList = TOPIC_TOKENS.map((t) => `"${t}"`).join(", ");
        throw new Error(
          `"pipelineOperator" in "proposal": "hack" mode also requires a "topicToken" option whose value must be one of: ${tokenList}.`
        );
      }
      {
        if (topicToken === "#" && pluginsMap.get("recordAndTuple")?.syntaxType === "hash") {
          throw new Error(
            `Plugin conflict between \`["pipelineOperator", { proposal: "hack", topicToken: "#" }]\` and \`${JSON.stringify(["recordAndTuple", pluginsMap.get("recordAndTuple")])}\`.`
          );
        }
      }
    } else if (proposal === "smart" && pluginsMap.get("recordAndTuple")?.syntaxType === "hash") {
      throw new Error(
        `Plugin conflict between \`["pipelineOperator", { proposal: "smart" }]\` and \`${JSON.stringify(["recordAndTuple", pluginsMap.get("recordAndTuple")])}\`.`
      );
    }
  }
  if (pluginsMap.has("moduleAttributes")) {
    {
      if (pluginsMap.has("deprecatedImportAssert") || pluginsMap.has("importAssertions")) {
        throw new Error(
          "Cannot combine importAssertions, deprecatedImportAssert and moduleAttributes plugins."
        );
      }
      const moduleAttributesVersionPluginOption = pluginsMap.get("moduleAttributes").version;
      if (moduleAttributesVersionPluginOption !== "may-2020") {
        throw new Error(
          "The 'moduleAttributes' plugin requires a 'version' option, representing the last proposal update. Currently, the only supported value is 'may-2020'."
        );
      }
    }
  }
  if (pluginsMap.has("importAssertions")) {
    if (pluginsMap.has("deprecatedImportAssert")) {
      throw new Error(
        "Cannot combine importAssertions and deprecatedImportAssert plugins."
      );
    }
  }
  if (pluginsMap.has("deprecatedImportAssert")) ;
  else if (pluginsMap.has("importAttributes") && pluginsMap.get("importAttributes").deprecatedAssertSyntax) {
    {
      pluginsMap.set("deprecatedImportAssert", {});
    }
  }
  if (pluginsMap.has("recordAndTuple")) {
    {
      const syntaxType = pluginsMap.get("recordAndTuple").syntaxType;
      if (syntaxType != null) {
        const RECORD_AND_TUPLE_SYNTAX_TYPES = ["hash", "bar"];
        if (!RECORD_AND_TUPLE_SYNTAX_TYPES.includes(syntaxType)) {
          throw new Error(
            "The 'syntaxType' option of the 'recordAndTuple' plugin must be one of: " + RECORD_AND_TUPLE_SYNTAX_TYPES.map((p) => `'${p}'`).join(", ")
          );
        }
      }
    }
  }
  if (pluginsMap.has("asyncDoExpressions") && !pluginsMap.has("doExpressions")) {
    const error = new Error(
      "'asyncDoExpressions' requires 'doExpressions', please add 'doExpressions' to parser plugins."
    );
    error.missingPlugins = "doExpressions";
    throw error;
  }
  if (pluginsMap.has("optionalChainingAssign") && pluginsMap.get("optionalChainingAssign").version !== "2023-07") {
    throw new Error(
      "The 'optionalChainingAssign' plugin requires a 'version' option, representing the last proposal update. Currently, the only supported value is '2023-07'."
    );
  }
  if (pluginsMap.has("discardBinding") && pluginsMap.get("discardBinding").syntaxType !== "void") {
    throw new Error(
      "The 'discardBinding' plugin requires a 'syntaxType' option. Currently the only supported value is 'void'."
    );
  }
}
var mixinPlugins = {
  estree: estree_default,
  jsx: jsx_default,
  flow: flow_default,
  typescript: typescript_default,
  v8intrinsic: v8intrinsic_default,
  placeholders: placeholders_default
};
var mixinPluginNames = Object.keys(mixinPlugins);
var Parser = class extends StatementParser {
  constructor(options, input, pluginsMap) {
    const normalizedOptions = getOptions(options);
    super(normalizedOptions, input);
    this.options = normalizedOptions;
    this.initializeScopes();
    this.plugins = pluginsMap;
    this.filename = normalizedOptions.sourceFilename;
    this.startIndex = normalizedOptions.startIndex;
    let optionFlags = 0;
    if (normalizedOptions.allowAwaitOutsideFunction) {
      optionFlags |= OptionFlags.AllowAwaitOutsideFunction;
    }
    if (normalizedOptions.allowReturnOutsideFunction) {
      optionFlags |= OptionFlags.AllowReturnOutsideFunction;
    }
    if (normalizedOptions.allowImportExportEverywhere) {
      optionFlags |= OptionFlags.AllowImportExportEverywhere;
    }
    if (normalizedOptions.allowSuperOutsideMethod) {
      optionFlags |= OptionFlags.AllowSuperOutsideMethod;
    }
    if (normalizedOptions.allowUndeclaredExports) {
      optionFlags |= OptionFlags.AllowUndeclaredExports;
    }
    if (normalizedOptions.allowNewTargetOutsideFunction) {
      optionFlags |= OptionFlags.AllowNewTargetOutsideFunction;
    }
    if (normalizedOptions.allowYieldOutsideFunction) {
      optionFlags |= OptionFlags.AllowYieldOutsideFunction;
    }
    if (normalizedOptions.ranges) {
      optionFlags |= OptionFlags.Ranges;
    }
    if (normalizedOptions.tokens) {
      optionFlags |= OptionFlags.Tokens;
    }
    if (normalizedOptions.createImportExpressions) {
      optionFlags |= OptionFlags.CreateImportExpressions;
    }
    if (normalizedOptions.createParenthesizedExpressions) {
      optionFlags |= OptionFlags.CreateParenthesizedExpressions;
    }
    if (normalizedOptions.errorRecovery) {
      optionFlags |= OptionFlags.ErrorRecovery;
    }
    if (normalizedOptions.attachComment) {
      optionFlags |= OptionFlags.AttachComment;
    }
    if (normalizedOptions.annexB) {
      optionFlags |= OptionFlags.AnnexB;
    }
    this.optionFlags = optionFlags;
  }
  // This can be overwritten, for example, by the TypeScript plugin.
  getScopeHandler() {
    return ScopeHandler;
  }
  parse() {
    this.enterInitialScopes();
    const file = this.startNode();
    const program = this.startNode();
    this.nextToken();
    file.errors = null;
    const result = this.parseTopLevel(file, program);
    result.errors = this.state.errors;
    result.comments.length = this.state.commentsLen;
    return result;
  }
};
function parse(input, options) {
  if (options?.sourceType === "unambiguous") {
    options = {
      ...options
    };
    try {
      options.sourceType = "module";
      const parser = getParser(options, input);
      const ast = parser.parse();
      if (parser.sawUnambiguousESM) {
        return ast;
      }
      if (parser.ambiguousScriptDifferentAst) {
        try {
          options.sourceType = "script";
          return getParser(options, input).parse();
        } catch {
        }
      } else {
        ast.program.sourceType = "script";
      }
      return ast;
    } catch (moduleError) {
      try {
        options.sourceType = "script";
        return getParser(options, input).parse();
      } catch {
      }
      throw moduleError;
    }
  } else {
    return getParser(options, input).parse();
  }
}
function parseExpression(input, options) {
  const parser = getParser(options, input);
  if (parser.options.strictMode) {
    parser.state.strict = true;
  }
  return parser.getExpression();
}
function generateExportedTokenTypes(internalTokenTypes2) {
  const tokenTypes = {};
  for (const typeName of Object.keys(
    internalTokenTypes2
  )) {
    tokenTypes[typeName] = getExportedToken(internalTokenTypes2[typeName]);
  }
  return tokenTypes;
}
generateExportedTokenTypes(tt);
function getParser(options, input) {
  let cls = Parser;
  const pluginsMap = /* @__PURE__ */ new Map();
  if (options?.plugins) {
    for (const plugin of options.plugins) {
      let name2, opts;
      if (typeof plugin === "string") {
        name2 = plugin;
      } else {
        [name2, opts] = plugin;
      }
      if (!pluginsMap.has(name2)) {
        pluginsMap.set(name2, opts || {});
      }
    }
    validatePlugins(pluginsMap);
    cls = getParserClass(pluginsMap);
  }
  return new cls(options, input, pluginsMap);
}
var parserClassCache = /* @__PURE__ */ new Map();
function getParserClass(pluginsMap) {
  const pluginList = [];
  for (const name2 of mixinPluginNames) {
    if (pluginsMap.has(name2)) {
      pluginList.push(name2);
    }
  }
  const key = pluginList.join("|");
  let cls = parserClassCache.get(key);
  if (!cls) {
    cls = Parser;
    for (const plugin of pluginList) {
      cls = mixinPlugins[plugin](cls);
    }
    parserClassCache.set(key, cls);
  }
  return cls;
}
var Unsupported = class extends Error {
};
var MAX_EXPRESSION_CHARS = 600;
var MAX_PAD = 1e3;
var MATH_FNS = {
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  abs: Math.abs,
  trunc: Math.trunc,
  sign: Math.sign,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  sqrt: Math.sqrt
};
var MATH_CONSTANTS = { PI: Math.PI, E: Math.E };
var UNITS = /* @__PURE__ */ new Set([
  "year",
  "years",
  "y",
  "quarter",
  "quarters",
  "Q",
  "month",
  "months",
  "M",
  "week",
  "weeks",
  "w",
  "isoWeek",
  "isoWeeks",
  "day",
  "days",
  "d",
  "date",
  "hour",
  "hours",
  "h",
  "minute",
  "minutes",
  "m",
  "second",
  "seconds",
  "s",
  "millisecond",
  "milliseconds",
  "ms"
]);
var none = (a) => a.length === 0;
var MOMENT_METHODS = {
  add: (a) => a.length === 2 && typeof a[0] === "number" && isUnit(a[1]),
  subtract: (a) => a.length === 2 && typeof a[0] === "number" && isUnit(a[1]),
  startOf: (a) => a.length === 1 && isUnit(a[0]),
  endOf: (a) => a.length === 1 && isUnit(a[0]),
  format: (a) => a.length === 0 || a.length === 1 && typeof a[0] === "string",
  toISOString: none,
  valueOf: none,
  unix: none,
  utc: none,
  local: none,
  clone: none,
  isValid: none,
  year: none,
  quarter: none,
  month: none,
  date: none,
  day: none,
  isoWeekday: none,
  week: none,
  isoWeek: none,
  hour: none,
  minute: none,
  second: none,
  daysInMonth: none,
  diff: (a) => a.length >= 1 && a.length <= 3 && isDateLike(a[0]) && (a[1] === void 0 || isUnit(a[1])) && (a[2] === void 0 || typeof a[2] === "boolean"),
  isBefore: (a) => a.length >= 1 && a.length <= 2 && isDateLike(a[0]) && (a[1] === void 0 || isUnit(a[1])),
  isAfter: (a) => a.length >= 1 && a.length <= 2 && isDateLike(a[0]) && (a[1] === void 0 || isUnit(a[1])),
  isSame: (a) => a.length >= 1 && a.length <= 2 && isDateLike(a[0]) && (a[1] === void 0 || isUnit(a[1]))
};
var STRING_METHODS = {
  toUpperCase: (s, a) => a.length ? unsupported() : s.toUpperCase(),
  toLowerCase: (s, a) => a.length ? unsupported() : s.toLowerCase(),
  trim: (s, a) => a.length ? unsupported() : s.trim(),
  // A length past the cap is not resolved: shortening it would give a different answer than JavaScript.
  padStart: (s, a) => s.padStart(capped(a[0], MAX_PAD), str(a[1] ?? " ")),
  padEnd: (s, a) => s.padEnd(capped(a[0], MAX_PAD), str(a[1] ?? " ")),
  slice: (s, a) => s.slice(num(a[0] ?? 0), a[1] === void 0 ? void 0 : num(a[1])),
  substring: (s, a) => s.substring(num(a[0] ?? 0), a[1] === void 0 ? void 0 : num(a[1]))
};
function unsupported() {
  throw new Unsupported();
}
function own(table, name2) {
  return typeof name2 === "string" && Object.prototype.hasOwnProperty.call(table, name2) ? table[name2] : void 0;
}
function isUnit(v) {
  return typeof v === "string" && UNITS.has(v);
}
function isDateLike(v) {
  return isMoment(v) || typeof v === "string" || typeof v === "number";
}
function isMoment(v) {
  return typeof v === "object" && v !== null && v.kind === "moment";
}
function num(v) {
  if (typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > 1e9)
    unsupported();
  return v;
}
function capped(v, max) {
  const n = num(v);
  if (n < 0 || n > max)
    unsupported();
  return n;
}
function str(v) {
  if (typeof v !== "string")
    unsupported();
  return v;
}
function primitive(v) {
  if (isMoment(v))
    unsupported();
  return v;
}
function box(m) {
  return { kind: "moment", m };
}
function momentArgs(args) {
  if (args.length > 2)
    unsupported();
  return args.map((a) => typeof a === "string" || typeof a === "number" ? a : unsupported());
}
function interpret(node) {
  switch (node?.type) {
    case "StringLiteral":
    case "NumericLiteral":
    case "BooleanLiteral":
      return node.value;
    case "NullLiteral":
      return null;
    case "Identifier":
      if (node.name === "undefined")
        return void 0;
      if (node.name === "NaN")
        return NaN;
      if (node.name === "Infinity")
        return Infinity;
      return unsupported();
    case "TemplateLiteral": {
      let out = "";
      node.quasis.forEach((q, i) => {
        out += q.value.cooked ?? "";
        if (i < node.expressions.length)
          out += String(primitive(interpret(node.expressions[i])));
      });
      return out;
    }
    case "UnaryExpression": {
      const v = primitive(interpret(node.argument));
      if (node.operator === "!")
        return !v;
      if (node.operator === "-")
        return -num(v);
      if (node.operator === "+")
        return typeof v === "string" ? Number(v) : num(v);
      if (node.operator === "typeof")
        return typeof v;
      return unsupported();
    }
    case "BinaryExpression": {
      const a = primitive(interpret(node.left));
      const b = primitive(interpret(node.right));
      switch (node.operator) {
        case "+":
          return typeof a === "string" || typeof b === "string" ? String(a) + String(b) : num(a) + num(b);
        case "-":
          return num(a) - num(b);
        case "*":
          return num(a) * num(b);
        case "/":
          return num(a) / num(b);
        case "%":
          return num(a) % num(b);
        case "===":
          return a === b;
        case "!==":
          return a !== b;
        case "==":
          return a == b;
        // eslint-disable-line eqeqeq
        case "!=":
          return a != b;
        // eslint-disable-line eqeqeq
        case "<":
          return a < b;
        case ">":
          return a > b;
        case "<=":
          return a <= b;
        case ">=":
          return a >= b;
        default:
          return unsupported();
      }
    }
    case "LogicalExpression": {
      const l = interpret(node.left);
      if (node.operator === "&&")
        return l ? interpret(node.right) : l;
      if (node.operator === "||")
        return l ? l : interpret(node.right);
      if (node.operator === "??")
        return l ?? interpret(node.right);
      return unsupported();
    }
    case "ConditionalExpression":
      return interpret(node.test) ? interpret(node.consequent) : interpret(node.alternate);
    case "MemberExpression": {
      if (node.computed)
        return unsupported();
      const name2 = node.property?.name;
      if (node.object?.type === "Identifier" && node.object.name === "Math") {
        const constant = own(MATH_CONSTANTS, name2);
        return constant ?? unsupported();
      }
      const target = interpret(node.object);
      if (typeof target === "string" && name2 === "length")
        return target.length;
      return unsupported();
    }
    case "CallExpression": {
      const args = node.arguments.map((a) => a.type === "SpreadElement" ? unsupported() : interpret(a));
      const callee = node.callee;
      if (callee.type === "Identifier") {
        if (callee.name === "moment")
          return box((0, import_moment.default)(...momentArgs(args)));
        if (callee.name === "String" && args.length === 1)
          return String(primitive(args[0]));
        if (callee.name === "Number" && args.length === 1)
          return Number(primitive(args[0]));
        if (callee.name === "parseInt" && args.length === 1)
          return parseInt(str(args[0]));
        if (callee.name === "parseInt" && args.length === 2)
          return parseInt(str(args[0]), capped(args[1], 36));
        if (callee.name === "parseFloat" && args.length === 1)
          return parseFloat(str(args[0]));
        return unsupported();
      }
      if (callee.type !== "MemberExpression" || callee.computed)
        return unsupported();
      const name2 = callee.property?.name;
      const object2 = callee.object;
      if (object2.type === "Identifier" && object2.name === "moment") {
        if (name2 === "utc")
          return box(import_moment.default.utc(...momentArgs(args)));
        if (name2 === "unix" && args.length === 1)
          return box(import_moment.default.unix(num(args[0])));
        return unsupported();
      }
      if (object2.type === "Identifier" && object2.name === "Math") {
        const fn = own(MATH_FNS, name2);
        return fn ? fn(...args.map((a) => num(a))) : unsupported();
      }
      if (object2.type === "Identifier" && object2.name === "Date" && name2 === "now" && args.length === 0)
        return Date.now();
      if (object2.type === "Identifier" && object2.name === "JSON" && name2 === "stringify" && args.length === 1) {
        return JSON.stringify(primitive(args[0]));
      }
      const target = interpret(object2);
      if (isMoment(target)) {
        const check = own(MOMENT_METHODS, name2);
        if (!check || !check(args))
          return unsupported();
        const unwrapped = args.map((a) => isMoment(a) ? a.m : a);
        const result = target.m[name2](...unwrapped);
        if (import_moment.default.isMoment(result))
          return box(result);
        if (typeof result === "string" || typeof result === "number" || typeof result === "boolean")
          return result;
        return unsupported();
      }
      if (typeof target === "string") {
        const fn = own(STRING_METHODS, name2);
        return fn ? fn(target, args) : unsupported();
      }
      if (typeof target === "number") {
        if (name2 === "toFixed" && args.length <= 1)
          return target.toFixed(args[0] === void 0 ? 0 : capped(args[0], 100));
        if (name2 === "toString" && args.length === 0)
          return String(target);
        return unsupported();
      }
      return unsupported();
    }
    default:
      return unsupported();
  }
}
var SERVER_BINDING = /\{\{(.*?)\}\}/gs;
function resolveStaticBindings(options) {
  const resolved = {};
  const unresolved = [];
  const visit = (value) => {
    if (typeof value === "string") {
      if (!value.includes("{{") || !value.includes("}}"))
        return;
      const key = value.replace(/\n/g, " ");
      if (key in resolved || unresolved.includes(key))
        return;
      const outcome = resolveString(value);
      if (!outcome.ok) {
        unresolved.push(key);
        return;
      }
      resolved[key] = outcome.value;
      for (const [binding, v] of outcome.parts)
        resolved[binding.replace(/\n/g, " ")] = v;
    } else if (Array.isArray(value))
      value.forEach(visit);
    else if (value && typeof value === "object")
      Object.values(value).forEach(visit);
  };
  visit(options);
  return { resolved, unresolved };
}
function resolveString(text) {
  const matches = [...text.matchAll(SERVER_BINDING)];
  if (!matches.length)
    return { ok: false };
  const parts = [];
  for (const m of matches) {
    const result = evaluate(m[1]);
    if (!result.ok)
      return { ok: false };
    parts.push([m[0], result.value]);
  }
  if (matches.length === 1 && matches[0][0] === text.trim())
    return { ok: true, value: parts[0][1], parts: [] };
  let i = 0;
  return { ok: true, value: text.replace(SERVER_BINDING, () => String(parts[i++][1])), parts };
}
function evaluate(expression) {
  if (expression.length > MAX_EXPRESSION_CHARS)
    return { ok: false };
  try {
    const value = interpret(parseExpression(expression));
    if (isMoment(value))
      return { ok: true, value: value.m.toISOString() };
    if (typeof value === "number" && !Number.isFinite(value))
      return { ok: false };
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}
function unresolvedNote(bindings) {
  const shown = bindings.slice(0, 3).map((b) => b.length > 60 ? `${b.slice(0, 57)}...` : b).join(", ");
  return `Browser-free run: ${bindings.length} binding(s) read live app state and ran as undefined (${shown}). Empty or failed results here do not show the viewer is wrong; check it in the viewer before rewriting the query.`;
}
function applyResolvedBindings(options, resolved) {
  if (typeof options === "string") {
    if (!options.includes("{{") || !options.includes("}}"))
      return options;
    const key = options.replace(/\n/g, " ");
    return Object.prototype.hasOwnProperty.call(resolved, key) ? resolved[key] : options;
  }
  if (Array.isArray(options))
    return options.map((value) => applyResolvedBindings(value, resolved));
  if (options && typeof options === "object") {
    return Object.fromEntries(Object.entries(options).map(([k, v]) => [k, applyResolvedBindings(v, resolved)]));
  }
  return options;
}
function resolvedBindingValues(resolved) {
  return Object.entries(resolved).filter(([key]) => /^\{\{(?:(?!\}\})[\s\S])*\}\}$/.test(key)).map(([, value]) => value);
}
function emptyViewerOnlyParams(options, resolution) {
  const params = options && typeof options === "object" ? options.query_params : void 0;
  if (!Array.isArray(params))
    return [];
  const filled = [];
  for (const pair of params) {
    if (!Array.isArray(pair) || typeof pair[1] !== "string")
      continue;
    const key = pair[1].replace(/\n/g, " ");
    if (!resolution.unresolved.includes(key))
      continue;
    resolution.resolved[key] = null;
    resolution.unresolved = resolution.unresolved.filter((b) => b !== key);
    filled.push(String(pair[0]));
  }
  return filled;
}
function emptyParamsNote(names) {
  return `Ran with ${names.map((n) => `:${n}`).join(", ")} = null: ${names.length > 1 ? "they come" : "it comes"} from the app (a component or a picked row), which is empty outside the viewer. The query works for the empty case; check a value in the viewer.`;
}
var LARGE_READ_ROW_THRESHOLD = 1e3;
var SQL_KINDS = /* @__PURE__ */ new Set([
  "postgresql",
  "mysql",
  "mariadb",
  "mssql",
  "sqlserver",
  "cockroachdb",
  "redshift",
  "snowflake",
  "bigquery",
  "clickhouse",
  "oracle",
  "oracledb",
  "sqlite",
  "databricks",
  "athena",
  "awsredshift",
  "harperdb",
  "ibmdb",
  "saphana",
  // SQL dialects assessSql already parses; each keeps its SQL in one operation, and the write
  // operations carry no SQL field, so they still fall through to a refusal.
  "spanner",
  "presto",
  "cosmosdb",
  "couchbase",
  "salesforce"
]);
var BILLABLE_SCAN_SQL_KINDS = /* @__PURE__ */ new Set(["bigquery", "snowflake", "redshift", "awsredshift", "athena", "databricks"]);
function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function staticPositiveInteger(value) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0)
    return value;
  if (typeof value !== "string")
    return void 0;
  const match = value.trim().match(/^(?:\{\{\s*)?(\d+)(?:\s*\}\})?$/);
  return match ? Number(match[1]) : void 0;
}
function containsBinding(value) {
  if (typeof value === "string")
    return value.includes("{{");
  if (Array.isArray(value))
    return value.some(containsBinding);
  return !!record(value) && Object.values(record(value)).some(containsBinding);
}
var SERVICENOW_ROW_READS = /* @__PURE__ */ new Set(["list_records"]);
var SERVICENOW_SINGLE_READS = /* @__PURE__ */ new Set(["get_record", "aggregate"]);
var SERVICENOW_METADATA_READS = /* @__PURE__ */ new Set([
  "list_tables",
  "get_table_schema",
  "get_field_choices",
  "list_workflows",
  "list_flows"
]);
function assessServiceNow(options, datasourceId) {
  const identity = { datasourceKind: "servicenow", ...datasourceId ? { datasourceId } : {} };
  const operation = typeof options.operation === "string" ? options.operation.toLowerCase() : void 0;
  const table = typeof options.table === "string" ? options.table.trim() : "";
  const source = table ? { kind: "remote_endpoint", value: `servicenow:${table}` } : void 0;
  const refuse = (reason) => ({
    provenRead: false,
    directSafe: false,
    countOnly: false,
    selectStar: false,
    requiresCountPreflight: false,
    reason,
    ...identity
  });
  if (!operation)
    return refuse("ServiceNow query has no operation.");
  if (!SERVICENOW_ROW_READS.has(operation) && !SERVICENOW_SINGLE_READS.has(operation) && !SERVICENOW_METADATA_READS.has(operation)) {
    return refuse(`ServiceNow operation ${operation} is not a read; it can change ServiceNow state.`);
  }
  const remote = {
    provenRead: true,
    directSafe: false,
    selectStar: false,
    requiresCountPreflight: false,
    requiresRemoteReadConfirmation: true,
    ...source ? { source } : {},
    ...identity
  };
  if (SERVICENOW_SINGLE_READS.has(operation)) {
    return {
      ...remote,
      countOnly: operation === "aggregate",
      maxRows: 1,
      reason: `ServiceNow ${operation} reads remote data and consumes API quota.`
    };
  }
  if (SERVICENOW_METADATA_READS.has(operation)) {
    return {
      ...remote,
      countOnly: false,
      reason: `ServiceNow ${operation} reads remote metadata and consumes API quota.`
    };
  }
  const maxRows = staticPositiveInteger(options.sysparm_limit);
  if (maxRows === void 0) {
    return {
      ...remote,
      countOnly: false,
      requiresCountPreflight: true,
      reason: "ServiceNow list_records has no static sysparm_limit, so its result size cannot be bounded."
    };
  }
  if (maxRows > LARGE_READ_ROW_THRESHOLD) {
    return {
      ...remote,
      countOnly: false,
      requiresCountPreflight: true,
      maxRows,
      reason: `ServiceNow list_records can return up to ${maxRows} rows, above the ${LARGE_READ_ROW_THRESHOLD}-row safety threshold.`
    };
  }
  return {
    ...remote,
    countOnly: false,
    maxRows,
    simpleSourceRead: true,
    reason: "ServiceNow list_records reads remote data and consumes API quota."
  };
}
function assessOpenapi(options, datasourceId) {
  const identity = { datasourceKind: "openapi", ...datasourceId ? { datasourceId } : {} };
  const refuse = (reason) => ({
    provenRead: false,
    directSafe: false,
    countOnly: false,
    selectStar: false,
    requiresCountPreflight: false,
    reason,
    ...identity
  });
  const method = typeof options.operation === "string" ? options.operation.toLowerCase() : void 0;
  if (method !== "get") {
    return refuse(`OpenAPI method ${method ?? "<missing>"} is not a proven read; only GET queries can be previewed.`);
  }
  const path = typeof options.path === "string" ? options.path.trim() : "";
  if (!path || containsBinding(path)) {
    return refuse("OpenAPI preview requires a non-empty static path; dynamic endpoints must be verified in the viewer.");
  }
  if (containsBinding(options.params) || containsBinding(options.host)) {
    return refuse("OpenAPI preview requires static host and parameters; binding-dependent requests must be verified in the viewer.");
  }
  const host = typeof options.host === "string" ? options.host.trim() : "";
  return {
    provenRead: true,
    directSafe: false,
    countOnly: false,
    selectStar: false,
    requiresCountPreflight: false,
    requiresRemoteReadConfirmation: true,
    source: { kind: "remote_endpoint", value: `${host}${path}` },
    reason: "OpenAPI GET may expose remote data, consume quota, or return an unbounded payload.",
    ...identity
  };
}
var INFLUX_ROW_READS = /* @__PURE__ */ new Set(["query_data"]);
var INFLUX_METADATA_READS = /* @__PURE__ */ new Set([
  "list_buckets",
  "retrieve_bucket",
  "analyze_flux_query",
  "abstract_syntax_tree",
  "query_suggestions",
  "query_suggestions_for_branching"
]);
var FLUX_WRITE_CALL = /(^|[^A-Za-z0-9_])(?:[A-Za-z_][A-Za-z0-9_]*\s*\.\s*)?(?:wideTo|to)\s*\(/;
var FLUX_EGRESS_PACKAGES = [
  "sql",
  "kafka",
  "mqtt",
  "http",
  "slack",
  "pagerduty",
  "discord",
  "teams",
  "telegram",
  "bigpanda",
  "opsgenie",
  "sensu",
  "servicenow",
  "victorops",
  "webexteams",
  "zenoss",
  "monitor",
  "influxdata/influxdb/secrets",
  "influxdata/influxdb/tasks"
];
var FLUX_EGRESS_IMPORT = new RegExp(String.raw`(^|\n)\s*import\s+(?:[A-Za-z_][A-Za-z0-9_]*\s+)?"(?:` + FLUX_EGRESS_PACKAGES.map((name2) => name2.replace(/\//g, String.raw`\/`)).join("|") + String.raw`)"`);
var FLUX_LIMIT = /(^|[^A-Za-z0-9_.])limit\s*\(\s*n\s*:\s*(\d+)/;
function assessInflux(options, datasourceId) {
  const identity = { datasourceKind: "influxdb", ...datasourceId ? { datasourceId } : {} };
  const operation = typeof options.operation === "string" ? options.operation.toLowerCase() : void 0;
  const refuse = (reason) => ({
    provenRead: false,
    directSafe: false,
    countOnly: false,
    selectStar: false,
    requiresCountPreflight: false,
    reason,
    ...identity
  });
  if (!operation)
    return refuse("InfluxDB query has no operation.");
  if (!INFLUX_ROW_READS.has(operation) && !INFLUX_METADATA_READS.has(operation)) {
    return refuse(`InfluxDB operation ${operation} is not a read; it can change InfluxDB state.`);
  }
  const remote = {
    provenRead: true,
    directSafe: false,
    selectStar: false,
    requiresCountPreflight: false,
    requiresRemoteReadConfirmation: true,
    ...identity
  };
  if (INFLUX_METADATA_READS.has(operation)) {
    return {
      ...remote,
      countOnly: false,
      reason: `InfluxDB ${operation} reads remote metadata without executing a query.`
    };
  }
  const body = typeof options.body === "string" ? options.body : "";
  if (!body.trim())
    return refuse("InfluxDB query_data has no Flux body to classify.");
  if (FLUX_WRITE_CALL.test(body)) {
    return refuse("InfluxDB query_data body calls to()/wideTo(), which writes points or rows out of the query; that is not a read.");
  }
  const egress = body.match(FLUX_EGRESS_IMPORT);
  if (egress) {
    return refuse(`InfluxDB query_data body imports ${egress[0].trim()}, which can send data out of InfluxDB or read secrets; that is not a read.`);
  }
  const bucket = body.match(/from\s*\(\s*bucket\s*:\s*"([^"]+)"/)?.[1];
  const source = bucket ? { kind: "remote_endpoint", value: `influxdb:${bucket}` } : void 0;
  const bounded = { ...remote, countOnly: false, ...source ? { source } : {} };
  const maxRows = staticPositiveInteger(body.match(FLUX_LIMIT)?.[2]);
  if (maxRows === void 0) {
    return {
      ...bounded,
      requiresCountPreflight: true,
      reason: "InfluxDB Flux query has no static limit(n:), so the number of points it returns cannot be bounded."
    };
  }
  if (maxRows > LARGE_READ_ROW_THRESHOLD) {
    return {
      ...bounded,
      requiresCountPreflight: true,
      maxRows,
      reason: `InfluxDB Flux query can return up to ${maxRows} points, above the ${LARGE_READ_ROW_THRESHOLD}-row safety threshold.`
    };
  }
  return { ...bounded, maxRows, reason: "InfluxDB query_data reads remote time-series data." };
}
function assessRestGet(options, datasourceId) {
  const identity = { datasourceKind: "restapi", ...datasourceId ? { datasourceId } : {} };
  const method = typeof options.method === "string" ? options.method.toLowerCase() : void 0;
  if (method !== "get") {
    return {
      provenRead: false,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      reason: `REST method ${method ?? "<missing>"} is not a proven read; only static GET queries can be previewed.`,
      ...identity
    };
  }
  const url = typeof options.url === "string" ? options.url.trim() : "";
  if (!url || containsBinding(url)) {
    return {
      provenRead: false,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      reason: "REST GET preview requires a non-empty static url; dynamic endpoints must be verified in the viewer.",
      ...identity
    };
  }
  const requestFields = ["url_params", "headers", "cookies"].map((key) => options[key]);
  if (requestFields.some(containsBinding)) {
    return {
      provenRead: false,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      reason: "REST GET preview requires static request parameters/headers/cookies; binding-dependent requests must be verified in the viewer.",
      ...identity
    };
  }
  return {
    provenRead: true,
    directSafe: false,
    countOnly: false,
    selectStar: false,
    requiresCountPreflight: false,
    requiresRemoteReadConfirmation: true,
    source: { kind: "remote_endpoint", value: url },
    reason: "REST GET may expose remote data, consume quota, or return an unbounded payload.",
    ...identity
  };
}
function assessSupabase(options, datasourceId) {
  const operation = typeof options.operation === "string" ? options.operation.toLowerCase() : "";
  const table = operation === "count_rows" ? options.count_table_name : options.get_table_name;
  const identity = { datasourceKind: "supabase", ...datasourceId ? { datasourceId } : {} };
  if (!["get_rows", "count_rows"].includes(operation) || typeof table !== "string" || !table.trim() || containsBinding(table)) {
    return {
      provenRead: false,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      reason: "Supabase operation is not a static row read.",
      ...identity
    };
  }
  const source = { kind: "remote_endpoint", value: `supabase:${table.trim().toLowerCase()}` };
  if (operation === "count_rows") {
    const countFilters = options.count_filters;
    const fullSourceCount = countFilters == null || Array.isArray(countFilters) && countFilters.length === 0 || !!record(countFilters) && Object.keys(record(countFilters)).length === 0;
    return {
      provenRead: true,
      directSafe: false,
      countOnly: true,
      selectStar: false,
      requiresCountPreflight: false,
      requiresRemoteReadConfirmation: true,
      fullSourceCount,
      simpleSourceRead: true,
      maxRows: 1,
      source,
      ...identity
    };
  }
  const maxRows = staticPositiveInteger(options.get_limit);
  const unbounded = maxRows === void 0 || maxRows > LARGE_READ_ROW_THRESHOLD;
  return {
    provenRead: true,
    directSafe: false,
    countOnly: false,
    selectStar: false,
    requiresCountPreflight: unbounded,
    requiresRemoteReadConfirmation: true,
    simpleSourceRead: true,
    source,
    maxRows,
    ...identity,
    ...unbounded ? { reason: `Supabase get_rows has no static get_limit at or below ${LARGE_READ_ROW_THRESHOLD}; set get_limit.` } : {}
  };
}
var MONGO_ROW_READS = /* @__PURE__ */ new Set(["find_many"]);
var MONGO_SINGLE_READS = /* @__PURE__ */ new Set(["find_one"]);
var MONGO_COUNT_READS = /* @__PURE__ */ new Set(["count", "count_total"]);
var MONGO_WRITE_STAGES = ["$out", "$merge"];
function mongoOptions(raw) {
  const direct = record(raw);
  if (direct)
    return direct;
  if (typeof raw !== "string" || !raw.trim())
    return void 0;
  try {
    if (containsBinding(raw))
      return void 0;
    return record(import_json5.default.parse(raw));
  } catch {
    return void 0;
  }
}
function mongoPipelineWrites(pipeline) {
  if (Array.isArray(pipeline))
    return pipeline.some(mongoPipelineWrites);
  const obj = record(pipeline);
  return !!obj && Object.entries(obj).some(([key, value]) => MONGO_WRITE_STAGES.includes(key) || mongoPipelineWrites(value));
}
function assessMongo(options, datasourceId) {
  const operation = typeof options.operation === "string" ? options.operation.toLowerCase() : "";
  const identity = { datasourceKind: "mongodb", ...datasourceId ? { datasourceId } : {} };
  const refuse = (reason) => ({
    provenRead: false,
    directSafe: false,
    countOnly: false,
    selectStar: false,
    requiresCountPreflight: false,
    reason,
    ...identity
  });
  const collection = options.collection;
  if (typeof collection !== "string" || !collection.trim() || containsBinding(collection)) {
    return refuse("MongoDB collection is missing or not statically known.");
  }
  const source = { kind: "gui_table", value: collection };
  if (MONGO_COUNT_READS.has(operation)) {
    const filter = options.filter;
    const fullSourceCount = filter == null || filter === "" || !!record(filter) && Object.keys(record(filter)).length === 0 || typeof filter === "string" && ["{}", "{ }"].includes(filter.trim());
    return {
      provenRead: true,
      directSafe: true,
      countOnly: true,
      selectStar: false,
      requiresCountPreflight: false,
      fullSourceCount,
      simpleSourceRead: true,
      maxRows: 1,
      source,
      ...identity
    };
  }
  if (MONGO_SINGLE_READS.has(operation)) {
    return {
      provenRead: true,
      directSafe: true,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      simpleSourceRead: true,
      maxRows: 1,
      source,
      ...identity
    };
  }
  if (operation === "aggregate") {
    const rawOptions = options.options;
    const aggregateOptions = rawOptions == null || rawOptions === "" ? {} : mongoOptions(rawOptions);
    if (!aggregateOptions || containsBinding(rawOptions) || containsBinding(aggregateOptions)) {
      return refuse("MongoDB aggregate options must be a statically known JSON5 object.");
    }
    if ("out" in aggregateOptions) {
      return refuse("MongoDB aggregate options.out adds a $out stage, which writes a collection.");
    }
    let pipeline = options.pipeline;
    if (containsBinding(pipeline))
      return refuse("MongoDB aggregate pipeline is not statically known.");
    if (typeof pipeline === "string") {
      try {
        pipeline = import_json5.default.parse(pipeline);
      } catch {
        return refuse("MongoDB aggregate pipeline must be valid JSON5 array text.");
      }
    }
    if (!Array.isArray(pipeline) || pipeline.some((stage) => !record(stage))) {
      return refuse("MongoDB aggregate pipeline must be a statically known array of stages.");
    }
    if (mongoPipelineWrites(pipeline)) {
      return refuse("MongoDB aggregate pipeline contains a $out/$merge stage, which writes a collection.");
    }
    const last = record(pipeline.at(-1));
    const maxRows2 = last && Object.keys(last).length === 1 && typeof last.$limit === "number" ? staticPositiveInteger(last.$limit) : void 0;
    return {
      provenRead: true,
      directSafe: maxRows2 !== void 0 && maxRows2 <= LARGE_READ_ROW_THRESHOLD,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: maxRows2 === void 0 || maxRows2 > LARGE_READ_ROW_THRESHOLD,
      source,
      maxRows: maxRows2,
      ...identity,
      ...maxRows2 === void 0 ? { reason: "MongoDB aggregate has no statically provable row limit; add a final {$limit: N} pipeline stage. options.limit does not bound aggregation output." } : {}
    };
  }
  if (operation === "distinct") {
    return {
      provenRead: true,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: true,
      source,
      ...identity,
      reason: "MongoDB distinct ignores options.limit and array fields can yield multiple values per document. Use a bounded aggregate with a final $limit stage."
    };
  }
  if (!MONGO_ROW_READS.has(operation)) {
    return refuse(`MongoDB operation ${operation || "<missing>"} is not a proven bounded read.`);
  }
  const maxRows = staticPositiveInteger(mongoOptions(options.options)?.limit);
  if (maxRows !== void 0 && maxRows <= LARGE_READ_ROW_THRESHOLD) {
    return {
      provenRead: true,
      directSafe: true,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      simpleSourceRead: true,
      maxRows,
      source,
      ...identity
    };
  }
  return {
    provenRead: true,
    directSafe: false,
    countOnly: false,
    selectStar: false,
    requiresCountPreflight: true,
    simpleSourceRead: true,
    maxRows,
    source,
    ...identity,
    reason: maxRows === void 0 ? `MongoDB ${operation} has no statically provable row limit; set options.limit.` : `MongoDB ${operation} can return up to ${maxRows} rows, above the ${LARGE_READ_ROW_THRESHOLD}-row safety threshold.`
  };
}
var SHEETS_METADATA_READS = /* @__PURE__ */ new Set(["info", "list_all_spreadsheets"]);
var A1_ROW_RANGE = /^(?:[^!]*!)?[A-Z]*(\d+):[A-Z]*(\d+)$/i;
function sheetsRangeRows(range) {
  if (typeof range !== "string" || containsBinding(range))
    return void 0;
  const match = range.trim().match(A1_ROW_RANGE);
  if (!match)
    return void 0;
  const rows = Number(match[2]) - Number(match[1]) + 1;
  return rows > 0 ? rows : void 0;
}
function assessSheets(options, datasourceId) {
  const operation = typeof options.operation === "string" ? options.operation.toLowerCase() : "";
  const identity = { datasourceKind: "googlesheetsv2", ...datasourceId ? { datasourceId } : {} };
  const spreadsheet = options.spreadsheet_id;
  if (SHEETS_METADATA_READS.has(operation)) {
    return {
      provenRead: true,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      requiresRemoteReadConfirmation: true,
      maxRows: 1,
      ...identity
    };
  }
  if (operation !== "read" && operation !== "list_all") {
    return {
      provenRead: false,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      ...identity,
      reason: `Google Sheets operation ${operation || "<missing>"} is not a proven bounded read.`
    };
  }
  if (typeof spreadsheet !== "string" || !spreadsheet.trim() || containsBinding(spreadsheet)) {
    return {
      provenRead: false,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      ...identity,
      reason: "Google Sheets spreadsheet_id is missing or not statically known."
    };
  }
  const sheet = typeof options.sheet === "string" && options.sheet.trim() ? `:${options.sheet.trim()}` : "";
  const source = { kind: "remote_endpoint", value: `googlesheets:${spreadsheet.trim()}${sheet}` };
  const maxRows = operation === "read" ? sheetsRangeRows(options.spreadsheet_range) : void 0;
  const bounded = maxRows !== void 0 && maxRows <= LARGE_READ_ROW_THRESHOLD;
  return {
    provenRead: true,
    directSafe: false,
    countOnly: false,
    selectStar: false,
    requiresCountPreflight: !bounded,
    requiresRemoteReadConfirmation: true,
    source,
    maxRows,
    ...identity,
    ...bounded ? {} : { reason: maxRows === void 0 ? `Google Sheets ${operation} has no statically bounded row range; set spreadsheet_range to an explicit A1 range such as A1:D100.` : `Google Sheets range covers ${maxRows} rows, above the ${LARGE_READ_ROW_THRESHOLD}-row safety threshold.` }
  };
}
function assessDynamo(options, datasourceId) {
  const operation = typeof options.operation === "string" ? options.operation.toLowerCase() : "";
  const identity = { datasourceKind: "dynamodb", ...datasourceId ? { datasourceId } : {} };
  const table = options.table;
  const refuse = (reason) => ({
    provenRead: false,
    directSafe: false,
    countOnly: false,
    selectStar: false,
    requiresCountPreflight: false,
    reason,
    ...identity
  });
  if (!["get_item", "query_table", "scan_table", "describe_table"].includes(operation)) {
    return refuse(`DynamoDB operation ${operation || "<missing>"} is not a proven bounded read.`);
  }
  if (typeof table !== "string" || !table.trim() || containsBinding(table)) {
    return refuse("DynamoDB table is missing or not statically known.");
  }
  const source = { kind: "gui_table", value: table.trim().toLowerCase() };
  if (operation === "get_item" || operation === "describe_table") {
    return {
      provenRead: true,
      directSafe: true,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      simpleSourceRead: true,
      maxRows: 1,
      source,
      ...identity
    };
  }
  return {
    provenRead: true,
    directSafe: false,
    countOnly: false,
    selectStar: false,
    requiresCountPreflight: true,
    simpleSourceRead: true,
    source,
    ...identity,
    reason: `DynamoDB ${operation} has no statically provable row limit.`
  };
}
function assessCouch(options, datasourceId) {
  const operation = typeof options.operation === "string" ? options.operation.toLowerCase() : "";
  const identity = { datasourceKind: "couchdb", ...datasourceId ? { datasourceId } : {} };
  if (operation === "retrieve_record") {
    return {
      provenRead: true,
      directSafe: true,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      maxRows: 1,
      ...identity
    };
  }
  if (!["list_records", "get_view", "find"].includes(operation)) {
    return {
      provenRead: false,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      ...identity,
      reason: `CouchDB operation ${operation || "<missing>"} is not a proven bounded read.`
    };
  }
  const limit = operation === "find" ? mongoOptions(options.body)?.limit : options.limit;
  const maxRows = staticPositiveInteger(limit);
  if (maxRows !== void 0 && maxRows <= LARGE_READ_ROW_THRESHOLD) {
    return {
      provenRead: true,
      directSafe: true,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      maxRows,
      ...identity
    };
  }
  return {
    provenRead: true,
    directSafe: false,
    countOnly: false,
    selectStar: false,
    requiresCountPreflight: true,
    maxRows,
    ...identity,
    reason: maxRows === void 0 ? `CouchDB ${operation} has no statically provable row limit; set ${operation === "find" ? "limit in the request body" : "limit"}.` : `CouchDB ${operation} can return up to ${maxRows} rows, above the ${LARGE_READ_ROW_THRESHOLD}-row safety threshold.`
  };
}
function stripSql(sql) {
  return sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim().replace(/;\s*$/, "").trim();
}
function sqlStatementText(sql, backslashEscapes) {
  let text = "";
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'" || char === '"' || char === "`") {
      const quote = char;
      text += quote + quote;
      let closed = false;
      while (++i < sql.length) {
        if (sql[i] === "\\" && backslashEscapes) {
          i++;
          continue;
        }
        if (sql[i] !== quote)
          continue;
        if (sql[i + 1] === quote) {
          i++;
          continue;
        }
        closed = true;
        break;
      }
      if (!closed)
        return void 0;
    } else if (char === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n")
        i++;
      text += " ";
    } else if (char === "/" && sql[i + 1] === "*") {
      if (sql[i + 2] === "!")
        return void 0;
      const end = sql.indexOf("*/", i + 2);
      if (end < 0)
        return void 0;
      i = end + 1;
      text += " ";
    } else
      text += char;
  }
  return text.trim().replace(/;\s*$/, "").trim();
}
function normalizeSqlTable(raw) {
  return raw.split(".").map((part) => part.replace(/^[`"\[]|[`"\]]$/g, "")).join(".").toLowerCase();
}
function sqlSource(sql) {
  const match = sql.match(/\bfrom\s+((?:[`"\[]?[A-Za-z_$][\w$]*[`"\]]?\.)*[`"\[]?[A-Za-z_$][\w$]*[`"\]]?)/i);
  return match ? { kind: "sql_table", value: normalizeSqlTable(match[1]) } : void 0;
}
function blankQuoted(sql) {
  return sql.replace(/'(?:[^']|'')*'|"(?:[^"]|"")*"|`[^`]*`/g, (m) => " ".repeat(m.length));
}
function mainStatementAfterCtes(sql) {
  const blank = blankQuoted(sql);
  const head = /^with\s+(?:recursive\s+)?/i.exec(blank);
  if (!head)
    return void 0;
  let i = head[0].length;
  for (let guard = 0; guard < 50; guard++) {
    const name2 = /^\s*[`"\[]?[A-Za-z_$][\w$]*[`"\]]?\s*(?:\([^()]*\)\s*)?as\s+(?:not\s+)?(?:materialized\s+)?\(/i.exec(blank.slice(i));
    if (!name2)
      return void 0;
    i += name2[0].length;
    let depth = 1;
    while (i < blank.length && depth > 0) {
      if (blank[i] === "(")
        depth++;
      else if (blank[i] === ")")
        depth--;
      i++;
    }
    if (depth !== 0)
      return void 0;
    const next = /^\s*,/.exec(blank.slice(i));
    if (!next)
      return sql.slice(i).trim();
    i += next[0].length;
  }
  return void 0;
}
function assessSql(sql, datasourceKind, datasourceId) {
  const compact = stripSql(sql);
  const identity = { datasourceKind, ...datasourceId ? { datasourceId } : {} };
  const unquoted = sqlStatementText(sql, false);
  if (unquoted === void 0 || unquoted !== sqlStatementText(sql, true)) {
    return {
      provenRead: false,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      reason: "SQL quoting is ambiguous or unterminated; use doubled SQL quotes or query parameters",
      ...identity
    };
  }
  const entity = unquoted.match(/&(?:lt|gt|amp|quot|#39);/);
  if (entity) {
    return {
      provenRead: false,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      reason: `SQL contains the HTML entity ${entity[0]}; write the character itself (<, >, &) in the SQL`,
      ...identity
    };
  }
  if (!compact || unquoted.includes(";")) {
    return {
      provenRead: false,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      reason: "SQL is empty or contains more than one statement",
      ...identity
    };
  }
  if (/^with\b/i.test(compact)) {
    if (/\b(insert|update|delete|merge|upsert|truncate|drop|alter|create|grant|revoke|copy|call|exec|execute)\b/i.test(unquoted)) {
      return {
        provenRead: false,
        directSafe: false,
        countOnly: false,
        selectStar: false,
        requiresCountPreflight: false,
        reason: "A WITH statement that writes or runs code is not a read",
        ...identity
      };
    }
    const main = mainStatementAfterCtes(compact);
    if (!main || !/^select\b/i.test(main)) {
      return {
        provenRead: false,
        directSafe: false,
        countOnly: false,
        selectStar: false,
        requiresCountPreflight: false,
        reason: "WITH statement: its final statement is not a SELECT that can be proven",
        ...identity
      };
    }
    const assessed = assessSql(main, datasourceKind, datasourceId);
    return { ...assessed, simpleSourceRead: false, ...assessed.fullSourceCount ? { fullSourceCount: false } : {} };
  }
  if (/^(show\b|describe\b|desc\b|explain\s+(?:select\b|show\b))/i.test(compact)) {
    return {
      provenRead: true,
      directSafe: true,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      ...identity
    };
  }
  if (!/^select\b/i.test(compact)) {
    return {
      provenRead: false,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      reason: "SQL is not a single proven read statement",
      ...identity
    };
  }
  if (/\binto\s+(?:temp(?:orary)?\s+|unlogged\s+)?[`"\[]?[A-Za-z_$]/i.test(compact)) {
    return {
      provenRead: false,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      reason: "SELECT INTO creates or replaces data and is not a read-only query",
      ...identity
    };
  }
  if (/\bfor\s+(?:no\s+key\s+update|key\s+share|update|share)\b|\block\s+in\s+share\s+mode\b/i.test(compact)) {
    return {
      provenRead: false,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      reason: "Locking SELECT statements are not side-effect-free reads",
      ...identity
    };
  }
  const fromIndex = compact.search(/\bfrom\b/i);
  const selectClause = compact.slice("select".length, fromIndex >= 0 ? fromIndex : compact.length).trim();
  const countOnly = /^count\s*\([\s\S]+\)(?:\s+(?:as\s+)?[`"A-Za-z_$][\w$`"]*)?$/i.test(selectClause);
  const projectionClause = selectClause.replace(/^top\s*(?:\(\s*\d+\s*\)|\d+)\s+/i, "").trim();
  const selectStar = !countOnly && /(?:^|,)\s*(?:[`"A-Za-z_$][\w$`"]*\.)?\*\s*(?:,|$)/.test(projectionClause);
  const source = sqlSource(compact);
  const fromCount = compact.match(/\bfrom\b/gi)?.length ?? 0;
  const simpleSourceRead = !!source && fromCount === 1 && !/\b(join|union|intersect|except)\b|\bfrom\s*\(|\bfrom\s+(?:[`"\[]?[A-Za-z_$][\w$]*[`"\]]?\.)*[`"\[]?[A-Za-z_$][\w$]*[`"\]]?\s*\(/i.test(compact);
  const limit = compact.match(/\blimit\s+(\d+)\b/i);
  const top = selectClause.match(/^top\s*(?:\(\s*(\d+)\s*\)|(\d+))\s+/i);
  const fetch = compact.match(/\bfetch\s+(?:first|next)\s+(\d+)\s+rows?\s+only\b/i);
  const maxRows = limit ? Number(limit[1]) : top ? Number(top[1] ?? top[2]) : fetch ? Number(fetch[1]) : void 0;
  const billableRead = BILLABLE_SCAN_SQL_KINDS.has(datasourceKind) && fromIndex >= 0;
  const fullSourceCount = countOnly && /^count\s*\(\s*\*\s*\)(?:\s+(?:as\s+)?[`"A-Za-z_$][\w$`"]*)?$/i.test(selectClause) && simpleSourceRead && !/\b(where|group\s+by|having|limit|offset)\b/i.test(compact);
  if (selectStar) {
    return {
      provenRead: true,
      directSafe: false,
      countOnly: false,
      selectStar: true,
      requiresCountPreflight: false,
      source,
      maxRows,
      simpleSourceRead,
      ...identity,
      reason: "SELECT * is refused. Inspect the schema and select only the required columns."
    };
  }
  if (fromIndex < 0) {
    if (/\b[A-Za-z_$][\w$.]*\s*\(/.test(selectClause)) {
      return {
        provenRead: false,
        directSafe: false,
        countOnly: false,
        selectStar: false,
        requiresCountPreflight: false,
        reason: "Function-only SELECT statements cannot be proven side-effect-free",
        ...identity
      };
    }
    return {
      provenRead: true,
      directSafe: true,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      source,
      maxRows,
      ...identity
    };
  }
  if (countOnly) {
    return {
      provenRead: true,
      directSafe: !billableRead,
      countOnly: true,
      selectStar: false,
      requiresCountPreflight: false,
      requiresBillableReadConfirmation: billableRead,
      fullSourceCount,
      simpleSourceRead,
      source,
      maxRows: 1,
      ...identity
    };
  }
  if (maxRows !== void 0 && maxRows <= LARGE_READ_ROW_THRESHOLD) {
    return {
      provenRead: true,
      directSafe: !billableRead,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      requiresBillableReadConfirmation: billableRead,
      simpleSourceRead,
      source,
      maxRows,
      ...identity
    };
  }
  return {
    provenRead: true,
    directSafe: false,
    countOnly: false,
    selectStar: false,
    requiresCountPreflight: true,
    requiresBillableReadConfirmation: billableRead,
    simpleSourceRead,
    source,
    maxRows,
    ...identity,
    reason: maxRows === void 0 ? "Row-returning SQL has no static LIMIT." : `SQL can return up to ${maxRows} rows, above the ${LARGE_READ_ROW_THRESHOLD}-row safety threshold.`
  };
}
function countAggregate(options) {
  const listRows = record(options.list_rows);
  const aggregates = record(listRows?.aggregates);
  const groupBy = record(listRows?.group_by);
  if (!aggregates || Object.keys(aggregates).length === 0 || groupBy && Object.keys(groupBy).length > 0)
    return false;
  return Object.values(aggregates).every((aggregate) => record(aggregate)?.aggFx === "count");
}
function fullToolJetDbCount(options) {
  if (!countAggregate(options))
    return false;
  const listRows = record(options.list_rows);
  const aggregates = record(listRows.aggregates);
  if (Object.keys(aggregates).length !== 1)
    return false;
  const aggregate = record(Object.values(aggregates)[0]);
  if (aggregate?.column !== "id")
    return false;
  const ignoredForScope = /* @__PURE__ */ new Set(["aggregates", "group_by", "order_filters", "limit", "offset"]);
  return Object.entries(listRows).every(([key, value]) => {
    if (ignoredForScope.has(key))
      return true;
    if (value === void 0 || value === null || value === "")
      return true;
    if (Array.isArray(value))
      return value.length === 0;
    if (record(value))
      return Object.keys(record(value)).length === 0;
    return false;
  });
}
function guiSource(kind, options) {
  if (kind === "tooljetdb" && typeof options.table_id === "string") {
    return { kind: "table_id", value: options.table_id };
  }
  const table = typeof options.table === "string" ? options.table : void 0;
  if (!table)
    return void 0;
  const schema = typeof options.schema === "string" ? `${options.schema}.` : "";
  return { kind: "gui_table", value: `${schema}${table}`.toLowerCase() };
}
function assessListRows(kind, options, datasourceId) {
  const source = guiSource(kind, options);
  const billableRead = BILLABLE_SCAN_SQL_KINDS.has(kind);
  const identity = { datasourceKind: kind, ...datasourceId ? { datasourceId } : {} };
  if (kind === "tooljetdb" && countAggregate(options)) {
    return {
      provenRead: true,
      directSafe: true,
      countOnly: true,
      selectStar: false,
      requiresCountPreflight: false,
      fullSourceCount: fullToolJetDbCount(options),
      simpleSourceRead: true,
      source,
      maxRows: 1,
      ...identity
    };
  }
  const listRows = record(options.list_rows);
  const maxRows = staticPositiveInteger(listRows?.limit ?? options.limit);
  if (maxRows !== void 0 && maxRows <= LARGE_READ_ROW_THRESHOLD) {
    return {
      provenRead: true,
      directSafe: !billableRead,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      requiresBillableReadConfirmation: billableRead,
      simpleSourceRead: true,
      source,
      maxRows,
      ...identity
    };
  }
  return {
    provenRead: true,
    directSafe: false,
    countOnly: false,
    selectStar: false,
    requiresCountPreflight: true,
    requiresBillableReadConfirmation: billableRead,
    simpleSourceRead: true,
    source,
    maxRows,
    ...identity,
    reason: maxRows === void 0 ? "list_rows has no statically provable row limit." : `list_rows can return up to ${maxRows} rows, above the ${LARGE_READ_ROW_THRESHOLD}-row safety threshold.`
  };
}
function assessQueryRead(query) {
  const kind = query.kind?.toLowerCase();
  const datasourceId = query.data_source_id;
  const options = record(query.options);
  if (!kind || !options) {
    return {
      provenRead: false,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      reason: "Datasource kind/options are unavailable."
    };
  }
  const operation = typeof options.operation === "string" ? options.operation.toLowerCase() : void 0;
  if (kind === "hubspot") {
    const issue2 = hubspotQueryIssues(options)[0];
    const assessment = assessOpenapi({ ...options, host: "https://api.hubapi.com" }, datasourceId);
    return {
      ...assessment,
      datasourceKind: "hubspot",
      ...issue2 ? { provenRead: false, directSafe: false, requiresRemoteReadConfirmation: false, reason: issue2.message } : { reason: assessment.reason?.replaceAll("OpenAPI", "HubSpot") }
    };
  }
  if (singleSpecRef(kind)) {
    const issue2 = apiEndpointQueryIssues(kind, options)[0];
    const assessment = assessOpenapi({ ...options, host: kind }, datasourceId);
    return {
      ...assessment,
      datasourceKind: kind,
      ...issue2 ? { provenRead: false, directSafe: false, requiresRemoteReadConfirmation: false, reason: issue2.message } : { reason: assessment.reason?.replaceAll("OpenAPI", kind) }
    };
  }
  if (kind === "restapi")
    return assessRestGet(options, datasourceId);
  if (kind === "openapi")
    return assessOpenapi(options, datasourceId);
  if (kind === "servicenow")
    return assessServiceNow(options, datasourceId);
  if (kind === "influxdb")
    return assessInflux(options, datasourceId);
  if (kind === "supabase")
    return assessSupabase(options, datasourceId);
  if (kind === "mongodb")
    return assessMongo(options, datasourceId);
  if (kind === "redis")
    return assessRedisRead(options, datasourceId);
  if (kind === "googlesheetsv2")
    return assessSheets(options, datasourceId);
  if (kind === "dynamodb")
    return assessDynamo(options, datasourceId);
  if (kind === "couchdb")
    return assessCouch(options, datasourceId);
  if (kind === "tooljetdb") {
    if (operation === "list_rows")
      return assessListRows(kind, options, datasourceId);
    if (operation === "sql_execution") {
      const sql = record(options.sql_execution)?.sqlQuery;
      return typeof sql === "string" ? assessSql(sql, kind, datasourceId) : {
        provenRead: false,
        directSafe: false,
        countOnly: false,
        selectStar: false,
        requiresCountPreflight: false,
        reason: "ToolJet DB SQL text is unavailable."
      };
    }
    return {
      provenRead: false,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      reason: `ToolJet DB operation ${operation ?? "<missing>"} is not a proven bounded read.`
    };
  }
  if (SQL_KINDS.has(kind)) {
    if (operation === "list_rows" || options.mode === "gui")
      return assessListRows(kind, options, datasourceId);
    const sql = ["query", "sql_query", "sql", "presto_sql_query", "soql_query"].map((field) => options[field]).find((value) => typeof value === "string" && !!value.trim());
    return sql ? assessSql(sql, kind, datasourceId) : {
      provenRead: false,
      directSafe: false,
      countOnly: false,
      selectStar: false,
      requiresCountPreflight: false,
      reason: "SQL text is unavailable."
    };
  }
  return {
    provenRead: false,
    directSafe: false,
    countOnly: false,
    selectStar: false,
    requiresCountPreflight: false,
    reason: `Datasource kind ${kind} has no proven read classifier.`
  };
}
function resolvedReadRefusal(query, before, resolved) {
  if (!Object.keys(resolved).length)
    return void 0;
  const kind = query.kind?.toLowerCase() ?? "";
  const sqlLike = SQL_KINDS.has(kind) || kind === "tooljetdb";
  if (sqlLike && resolvedBindingValues(resolved).some((value) => typeof value === "string" && value.includes(";"))) {
    return "after its {{ }} bindings are resolved, a binding value contains a statement separator (;). Bindings in SQL must supply values, not SQL; move the statement text into the saved query.";
  }
  const after = assessQueryRead({ ...query, options: applyResolvedBindings(query.options, resolved) });
  const weaker = !after.provenRead || after.selectStar || before.directSafe && !after.directSafe || !before.requiresCountPreflight && after.requiresCountPreflight || !before.requiresBillableReadConfirmation && !!after.requiresBillableReadConfirmation || !before.requiresRemoteReadConfirmation && !!after.requiresRemoteReadConfirmation;
  if (!weaker)
    return void 0;
  return `after its {{ }} bindings are resolved, it is no longer the same proven bounded read (${after.reason ?? "the resolved text changes the statement"}). Bindings must supply values, not SQL or query structure; move that text into the saved query.`;
}
function sameReadSource(target, count) {
  return !!target.source && !!count.source && target.simpleSourceRead === true && count.fullSourceCount === true && !!target.datasourceId && target.datasourceId === count.datasourceId && target.datasourceKind === count.datasourceKind && target.source.kind === count.source.kind && target.source.value === count.source.value;
}
function extractRowCount(result) {
  if (result.status !== "ok")
    return void 0;
  let value = result.data;
  if (typeof value === "number")
    return Number.isSafeInteger(value) && value >= 0 ? value : void 0;
  if (record(value)?.result !== void 0)
    value = record(value).result;
  if (Array.isArray(value)) {
    if (value.length !== 1)
      return void 0;
    value = value[0];
  }
  const row = record(value);
  if (!row)
    return void 0;
  const numeric = Object.values(row).flatMap((candidate) => {
    const parsed = typeof candidate === "number" ? candidate : typeof candidate === "string" && /^\d+$/.test(candidate.trim()) ? Number(candidate) : Number.NaN;
    return Number.isSafeInteger(parsed) && parsed >= 0 ? [parsed] : [];
  });
  return numeric.length === 1 ? numeric[0] : void 0;
}
createRequire(import.meta.url);
var QUERY_TOGGLES = ["runOnPageLoad", "runOnDependencyChange", "requestConfirmation", "showSuccessNotification"];
var STATIC_TOGGLE = /^\s*(?:\{\{\s*(true|false)\s*\}\}|(true|false))\s*$/;
function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function staticToggle(value) {
  if (typeof value !== "string")
    return void 0;
  const match = STATIC_TOGGLE.exec(value);
  return match ? (match[1] ?? match[2]) === "true" : void 0;
}
function normalizeQueryToggles(options) {
  if (!isPlainObject(options))
    return options;
  let out = options;
  for (const key of QUERY_TOGGLES) {
    const value = staticToggle(options[key]);
    if (value === void 0)
      continue;
    if (out === options)
      out = { ...options };
    out[key] = value;
  }
  return out;
}
function describe(value) {
  if (value === null)
    return "null";
  if (Array.isArray(value))
    return "an array";
  if (typeof value === "object")
    return "an object";
  if (typeof value === "string")
    return JSON.stringify(value);
  return `${typeof value} ${String(value)}`;
}
function queryToggleIssues(options) {
  if (!isPlainObject(options))
    return [];
  const issues = [];
  for (const key of QUERY_TOGGLES) {
    if (!(key in options))
      continue;
    const value = options[key];
    if (value === void 0 || typeof value === "boolean" || staticToggle(value) !== void 0)
      continue;
    const dynamic = typeof value === "string" ? " ToolJet does not evaluate it and treats any text as on. Run the query from an event instead when it depends on state." : "";
    issues.push({
      code: "query_toggle_not_boolean",
      path: key,
      message: `${key} must be true or false (or left out), not ${describe(value)}.${dynamic}`
    });
  }
  return issues;
}
function toggleRewriteWarning(before, after) {
  const changed = QUERY_TOGGLES.filter((key) => before?.[key] !== after?.[key]);
  if (!changed.length)
    return void 0;
  return `${changed.map((key) => `${key} ${JSON.stringify(before[key])} saved as ${String(after[key])}`).join(", ")}; ToolJet reads these as true/false and runs any text on load.`;
}
function assertPersistableQueryToggles(options, subject) {
  const issues = queryToggleIssues(options);
  const strings = isPlainObject(options) ? QUERY_TOGGLES.filter((key) => typeof options[key] === "string") : [];
  const messages = [
    ...issues.map((issue2) => issue2.message),
    ...strings.filter((key) => !issues.some((issue2) => issue2.path === key)).map((key) => `${key} must be sent as a boolean, not ${JSON.stringify(options[key])}.`)
  ];
  if (messages.length)
    throw new Error(`${subject}: ${messages.join(" ")}`);
}
function bindingSpans(value) {
  const spans = [];
  let from = 0;
  while (from < value.length) {
    const start = value.indexOf("{{", from);
    if (start < 0)
      break;
    let close = value.indexOf("}}", start + 2);
    let matched = false;
    while (close >= 0) {
      const body = value.slice(start + 2, close);
      try {
        parseExpression(`(${body})`);
        spans.push({ start, end: close + 2, body });
        from = close + 2;
        matched = true;
        break;
      } catch {
        close = value.indexOf("}}", close + 1);
      }
    }
    if (!matched)
      from = start + 2;
  }
  return spans;
}
function primitiveWriteBindingEntries(value) {
  if (typeof value !== "string")
    return [];
  const source = value.trim();
  const spans = bindingSpans(source);
  if (spans.length !== 1 || spans[0].start !== 0 || spans[0].end !== source.length)
    return [];
  try {
    const node = parseExpression(spans[0].body);
    if (node.type !== "ObjectExpression")
      return [];
    return node.properties.flatMap((p) => {
      if (p.type !== "ObjectProperty" || p.computed)
        return [];
      const key = p.key.type === "Identifier" ? p.key.name : p.key.type === "StringLiteral" || p.key.type === "NumericLiteral" ? String(p.key.value) : void 0;
      if (!key)
        return [];
      return ["StringLiteral", "NumericLiteral", "BooleanLiteral", "NullLiteral", "TemplateLiteral", "UnaryExpression"].includes(p.value.type) ? [key] : [];
    });
  } catch {
    return [];
  }
}
var object = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : void 0;
function conditionalWriteWarning(kind, options) {
  if (kind !== "tooljetdb" || options.operation !== "update_rows")
    return;
  const update = object(options.update_rows);
  const written = new Set(Object.values(object(update?.columns) ?? {}).map(object).flatMap((c) => typeof c?.column === "string" ? [c.column] : []));
  const guarded = Object.values(object(update?.where_filters) ?? {}).map(object).filter((f) => typeof f?.column === "string" && written.has(f.column) && f.operator === "eq").map((f) => String(f.column));
  if (!guarded.length)
    return;
  return `update_rows both checks and changes ${[...new Set(guarded)].map((x) => JSON.stringify(x)).join(", ")}. This can legitimately succeed with zero matching rows (stale value/state). An untransformed ToolJet DB update_rows returns the changed rows in queries.<name>.data (an empty array means no match); account for any query transformation. Before a dependent write, audit entry, status transition or success message, verify the result contains the intended row and expected count; do not treat onDataQuerySuccess alone as that proof. On no match, stop the dependent chain and show a conflict/reload message. Do not remove the predicate to make the write pass. This is advisory; callers may already handle the result.`;
}
function walk(v, visit) {
  if (Array.isArray(v)) {
    for (const x of v)
      walk(x, visit);
    return;
  }
  const n = object(v);
  if (!n)
    return;
  visit(n);
  for (const [key, child] of Object.entries(n))
    if (!["loc", "extra", "comments"].includes(key))
      walk(child, visit);
}
function property(n) {
  const p = object(n?.property);
  if (!n?.computed && p?.type === "Identifier")
    return String(p.name);
  if (p?.type === "StringLiteral")
    return String(p.value);
}
function arithmeticWriteWarning(kind, options) {
  if (kind !== "tooljetdb" || options.operation !== "update_rows")
    return;
  const update = object(options.update_rows), columns = object(update?.columns);
  if (!columns)
    return;
  const filters = Object.values(object(update?.where_filters) ?? {}).map(object);
  const risky = [];
  for (const entry of Object.values(columns)) {
    const c = object(entry);
    if (typeof c?.column !== "string" || typeof c.value !== "string")
      continue;
    if (filters.some((f) => f?.column === c.column && f?.operator === "eq"))
      continue;
    const match = c.value.trim().match(/^\{\{([\s\S]*)\}\}$/);
    if (!match)
      continue;
    let ast;
    try {
      ast = parseExpression(match[1]);
    } catch {
      continue;
    }
    let shadowed = false, found = false;
    walk(ast, (n) => {
      if (Array.isArray(n.params) && /"components"/.test(JSON.stringify(n.params)))
        shadowed = true;
      if (n.type === "VariableDeclarator" && /"components"/.test(JSON.stringify(n.id)))
        shadowed = true;
    });
    if (shadowed)
      continue;
    walk(ast, (n) => {
      if (n.type !== "BinaryExpression" || !["+", "-"].includes(String(n.operator)))
        return;
      walk(n, (member) => {
        if (!["MemberExpression", "OptionalMemberExpression"].includes(String(member.type)))
          return;
        const selected = object(member.object), table = object(selected?.object), namespace = object(table?.object);
        if (property(selected) === "selectedRow" && namespace?.type === "Identifier" && namespace.name === "components")
          found = true;
      });
    });
    if (found)
      risky.push(c.column);
  }
  if (!risky.length)
    return;
  return `update_rows calculates ${[...new Set(risky)].map((x) => JSON.stringify(x)).join(", ")} from selectedRow arithmetic without an expected-value predicate for that column. Verify the source query actually returns every operand; an absent value defaulted to zero can overwrite a real balance. For accumulated stock, balances or counters, prefer a supported atomic database increment/decrement with bounds and idempotency, or an explicit optimistic-concurrency predicate. Do not silently replace the intended calculation; ordinary derived-field formulas may be intentional. This is advisory, not proof that the operation is incorrect.`;
}
var UPDATE_OPERATIONS = /* @__PURE__ */ new Set(["update_one", "update_many", "find_one_update"]);
var BULK_UPDATES = ["updateOne", "updateMany"];
var ARRAY_METHODS = /* @__PURE__ */ new Set(["map", "filter", "concat", "flat", "flatMap", "slice", "sort", "reverse", "toSorted", "toReversed"]);
var STRING_OR_ARRAY_METHODS = /* @__PURE__ */ new Set(["slice", "concat"]);
var ROW_COLLECTIONS = /* @__PURE__ */ new Set(["currentData", "updatedData", "filteredData", "currentPageData", "selectedRows", "newRows"]);
var ELEMENT_PATH = /\$|\.\d+(\.|$)/;
var isMember = (n) => n?.type === "MemberExpression" || n?.type === "OptionalMemberExpression";
var propertyName = (n) => n.computed ? n.property?.type === "StringLiteral" ? n.property.value : void 0 : n.property?.name;
var keyName = (p) => p.computed ? void 0 : p.key?.type === "Identifier" ? p.key.name : p.key?.type === "StringLiteral" ? p.key.value : void 0;
var property2 = (n, key) => n?.type === "ObjectExpression" ? n.properties.find((p) => p.type === "ObjectProperty" && keyName(p) === key)?.value : void 0;
function unwrap(n) {
  while (n?.type === "CallExpression") {
    if (isMember(n.callee) && n.callee.object?.name === "JSON" && propertyName(n.callee) === "stringify" && n.arguments.length >= 1) {
      n = n.arguments[0];
      continue;
    }
    const fn = n.callee;
    if (!["ArrowFunctionExpression", "FunctionExpression"].includes(fn?.type) || fn.async || fn.generator || fn.params.length || n.arguments.length)
      break;
    if (fn.body.type !== "BlockStatement") {
      n = fn.body;
    } else if (fn.body.body.length === 1 && fn.body.body[0].type === "ReturnStatement") {
      n = fn.body.body[0].argument;
    } else
      break;
  }
  return n;
}
function parseField(value) {
  if (value !== null && typeof value === "object")
    value = JSON.stringify(value);
  if (typeof value !== "string" || !value.trim())
    return void 0;
  let source = "";
  let from = 0;
  for (const span of bindingSpans(value)) {
    const quote = value[span.start - 1];
    const quoted = (quote === '"' || quote === "'") && value[span.end] === quote && span.start - 1 >= from;
    source += value.slice(from, quoted ? span.start - 1 : span.start) + `(${span.body})`;
    from = quoted ? span.end + 1 : span.end;
  }
  source += value.slice(from);
  try {
    return unwrap(parseExpression(source));
  } catch {
    return void 0;
  }
}
function referencesComponents(n) {
  if (!n || typeof n !== "object")
    return false;
  if (Array.isArray(n))
    return n.some(referencesComponents);
  const node = n;
  if (isMember(node) && node.object?.type === "Identifier" && node.object.name === "components")
    return true;
  return Object.entries(node).some(([key, child]) => !["loc", "extra", "comments"].includes(key) && referencesComponents(child));
}
function isArrayValue(raw) {
  const n = unwrap(raw);
  if (!n)
    return false;
  if (n.type === "LogicalExpression")
    return isArrayValue(n.left) || isArrayValue(n.right);
  if (n.type === "ConditionalExpression")
    return isArrayValue(n.consequent) || isArrayValue(n.alternate);
  if (n.type === "ArrayExpression")
    return true;
  if (n.type === "CallExpression" || n.type === "OptionalCallExpression") {
    const callee = n.callee;
    const method = isMember(callee) ? propertyName(callee) ?? "" : "";
    if (ARRAY_METHODS.has(method)) {
      return !STRING_OR_ARRAY_METHODS.has(method) || isArrayValue(callee.object);
    }
    if (isMember(callee) && ["Array", "Object"].includes(callee.object?.name) && ["from", "values"].includes(propertyName(callee) ?? ""))
      return true;
    return false;
  }
  return isMember(n) && ROW_COLLECTIONS.has(propertyName(n) ?? "");
}
function isComponentArray(raw) {
  const n = unwrap(raw);
  if (n?.type === "LogicalExpression")
    return isComponentArray(n.left) || isComponentArray(n.right);
  if (n?.type === "ConditionalExpression")
    return isComponentArray(n.consequent) || isComponentArray(n.alternate);
  return referencesComponents(n) && isArrayValue(n);
}
function replacedArrayPaths(set, prefix = "") {
  if (set?.type !== "ObjectExpression")
    return [];
  return set.properties.flatMap((p) => {
    if (p.type !== "ObjectProperty")
      return [];
    const key = keyName(p);
    if (!key)
      return [];
    const path = prefix ? `${prefix}.${key}` : key;
    if (ELEMENT_PATH.test(path))
      return [];
    if (isComponentArray(p.value))
      return [path];
    return replacedArrayPaths(unwrap(p.value), path);
  });
}
function setStages(update) {
  update = unwrap(update);
  if (update?.type === "ObjectExpression")
    return [property2(update, "$set")].filter(Boolean);
  if (update?.type === "ArrayExpression") {
    return update.elements.flatMap((stage) => [property2(stage, "$set"), property2(stage, "$addFields")].filter(Boolean));
  }
  return [];
}
function issue(path, field) {
  return {
    code: "mongodb_whole_array_set",
    path,
    message: `$set replaces the whole "${field}" array with a value built from component data, so every save drops the elements and fields the components do not hold. Update the edited elements by path instead: { $set: { "${field}.$[el].<field>": ... } } with options { arrayFilters: [{ "el.<key>": ... }] }, matching a stable key field, and abort the save unless the element count is unchanged apart from explicit adds and deletes.`
  };
}
function mongoArrayReplacementIssues(options) {
  const operation = typeof options.operation === "string" ? options.operation : "";
  const updates = [];
  if (UPDATE_OPERATIONS.has(operation))
    updates.push({ path: "update", update: parseField(options.update) });
  if (operation === "bulk_write") {
    const operations = parseField(options.operations);
    if (operations?.type === "ArrayExpression") {
      operations.elements.forEach((op, index) => {
        for (const kind of BULK_UPDATES) {
          const update = unwrap(property2(unwrap(property2(op, kind)), "update"));
          if (update)
            updates.push({ path: `operations[${index}].${kind}.update`, update });
        }
      });
    }
  }
  return updates.flatMap(({ path, update }) => setStages(update).flatMap((set) => replacedArrayPaths(unwrap(set)).map((field) => issue(path, field))));
}
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var ALIASES = { workflow_id: "workflowId", workflow_version_id: "workflowVersionId" };
function normalizeWorkflowQueryOptions(options) {
  let normalized = options;
  for (const [alias, field] of Object.entries(ALIASES)) {
    if (!(alias in options))
      continue;
    if (options[field] !== void 0 && options[field] !== options[alias])
      continue;
    if (normalized === options)
      normalized = { ...options };
    if (normalized[field] === void 0)
      normalized[field] = normalized[alias];
    delete normalized[alias];
  }
  return normalized;
}
function workflowQueryIssues(options) {
  const errors = [];
  for (const [alias, field] of Object.entries(ALIASES)) {
    if (alias in options && options[field] !== void 0 && options[field] !== options[alias])
      errors.push({
        code: "conflicting_workflow_target",
        path: alias,
        message: `Conflicting workflow selectors ${field} and ${alias}; specify one target.`
      });
  }
  if ("sync_execution" in options)
    errors.push({ code: "invalid_workflow_option", path: "sync_execution", message: "Use the native syncExecution boolean, not sync_execution." });
  options = normalizeWorkflowQueryOptions(options);
  for (const field of ["workflowId", "workflowVersionId"]) {
    const value = options[field];
    if (field === "workflowVersionId" && (value === void 0 || value === null))
      continue;
    if (typeof value !== "string" || !UUID.test(value))
      errors.push({
        code: "invalid_workflow_target",
        path: field,
        message: `Workflow query options.${field} must be a literal workflow ${field === "workflowId" ? "ID from list_workflows/get_workflow" : "version ID from list_app_versions/get_workflow"}. A query and its success/failure handlers do not establish the workflow mapping.`
      });
  }
  if (options.syncExecution !== void 0 && typeof options.syncExecution !== "boolean") {
    errors.push({ code: "invalid_workflow_option", path: "syncExecution", message: "Workflow query syncExecution must be a boolean." });
  }
  if (options.params !== void 0 && (!Array.isArray(options.params) || options.params.some((param) => !param || typeof param !== "object" || Array.isArray(param) || typeof param.key !== "string" || !Object.hasOwn(param, "value")))) {
    errors.push({ code: "invalid_workflow_option", path: "params", message: "Workflow query params must be an array of {key, value} entries; values may contain app bindings." });
  }
  return errors;
}
function assertWorkflowQueryOptions(options) {
  const errors = workflowQueryIssues(options);
  if (errors.length)
    throw new Error(errors.map((error) => error.message).join(" "));
}
function workflowMappingMatches(expected, actual) {
  if (!actual || typeof actual !== "object" || Array.isArray(actual))
    return false;
  const saved = normalizeWorkflowQueryOptions(actual);
  return saved.workflowId === expected.workflowId && (saved.workflowVersionId ?? null) === (expected.workflowVersionId ?? null);
}
var KNOWN_IGNORED_KEYS = {
  run_on_page_load: "runOnPageLoad"
};
function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function isTruthyStatic(value) {
  return value === true || staticToggle(value) === true;
}
function isDynamicBinding(value) {
  return typeof value === "string" && value.includes("{{");
}
function valueAtPath(source, path) {
  let cursor = source;
  for (const segment of path.split(".")) {
    if (!isObject(cursor) || !Object.prototype.hasOwnProperty.call(cursor, segment))
      return void 0;
    cursor = cursor[segment];
  }
  return cursor;
}
function describeOperationSelection(schema) {
  if (schema.kind === "hubspot")
    return "Use inspect_datasource_schema getEndpointSchema and copy query_options (operation, path, specType and params).";
  if (singleSpecRef(schema.kind))
    return SPEC_DISCOVERY_NOTE;
  const selection = schema.operationSelection;
  if (schema.operations.length) {
    const fields = selection?.fields?.length ? selection.fields.join(" + ") : "operation";
    return `Set ${fields}. Valid operations: ${schema.operations.join(", ")}.`;
  }
  if (selection?.mode === "remote-spec") {
    return `This kind takes its operation from the remote API spec${selection.specUrl ? ` (${selection.specUrl})` : ""}, not from a fixed list; set ${selection.field ?? "the operation field"} to an operation id from that spec.`;
  }
  return "This kind has a single unnamed query form; author it against the default contract.";
}
function operationFromOptions(options, contracts, defaults) {
  const operation = options.operation ?? defaults.operation;
  if (typeof operation === "string" && operation) {
    if (Object.prototype.hasOwnProperty.call(contracts, operation))
      return operation;
    if (Object.prototype.hasOwnProperty.call(contracts, "default"))
      return "default";
    return operation;
  }
  const mode = options.mode ?? defaults.mode;
  if (typeof mode === "string" && mode && Object.prototype.hasOwnProperty.call(contracts, mode))
    return mode;
  if (Object.prototype.hasOwnProperty.call(contracts, "default"))
    return "default";
  const selectorMatches = Object.entries(contracts).filter(([, contract]) => contract.variants.some((variant) => {
    const selectors = Object.entries(variant.when);
    return selectors.length > 0 && selectors.every(([selector, accepted]) => {
      const actual = options[selector] ?? defaults[selector];
      return typeof actual === "string" && !isDynamicBinding(actual) && accepted.includes(actual);
    });
  }));
  if (selectorMatches.length === 1)
    return selectorMatches[0][0];
  return void 0;
}
function variantMatches(variant, options) {
  return Object.entries(variant.when).every(([selector, accepted]) => {
    const actual = options[selector];
    return actual === void 0 || isDynamicBinding(actual) || typeof actual === "string" && accepted.includes(actual);
  });
}
function intersection(values) {
  if (!values.length)
    return [];
  return values[0].filter((value) => values.every((items) => items.includes(value)));
}
function fieldMap(variants) {
  const fields = { ...COMMON_QUERY_OPTION_FIELDS };
  for (const variant of variants)
    Object.assign(fields, variant.fields);
  return fields;
}
function topLevelKeys(fields) {
  return new Set(Object.keys(fields).map((path) => path.split(".")[0]));
}
function nestedChildren(fields, root) {
  return new Set(Object.keys(fields).filter((path) => path.startsWith(`${root}.`)).map((path) => path.slice(root.length + 1).split(".")[0]));
}
function suffixSuggestion(key, fields) {
  const matches = Object.keys(fields).filter((path) => path.endsWith(`.${key}`));
  return matches.length === 1 ? matches[0] : void 0;
}
function tupleArity(field) {
  const tuple = field.shape?.["<index>"];
  return Array.isArray(tuple) && tuple.length > 0 ? tuple.length : void 0;
}
function bindingStrings(value, path = "") {
  if (typeof value === "string")
    return [{ path: path || void 0, value }];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => bindingStrings(item, `${path}[${index}]`));
  }
  if (!isObject(value))
    return [];
  return Object.entries(value).flatMap(([key, item]) => bindingStrings(item, path ? `${path}.${key}` : key));
}
function tableStateWarnings(options) {
  const warnings = [];
  for (const binding of bindingStrings(options)) {
    const match = binding.value.match(/components\.([A-Za-z_$][\w$]*)\.pageIndex\s*-\s*1/);
    if (!match)
      continue;
    warnings.push({
      code: "unguarded_table_page_index",
      path: binding.path,
      message: `Table pageIndex may be undefined when the first page-load query evaluates; "${match[0]}" can produce NaN and an empty table. Use ((components.${match[1]}.pageIndex || 1) - 1) * pageSize (or an equivalent nullish guard).`
    });
  }
  return warnings;
}
function unquotedSqlBindingIssues(sql) {
  const issues = [];
  const risky = /(=|<>|!=|>|<|>=|<=|\bLIKE\b|\bILIKE\b|,|\()\s*(?!')\{\{/gi;
  const seen = /* @__PURE__ */ new Set();
  let match;
  while ((match = risky.exec(sql)) !== null) {
    const raw = match[1].toUpperCase();
    const operator = raw === "," || raw === "(" ? "a function argument" : raw;
    if (seen.has(operator))
      continue;
    seen.add(operator);
    issues.push({
      code: "unquoted_sql_binding",
      path: "query",
      message: `SQL uses an unquoted binding (as ${operator}). ToolJet splices bindings in as raw text, so when that component is empty \u2014 its state on page load \u2014 the statement becomes nothing at that position and fails with a SQL syntax error; the table then shows "No data" and the page looks broken on first open. Pass it as a parameter instead: put \`:name\` in the statement and the binding in query_params, e.g. \`WHERE priority = :priority\` with query_params [["priority", "{{components.priorityFilter.value}}"]]. That fixes the empty case and the escaping together. Quoting it ('{{...}}') only fixes the empty case and leaves the value spliced into the statement as text.`
    });
  }
  return issues;
}
function interpolatedSqlBindingIssues(sql) {
  const quoted = /'\s*\{\{[^}]*\}\}\s*'/g;
  if (!quoted.test(sql))
    return [];
  return [
    {
      code: "interpolated_sql_binding",
      path: "query",
      message: 'SQL pastes a binding into the statement as quoted text (\'{{...}}\'). The quotes are the only escaping, so a value containing a quote rewrites the statement. Pass it as a parameter instead: `:name` in the query and the binding in query_params, e.g. `WHERE priority = :priority` with query_params [["priority", "{{components.priorityFilter.value}}"]]. Safe today if the value comes from a fixed dropdown, but the query does not change when someone later binds it to a text input.'
    }
  ];
}
var RUNJS_PARAMETERS = ["moment", "_", "components", "queries", "globals", "page", "axios", "variables", "actions", "constants"];
function runjsSyntaxError(code) {
  try {
    new Function(`return (async (${RUNJS_PARAMETERS.join(", ")}) => {
${code}
});`);
    return void 0;
  } catch (error) {
    if (!(error instanceof SyntaxError))
      return void 0;
    const clash = error.message.match(/Identifier '([\w$]+)' has already been declared/)?.[1];
    if (clash && RUNJS_PARAMETERS.includes(clash)) {
      return `the code declares \`${clash}\`, a name ToolJet already gives every RunJS query (${RUNJS_PARAMETERS.join(", ")}), so the query fails with "Identifier '${clash}' has already been declared" when it runs. Rename it (${clash}List, say).`;
    }
    try {
      parse(`async function f(){
${code}
}`, { sourceType: "script" });
    } catch (located) {
      const loc = located.loc;
      const line = loc ? code.split("\n")[loc.line - 2] : void 0;
      if (loc && line !== void 0) {
        const from = Math.max(0, loc.column - 60);
        const excerpt = line.slice(from, loc.column + 20).trim();
        return `${error.message}, at line ${loc.line - 1} column ${loc.column + 1}: ${from > 0 ? "\u2026" : ""}${excerpt}${bracketBalance(code)}`;
      }
    }
    return `${error.message}${bracketBalance(code)}`;
  }
}
function bracketBalance(code) {
  const stack = [];
  const pairs = { ")": "(", "]": "[", "}": "{" };
  const lines = code.split("\n");
  const lineOf = (i) => code.slice(0, i).split("\n").length;
  const snippet = (i) => {
    const l = lineOf(i);
    const start = code.lastIndexOf("\n", i - 1) + 1;
    const col = i - start;
    return (lines[l - 1] ?? "").slice(Math.max(0, col - 30), col + 30).trim();
  };
  let quote = null;
  for (let i = 0; i < code.length; i += 1) {
    const ch = code[i];
    if (quote) {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (quote === "`" && ch === "$" && code[i + 1] === "{") {
        stack.push({ ch: "${", line: lineOf(i), at: i });
        quote = null;
        i += 1;
        continue;
      }
      if (ch === quote)
        quote = null;
      continue;
    }
    if (ch === "/" && code[i + 1] === "/") {
      const end = code.indexOf("\n", i);
      i = end === -1 ? code.length : end;
      continue;
    }
    if (ch === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      i = end === -1 ? code.length : end + 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{")
      stack.push({ ch, line: lineOf(i), at: i });
    else if (ch === ")" || ch === "]" || ch === "}") {
      const top = stack.pop();
      if (top?.ch === "${" && ch === "}") {
        quote = "`";
        continue;
      }
      if (!top || top.ch !== pairs[ch]) {
        return top ? ` A \`${ch}\` at line ${lineOf(i)} closes the \`${top.ch}\` opened at line ${top.line} (${snippet(top.at)}).` : ` A \`${ch}\` at line ${lineOf(i)} closes nothing.`;
      }
    }
  }
  const open = stack.filter((s) => s.ch !== "${");
  if (!open.length)
    return "";
  const last = open[open.length - 1];
  return ` ${open.length} bracket${open.length > 1 ? "s are" : " is"} never closed; the last, \`${last.ch}\` opened at line ${last.line} (${snippet(last.at)}), needs its \`${{ "(": ")", "[": "]", "{": "}" }[last.ch]}\`.`;
}
var RUNJS_KNOWN_NAMES = /* @__PURE__ */ new Set([
  ...RUNJS_PARAMETERS,
  "parameters",
  "input",
  "arguments",
  "undefined",
  "NaN",
  "Infinity",
  "globalThis",
  "eval",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
  "decodeURI",
  "decodeURIComponent",
  "encodeURI",
  "encodeURIComponent",
  "escape",
  "unescape",
  "Object",
  "Function",
  "Boolean",
  "Symbol",
  "Error",
  "AggregateError",
  "EvalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
  "Number",
  "BigInt",
  "Math",
  "Date",
  "String",
  "RegExp",
  "Array",
  "Int8Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int16Array",
  "Uint16Array",
  "Int32Array",
  "Uint32Array",
  "Float32Array",
  "Float64Array",
  "BigInt64Array",
  "BigUint64Array",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "WeakRef",
  "FinalizationRegistry",
  "ArrayBuffer",
  "SharedArrayBuffer",
  "DataView",
  "Atomics",
  "JSON",
  "Promise",
  "Proxy",
  "Reflect",
  "Intl",
  "window",
  "self",
  "document",
  "navigator",
  "location",
  "history",
  "screen",
  "localStorage",
  "sessionStorage",
  "console",
  "alert",
  "confirm",
  "prompt",
  "fetch",
  "Blob",
  "File",
  "FileReader",
  "FormData",
  "Headers",
  "Request",
  "Response",
  "URL",
  "URLSearchParams",
  "AbortController",
  "atob",
  "btoa",
  "crypto",
  "performance",
  "structuredClone",
  "queueMicrotask",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "TextEncoder",
  "TextDecoder",
  "DOMParser",
  "XMLHttpRequest",
  "WebSocket",
  "Image",
  "getComputedStyle",
  "Event",
  "CustomEvent"
]);
var isNode = (value) => !!value && typeof value === "object" && typeof value.type === "string";
function patternNames(node, out) {
  if (!isNode(node))
    return;
  if (node.type === "Identifier")
    out.add(String(node.name));
  else if (node.type === "ObjectPattern")
    for (const p of node.properties)
      patternNames(p.type === "RestElement" ? p.argument : p.value, out);
  else if (node.type === "ArrayPattern")
    for (const e of node.elements)
      patternNames(e, out);
  else if (node.type === "RestElement")
    patternNames(node.argument, out);
  else if (node.type === "AssignmentPattern")
    patternNames(node.left, out);
}
function runjsUndeclaredNames(code) {
  return undeclaredNames(`async function __runjs__(){
${code}
}`, RUNJS_KNOWN_NAMES);
}
function bindingUndeclaredNames(expression) {
  if (/\b(components|queries)\.[0-9a-f]{8}-[0-9a-f]{4}-/i.test(expression))
    return [];
  return undeclaredNames(`(function __binding__(){ return (
${expression}
); })`, BINDING_KNOWN_NAMES);
}
function lintBindingNames(value, label, path = "") {
  if (Array.isArray(value))
    return value.flatMap((child, i) => lintBindingNames(child, label, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => lintBindingNames(child, label, path ? `${path}.${key}` : key));
  }
  if (typeof value !== "string" || !value.includes("{{"))
    return [];
  const names = [...new Set([...value.matchAll(/\{\{([\s\S]*?)\}\}/g)].flatMap((m) => bindingUndeclaredNames(m[1])))];
  if (!names.length)
    return [];
  const hints = names.map((n) => /^[a-z_$][\w$]*$/i.test(n) && n.length > 2 && !["row", "item", "r", "x", "d", "e"].includes(n) ? `\`${n}\` (a query is read as queries.${n})` : `\`${n}\``);
  return [`${label}${path ? ` ${path}` : ""}: the binding reads ${hints.join(", ")}, which nothing declares there, so it throws and the component shows nothing. Declare it (a callback needs its parameter: \`rows.filter(r => r.status === "Open")\`), or use ToolJet's names: components, queries, variables, globals, page, constants, and in a table column rowData/cellValue, in a list view listItem, on a Kanban card cardData.`];
}
var BINDING_KNOWN_NAMES = /* @__PURE__ */ new Set([
  ...RUNJS_KNOWN_NAMES,
  "rowData",
  "cellValue",
  "currentRow",
  "listItem",
  "cardData",
  "theme"
]);
var FUNCTION_TYPES = /* @__PURE__ */ new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression", "ObjectMethod", "ClassMethod", "ClassPrivateMethod"]);
function undeclaredNames(source, known) {
  let ast;
  try {
    ast = parse(source, { sourceType: "script", errorRecovery: false });
  } catch {
    return [];
  }
  const declaredIn = (body, into) => {
    const visit = (node) => {
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (!isNode(node))
        return;
      if (node.type === "VariableDeclarator")
        patternNames(node.id, into);
      if ((node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") && isNode(node.id))
        into.add(String(node.id.name));
      if (node.type === "CatchClause")
        patternNames(node.param, into);
      if (FUNCTION_TYPES.has(node.type))
        return;
      for (const [k, v] of Object.entries(node))
        if (k !== "loc" && k !== "extra" && !k.endsWith("Comments"))
          visit(v);
    };
    visit(body);
  };
  const used = [];
  const scopes = [];
  const isDeclared = (name2) => scopes.some((scope) => scope.has(name2));
  const walk2 = (node, parent, key) => {
    if (Array.isArray(node)) {
      for (const child of node)
        walk2(child, parent, key);
      return;
    }
    if (!isNode(node))
      return;
    if (node.type === "Identifier") {
      const p = parent?.type;
      const notARead = (p === "MemberExpression" || p === "OptionalMemberExpression") && key === "property" && !parent.computed || (p === "ObjectProperty" || p === "ObjectMethod" || p === "ClassMethod" || p === "ClassProperty" || p === "ClassPrivateProperty") && key === "key" && !parent.computed || (p === "LabeledStatement" || p === "BreakStatement" || p === "ContinueStatement") && key === "label" || p === "UnaryExpression" && parent.operator === "typeof" || p === "MetaProperty" || // a declaration's own name, a parameter or a pattern binding is not a read
      p === "VariableDeclarator" && key === "id" || p !== void 0 && FUNCTION_TYPES.has(p) && (key === "id" || key === "params") || (p === "ClassDeclaration" || p === "ClassExpression") && key === "id" || p === "CatchClause" && key === "param";
      const name2 = String(node.name);
      if (!notARead && !isDeclared(name2))
        used.push(name2);
      return;
    }
    if (node.type === "Program" || FUNCTION_TYPES.has(node.type)) {
      const scope = /* @__PURE__ */ new Set();
      if (FUNCTION_TYPES.has(node.type)) {
        if (node.type === "FunctionExpression" && isNode(node.id))
          scope.add(String(node.id.name));
        for (const param of node.params ?? [])
          patternNames(param, scope);
        declaredIn(node.body, scope);
      } else {
        declaredIn(node.body, scope);
      }
      scopes.push(scope);
      for (const [k, v] of Object.entries(node)) {
        if (k === "loc" || k === "extra" || k.endsWith("Comments"))
          continue;
        if (k === "params") {
          for (const param of v)
            walkPatternDefaults(param);
          continue;
        }
        walk2(v, node, k);
      }
      scopes.pop();
      return;
    }
    if (node.type === "VariableDeclarator") {
      walkPatternDefaults(node.id);
      walk2(node.init, node, "init");
      return;
    }
    if (node.type === "CatchClause") {
      walk2(node.body, node, "body");
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k === "loc" || k === "start" || k === "end" || k === "extra" || k.endsWith("Comments"))
        continue;
      walk2(v, node, k);
    }
  };
  const walkPatternDefaults = (pattern) => {
    if (!isNode(pattern))
      return;
    if (pattern.type === "AssignmentPattern") {
      walkPatternDefaults(pattern.left);
      walk2(pattern.right, pattern, "right");
    } else if (pattern.type === "ObjectPattern")
      for (const p of pattern.properties) {
        if (p.type === "RestElement")
          walkPatternDefaults(p.argument);
        else {
          if (p.computed)
            walk2(p.key, p, "computedKey");
          walkPatternDefaults(p.value);
        }
      }
    else if (pattern.type === "ArrayPattern")
      for (const e of pattern.elements)
        walkPatternDefaults(e);
    else if (pattern.type === "RestElement")
      walkPatternDefaults(pattern.argument);
  };
  walk2(ast);
  return [...new Set(used.filter((name2) => !known.has(name2) && name2 !== "__runjs__" && name2 !== "__binding__"))];
}
function transformationWarnings(options) {
  const warnings = [];
  const bag = isObject(options.transformations) ? options.transformations : void 0;
  const languages = bag ? Object.keys(bag).filter((key) => key === "javascript" || key === "python") : [];
  const hasCode = languages.length > 0 || typeof options.transformation === "string" && options.transformation.trim() !== "";
  if (!hasCode)
    return warnings;
  const enabled = isTruthyStatic(options.enableTransformation);
  const language = typeof options.transformationLanguage === "string" ? options.transformationLanguage : void 0;
  if (!enabled) {
    warnings.push({
      code: "transformation_not_enabled",
      path: "enableTransformation",
      message: "A transformation is supplied but enableTransformation is not true, so ToolJet saves the code and never runs it. Set enableTransformation: true and transformationLanguage to the language the code is written in."
    });
  }
  if (!language) {
    warnings.push({
      code: "transformation_language_missing",
      path: "transformationLanguage",
      message: `A transformation is supplied without transformationLanguage, so ToolJet cannot tell how to run it. Set it to ${languages.length === 1 ? `"${languages[0]}"` : '"javascript" or "python"'}.`
    });
  } else if (languages.length > 0 && !languages.includes(language)) {
    warnings.push({
      code: "transformation_language_mismatch",
      path: "transformationLanguage",
      message: `transformationLanguage is "${language}" but the code is under transformations.${languages.join("/")}. ToolJet runs the entry matching transformationLanguage, so the supplied code is ignored.`
    });
  }
  return warnings;
}
function influxTransformWarnings(kind, options) {
  if (kind !== "influxdb")
    return [];
  const operation = typeof options.operation === "string" ? options.operation.toLowerCase() : void 0;
  if (operation !== "query_data")
    return [];
  if (isTruthyStatic(options.enableTransformation))
    return [];
  return [{
    code: "influx_raw_csv_response",
    path: "enableTransformation",
    message: 'InfluxDB query_data returns annotated CSV as a single raw string, not rows. Bound directly, a Table renders nothing. Add a transformation that parses the CSV into an array of row objects (skip the #datatype/#group/#default annotation lines and the empty leading columns), with enableTransformation: true and transformationLanguage: "javascript".'
  }];
}
var TARGET_FIELD = /(^|_)(table|table_name|table_id|collection|collection_name|spreadsheet_id|base_id|bucket|bucket_name|index|index_name|container|url|endpoint|list_id|database_id|page_id|object_type|resource_name)$/i;
function validateQueryOptions(kind, options, executionContext = "app") {
  const errors = [];
  errors.push(...queryToggleIssues(options));
  if (kind === "workflows")
    errors.push(...workflowQueryIssues(options));
  if (kind === "hubspot")
    errors.push(...hubspotQueryIssues(options).map((issue2) => ({ code: "invalid_hubspot_query", ...issue2 })));
  errors.push(...apiEndpointQueryIssues(kind, options).map((issue2) => ({ code: "invalid_api_endpoint_query", ...issue2 })));
  if (kind === "hubspot" && options.operation !== "get" && (isTruthyStatic(options.runOnPageLoad) || isTruthyStatic(options.runOnDependencyChange))) {
    errors.push({ code: "automatic_hubspot_write", message: "HubSpot writes must run from an explicit user action, not on page load or dependency changes." });
  }
  const warnings = tableStateWarnings(options);
  if (kind === "workflows") {
    const normalized = normalizeWorkflowQueryOptions(options);
    if (normalized !== options)
      warnings.push({ code: "legacy_workflow_selector", message: "Legacy workflow selector keys are equivalent to workflowId/workflowVersionId; writes use the native camelCase keys." });
    options = normalized;
  }
  const conditionalWrite = conditionalWriteWarning(kind, options);
  if (conditionalWrite)
    warnings.push({ code: "conditional_write_result", path: "update_rows", message: conditionalWrite });
  if (kind === "mongodb")
    errors.push(...mongoArrayReplacementIssues(options));
  if (executionContext === "app" && kind === "runjs" && typeof options.code === "string" && options.code.trim()) {
    const syntax = runjsSyntaxError(options.code);
    if (syntax) {
      errors.push({
        code: "runjs_syntax_error",
        path: "code",
        message: `the JavaScript does not parse (${syntax}). ToolJet marks the query failed and every component bound to its data stays empty; fix the code before writing it.`
      });
    } else {
      const undeclared = runjsUndeclaredNames(options.code);
      if (undeclared.length) {
        errors.push({
          code: "runjs_undeclared_name",
          path: "code",
          message: `the JavaScript uses ${undeclared.map((n) => `\`${n}\``).join(", ")} but never declares ${undeclared.length > 1 ? "them" : "it"}. The query throws a ReferenceError when that line runs, ToolJet marks it failed, and every component bound to its data stays empty. Declare the value, or use the name you meant.`
        });
      }
    }
  }
  warnings.push(...transformationWarnings(options));
  warnings.push(...influxTransformWarnings(kind, options));
  if (typeof options.query === "string") {
    errors.push(...unquotedSqlBindingIssues(options.query));
    warnings.push(...interpolatedSqlBindingIssues(options.query));
  }
  const readAssessment = assessQueryRead({ kind, options });
  if (readAssessment.selectStar) {
    warnings.push({
      code: "select_star_read",
      path: typeof options.query === "string" ? "query" : void 0,
      message: "SELECT * will be refused by run_query. Inspect the table schema and select only the fields the app needs; this avoids unknown/wide columns and accidental sensitive-data reads."
    });
  }
  if (readAssessment.provenRead && readAssessment.requiresCountPreflight) {
    warnings.push({
      code: "unbounded_read",
      path: typeof options.query === "string" ? "query" : void 0,
      message: `${readAssessment.reason ?? "This read is not statically bounded"} Count the same table before running it. Prefer a bounded preview and server-side pagination for large or growing datasets.`
    });
  }
  const automaticRead = isTruthyStatic(options.runOnPageLoad) || isTruthyStatic(options.runOnDependencyChange);
  if (automaticRead && readAssessment.provenRead && readAssessment.requiresCountPreflight) {
    errors.push({
      code: "unsafe_automatic_unbounded_read",
      path: isTruthyStatic(options.runOnPageLoad) ? "runOnPageLoad" : "runOnDependencyChange",
      message: "An unbounded read cannot run automatically on page load or dependency change. " + (readAssessment.reason ? `${readAssessment.reason} ` : `Add a static row limit at or below ${LARGE_READ_ROW_THRESHOLD}. `) + "Use server-side pagination for more, or run it only after an explicit user decision."
    });
  }
  if (automaticRead && readAssessment.requiresBillableReadConfirmation) {
    errors.push({
      code: "unsafe_automatic_billable_read",
      path: isTruthyStatic(options.runOnPageLoad) ? "runOnPageLoad" : "runOnDependencyChange",
      message: "A potentially billable warehouse read cannot run automatically. Trigger it through an explicit user action, and use run_query user_confirmed_billable_read:true only after the user approves any MCP-side verification run."
    });
  }
  const schema = getDatasourceQuerySchema(kind);
  if (!schema) {
    warnings.push({
      code: "schema_unavailable",
      message: `No generated query contract is available for datasource kind "${kind}"; options were not validated.`
    });
    return { kind, schemaFound: false, errors, warnings };
  }
  const operationHint = describeOperationSelection(schema);
  const operation = operationFromOptions(options, schema.contracts, schema.defaults);
  if (!operation) {
    errors.push({
      code: "missing_operation",
      path: schema.contracts.sql ? "mode" : "operation",
      message: `Datasource "${kind}" needs an operation/mode. ${operationHint}`
    });
    return { kind, schemaFound: true, errors, warnings };
  }
  const contract = schema.contracts[operation];
  if (!contract) {
    errors.push({
      code: "invalid_operation",
      path: typeof options.operation === "string" ? "operation" : "mode",
      message: `Unknown operation/mode "${operation}" for datasource "${kind}". ${operationHint}`
    });
    return { kind, operation, schemaFound: true, errors, warnings };
  }
  const matching = contract.variants.filter((variant) => variantMatches(variant, options));
  if (!matching.length) {
    const selectors = /* @__PURE__ */ new Map();
    for (const variant of contract.variants) {
      for (const [selector, accepted] of Object.entries(variant.when)) {
        const values = selectors.get(selector) ?? /* @__PURE__ */ new Set();
        accepted.forEach((value) => values.add(value));
        selectors.set(selector, values);
      }
    }
    for (const [selector, accepted] of selectors) {
      const actual = options[selector];
      if (typeof actual === "string" && !accepted.has(actual)) {
        errors.push({
          code: "invalid_selector_value",
          path: selector,
          message: `Invalid ${selector} "${actual}" for ${kind}/${operation}. Allowed values: ${[...accepted].sort().join(", ")}.`
        });
      }
    }
    return { kind, operation, schemaFound: true, errors, warnings };
  }
  const dynamicSelectors = [...new Set(contract.variants.flatMap((variant) => Object.keys(variant.when)).filter((selector) => isDynamicBinding(options[selector])))];
  for (const selector of dynamicSelectors) {
    warnings.push({
      code: "runtime_selector_binding",
      path: selector,
      message: `Selector "${selector}" is a dynamic binding, so MCP validated the fields shared by every possible ${kind}/${operation} variant. Browser-verify any fields required only by the runtime-selected value.`
    });
  }
  const fields = fieldMap(matching);
  const allowedTopLevel = topLevelKeys(fields);
  if (singleSpecRef(kind))
    for (const key of ["operation", "path", "params", "selectedOperation"])
      allowedTopLevel.add(key);
  const own2 = [...allowedTopLevel].filter((k) => !(k in COMMON_QUERY_OPTION_FIELDS));
  for (const key of Object.keys(options)) {
    if (allowedTopLevel.has(key))
      continue;
    const exactReplacement = KNOWN_IGNORED_KEYS[key];
    const nestedReplacement = suffixSuggestion(key, fields);
    const replacement = exactReplacement ?? nestedReplacement;
    const meant = key.length >= 4 ? own2.filter((f) => f !== key && options[f] === void 0 && (f.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(f.toLowerCase()))) : [];
    if (!replacement && meant.length === 1) {
      errors.push({
        code: "unknown_option_key",
        path: key,
        message: `Option key "${key}" does not exist for ${kind}/${operation}; the field is "${meant[0]}". ToolJet drops "${key}" and the query runs without it.`
      });
      continue;
    }
    warnings.push({
      code: replacement ? "ignored_or_misplaced_option_key" : "unknown_option_key",
      path: key,
      message: replacement ? `Option key "${key}" is not read at this location for ${kind}/${operation}; use "${replacement}".` : `Unknown option key "${key}" for ${kind}/${operation}; ToolJet plugins may silently drop it.`
    });
  }
  for (const root of allowedTopLevel) {
    const children = nestedChildren(fields, root);
    const actual = options[root];
    if (!children.size || !isObject(actual))
      continue;
    for (const child of Object.keys(actual)) {
      if (!children.has(child)) {
        warnings.push({
          code: "unknown_nested_option_key",
          path: `${root}.${child}`,
          message: `Unknown nested option key "${root}.${child}" for ${kind}/${operation}; ToolJet may silently drop it.`
        });
      }
    }
  }
  if (options.mode !== "sql") {
    const targets = Object.keys(fields).filter((path) => !path.includes(".") && TARGET_FIELD.test(path) && !(path in COMMON_QUERY_OPTION_FIELDS));
    const set = targets.filter((path) => {
      const v = options[path];
      return v !== void 0 && v !== null && v !== "";
    });
    if (targets.length && !set.length) {
      errors.push({ code: "missing_target", path: targets[0], message: `${kind}/${operation} names nothing to act on: set ${targets.join(" or ")}.` });
    }
  }
  const required = intersection(matching.map((variant) => variant.required));
  for (const path of required) {
    const value = valueAtPath(options, path);
    if (value === void 0 || value === null || value === "") {
      errors.push({
        code: "missing_required_option",
        path,
        message: `Missing required option "${path}" for ${kind}/${operation}.`
      });
    }
  }
  for (const [path, field] of Object.entries(fields)) {
    const value = valueAtPath(options, path);
    const arity = tupleArity(field);
    if (arity !== void 0 && value !== void 0 && !isDynamicBinding(value)) {
      if (!Array.isArray(value)) {
        errors.push({
          code: "invalid_option_shape",
          path,
          message: `Option "${path}" for ${kind}/${operation} must be an array of ${arity}-item tuples.`
        });
      } else {
        const invalidIndex = value.findIndex((item) => !Array.isArray(item) || item.length !== arity);
        if (invalidIndex >= 0) {
          errors.push({
            code: "invalid_option_shape",
            path: `${path}[${invalidIndex}]`,
            message: `Option "${path}" for ${kind}/${operation} must contain ${arity}-item tuples such as [["key", "value"]].`
          });
        }
      }
    }
    if (!field.allowedValues?.length)
      continue;
    if (typeof value === "string" && !value.includes("{{") && !field.allowedValues.includes(value)) {
      errors.push({
        code: "invalid_option_value",
        path,
        message: `Invalid value "${value}" for ${kind}/${operation} option "${path}". Allowed values: ${field.allowedValues.join(", ")}.`
      });
    }
  }
  if (kind === "tooljetdb" && (operation === "create_row" || operation === "update_rows")) {
    const columnsPath = operation === "create_row" ? "create_row" : "update_rows.columns";
    const columns = valueAtPath(options, columnsPath);
    const primitiveEntries = primitiveWriteBindingEntries(columns);
    if (primitiveEntries.length)
      errors.push({
        code: "malformed_write_columns",
        path: columnsPath,
        message: `ToolJet DB ${operation} "${columnsPath}" binds a flat object with primitive entry values at ${primitiveEntries.map((k) => JSON.stringify(k)).join(", ")}. ToolJet reads {column, value} records, so these fields are omitted or the write fails. Use a literal column map with bound values, e.g. {"0":{"column":"status","value":"{{components.status.value}}"}}, or make the binding return that same record-map shape. Do not change the intended field values.`
      });
    if (isObject(columns) && Object.keys(columns).length > 0) {
      const flat = Object.entries(columns).filter(([, clause]) => !isObject(clause) || typeof clause.column !== "string" || clause.column === "");
      if (flat.length > 0) {
        const example = flat[0][0];
        errors.push({
          code: "malformed_write_columns",
          path: `${columnsPath}.${example}`,
          message: `ToolJet DB ${operation} "${columnsPath}" must map each entry to a {column, value} record, not a flat {"${example}": <value>} pair. ToolJet reads .column off each entry, so as authored this write sends an empty body and fails at runtime with PGRST102 ("Empty or invalid json") even though the app validates. Use {"0": {"column": "${example}", "value": <value>}, \u2026}.`
        });
      }
    }
  }
  if (kind !== "tooljetdb" && operation === "create_row" && isObject(valueAtPath(options, "create_row"))) {
    const createRow = valueAtPath(options, "create_row");
    const columns = createRow.columns;
    const usable = isObject(columns) && Object.values(columns).some((clause) => isObject(clause) && typeof clause.column === "string" && clause.column !== "");
    if (!usable) {
      const misplaced = !isObject(columns) && Object.values(createRow).some((clause) => isObject(clause) && typeof clause.column === "string" && clause.column !== "");
      errors.push({
        code: "malformed_write_columns",
        path: "create_row.columns",
        message: misplaced ? `${kind} create_row expects the column map under "create_row.columns", not directly on "create_row" (that is the ToolJet DB shape). As authored no column is read, and the driver falls back to INSERT ... DEFAULT VALUES \u2014 inserting a BLANK ROW that reports success.` : `${kind} create_row requires "create_row.columns" as {"0": {"column": "<name>", "value": <v>}, \u2026}. With no usable column entry the driver emits INSERT ... DEFAULT VALUES, inserting a BLANK ROW and reporting success.`
      });
    }
  }
  if (kind === "tooljetdb" && (operation === "update_rows" || operation === "delete_rows")) {
    const filtersPath = `${operation}.where_filters`;
    const filters = valueAtPath(options, filtersPath);
    if (isObject(filters) || Array.isArray(filters)) {
      const usable = Object.entries(filters).filter(([, clause]) => isObject(clause) && typeof clause.column === "string" && clause.column !== "" && typeof clause.operator === "string" && clause.operator !== "");
      if (usable.length === 0) {
        const example = Object.keys(filters)[0];
        errors.push({
          code: "malformed_where_filters",
          path: filtersPath,
          message: `ToolJet DB ${operation} "${filtersPath}" has no usable clause: every entry must be a {column, operator, value} record (for example {"0": {"column": "id", "operator": "eq", "value": "{{components.table1.selectedRow.id}}"}}). ToolJet silently drops any clause missing column or operator` + (operation === "update_rows" ? ", and an update with no surviving clause updates EVERY ROW in the table." : ".") + (example ? ` Entry "${example}" is not in that shape.` : "")
        });
      }
    } else if (filters === void 0 && operation === "update_rows") {
      errors.push({
        code: "malformed_where_filters",
        path: filtersPath,
        message: `ToolJet DB update_rows requires "${filtersPath}"; without it the write is unfiltered and updates EVERY ROW in the table. Add {"0": {"column", "operator", "value"}}.`
      });
    }
  }
  if (kind === "tooljetdb" && ["list_rows", "update_rows", "delete_rows"].includes(operation)) {
    const filters = valueAtPath(options, `${operation}.where_filters`);
    if (isObject(filters) || Array.isArray(filters)) {
      for (const [mapKey, rawClause] of Object.entries(filters)) {
        const aliases = {
          equals: "eq",
          equal: "eq",
          "==": "eq",
          "===": "eq",
          "=": "eq",
          not_equals: "neq",
          notEquals: "neq",
          "!=": "neq",
          "!==": "neq",
          "<>": "neq",
          greater_than: "gt",
          greaterThan: "gt",
          ">": "gt",
          greater_than_or_equal: "gte",
          ">=": "gte",
          less_than: "lt",
          lessThan: "lt",
          "<": "lt",
          less_than_or_equal: "lte",
          "<=": "lte"
        };
        if (isObject(rawClause) && typeof rawClause.operator === "string" && Object.hasOwn(aliases, rawClause.operator)) {
          errors.push({
            code: "invalid_tooljetdb_filter_operator",
            path: `${operation}.where_filters.${mapKey}.operator`,
            message: `ToolJet DB filter operator "${rawClause.operator}" is not a PostgREST builder operator. Use "${aliases[rawClause.operator]}" for this comparison; keep the same column and value. The query was not automatically rewritten. Fetch the datasource operation contract if unsure.`
          });
        }
        if (!isObject(rawClause) || rawClause.operator !== "eq")
          continue;
        const column = typeof rawClause.column === "string" ? rawClause.column : "";
        const value = typeof rawClause.value === "string" ? rawClause.value : "";
        const dateLikeColumn = /(^|_)(date|day|time|at|on)$|_date_|timestamp/i.test(column);
        const dayValue = /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) || /format\(\s*['"]YYYY-MM-DD['"]\s*\)/.test(value);
        if (!dayValue && !dateLikeColumn)
          continue;
        if (!dayValue && !/moment\(|new Date|Date\.now/.test(value))
          continue;
        warnings.push({
          code: "date_equality_filter",
          path: `${operation}.where_filters.${mapKey}`,
          message: `ToolJet DB ${operation} filter "${column}" uses "eq" against a calendar day. Date and timestamp columns come back as full ISO timestamps ("2026-09-04T00:00:00+00:00"), so equality with "YYYY-MM-DD" matches no rows and the table shows "No data" with no error. Filter a day as a range instead: one clause "gte" the day at 00:00 and one "lt" the next day, or store the day in a text column seeded as YYYY-MM-DD when this build creates the table.`
        });
      }
    }
  }
  if (kind === "tooljetdb" && operation === "list_rows") {
    const orderFilters = valueAtPath(options, "list_rows.order_filters");
    if (isObject(orderFilters)) {
      for (const [mapKey, rawClause] of Object.entries(orderFilters)) {
        if (!isObject(rawClause) || typeof rawClause.id !== "string" || rawClause.id === mapKey)
          continue;
        warnings.push({
          code: "mismatched_record_id",
          path: `list_rows.order_filters.${mapKey}.id`,
          message: `ToolJet DB order_filters key "${mapKey}" does not match its inner id "${rawClause.id}"; ToolJet can silently ignore the sort. Use the same stable value for the outer key and inner id.`
        });
      }
    }
  }
  return { kind, operation, schemaFound: true, errors, warnings };
}
function issueMessages(issues, prefix) {
  return issues.map((issue2) => `${prefix ? `${prefix}: ` : ""}${issue2.message}`);
}
function normalizeWriteColumnMap(columns) {
  if (!isObject(columns) || Object.keys(columns).length === 0)
    return null;
  const entries = Object.entries(columns);
  if (entries.every(([, clause]) => isObject(clause) && typeof clause.column === "string" && clause.column !== "")) {
    return null;
  }
  const normalized = {};
  entries.forEach(([key, clause], index) => {
    if (isObject(clause) && typeof clause.column === "string" && clause.column !== "") {
      normalized[String(index)] = clause;
      return;
    }
    normalized[String(index)] = { column: key, value: clause };
  });
  return normalized;
}
function normalizeQueryOptions(kind, rawOptions) {
  const options = normalizeQueryToggles(rawOptions);
  if (kind === "workflows")
    return normalizeWorkflowQueryOptions(options);
  if (kind === "mongodb" && isObject(options)) {
    let result = options;
    for (const field of ["filter", "options", "pipeline", "document", "documents", "update", "replacement", "operations"]) {
      const value = options[field];
      if (value !== null && typeof value === "object") {
        if (result === options)
          result = { ...options };
        result[field] = JSON.stringify(value);
      }
    }
    return result;
  }
  if (kind !== "tooljetdb" || !isObject(options))
    return options;
  const operation = typeof options.operation === "string" ? options.operation : "";
  if (operation === "create_row") {
    const normalized = normalizeWriteColumnMap(options.create_row);
    return normalized ? { ...options, create_row: normalized } : options;
  }
  if (operation === "update_rows") {
    const updateRows = options.update_rows;
    if (!isObject(updateRows))
      return options;
    const normalized = normalizeWriteColumnMap(updateRows.columns);
    return normalized ? { ...options, update_rows: { ...updateRows, columns: normalized } } : options;
  }
  return options;
}
createRequire(import.meta.url);
var capabilityRequestSchema = external_exports.object({
  version_id: external_exports.string().uuid()
}).strict();
var datasourceCapabilitySchema = external_exports.enum(["query", "ai-model", "email"]);
var workflowCapabilityReportSchema = external_exports.object({
  version_id: external_exports.string().uuid(),
  authorable_node_types: external_exports.array(external_exports.string()),
  datasources: external_exports.array(external_exports.object({
    id: external_exports.string(),
    name: external_exports.string(),
    kind: external_exports.string(),
    capabilities: external_exports.array(datasourceCapabilitySchema)
  }).strict())
}).strict();
var AI_DATASOURCE_KINDS = /* @__PURE__ */ new Set(["openai", "anthropic", "gemini", "mistral_ai"]);
var EMAIL_DATASOURCE_KINDS = /* @__PURE__ */ new Set(["smtp", "sendgrid", "mailgun"]);
function datasourceCapabilities(kind) {
  const capabilities = ["query"];
  if (AI_DATASOURCE_KINDS.has(kind))
    capabilities.push("ai-model");
  if (EMAIL_DATASOURCE_KINDS.has(kind))
    capabilities.push("email");
  return capabilities;
}
async function getWorkflowCapabilities(client, input) {
  const { version_id } = capabilityRequestSchema.parse(input);
  const datasources = await client.workflows.listDatasources(version_id);
  return workflowCapabilityReportSchema.parse({
    version_id,
    authorable_node_types: nodeCatalog.nodes.map((node) => node.type),
    datasources: datasources.map((datasource) => ({
      id: datasource.id,
      name: datasource.name,
      kind: datasource.kind,
      capabilities: datasourceCapabilities(datasource.kind)
    }))
  });
}
function workflowReadiness(graph, structuralErrors) {
  if (structuralErrors.length)
    return { runtime_readiness: "blocked", blockers: structuralErrors };
  const adjacency = new Map(graph.nodes.map((node) => [node.id, []]));
  for (const edge of controlFlowEdges(graph))
    adjacency.get(edge.source)?.push(edge.target);
  const reachable = /* @__PURE__ */ new Set();
  const visit = (id) => {
    if (reachable.has(id))
      return;
    reachable.add(id);
    for (const target of adjacency.get(id) ?? [])
      visit(target);
  };
  for (const start of graph.nodes.filter((node) => node.type === "input" && node.data.nodeType === "start"))
    visit(start.id);
  const blockers = [];
  for (const agent of graph.nodes.filter((node) => node.type === "agent" && reachable.has(node.id))) {
    const attachment = graph.edges.find((edge) => edge.target === agent.id && edge.targetHandle === "ai-model");
    const child = attachment && graph.nodes.find((node) => node.id === attachment.source);
    const definitionId = child?.data.idOnDefinition;
    const mapping = typeof definitionId === "string" && graph.queries.find((query) => query.idOnDefinition === definitionId);
    if (!attachment || !child || !mapping)
      blockers.push({
        code: "agent_missing_model",
        path: `nodes.${agent.id}.model`,
        message: "Reachable Agent requires one configured AI model attachment."
      });
  }
  return { runtime_readiness: blockers.length ? "draft_only" : "runnable", blockers };
}
var plans = /* @__PURE__ */ new Map();
var TTL = 30 * 6e4;
function prune() {
  for (const [key, plan] of plans)
    if (plan.expires <= Date.now())
      plans.delete(key);
}
async function prepare(client, workflowId, versionId, spec, ids) {
  const snapshot = await client.get(workflowId, versionId);
  if (!snapshot.editable)
    throw new Error("Only editable draft workflow versions can be changed.");
  const [queries, datasources] = await Promise.all([client.getQueries(versionId), client.listDatasources(versionId)]);
  const compiled = compileGraph(snapshot.definition, spec, ids, new Map(datasources.map((datasource) => [datasource.id, datasource.kind])));
  const warnings = [];
  const writes = [];
  const finalDefinitionIds = new Set(compiled.graph.nodes.map((node) => node.data.idOnDefinition).filter((value) => typeof value === "string"));
  const removedDefinitionIds = new Set(snapshot.definition.nodes.map((node) => node.data.idOnDefinition).filter((value) => typeof value === "string" && !finalDefinitionIds.has(value)));
  const deletions = [];
  for (const mapping of snapshot.definition.queries) {
    if (!removedDefinitionIds.has(mapping.idOnDefinition))
      continue;
    if (compiled.graph.queries.some((retained) => retained.id === mapping.id))
      continue;
    if (deletions.some((deletion) => deletion.query_id === mapping.id))
      continue;
    const node = snapshot.definition.nodes.find((candidate) => candidate.data.idOnDefinition === mapping.idOnDefinition);
    if (!node)
      continue;
    if (!queries.some((query) => query.id === mapping.id))
      throw new Error(`Query ${mapping.id} is missing from the target version.`);
    deletions.push({ node_id: node.id, definition_id: mapping.idOnDefinition, query_id: mapping.id });
  }
  const claimedNames = /* @__PURE__ */ new Set();
  for (const item of compiled.query_nodes) {
    const existingMapping = snapshot.definition.queries.find((q) => q.idOnDefinition === item.definition_id);
    const oldQuery = queries.find((q) => q.id === existingMapping?.id);
    if (existingMapping && !oldQuery)
      throw new Error(`Query ${existingMapping.id} is missing from the target version.`);
    if (oldQuery && snapshot.definition.nodes.filter((n) => snapshot.definition.queries.some((q) => q.id === oldQuery.id && q.idOnDefinition === n.data.idOnDefinition)).length > 1)
      throw new Error(`Query ${oldQuery.id} is shared by multiple nodes. Shared query editing is unsupported.`);
    const input = item.role === "workflow-node" ? item.spec : void 0;
    const datasource = item.role === "agent-model" ? datasources.find((d) => d.id === item.datasource_id) : input.type === "javascript" || input.type === "loop" ? datasources.find((d) => d.kind === "runjs") : datasources.find((d) => d.id === input.datasource_id);
    const label = item.role === "agent-model" ? "Agent model" : `node ${input.ref}`;
    if (!datasource)
      throw new Error(`Datasource unavailable for ${label}.`);
    if (item.role === "agent-model" && !AI_DATASOURCE_KINDS.has(datasource.kind))
      throw new Error(`Datasource ${datasource.id} is not an AI model datasource.`);
    const kind = datasource.kind;
    const dataSourceId = datasource.id;
    const name2 = item.role === "agent-model" ? item.name : input.name;
    if (oldQuery && (oldQuery.kind !== kind || oldQuery.data_source_id !== dataSourceId))
      throw new Error(item.role === "agent-model" ? "Changing an Agent model datasource is unsupported; remove the model first, then add its replacement in a second phase." : "Changing an existing query datasource is unsupported; add a new node.");
    if (oldQuery?.name !== void 0 && oldQuery.name !== name2)
      throw new Error(item.role === "agent-model" ? "Renaming an Agent model query is unsupported; remove the model first, then add its replacement in a second phase." : "Renaming existing queries is unsupported because code references cannot be rewritten safely.");
    if (claimedNames.has(name2) || queries.some((q) => q.name === name2 && q.id !== oldQuery?.id))
      throw new Error(`Duplicate query name: ${name2}`);
    claimedNames.add(name2);
    const requestedOptions = item.role === "agent-model" ? item.options : input.type === "javascript" || input.type === "loop" ? { ...oldQuery?.options ?? {}, code: input.code } : input.options;
    const options = item.role === "agent-model" ? structuredClone(requestedOptions) : normalizeQueryOptions(kind, requestedOptions);
    if (item.role === "workflow-node" && kind === "runjs")
      assertWorkflowJavaScript(options.code, label);
    if (item.role === "workflow-node") {
      const validation2 = validateQueryOptions(kind, options, "workflow");
      if (validation2.errors.length)
        throw new Error(issueMessages(validation2.errors).join(" "));
      warnings.push(...issueMessages(validation2.warnings));
    }
    writes.push({ node_id: item.node_id, definition_id: item.definition_id, existing_id: oldQuery?.id, name: name2, dataSourceId: dataSourceId ?? "", kind, options });
    if (!existingMapping && !compiled.graph.queries.some((mapping) => mapping.idOnDefinition === item.definition_id))
      compiled.graph.queries.push({ idOnDefinition: item.definition_id, id: `pending:${item.node_id}` });
  }
  const queryIds = /* @__PURE__ */ new Set([...queries.map((q) => q.id), ...writes.filter((q) => !q.existing_id).map((q) => `pending:${q.node_id}`)]);
  const validation = validateGraph(compiled.graph, queryIds);
  const readiness = workflowReadiness(compiled.graph, validation.errors);
  return { snapshot, compiled, writes, deletions, validation, readiness, warnings };
}
async function lint(client, workflowId, versionId, spec, allowDraft = false) {
  const prepared = await prepare(client, workflowId, versionId, spec);
  if (prepared.validation.errors.length || prepared.readiness.runtime_readiness === "draft_only" && !allowDraft)
    return { ...prepared.validation, ...prepared.readiness, query_warnings: prepared.warnings };
  prune();
  while (plans.size >= 200)
    plans.delete(plans.keys().next().value);
  const token = randomUUID();
  plans.set(token, { scope: await client.planScope(), workflowId, versionId, spec: structuredClone(spec), ids: prepared.compiled, allowDraft, expires: Date.now() + TTL });
  return {
    plan_token: token,
    expires_in_seconds: TTL / 1e3,
    node_ids: prepared.compiled.node_ids,
    edge_ids: prepared.compiled.edge_ids,
    ...prepared.validation,
    ...prepared.readiness,
    query_warnings: prepared.warnings,
    changes: { node_upserts: spec.nodes.length, edge_upserts: spec.edges.length, node_removals: spec.remove_node_ids, edge_removals: spec.remove_edge_ids, queries: [...prepared.writes.map((q) => ({ name: q.name, operation: q.existing_id ? "update" : "create" })), ...prepared.deletions.map((q) => ({ query_id: q.query_id, operation: "delete" }))] }
  };
}
async function apply(client, token) {
  prune();
  const scope = await client.planScope();
  const plan = plans.get(token);
  if (!plan || plan.scope !== scope)
    throw new Error("Unknown, expired, consumed, or differently scoped plan. Run lint_workflow_spec again.");
  plans.delete(token);
  const { compiled, snapshot, writes, deletions, validation, readiness } = await prepare(client, plan.workflowId, plan.versionId, plan.spec, plan.ids);
  if (validation.errors.length)
    throw new Error(JSON.stringify(validation.errors));
  if (readiness.runtime_readiness === "draft_only" && !plan.allowDraft)
    throw new Error(JSON.stringify(readiness.blockers));
  const completed = [];
  let phase = "queries";
  let attemptedQuery;
  try {
    for (const write of writes) {
      attemptedQuery = { name: write.name, node_id: write.node_id, existing_id: write.existing_id };
      const result = write.existing_id ? await client.updateQuery({ queryId: write.existing_id, versionId: plan.versionId, name: write.name, options: write.options }) : await client.createWorkflowQuery({ workflowId: plan.workflowId, versionId: plan.versionId, name: write.name, dataSourceId: write.dataSourceId || void 0, kind: write.kind, options: write.options });
      completed.push({ operation: write.existing_id ? "update" : "create", query_id: result.query_id, node_id: write.node_id });
      compiled.graph.queries = compiled.graph.queries.filter((q) => q.idOnDefinition !== write.definition_id);
      compiled.graph.queries.push({ idOnDefinition: write.definition_id, id: result.query_id });
      attemptedQuery = void 0;
    }
    phase = "save";
    await client.save(snapshot, compiled.graph);
    phase = "readback";
    const [saved, queries] = await Promise.all([client.get(plan.workflowId, plan.versionId), client.getQueries(plan.versionId)]);
    const validation2 = validateGraph(saved.definition, new Set(queries.map((q) => q.id)));
    if (!isDeepStrictEqual(saved.definition, compiled.graph))
      throw new Error("Saved definition differs from the intended graph. Inspect get_workflow before retrying.");
    for (const write of writes) {
      const id = completed.find((q) => q.node_id === write.node_id).query_id;
      const persisted = queries.find((q) => q.id === id);
      if (!persisted || persisted.name !== write.name || persisted.kind !== write.kind || persisted.data_source_id !== write.dataSourceId || !isDeepStrictEqual(persisted.options, write.options))
        throw new Error(`Query ${id} readback differs from intended datasource, kind, name, or options.`);
    }
    if (validation2.errors.length)
      throw new Error(JSON.stringify(validation2.errors));
    phase = "query_deletions";
    for (const deletion of deletions) {
      attemptedQuery = { name: deletion.query_id, node_id: deletion.node_id, existing_id: deletion.query_id };
      await client.deleteQuery({ queryId: deletion.query_id, versionId: plan.versionId });
      completed.push({ operation: "delete", query_id: deletion.query_id, node_id: deletion.node_id });
      attemptedQuery = void 0;
    }
    return { workflow_id: plan.workflowId, version_id: plan.versionId, editor_url: saved.editor_url, node_ids: compiled.node_ids, edge_ids: compiled.edge_ids, completed, validation: validation2, ...readiness };
  } catch (error) {
    return {
      failed: true,
      workflow_id: plan.workflowId,
      version_id: plan.versionId,
      phase,
      completed,
      attempted_query: attemptedQuery,
      node_ids: compiled.node_ids,
      edge_ids: compiled.edge_ids,
      graph_persistence: phase === "queries" ? "not_attempted" : phase === "save" ? "unknown" : "saved",
      error: error instanceof Error ? error.message : String(error),
      recovery: "Inspect get_workflow and its queries; reuse persisted IDs when replanning. Do not repeat creation blindly. No resources were automatically deleted."
    };
  }
}
async function deleteNode(client, workflowId, versionId, nodeId) {
  const snapshot = await client.get(workflowId, versionId);
  if (!snapshot.definition.nodes.some((node) => node.id === nodeId))
    throw new Error(`Unknown workflow node: ${nodeId}`);
  const spec = specSchema.parse({ remove_node_ids: [nodeId], remove_edge_ids: snapshot.definition.edges.filter((edge) => edge.source === nodeId || edge.target === nodeId).map((edge) => edge.id) });
  const result = await lint(client, workflowId, versionId, spec, true);
  if (!("plan_token" in result))
    throw new Error(JSON.stringify({ errors: result.errors, blockers: result.blockers }));
  return apply(client, result.plan_token);
}
createRequire(import.meta.url);
var dataPath = resolve(dirname(fileURLToPath(import.meta.url)), "../data/component-schemas.json");
var compatibilityPath = resolve(dirname(fileURLToPath(import.meta.url)), "../data/component-compatibility.json");
var cache = null;
var legacyReplacements = null;
function load() {
  if (!cache)
    cache = readCatalog(dataPath);
  return cache;
}
function loadLegacyReplacements() {
  if (!legacyReplacements) {
    const compatibility = JSON.parse(readFileSync(compatibilityPath, "utf8"));
    legacyReplacements = compatibility.legacyReplacements ?? {};
  }
  return legacyReplacements;
}
function getCatalog() {
  const legacy = loadLegacyReplacements();
  return Object.values(load()).filter((c) => !legacy[c.type]).map((c) => ({ type: c.type, description: c.description })).sort((a, b) => a.type.localeCompare(b.type));
}
function getComponentSchema(type) {
  return load()[type] ?? null;
}
function getLegacyComponentReplacement(type) {
  return loadLegacyReplacements()[type] ?? null;
}
createRequire(import.meta.url);
var name = external_exports.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).refine((v) => !["__proto__", "prototype", "constructor"].includes(v));
var editContractSchema = external_exports.object({
  source_query: name.describe("Already-loaded bounded raw row-array query; never a display projection."),
  table_component: name,
  id_field: name.default("id"),
  prefix: name.describe("Unique prefix for generated snapshot/draft variables and RunJS query names."),
  fields: external_exports.array(external_exports.object({
    field: name,
    component: name,
    type: external_exports.enum(["text", "number", "date_only", "boolean"]),
    required: external_exports.boolean().default(false),
    nullable: external_exports.boolean().default(false).describe("Opt in to clearing to null; a user change event is also required."),
    trim: external_exports.boolean().default(false),
    choices: external_exports.union([
      external_exports.array(external_exports.object({ label: external_exports.string(), value: external_exports.union([external_exports.string(), external_exports.number().finite()]) }).strict()).min(1).max(100),
      external_exports.object({ query: name, value_field: name, label_field: name }).strict()
    ]).optional().describe("Opt-in DropdownV2 for text/number fields: literal label/value options or an already-loaded bounded raw option query. Values must match the declared field type.")
  })).min(1).max(40)
}).strict();
function canonical(value, field) {
  if (value === void 0)
    throw new Error(`Missing input: ${field.field}`);
  if (value === null || value === "") {
    if (field.required)
      throw new Error(`Required field: ${field.field}`);
    if (value === null && !field.nullable)
      throw new Error(`Null not allowed: ${field.field}`);
    return value;
  }
  if (field.type === "text") {
    if (typeof value !== "string")
      throw new Error(`Expected text: ${field.field}`);
    if (field.required && !value.trim())
      throw new Error(`Required field: ${field.field}`);
    return field.trim ? value.trim() : value;
  }
  if (field.type === "boolean") {
    if (typeof value !== "boolean")
      throw new Error(`Expected boolean: ${field.field}`);
    return value;
  }
  if (field.type === "number") {
    if (typeof value !== "number" && typeof value !== "string" || typeof value === "string" && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value) || !Number.isFinite(Number(value)))
      throw new Error(`Expected finite number: ${field.field}`);
    return Number(value);
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) {
    throw new Error(`Expected ISO date: ${field.field}`);
  }
  const day = value.slice(0, 10);
  const parsed = /* @__PURE__ */ new Date(day + "T00:00:00Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day || !Number.isFinite(Date.parse(value))) {
    throw new Error(`Invalid date: ${field.field}`);
  }
  return day;
}
function generateEditContract(input) {
  const spec = editContractSchema.parse(input);
  for (const key of ["field", "component"]) {
    if (new Set(spec.fields.map((f) => f[key])).size !== spec.fields.length)
      throw new Error(`Duplicate ${key} in edit contract`);
  }
  if (spec.fields.some((f) => f.field === spec.id_field))
    throw new Error("The stable primary key cannot be edited");
  if (spec.fields.some((f) => f.required && f.nullable))
    throw new Error("A required field cannot be nullable");
  for (const f of spec.fields)
    if (f.choices) {
      if (!["text", "number"].includes(f.type))
        throw new Error("Choices require a text or number field");
      if (Array.isArray(f.choices)) {
        if (f.choices.some((o) => typeof o.value !== (f.type === "text" ? "string" : "number")))
          throw new Error("Choice values must match field type");
        if (new Set(f.choices.map((o) => o.value)).size !== f.choices.length)
          throw new Error("Duplicate choice value");
      }
    }
  const snapshot = `${spec.prefix}Snapshot`, draft = `${spec.prefix}Draft`;
  const openName = `${spec.prefix}Open`, prepareName = `${spec.prefix}Prepare`;
  const q = JSON.stringify;
  const helpers = `const canonical = ${canonical.toString()};
const fields = ${q(spec.fields)};
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
`;
  const openCode = helpers + `await actions.setVariable(${q(snapshot)}, null);
await actions.setVariable(${q(draft)}, null);
const selection = components.${spec.table_component}.selectedRow;
const id = selection && selection[${q(spec.id_field)}];
if ((typeof id !== 'string' && typeof id !== 'number') || id === '' || (typeof id === 'number' && !Number.isFinite(id))) throw new Error('Select a record first');
const rows = queries.${spec.source_query}.data;
if (!Array.isArray(rows)) throw new Error('Raw records are not loaded');
const matches = rows.filter(r => r && own(r, ${q(spec.id_field)}) && r[${q(spec.id_field)}] === id);
if (matches.length !== 1) throw new Error('Expected exactly one raw record for the selected ID');
const values = {};
for (const field of fields) {
  if (!own(matches[0], field.field)) throw new Error('Raw record omits: ' + field.field);
  // Existing incomplete records must be openable for correction. Validate required
  // values on Prepare, not before the user can edit them.
  values[field.field] = canonical(matches[0][field.field], { ...field, required: false, nullable: true });
}
await actions.setVariable(${q(snapshot)}, { id, values });
return { id };`;
  const prepareCode = helpers + `const snapshot = variables.${snapshot};
const draft = variables.${draft};
const selection = components.${spec.table_component}.selectedRow;
if (!snapshot || !selection || selection[${q(spec.id_field)}] !== snapshot.id) throw new Error('Reopen the selected record before saving');
if (draft && draft.id !== snapshot.id) throw new Error('Draft belongs to another record');
const changes = draft ? draft.values : {};
if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw new Error('Invalid draft');
const patch = {};
for (const key of Object.keys(changes)) if (!fields.some(f => f.field === key)) throw new Error('Unknown draft field: ' + key);
for (const field of fields) {
  if (!own(snapshot.values, field.field)) throw new Error('Incomplete edit snapshot');
  if (!own(changes, field.field)) {
    canonical(snapshot.values[field.field], field);
    continue;
  }
  const raw = changes[field.field];
  let value = canonical(raw, field);
  if (value === '' && field.type !== 'text') value = null;
  if (value === '' || value === null) {
    if (!field.nullable) throw new Error('Clearing is not allowed: ' + field.field);
    value = null;
  }
  if (value !== snapshot.values[field.field]) patch[field.field] = value;
}
return { id: snapshot.id, patch, changed: Object.keys(patch).length > 0 };`;
  const inputs = spec.fields.map((f) => {
    const type = f.choices ? "DropdownV2" : { text: "TextInput", number: "NumberInput", date_only: "DatePickerV2", boolean: "Checkbox" }[f.type];
    const initialKey = f.choices ? "schema" : ["date_only", "boolean"].includes(f.type) ? "defaultValue" : "value";
    const exposed = f.type === "date_only" ? "selectedDate" : "value";
    const trigger = f.choices || f.type === "date_only" ? "onSelect" : "onChange";
    const schema = getComponentSchema(type);
    if (!schema?.properties.some((p) => p.key === initialKey) || !schema.events?.some((e) => e.id === trigger))
      throw new Error(`Unsupported edit adapter: ${type}`);
    const initial = `variables.${snapshot} && variables.${snapshot}.values[${q(f.field)}]`;
    let value = `{{${initial} != null ? variables.${snapshot}.values[${q(f.field)}] : ${f.type === "boolean" ? "false" : "''"}}}`;
    if (f.choices) {
      const options = Array.isArray(f.choices) ? q(f.choices) : `(queries.${f.choices.query}.data || []).map(r=>({label:r[${q(f.choices.label_field)}],value:r[${q(f.choices.value_field)}]}))`;
      value = `{{(${options}).map(option=>({label:option.label,value:option.value,visible:true,default:!!variables.${snapshot} && option.value === variables.${snapshot}.values[${q(f.field)}]}))}}`;
    }
    const exposedValue = `components.${f.component}.${exposed}`;
    const changedValue = f.choices && f.nullable ? `(${exposedValue} == null ? null : ${exposedValue})` : exposedValue;
    const draftValue = `{{({id:variables.${snapshot}.id,values:Object.assign({},variables.${draft} && variables.${draft}.id === variables.${snapshot}.id ? variables.${draft}.values : {},{${q(f.field)}:${changedValue}})})}}`;
    return {
      name: f.component,
      type,
      properties: { [initialKey]: value, ...f.choices ? { advanced: "{{true}}", showClearBtn: f.nullable } : {}, ...f.type === "date_only" ? { dateFormat: "YYYY-MM-DD" } : {} },
      validation: { mandatory: f.required },
      events: [{ source_ref: f.component, source_type: "component", trigger, action: {
        actionId: "set-custom-variable",
        key: draft,
        value: draftValue,
        runOnlyIf: `{{!!variables.${snapshot}}}`
      } }]
    };
  });
  return {
    queries: [
      { name: openName, kind: "runjs", options: { code: openCode } },
      { name: prepareName, kind: "runjs", options: { code: prepareCode } }
    ],
    inputs,
    mutation_contract: {
      id: `{{queries.${prepareName}.data.id}}`,
      patch: `{{queries.${prepareName}.data.patch}}`,
      runOnlyIf: `{{queries.${prepareName}.data && queries.${prepareName}.data.changed === true}}`
    },
    wiring: [
      `Run ${openName} on Edit; open the editor only on its success. Merge the returned input properties and change events into your native layout. Never use display selectedRow fields as defaults.`,
      `Run ${prepareName} on Save; run a datasource-specific PATCH/update ONLY on its success and with mutation_contract.runOnlyIf. No change means no write. Bind the ID and patch from mutation_contract; never expand missing patch keys to null or empty strings.`,
      "Gate Save while open/prepare/write are loading. Preserve the editor on failure. Refresh affected queries and close/reset only after the actual mutation succeeds; refresh actions are not assumed to complete in order."
    ],
    limitations: [
      "Requires an already-loaded bounded raw row array and a single stable scalar ID. This generates wiring only; it does not create resources or persist data.",
      "Only text, finite number, ISO date-only and boolean fields are covered; text/number fields can opt into dropdown choices. Required/nullable/trim are explicit opt-ins; domain constraints, authorization and optimistic concurrency must be enforced separately.",
      "Dropdown option queries must already return bounded raw arrays with matching ID types and include the current value, including inactive owners when necessary. Missing options are not permission to clear stored relationships. Validate membership/authorization separately; this helper does not create or execute option queries.",
      "Draft tracks native change events, not every displayed input value. Programmatic field changes must update the draft explicitly. Browser-verify that all change events fire, including both checkbox transitions."
    ]
  };
}
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
var running = 0;
var grants = /* @__PURE__ */ new Set();
function reserveRenderAudit(grant) {
  const configured = Number(process.env.MCP_RENDER_AUDIT_MAX_BROWSERS ?? 2);
  const limit = Number.isInteger(configured) && configured >= 1 && configured <= 32 ? configured : 2;
  if (running >= limit || grant && grants.has(grant))
    return void 0;
  running++;
  if (grant)
    grants.add(grant);
  let released = false;
  return () => {
    if (released)
      return;
    released = true;
    running--;
    if (grant)
      grants.delete(grant);
  };
}
function httpUrl(value) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Render audit URLs must use HTTP(S) without embedded credentials");
  }
  return url;
}
function renderAuditOrigins(configuredBase, additional = "") {
  return /* @__PURE__ */ new Set([httpUrl(configuredBase).origin, ...additional.split(",").map((s) => s.trim()).filter(Boolean).map((s) => httpUrl(s).origin)]);
}
function renderAuditUrlAllowed(value, origins) {
  try {
    return origins.has(httpUrl(value).origin);
  } catch {
    return false;
  }
}
function renderAuditBase(configuredBase, override) {
  const origins = renderAuditOrigins(configuredBase, process.env.MCP_RENDER_AUDIT_ALLOWED_ORIGINS);
  const url = httpUrl(override ?? configuredBase);
  if (!origins.has(url.origin))
    throw new Error("viewer_url origin is not configured for render audits");
  if (url.search || url.hash)
    throw new Error("viewer_url must be a base URL without query or fragment");
  return { base: url.href.replace(/\/$/, ""), origins };
}
function hasBinding(value) {
  if (typeof value === "string")
    return value.includes("{{");
  if (Array.isArray(value))
    return value.some(hasBinding);
  return !!value && typeof value === "object" && Object.values(value).some(hasBinding);
}
function renderAuditRequest(url, method, saved) {
  if (["GET", "HEAD", "OPTIONS"].includes(method))
    return { allowed: true };
  const blocked = (detail) => ({ allowed: false, detail: `${detail}; this behavior was not verified` });
  if (method !== "POST" || !saved?.version_id)
    return blocked("A potentially mutating request was blocked");
  const parsed = httpUrl(url);
  const match = parsed.pathname.match(/\/api\/data-queries\/([A-Za-z0-9_-]+)(?:\/versions\/([A-Za-z0-9_-]+))?\/run(?:\/([A-Za-z0-9_-]+))?$/);
  if (!match || match[2] && (match[2] !== saved.version_id || !match[3] || parsed.searchParams.get("mode") !== "view") || !match[2] && match[3])
    return blocked("An unverified query or mutating request was blocked");
  const query = saved.queries.find((item) => item.id === match[1]);
  if (!query)
    return blocked("A query outside the audited app/version was blocked");
  const options = query.options;
  if (hasBinding(options))
    return blocked("A query with dynamic bindings was blocked");
  if (options?.requestConfirmation || options?.request_confirmation)
    return blocked("A query requiring confirmation was blocked");
  const read = assessQueryRead(query);
  if (!read.provenRead || !read.directSafe || read.requiresCountPreflight || read.requiresRemoteReadConfirmation || read.requiresBillableReadConfirmation) {
    return blocked("A query that is not a proven bounded read was blocked");
  }
  return { allowed: true, postData: JSON.stringify({ resolvedOptions: {} }) };
}
function auditScript() {
  const widgets = Array.from(document.querySelectorAll('[data-cy^="draggable-widget-"]'));
  const boxes = [];
  const findings = [];
  const seenNames = /* @__PURE__ */ new Set();
  const bad = /\bundefined\b|\bNaN\b|\bnull\b|Invalid date|\bTab [123]\b|Select\.\.|\\n|\[object Object\]|\{\{|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}|%%|·\s*·|[$€£]\s?\d{5,}(?![,.]\d)/;
  for (const el of widgets) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4)
      continue;
    const cy = el.getAttribute("data-cy") || "";
    const type = (el.className.toString().match(/_tooljet-([A-Za-z0-9]+)/) || [])[1] || "?";
    const name2 = `${type}:${cy.replace("draggable-widget-", "")}`;
    if (seenNames.has(cy))
      continue;
    seenNames.add(cy);
    const text = (el.innerText || "").trim();
    boxes.push({ name: name2, x: r.x, y: r.y, w: r.width, h: r.height, el });
    const textual = /^(Html|Text|Statistics|Table|Tabs|Listview|Kanban|KeyValuePair|Timeline|Steps):/.test(name2);
    const emptyStateByName = /empty|placeholder|no_?data|nothing/i.test(cy);
    if (textual && text.length === 0 && r.height > 30 && !emptyStateByName) {
      findings.push({ kind: "empty_render", component: name2, detail: `${Math.round(r.width)}x${Math.round(r.height)}px box renders no text (a multi-line binding or a broken expression)` });
    }
    const m = text.match(bad);
    if (m)
      findings.push({ kind: "placeholder_text", component: name2, detail: `rendered text contains "${m[0]}"` });
    let clippedHere = false;
    for (const node of [el, ...Array.from(el.querySelectorAll("*"))]) {
      const cs = getComputedStyle(node);
      const hidden = cs.overflow === "hidden" || cs.overflowY === "hidden" || cs.overflowX === "hidden";
      if (!hidden || (node.innerText || "").trim().length === 0)
        continue;
      if (node.scrollHeight > node.clientHeight + 6 && node.clientHeight > 12) {
        findings.push({ kind: "clipped", component: name2, detail: `"${(node.innerText || "").trim().slice(0, 40)}" needs ${node.scrollHeight}px but has ${node.clientHeight}px` });
        clippedHere = true;
        break;
      }
    }
    if (!clippedHere && !/^(Table|Listview|Kanban|Container|Form|Tabs):/.test(name2)) {
      const leaves = Array.from(el.querySelectorAll("*")).filter((n) => n.children.length === 0 && (n.textContent || "").trim());
      const overflow = Math.max(0, ...leaves.map((n) => n.getBoundingClientRect().bottom)) - (r.top + r.height);
      if (overflow > 4) {
        findings.push({ kind: "clipped", component: name2, detail: `text runs ${Math.round(overflow)}px past the widget's bottom edge; the widget needs ${Math.round(r.height + overflow)}px` });
        clippedHere = true;
      }
    }
    if (/^Chart:/.test(name2)) {
      const tick = el.querySelector(".xtick text, .ytick text, .legendtext");
      const family = tick ? getComputedStyle(tick).fontFamily.toLowerCase() : "";
      if (family.includes("open sans") || family.includes("verdana")) {
        findings.push({ kind: "placeholder_text", component: name2, detail: "chart uses Plotly default styling (Open Sans/Verdana labels); draw it with plotFromJson and the house layout" });
      }
      const traces = el.querySelectorAll(".trace, .bars path, .slice, .scatterlayer path, .heatmaplayer image").length;
      if (el.querySelector(".js-plotly-plot, .plot-container") && traces === 0) {
        findings.push({ kind: "empty_render", component: name2, detail: "chart has axes but no data trace; the query feeding it returned the wrong shape (a chart needs {data:[...], layout:{...}})" });
      }
      const slices = Array.from(el.querySelectorAll(".slice path, .pie path"));
      const fills = new Set(slices.map((n) => (n.getAttribute("style") || "").match(/fill:\s*([^;]+)/)?.[1] ?? n.getAttribute("fill") ?? "").filter(Boolean));
      if (fills.has("rgb(31, 119, 180)") && fills.has("rgb(255, 127, 14)")) {
        findings.push({ kind: "placeholder_text", component: name2, detail: "pie chart uses Plotly default rainbow colours; use the theme series palette" });
      }
      const drag = el.querySelector(".nsewdrag");
      const dr = drag ? drag.getBoundingClientRect() : null;
      if (dr) {
        const cutLabels = Array.from(el.querySelectorAll(".bartext")).filter((t) => {
          const tr = t.getBoundingClientRect();
          if (tr.top >= dr.top - 1 && tr.right <= dr.right + 1)
            return false;
          let n = t.parentElement;
          while (n && n !== el) {
            if (n.getAttribute("clip-path"))
              return true;
            n = n.parentElement;
          }
          return false;
        });
        if (cutLabels.length)
          findings.push({ kind: "clipped", component: name2, detail: `${cutLabels.length} bar value label(s) are cut by the plot area (e.g. "${(cutLabels[0].textContent || "").trim()}"); set cliponaxis:false on the bar trace` });
      }
      const plotEl = el.querySelector(".js-plotly-plot");
      for (const trace of plotEl?.data ?? []) {
        if ((trace.type ?? "scatter") !== "bar" || !Array.isArray(trace.x))
          continue;
        const seen = /* @__PURE__ */ new Set();
        const dup = trace.x.map(String).find((v) => seen.has(v) ? true : (seen.add(v), false));
        if (dup !== void 0) {
          findings.push({ kind: "placeholder_text", component: name2, detail: `category "${dup}" appears more than once in a bar trace, so its bars stack and read as one taller bar; aggregate the rows per category in the query` });
          break;
        }
      }
      if (dr && r.height > 120 && dr.height < r.height * 0.55)
        findings.push({ kind: "clipped", component: name2, detail: `plot area is ${Math.round(dr.height)}px of a ${Math.round(r.height)}px chart (styles.padding is the Plotly margin on every side; set it to 16)` });
      const rawLabels = Array.from(el.querySelectorAll(".bartext")).filter((t) => /^\d{5,}(\.\d+)?$/.test((t.textContent || "").trim()));
      if (rawLabels.length)
        findings.push({ kind: "placeholder_text", component: name2, detail: `bar value labels are unformatted numbers (e.g. "${(rawLabels[0].textContent || "").trim()}"); format them with toLocaleString and the unit` });
      const ticks = Array.from(el.querySelectorAll(".xaxislayer-above .xtick text, .xtick text"));
      const runOff = ticks.filter((t) => t.getBoundingClientRect().bottom > r.bottom - 2);
      if (runOff.length)
        findings.push({ kind: "clipped", component: name2, detail: `${runOff.length} category label(s) run off the bottom of the chart (e.g. "${(runOff[0].textContent || "").trim().slice(0, 30)}"); shorten the categories or draw horizontal bars (orientation 'h')` });
    }
    if (!clippedHere && /^Table:/.test(name2)) {
      const cut = [];
      for (const cell of Array.from(el.querySelectorAll('td, [role="cell"], .td'))) {
        const text2 = (cell.innerText || "").trim();
        if (!text2)
          continue;
        const cellRect = cell.getBoundingClientRect();
        const spill = Array.from(cell.querySelectorAll("*")).find((node) => {
          if (!(node.innerText || "").trim() || node.children.length > 0)
            return false;
          const nr = node.getBoundingClientRect();
          return nr.width > 0 && (nr.right > cellRect.right + 2 || nr.left < cellRect.left - 2);
        });
        if (spill) {
          cut.push(text2.slice(0, 24));
          if (cut.length >= 3)
            break;
          continue;
        }
        for (const node of [cell, ...Array.from(cell.querySelectorAll("*"))]) {
          const cs = getComputedStyle(node);
          if ((cs.overflow === "hidden" || cs.overflowX === "hidden") && cs.textOverflow !== "ellipsis" && node.scrollWidth > node.clientWidth + 4 && node.clientWidth > 20) {
            cut.push(text2.slice(0, 24));
            break;
          }
        }
        if (cut.length >= 3)
          break;
      }
      if (cut.length)
        findings.push({ kind: "clipped", component: name2, detail: `${cut.length}+ cells cut mid value (e.g. "${cut[0]}"); widen the column with columnSize or shorten the value` });
      const rawHeaders = Array.from(el.querySelectorAll('th, [role="columnheader"], .th')).map((h) => (h.innerText || "").trim()).filter((text2) => /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(text2));
      if (rawHeaders.length)
        findings.push({ kind: "placeholder_text", component: name2, detail: `${rawHeaders.length} column header(s) are raw field names (e.g. "${rawHeaders[0]}"); author the columns with readable names instead of letting ToolJet generate them` });
      const scroller = Array.from(el.querySelectorAll("*")).find((node) => node.scrollWidth > node.clientWidth + 12 && node.clientWidth > 200 && /table/i.test(node.className.toString()));
      if (scroller)
        findings.push({ kind: "clipped", component: name2, detail: `columns overflow the table by ${scroller.scrollWidth - scroller.clientWidth}px to the right (the columnSize values exceed the table width); show fewer columns or shrink them` });
      const body = el.querySelector('.table-responsive, .tbody, tbody, [class*="table-body"]');
      const rows = body ? Array.from(body.querySelectorAll('tr, [role="row"], .tr')) : [];
      if (body && rows.length) {
        const bodyBottom = body.getBoundingClientRect().bottom;
        const sliced = rows.filter((row) => {
          const rr = row.getBoundingClientRect();
          return rr.top < bodyBottom - 4 && rr.bottom > bodyBottom + 6 && (row.innerText || "").trim().length > 0;
        });
        if (sliced.length)
          findings.push({ kind: "clipped", component: name2, detail: `a row is sliced by the table's bottom edge; size the table to whole rows (header 40 + rows x row height + footer) or enable pagination` });
      }
    }
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.name.startsWith("ModalV2:") || b.name.startsWith("ModalV2:"))
        continue;
      if (a.name.split(":")[1] === b.name.split(":")[1])
        continue;
      if (a.el.contains(b.el) || b.el.contains(a.el))
        continue;
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 8 && iy > 8)
        findings.push({ kind: "overlap", component: `${a.name} and ${b.name}`, detail: `${Math.round(ix)}x${Math.round(iy)}px shared; move one` });
    }
  }
  return { widgets: widgets.length, findings: findings.slice(0, 60) };
}
async function loadPlaywright() {
  const explicit = process.env.MCP_RENDER_AUDIT_PLAYWRIGHT;
  if (explicit) {
    try {
      const { pathToFileURL } = await import("node:url");
      const { createRequire: createRequire2 } = await import("node:module");
      const req = createRequire2(pathToFileURL(explicit.replace(/\/?$/, "/")).href);
      return req(explicit);
    } catch {
    }
  }
  try {
    const specifier = "playwright-core";
    return await import(specifier);
  } catch {
    return null;
  }
}
var pathOf = (url) => {
  try {
    return new URL(url).pathname;
  } catch {
    return "?";
  }
};
async function auditPages(pages, options = {}, driver = loadPlaywright) {
  const unreachable = (p, reason, detail) => ({ ...p, widgets: 0, findings: [{ kind: "unreachable", component: "-", reason, detail }] });
  if (!pages.length)
    return [];
  const origins = options.allowedOrigins ?? renderAuditOrigins(pages[0].url);
  if (pages.some((p) => !renderAuditUrlAllowed(p.url, origins))) {
    return pages.map((p) => unreachable(p, "blocked_destination", "The requested viewer is outside the configured render-audit origins"));
  }
  const pw = await driver();
  if (!pw) {
    return pages.map((p) => unreachable(p, "browser_unavailable", "playwright-core is not installed on the MCP host; the render audit cannot run"));
  }
  const launch = {
    headless: true,
    chromiumSandbox: true,
    args: ["--force-webrtc-ip-handling-policy=disable_non_proxied_udp"]
  };
  if (options.executablePath)
    launch.executablePath = options.executablePath;
  else
    launch.channel = options.channel ?? "chrome";
  let browser;
  try {
    browser = await pw.chromium.launch(launch);
  } catch {
    return pages.map((p) => unreachable(p, "browser_unavailable", "Chrome could not start on the MCP host; check the configured executable/channel"));
  }
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 4, pages.length || 1));
  const reports = new Array(pages.length);
  const auditOne = async (index) => {
    const p = pages[index];
    let ctx;
    let blocked;
    const blocks = [];
    const block = (finding, where) => {
      blocked ??= finding;
      const line = `${finding.reason}: ${where}`;
      if (blocks.length < 4 && !blocks.includes(line))
        blocks.push(line);
    };
    try {
      ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, serviceWorkers: "block" });
      if (!ctx.routeWebSocket) {
        reports[index] = unreachable(p, "browser_unavailable", "The render audit requires Playwright 1.48+ for WebSocket interception");
        return;
      }
      if (options.session) {
        if (typeof options.session === "string") {
          await ctx.addCookies([{ name: "tj_auth_token", value: options.session, url: new URL(p.url).origin }]);
        } else {
          if (new URL(p.url).origin !== options.session.origin || options.session.expiresAt <= Date.now() / 1e3) {
            reports[index] = unreachable(p, "auth_required", "The scoped viewer credential does not authorize this page origin or has expired");
            return;
          }
          await ctx.addCookies([{
            name: "tj_oauth_viewer",
            value: options.session.token,
            url: options.session.origin,
            httpOnly: true,
            secure: options.session.origin.startsWith("https:"),
            sameSite: "Lax",
            expires: options.session.expiresAt
          }]);
        }
      }
      await ctx.routeWebSocket("**/*", (socket) => {
        block({ kind: "unreachable", component: "-", reason: "blocked_destination", detail: "A WebSocket dependency was blocked; live behavior was not verified" }, `WebSocket ${pathOf(socket.url?.() ?? "")}`);
        socket.close();
      });
      await ctx.route("**/*", async (route) => {
        const request = route.request();
        const url = request.url();
        if (!renderAuditUrlAllowed(url, origins)) {
          block({ kind: "unreachable", component: "-", reason: "blocked_destination", detail: "A navigation or resource outside the configured audit origins was blocked" }, `${request.method()} ${new URL(url).origin}`);
          await route.abort();
          return;
        }
        try {
          const policy = renderAuditRequest(url, request.method(), options.savedQueries);
          if (!policy.allowed) {
            block({
              kind: "unreachable",
              component: "-",
              reason: "blocked_execution",
              detail: `${policy.detail} (${request.method()} ${pathOf(url)})`
            }, `${request.method()} ${pathOf(url)}`);
            await route.abort();
            return;
          }
          const response2 = await route.fetch({
            maxRedirects: 0,
            maxRetries: 0,
            timeout: 3e4,
            ...policy.postData === void 0 ? {} : { postData: policy.postData }
          });
          try {
            if (response2.status() >= 300 && response2.status() < 400 && response2.headers().location) {
              const dest = new URL(response2.headers().location, url);
              const signIn = renderAuditUrlAllowed(dest.href, origins) && /\/(?:login|sign-in|signin)\b/i.test(dest.pathname);
              block({
                kind: "unreachable",
                component: "-",
                reason: signIn ? "auth_required" : "redirect_blocked",
                detail: signIn ? "The viewer requires sign-in; private app rendering was not verified" : "An HTTP redirect was blocked. Configure the canonical viewer/resource URL and its trusted origin"
              }, `${request.method()} ${pathOf(url)} redirected`);
              await route.abort();
            } else
              await route.fulfill({ response: response2 });
          } finally {
            await response2.dispose();
          }
        } catch {
          block({ kind: "unreachable", component: "-", reason: "navigation_failed", detail: "A viewer resource could not be loaded; the audit is incomplete" }, `${request.method()} ${pathOf(url)}`);
          await route.abort().catch(() => {
          });
        }
      });
      const page = await ctx.newPage();
      const response = await page.goto(p.url, { waitUntil: "domcontentloaded", timeout: 6e4 });
      if (response && response.status() >= 400) {
        const status = response.status();
        reports[index] = unreachable(p, [401, 403].includes(status) ? "auth_required" : "navigation_failed", "Viewer returned HTTP " + status);
        return;
      }
      await page.waitForTimeout(options.settleMs ?? 6e3);
      await page.waitForFunction(() => {
        const charts = document.querySelectorAll('[data-cy^="draggable-widget-"]._tooljet-Chart').length;
        const plots = document.querySelectorAll('[data-cy^="draggable-widget-"]._tooljet-Chart .js-plotly-plot').length;
        return charts === 0 || plots >= charts;
      }, void 0, { timeout: options.chartWaitMs ?? 2e4 }).catch(() => void 0);
      await page.waitForTimeout(1500);
      const landed = page.url();
      if (/\/(?:login|sign-in|signin)\b/i.test(new URL(landed).pathname)) {
        reports[index] = unreachable(p, "auth_required", "The viewer requires sign-in; private app rendering was not verified");
        return;
      }
      const result = await page.evaluate(auditScript);
      reports[index] = result.widgets === 0 && blocked ? { page: p.page, url: p.url, widgets: 0, findings: [{ ...blocked, detail: `${blocked.detail}; the page then showed no widgets. Blocked: ${blocks.join("; ")}` }] } : result.widgets === 0 ? unreachable(p, "no_widgets", "No ToolJet widgets were found; the page may be empty, unauthenticated, or not loaded") : { page: p.page, url: p.url, widgets: result.widgets, findings: [...result.findings, ...blocked ? [blocked] : []] };
    } catch (err) {
      const why = String(err?.message ?? err).split("\n")[0].slice(0, 200);
      reports[index] = blocked ? { ...p, widgets: 0, findings: [{ ...blocked, detail: `${blocked.detail}; the audit then stopped: ${why}. Blocked: ${blocks.join("; ")}` }] } : unreachable(p, "navigation_failed", `Could not load or inspect the viewer page: ${why}`);
    } finally {
      await ctx?.close().catch(() => {
      });
    }
  };
  try {
    let next = 0;
    const workers = Array.from({ length: concurrency }, async () => {
      while (next < pages.length) {
        const index = next++;
        await auditOne(index);
      }
    });
    await Promise.all(workers);
  } finally {
    await browser.close();
  }
  return reports;
}
function verifyPageRenderTool(client, viewerBase, driver = loadPlaywright) {
  return {
    name: "verify_page_render",
    title: "Verify Page Render",
    annotations: { readOnlyHint: true, openWorldHint: true },
    description: `Render audit of one page or every page of an app in a headless browser at 1600x900, after the app is built. Reports what lint cannot see: Html/Text widgets that render empty (a multi-line binding, a broken expression), placeholder text a customer would read as a bug ("undefined", "NaN", "Invalid date", "Tab 1", "Select..", a literal \\n), text clipped inside its box, and components overlapping each other. Run it once per page before the handoff and review every finding; report unverified behavior explicitly. Opens the version being edited with the builder's ToolJet session, or a separate app-scoped OAuth viewer credential (limited to the viewer origin), so a private app is audited without being made public. Only saved, static, bounded read queries may run; writes, dynamic queries and queries requiring confirmation are blocked and reported as unverified. Returns { pages: [{ page, url, widgets, findings: [{ kind, component, detail }] }], ok }.`,
    inputSchema: {
      app_id: external_exports.string().regex(/^[A-Za-z0-9_-]+$/),
      page_handle: external_exports.string().optional().describe("one page handle; omit to audit every page"),
      viewer_url: external_exports.string().optional().describe("canonical viewer base URL; alternate origins require host configuration in MCP_RENDER_AUDIT_ALLOWED_ORIGINS")
    },
    async handler(args) {
      const release = reserveRenderAudit(client.renderAuditGrant);
      if (!release)
        return fail(new Error("Render verification is busy; rendering remains unverified. Retry shortly."));
      try {
        if (!/^[A-Za-z0-9_-]+$/.test(args.app_id))
          return fail(new Error("Invalid app id"));
        const { base, origins } = renderAuditBase(viewerBase(), args.viewer_url);
        if (client.browserRenderOrigin && new URL(base).origin !== client.browserRenderOrigin) {
          return fail(new Error("OAuth render verification must use the configured ToolJet deployment origin"));
        }
        const summary = await client.getAppSummary(args.app_id);
        const pages = summary.pages ?? [];
        const version = await client.editingVersionName?.(args.app_id).catch(() => void 0);
        const preview = version ? `?env=development&version=${encodeURIComponent(version)}` : "";
        const targets = pages.filter((p) => !args.page_handle || p.handle === args.page_handle).map((p) => ({ page: p.handle ?? p.name ?? "home", url: `${base}/applications/${args.app_id}/${encodeURIComponent(p.handle ?? "home")}${preview}` }));
        if (!targets.length)
          return fail(new Error(`no page ${args.page_handle ?? ""} in app ${args.app_id}`));
        if (summary.queries?.length) {
          if (!summary.version_id)
            return fail(new Error("Cannot verify datasource eligibility without an app version."));
          if (summary.queries.some((query) => !query.data_source_id)) {
            return fail(new Error("Cannot verify an app query datasource; refusing browser verification."));
          }
          await client.listDatasources(summary.version_id);
          await Promise.all([...new Set(summary.queries.map((query) => query.data_source_id))].map((id) => client.assertDatasourceAllowed(id, summary.version_id)));
        }
        const options = {
          channel: process.env.MCP_RENDER_AUDIT_CHANNEL || "chrome",
          executablePath: process.env.MCP_RENDER_AUDIT_CHROME || void 0,
          allowedOrigins: origins,
          savedQueries: summary,
          // MCP_RENDER_AUDIT_SESSION=off keeps the browser unauthenticated (private apps are then reported unverified).
          session: process.env.MCP_RENDER_AUDIT_SESSION === "off" ? void 0 : client.browserRenderOrigin ? await client.viewerSession?.(args.app_id) : await client.viewerSession?.(args.app_id).catch(() => void 0)
        };
        const reports = await auditPages(targets, options, driver);
        const total = reports.reduce((n, r) => n + r.findings.length, 0);
        return ok({ pages: reports, ok: total === 0, findings: total });
      } catch (err) {
        return fail(err);
      } finally {
        release();
      }
    }
  };
}
export {
  emptyViewerOnlyParams as A,
  emptyParamsNote as B,
  unresolvedNote as C,
  verifyPageRenderTool as D,
  capabilityRequestSchema as E,
  getWorkflowCapabilities as F,
  lint as G,
  apply as H,
  deleteNode as I,
  editContractSchema as J,
  generateEditContract as K,
  LARGE_READ_ROW_THRESHOLD as L,
  TableQuotaError as T,
  getCatalog as a,
  getLegacyComponentReplacement as b,
  parse as c,
  bindingSpans as d,
  assertPersistableQueryToggles as e,
  assertWorkflowQueryOptions as f,
  getComponentSchema as g,
  fail as h,
  normalizeQueryToggles as i,
  toggleRewriteWarning as j,
  issueMessages as k,
  lintBindingNames as l,
  normalizeQueryOptions as m,
  normalizeWorkflowQueryOptions as n,
  ok as o,
  parseExpression as p,
  queryToggleIssues as q,
  arithmeticWriteWarning as r,
  assessQueryRead as s,
  tableQuotaError as t,
  resolveStaticBindings as u,
  validateQueryOptions as v,
  workflowMappingMatches as w,
  resolvedReadRefusal as x,
  sameReadSource as y,
  extractRowCount as z
};
