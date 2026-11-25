import { createRequire } from "node:module";
import { N as NodeProp, E as ExternalTokenizer, L as LRParser, C as ContextTracker } from "./chunk-CsK43dbw.js";
import { a as assessQueryRead, L as LARGE_READ_ROW_THRESHOLD } from "./chunk-ZM2Fbxze.js";
import { p as parseExpression, a as parse } from "./chunk-tj2BrYhx.js";
import { h as hubspotQueryIssues, a as apiEndpointQueryIssues, g as getDatasourceQuerySchema, s as singleSpecRef, C as COMMON_QUERY_OPTION_FIELDS, S as SPEC_DISCOVERY_NOTE } from "./chunk-eKcwgb7t.js";
createRequire(import.meta.url);
var nextTagID = 0;
var Tag = class _Tag {
  /**
  @internal
  */
  constructor(name2, set, base, modified) {
    this.name = name2;
    this.set = set;
    this.base = base;
    this.modified = modified;
    this.id = nextTagID++;
  }
  toString() {
    let { name: name2 } = this;
    for (let mod of this.modified)
      if (mod.name)
        name2 = `${mod.name}(${name2})`;
    return name2;
  }
  static define(nameOrParent, parent) {
    let name2 = typeof nameOrParent == "string" ? nameOrParent : "?";
    if (nameOrParent instanceof _Tag)
      parent = nameOrParent;
    if (parent === null || parent === void 0 ? void 0 : parent.base)
      throw new Error("Can not derive from a modified tag");
    let tag = new _Tag(name2, [], null, []);
    tag.set.push(tag);
    if (parent)
      for (let t2 of parent.set)
        tag.set.push(t2);
    return tag;
  }
  /**
  Define a tag _modifier_, which is a function that, given a tag,
  will return a tag that is a subtag of the original. Applying the
  same modifier to a twice tag will return the same value (`m1(t1)
  == m1(t1)`) and applying multiple modifiers will, regardless or
  order, produce the same tag (`m1(m2(t1)) == m2(m1(t1))`).
  
  When multiple modifiers are applied to a given base tag, each
  smaller set of modifiers is registered as a parent, so that for
  example `m1(m2(m3(t1)))` is a subtype of `m1(m2(t1))`,
  `m1(m3(t1)`, and so on.
  */
  static defineModifier(name2) {
    let mod = new Modifier(name2);
    return (tag) => {
      if (tag.modified.indexOf(mod) > -1)
        return tag;
      return Modifier.get(tag.base || tag, tag.modified.concat(mod).sort((a, b) => a.id - b.id));
    };
  }
};
var nextModifierID = 0;
var Modifier = class _Modifier {
  constructor(name2) {
    this.name = name2;
    this.instances = [];
    this.id = nextModifierID++;
  }
  static get(base, mods) {
    if (!mods.length)
      return base;
    let exists = mods[0].instances.find((t2) => t2.base == base && sameArray(mods, t2.modified));
    if (exists)
      return exists;
    let set = [], tag = new Tag(base.name, set, base, mods);
    for (let m of mods)
      m.instances.push(tag);
    let configs = powerSet(mods);
    for (let parent of base.set)
      if (!parent.modified.length)
        for (let config of configs)
          set.push(_Modifier.get(parent, config));
    return tag;
  }
};
function sameArray(a, b) {
  return a.length == b.length && a.every((x, i) => x == b[i]);
}
function powerSet(array) {
  let sets = [[]];
  for (let i = 0; i < array.length; i++) {
    for (let j = 0, e = sets.length; j < e; j++) {
      sets.push(sets[j].concat(array[i]));
    }
  }
  return sets.sort((a, b) => b.length - a.length);
}
function styleTags(spec) {
  let byName = /* @__PURE__ */ Object.create(null);
  for (let prop in spec) {
    let tags2 = spec[prop];
    if (!Array.isArray(tags2))
      tags2 = [tags2];
    for (let part of prop.split(" "))
      if (part) {
        let pieces = [], mode = 2, rest = part;
        for (let pos = 0; ; ) {
          if (rest == "..." && pos > 0 && pos + 3 == part.length) {
            mode = 1;
            break;
          }
          let m = /^"(?:[^"\\]|\\.)*?"|[^\/!]+/.exec(rest);
          if (!m)
            throw new RangeError("Invalid path: " + part);
          pieces.push(m[0] == "*" ? "" : m[0][0] == '"' ? JSON.parse(m[0]) : m[0]);
          pos += m[0].length;
          if (pos == part.length)
            break;
          let next = part[pos++];
          if (pos == part.length && next == "!") {
            mode = 0;
            break;
          }
          if (next != "/")
            throw new RangeError("Invalid path: " + part);
          rest = part.slice(pos);
        }
        let last = pieces.length - 1, inner = pieces[last];
        if (!inner)
          throw new RangeError("Invalid path: " + part);
        let rule = new Rule(tags2, mode, last > 0 ? pieces.slice(0, last) : null);
        byName[inner] = rule.sort(byName[inner]);
      }
  }
  return ruleNodeProp.add(byName);
}
var ruleNodeProp = new NodeProp({
  combine(a, b) {
    let cur, root, take;
    while (a || b) {
      if (!a || b && a.depth <= b.depth) {
        take = b;
        b = b.next;
      } else {
        take = a;
        a = a.next;
      }
      if (cur && cur.mode == take.mode && !take.context && !cur.context)
        continue;
      let copy = new Rule(take.tags, take.mode, take.context);
      if (cur)
        cur.next = copy;
      else
        root = copy;
      cur = copy;
    }
    return root;
  }
});
var Rule = class {
  constructor(tags2, mode, context, next) {
    this.tags = tags2;
    this.mode = mode;
    this.context = context;
    this.next = next;
  }
  get opaque() {
    return this.mode == 0;
  }
  get inherit() {
    return this.mode == 1;
  }
  sort(other) {
    if (!other || other.depth < this.depth) {
      this.next = other;
      return this;
    }
    other.next = this.sort(other.next);
    return other;
  }
  get depth() {
    return this.context ? this.context.length : 0;
  }
};
Rule.empty = new Rule([], 2, null);
function tagHighlighter(tags2, options) {
  let map = /* @__PURE__ */ Object.create(null);
  for (let style of tags2) {
    if (!Array.isArray(style.tag))
      map[style.tag.id] = style.class;
    else
      for (let tag of style.tag)
        map[tag.id] = style.class;
  }
  let { scope, all = null } = {};
  return {
    style: (tags3) => {
      let cls = all;
      for (let tag of tags3) {
        for (let sub of tag.set) {
          let tagClass = map[sub.id];
          if (tagClass) {
            cls = cls ? cls + " " + tagClass : tagClass;
            break;
          }
        }
      }
      return cls;
    },
    scope
  };
}
var t = Tag.define;
var comment = t();
var name = t();
var typeName = t(name);
var propertyName = t(name);
var literal = t();
var string = t(literal);
var number = t(literal);
var content = t();
var heading = t(content);
var keyword = t();
var operator = t();
var punctuation = t();
var bracket = t(punctuation);
var meta = t();
var tags = {
  /**
  A comment.
  */
  comment,
  /**
  A line [comment](#highlight.tags.comment).
  */
  lineComment: t(comment),
  /**
  A block [comment](#highlight.tags.comment).
  */
  blockComment: t(comment),
  /**
  A documentation [comment](#highlight.tags.comment).
  */
  docComment: t(comment),
  /**
  Any kind of identifier.
  */
  name,
  /**
  The [name](#highlight.tags.name) of a variable.
  */
  variableName: t(name),
  /**
  A type [name](#highlight.tags.name).
  */
  typeName,
  /**
  A tag name (subtag of [`typeName`](#highlight.tags.typeName)).
  */
  tagName: t(typeName),
  /**
  A property or field [name](#highlight.tags.name).
  */
  propertyName,
  /**
  An attribute name (subtag of [`propertyName`](#highlight.tags.propertyName)).
  */
  attributeName: t(propertyName),
  /**
  The [name](#highlight.tags.name) of a class.
  */
  className: t(name),
  /**
  A label [name](#highlight.tags.name).
  */
  labelName: t(name),
  /**
  A namespace [name](#highlight.tags.name).
  */
  namespace: t(name),
  /**
  The [name](#highlight.tags.name) of a macro.
  */
  macroName: t(name),
  /**
  A literal value.
  */
  literal,
  /**
  A string [literal](#highlight.tags.literal).
  */
  string,
  /**
  A documentation [string](#highlight.tags.string).
  */
  docString: t(string),
  /**
  A character literal (subtag of [string](#highlight.tags.string)).
  */
  character: t(string),
  /**
  An attribute value (subtag of [string](#highlight.tags.string)).
  */
  attributeValue: t(string),
  /**
  A number [literal](#highlight.tags.literal).
  */
  number,
  /**
  An integer [number](#highlight.tags.number) literal.
  */
  integer: t(number),
  /**
  A floating-point [number](#highlight.tags.number) literal.
  */
  float: t(number),
  /**
  A boolean [literal](#highlight.tags.literal).
  */
  bool: t(literal),
  /**
  Regular expression [literal](#highlight.tags.literal).
  */
  regexp: t(literal),
  /**
  An escape [literal](#highlight.tags.literal), for example a
  backslash escape in a string.
  */
  escape: t(literal),
  /**
  A color [literal](#highlight.tags.literal).
  */
  color: t(literal),
  /**
  A URL [literal](#highlight.tags.literal).
  */
  url: t(literal),
  /**
  A language keyword.
  */
  keyword,
  /**
  The [keyword](#highlight.tags.keyword) for the self or this
  object.
  */
  self: t(keyword),
  /**
  The [keyword](#highlight.tags.keyword) for null.
  */
  null: t(keyword),
  /**
  A [keyword](#highlight.tags.keyword) denoting some atomic value.
  */
  atom: t(keyword),
  /**
  A [keyword](#highlight.tags.keyword) that represents a unit.
  */
  unit: t(keyword),
  /**
  A modifier [keyword](#highlight.tags.keyword).
  */
  modifier: t(keyword),
  /**
  A [keyword](#highlight.tags.keyword) that acts as an operator.
  */
  operatorKeyword: t(keyword),
  /**
  A control-flow related [keyword](#highlight.tags.keyword).
  */
  controlKeyword: t(keyword),
  /**
  A [keyword](#highlight.tags.keyword) that defines something.
  */
  definitionKeyword: t(keyword),
  /**
  A [keyword](#highlight.tags.keyword) related to defining or
  interfacing with modules.
  */
  moduleKeyword: t(keyword),
  /**
  An operator.
  */
  operator,
  /**
  An [operator](#highlight.tags.operator) that dereferences something.
  */
  derefOperator: t(operator),
  /**
  Arithmetic-related [operator](#highlight.tags.operator).
  */
  arithmeticOperator: t(operator),
  /**
  Logical [operator](#highlight.tags.operator).
  */
  logicOperator: t(operator),
  /**
  Bit [operator](#highlight.tags.operator).
  */
  bitwiseOperator: t(operator),
  /**
  Comparison [operator](#highlight.tags.operator).
  */
  compareOperator: t(operator),
  /**
  [Operator](#highlight.tags.operator) that updates its operand.
  */
  updateOperator: t(operator),
  /**
  [Operator](#highlight.tags.operator) that defines something.
  */
  definitionOperator: t(operator),
  /**
  Type-related [operator](#highlight.tags.operator).
  */
  typeOperator: t(operator),
  /**
  Control-flow [operator](#highlight.tags.operator).
  */
  controlOperator: t(operator),
  /**
  Program or markup punctuation.
  */
  punctuation,
  /**
  [Punctuation](#highlight.tags.punctuation) that separates
  things.
  */
  separator: t(punctuation),
  /**
  Bracket-style [punctuation](#highlight.tags.punctuation).
  */
  bracket,
  /**
  Angle [brackets](#highlight.tags.bracket) (usually `<` and `>`
  tokens).
  */
  angleBracket: t(bracket),
  /**
  Square [brackets](#highlight.tags.bracket) (usually `[` and `]`
  tokens).
  */
  squareBracket: t(bracket),
  /**
  Parentheses (usually `(` and `)` tokens). Subtag of
  [bracket](#highlight.tags.bracket).
  */
  paren: t(bracket),
  /**
  Braces (usually `{` and `}` tokens). Subtag of
  [bracket](#highlight.tags.bracket).
  */
  brace: t(bracket),
  /**
  Content, for example plain text in XML or markup documents.
  */
  content,
  /**
  [Content](#highlight.tags.content) that represents a heading.
  */
  heading,
  /**
  A level 1 [heading](#highlight.tags.heading).
  */
  heading1: t(heading),
  /**
  A level 2 [heading](#highlight.tags.heading).
  */
  heading2: t(heading),
  /**
  A level 3 [heading](#highlight.tags.heading).
  */
  heading3: t(heading),
  /**
  A level 4 [heading](#highlight.tags.heading).
  */
  heading4: t(heading),
  /**
  A level 5 [heading](#highlight.tags.heading).
  */
  heading5: t(heading),
  /**
  A level 6 [heading](#highlight.tags.heading).
  */
  heading6: t(heading),
  /**
  A prose [content](#highlight.tags.content) separator (such as a horizontal rule).
  */
  contentSeparator: t(content),
  /**
  [Content](#highlight.tags.content) that represents a list.
  */
  list: t(content),
  /**
  [Content](#highlight.tags.content) that represents a quote.
  */
  quote: t(content),
  /**
  [Content](#highlight.tags.content) that is emphasized.
  */
  emphasis: t(content),
  /**
  [Content](#highlight.tags.content) that is styled strong.
  */
  strong: t(content),
  /**
  [Content](#highlight.tags.content) that is part of a link.
  */
  link: t(content),
  /**
  [Content](#highlight.tags.content) that is styled as code or
  monospace.
  */
  monospace: t(content),
  /**
  [Content](#highlight.tags.content) that has a strike-through
  style.
  */
  strikethrough: t(content),
  /**
  Inserted text in a change-tracking format.
  */
  inserted: t(),
  /**
  Deleted text.
  */
  deleted: t(),
  /**
  Changed text.
  */
  changed: t(),
  /**
  An invalid or unsyntactic element.
  */
  invalid: t(),
  /**
  Metadata or meta-instruction.
  */
  meta,
  /**
  [Metadata](#highlight.tags.meta) that applies to the entire
  document.
  */
  documentMeta: t(meta),
  /**
  [Metadata](#highlight.tags.meta) that annotates or adds
  attributes to a given syntactic element.
  */
  annotation: t(meta),
  /**
  Processing instruction or preprocessor directive. Subtag of
  [meta](#highlight.tags.meta).
  */
  processingInstruction: t(meta),
  /**
  [Modifier](#highlight.Tag^defineModifier) that indicates that a
  given element is being defined. Expected to be used with the
  various [name](#highlight.tags.name) tags.
  */
  definition: Tag.defineModifier("definition"),
  /**
  [Modifier](#highlight.Tag^defineModifier) that indicates that
  something is constant. Mostly expected to be used with
  [variable names](#highlight.tags.variableName).
  */
  constant: Tag.defineModifier("constant"),
  /**
  [Modifier](#highlight.Tag^defineModifier) used to indicate that
  a [variable](#highlight.tags.variableName) or [property
  name](#highlight.tags.propertyName) is being called or defined
  as a function.
  */
  function: Tag.defineModifier("function"),
  /**
  [Modifier](#highlight.Tag^defineModifier) that can be applied to
  [names](#highlight.tags.name) to indicate that they belong to
  the language's standard environment.
  */
  standard: Tag.defineModifier("standard"),
  /**
  [Modifier](#highlight.Tag^defineModifier) that indicates a given
  [names](#highlight.tags.name) is local to some scope.
  */
  local: Tag.defineModifier("local"),
  /**
  A generic variant [modifier](#highlight.Tag^defineModifier) that
  can be used to tag language-specific alternative variants of
  some common tag. It is recommended for themes to define special
  forms of at least the [string](#highlight.tags.string) and
  [variable name](#highlight.tags.variableName) tags, since those
  come up a lot.
  */
  special: Tag.defineModifier("special")
};
for (let name2 in tags) {
  let val = tags[name2];
  if (val instanceof Tag)
    val.name = name2;
}
tagHighlighter([
  { tag: tags.link, class: "tok-link" },
  { tag: tags.heading, class: "tok-heading" },
  { tag: tags.emphasis, class: "tok-emphasis" },
  { tag: tags.strong, class: "tok-strong" },
  { tag: tags.keyword, class: "tok-keyword" },
  { tag: tags.atom, class: "tok-atom" },
  { tag: tags.bool, class: "tok-bool" },
  { tag: tags.url, class: "tok-url" },
  { tag: tags.labelName, class: "tok-labelName" },
  { tag: tags.inserted, class: "tok-inserted" },
  { tag: tags.deleted, class: "tok-deleted" },
  { tag: tags.literal, class: "tok-literal" },
  { tag: tags.string, class: "tok-string" },
  { tag: tags.number, class: "tok-number" },
  { tag: [tags.regexp, tags.escape, tags.special(tags.string)], class: "tok-string2" },
  { tag: tags.variableName, class: "tok-variableName" },
  { tag: tags.local(tags.variableName), class: "tok-variableName tok-local" },
  { tag: tags.definition(tags.variableName), class: "tok-variableName tok-definition" },
  { tag: tags.special(tags.variableName), class: "tok-variableName2" },
  { tag: tags.definition(tags.propertyName), class: "tok-propertyName tok-definition" },
  { tag: tags.typeName, class: "tok-typeName" },
  { tag: tags.namespace, class: "tok-namespace" },
  { tag: tags.className, class: "tok-className" },
  { tag: tags.macroName, class: "tok-macroName" },
  { tag: tags.propertyName, class: "tok-propertyName" },
  { tag: tags.operator, class: "tok-operator" },
  { tag: tags.comment, class: "tok-comment" },
  { tag: tags.meta, class: "tok-meta" },
  { tag: tags.invalid, class: "tok-invalid" },
  { tag: tags.punctuation, class: "tok-punctuation" }
]);
var printKeyword = 1;
var indent = 194;
var dedent = 195;
var newline$1 = 196;
var blankLineStart = 197;
var newlineBracketed = 198;
var eof = 199;
var stringContent = 200;
var Escape = 2;
var replacementStart = 3;
var stringEnd = 201;
var ParenL = 24;
var ParenthesizedExpression = 25;
var TupleExpression = 49;
var ComprehensionExpression = 50;
var BracketL = 55;
var ArrayExpression = 56;
var ArrayComprehensionExpression = 57;
var BraceL = 59;
var DictionaryExpression = 60;
var DictionaryComprehensionExpression = 61;
var SetExpression = 62;
var SetComprehensionExpression = 63;
var ArgList = 65;
var subscript = 238;
var String$1 = 71;
var stringStart = 241;
var stringStartD = 242;
var stringStartL = 243;
var stringStartLD = 244;
var stringStartR = 245;
var stringStartRD = 246;
var stringStartRL = 247;
var stringStartRLD = 248;
var FormatString = 72;
var stringStartF = 249;
var stringStartFD = 250;
var stringStartFL = 251;
var stringStartFLD = 252;
var stringStartFR = 253;
var stringStartFRD = 254;
var stringStartFRL = 255;
var stringStartFRLD = 256;
var FormatReplacement = 73;
var nestedFormatReplacement = 77;
var importList = 263;
var TypeParamList = 112;
var ParamList = 130;
var SequencePattern = 151;
var MappingPattern = 152;
var PatternArgList = 155;
var newline = 10;
var carriageReturn = 13;
var space = 32;
var tab = 9;
var hash = 35;
var parenOpen = 40;
var dot = 46;
var braceOpen = 123;
var braceClose = 125;
var singleQuote = 39;
var doubleQuote = 34;
var backslash = 92;
var letter_o = 111;
var letter_x = 120;
var letter_N = 78;
var letter_u = 117;
var letter_U = 85;
var bracketed = /* @__PURE__ */ new Set([
  ParenthesizedExpression,
  TupleExpression,
  ComprehensionExpression,
  importList,
  ArgList,
  ParamList,
  ArrayExpression,
  ArrayComprehensionExpression,
  subscript,
  SetExpression,
  SetComprehensionExpression,
  FormatString,
  FormatReplacement,
  nestedFormatReplacement,
  DictionaryExpression,
  DictionaryComprehensionExpression,
  SequencePattern,
  MappingPattern,
  PatternArgList,
  TypeParamList
]);
function isLineBreak(ch) {
  return ch == newline || ch == carriageReturn;
}
function isHex(ch) {
  return ch >= 48 && ch <= 57 || ch >= 65 && ch <= 70 || ch >= 97 && ch <= 102;
}
var newlines = new ExternalTokenizer((input, stack) => {
  let prev;
  if (input.next < 0) {
    input.acceptToken(eof);
  } else if (stack.context.flags & cx_Bracketed) {
    if (isLineBreak(input.next)) input.acceptToken(newlineBracketed, 1);
  } else if (((prev = input.peek(-1)) < 0 || isLineBreak(prev)) && stack.canShift(blankLineStart)) {
    let spaces = 0;
    while (input.next == space || input.next == tab) {
      input.advance();
      spaces++;
    }
    if (input.next == newline || input.next == carriageReturn || input.next == hash)
      input.acceptToken(blankLineStart, -spaces);
  } else if (isLineBreak(input.next)) {
    input.acceptToken(newline$1, 1);
  }
}, { contextual: true });
var indentation = new ExternalTokenizer((input, stack) => {
  let context = stack.context;
  if (context.flags) return;
  let prev = input.peek(-1);
  if (prev == newline || prev == carriageReturn) {
    let depth = 0, chars = 0;
    for (; ; ) {
      if (input.next == space) depth++;
      else if (input.next == tab) depth += 8 - depth % 8;
      else break;
      input.advance();
      chars++;
    }
    if (depth != context.indent && input.next != newline && input.next != carriageReturn && input.next != hash) {
      if (depth < context.indent) input.acceptToken(dedent, -chars);
      else input.acceptToken(indent);
    }
  }
});
var cx_Bracketed = 1;
var cx_String = 2;
var cx_DoubleQuote = 4;
var cx_Long = 8;
var cx_Raw = 16;
var cx_Format = 32;
function Context(parent, indent2, flags) {
  this.parent = parent;
  this.indent = indent2;
  this.flags = flags;
  this.hash = (parent ? parent.hash + parent.hash << 8 : 0) + indent2 + (indent2 << 4) + flags + (flags << 6);
}
var topIndent = new Context(null, 0, 0);
function countIndent(space2) {
  let depth = 0;
  for (let i = 0; i < space2.length; i++)
    depth += space2.charCodeAt(i) == tab ? 8 - depth % 8 : 1;
  return depth;
}
var stringFlags = new Map([
  [stringStart, 0],
  [stringStartD, cx_DoubleQuote],
  [stringStartL, cx_Long],
  [stringStartLD, cx_Long | cx_DoubleQuote],
  [stringStartR, cx_Raw],
  [stringStartRD, cx_Raw | cx_DoubleQuote],
  [stringStartRL, cx_Raw | cx_Long],
  [stringStartRLD, cx_Raw | cx_Long | cx_DoubleQuote],
  [stringStartF, cx_Format],
  [stringStartFD, cx_Format | cx_DoubleQuote],
  [stringStartFL, cx_Format | cx_Long],
  [stringStartFLD, cx_Format | cx_Long | cx_DoubleQuote],
  [stringStartFR, cx_Format | cx_Raw],
  [stringStartFRD, cx_Format | cx_Raw | cx_DoubleQuote],
  [stringStartFRL, cx_Format | cx_Raw | cx_Long],
  [stringStartFRLD, cx_Format | cx_Raw | cx_Long | cx_DoubleQuote]
].map(([term, flags]) => [term, flags | cx_String]));
var trackIndent = new ContextTracker({
  start: topIndent,
  reduce(context, term, _, input) {
    if (context.flags & cx_Bracketed && bracketed.has(term) || (term == String$1 || term == FormatString) && context.flags & cx_String)
      return context.parent;
    return context;
  },
  shift(context, term, stack, input) {
    if (term == indent)
      return new Context(context, countIndent(input.read(input.pos, stack.pos)), 0);
    if (term == dedent)
      return context.parent;
    if (term == ParenL || term == BracketL || term == BraceL || term == replacementStart)
      return new Context(context, 0, cx_Bracketed);
    if (stringFlags.has(term))
      return new Context(context, 0, stringFlags.get(term) | context.flags & cx_Bracketed);
    return context;
  },
  hash(context) {
    return context.hash;
  }
});
var legacyPrint = new ExternalTokenizer((input) => {
  for (let i = 0; i < 5; i++) {
    if (input.next != "print".charCodeAt(i)) return;
    input.advance();
  }
  if (/\w/.test(String.fromCharCode(input.next))) return;
  for (let off = 0; ; off++) {
    let next = input.peek(off);
    if (next == space || next == tab) continue;
    if (next != parenOpen && next != dot && next != newline && next != carriageReturn && next != hash)
      input.acceptToken(printKeyword);
    return;
  }
});
var strings = new ExternalTokenizer((input, stack) => {
  let { flags } = stack.context;
  let quote = flags & cx_DoubleQuote ? doubleQuote : singleQuote;
  let long = (flags & cx_Long) > 0;
  let escapes = !(flags & cx_Raw);
  let format = (flags & cx_Format) > 0;
  let start = input.pos;
  for (; ; ) {
    if (input.next < 0) {
      break;
    } else if (format && input.next == braceOpen) {
      if (input.peek(1) == braceOpen) {
        input.advance(2);
      } else {
        if (input.pos == start) {
          input.acceptToken(replacementStart, 1);
          return;
        }
        break;
      }
    } else if (escapes && input.next == backslash) {
      if (input.pos == start) {
        input.advance();
        let escaped = input.next;
        if (escaped >= 0) {
          input.advance();
          skipEscape(input, escaped);
        }
        input.acceptToken(Escape);
        return;
      }
      break;
    } else if (input.next == backslash && !escapes && input.peek(1) > -1) {
      input.advance(2);
    } else if (input.next == quote && (!long || input.peek(1) == quote && input.peek(2) == quote)) {
      if (input.pos == start) {
        input.acceptToken(stringEnd, long ? 3 : 1);
        return;
      }
      break;
    } else if (input.next == newline) {
      if (long) {
        input.advance();
      } else if (input.pos == start) {
        input.acceptToken(stringEnd);
        return;
      }
      break;
    } else {
      input.advance();
    }
  }
  if (input.pos > start) input.acceptToken(stringContent);
});
function skipEscape(input, ch) {
  if (ch == letter_o) {
    for (let i = 0; i < 2 && input.next >= 48 && input.next <= 55; i++) input.advance();
  } else if (ch == letter_x) {
    for (let i = 0; i < 2 && isHex(input.next); i++) input.advance();
  } else if (ch == letter_u) {
    for (let i = 0; i < 4 && isHex(input.next); i++) input.advance();
  } else if (ch == letter_U) {
    for (let i = 0; i < 8 && isHex(input.next); i++) input.advance();
  } else if (ch == letter_N) {
    if (input.next == braceOpen) {
      input.advance();
      while (input.next >= 0 && input.next != braceClose && input.next != singleQuote && input.next != doubleQuote && input.next != newline) input.advance();
      if (input.next == braceClose) input.advance();
    }
  }
}
var pythonHighlighting = styleTags({
  'async "*" "**" FormatConversion FormatSpec': tags.modifier,
  "for while if elif else try except finally return raise break continue with pass assert await yield match case": tags.controlKeyword,
  "in not and or is del": tags.operatorKeyword,
  "from def class global nonlocal lambda": tags.definitionKeyword,
  import: tags.moduleKeyword,
  "with as print": tags.keyword,
  Boolean: tags.bool,
  None: tags.null,
  VariableName: tags.variableName,
  "CallExpression/VariableName": tags.function(tags.variableName),
  "FunctionDefinition/VariableName": tags.function(tags.definition(tags.variableName)),
  "ClassDefinition/VariableName": tags.definition(tags.className),
  PropertyName: tags.propertyName,
  "CallExpression/MemberExpression/PropertyName": tags.function(tags.propertyName),
  Comment: tags.lineComment,
  Number: tags.number,
  String: tags.string,
  FormatString: tags.special(tags.string),
  Escape: tags.escape,
  UpdateOp: tags.updateOperator,
  "ArithOp!": tags.arithmeticOperator,
  BitOp: tags.bitwiseOperator,
  CompareOp: tags.compareOperator,
  AssignOp: tags.definitionOperator,
  Ellipsis: tags.punctuation,
  At: tags.meta,
  "( )": tags.paren,
  "[ ]": tags.squareBracket,
  "{ }": tags.brace,
  ".": tags.derefOperator,
  ", ;": tags.separator
});
var spec_identifier = { __proto__: null, await: 44, or: 54, and: 56, in: 60, not: 62, is: 64, if: 70, else: 72, lambda: 76, yield: 94, from: 96, async: 102, for: 104, None: 162, True: 164, False: 164, del: 178, pass: 182, break: 186, continue: 190, return: 194, raise: 202, import: 206, as: 208, global: 212, nonlocal: 214, assert: 218, type: 223, elif: 236, while: 240, try: 246, except: 248, finally: 250, with: 254, def: 258, class: 268, match: 279, case: 285 };
var parser = LRParser.deserialize({
  version: 14,
  states: "##jO`QeOOP$}OSOOO&WQtO'#HUOOQS'#Co'#CoOOQS'#Cp'#CpO'vQdO'#CnO*UQtO'#HTOOQS'#HU'#HUOOQS'#DU'#DUOOQS'#HT'#HTO*rQdO'#D_O+VQdO'#DfO+gQdO'#DjO+zOWO'#DuO,VOWO'#DvO.[QtO'#GuOOQS'#Gu'#GuO'vQdO'#GtO0ZQtO'#GtOOQS'#Eb'#EbO0rQdO'#EcOOQS'#Gs'#GsO0|QdO'#GrOOQV'#Gr'#GrO1XQdO'#FYOOQS'#G^'#G^O1^QdO'#FXOOQV'#IS'#ISOOQV'#Gq'#GqOOQV'#Fq'#FqQ`QeOOO'vQdO'#CqO1lQdO'#C}O1sQdO'#DRO2RQdO'#HYO2cQtO'#EVO'vQdO'#EWOOQS'#EY'#EYOOQS'#E['#E[OOQS'#E^'#E^O2wQdO'#E`O3_QdO'#EdO3rQdO'#EfO3zQtO'#EfO1XQdO'#EiO0rQdO'#ElO1XQdO'#EnO0rQdO'#EtO0rQdO'#EwO4VQdO'#EyO4^QdO'#FOO4iQdO'#EzO0rQdO'#FOO1XQdO'#FQO1XQdO'#FVO4nQdO'#F[P4uOdO'#GpPOOO)CBd)CBdOOQS'#Ce'#CeOOQS'#Cf'#CfOOQS'#Cg'#CgOOQS'#Ch'#ChOOQS'#Ci'#CiOOQS'#Cj'#CjOOQS'#Cl'#ClO'vQdO,59OO'vQdO,59OO'vQdO,59OO'vQdO,59OO'vQdO,59OO'vQdO,59OO5TQdO'#DoOOQS,5:Y,5:YO5hQdO'#HdOOQS,5:],5:]O5uQ!fO,5:]O5zQtO,59YO1lQdO,59bO1lQdO,59bO1lQdO,59bO8jQdO,59bO8oQdO,59bO8vQdO,59jO8}QdO'#HTO:TQdO'#HSOOQS'#HS'#HSOOQS'#D['#D[O:lQdO,59aO'vQdO,59aO:zQdO,59aOOQS,59y,59yO;PQdO,5:RO'vQdO,5:ROOQS,5:Q,5:QO;_QdO,5:QO;dQdO,5:XO'vQdO,5:XO'vQdO,5:VOOQS,5:U,5:UO;uQdO,5:UO;zQdO,5:WOOOW'#Fy'#FyO<POWO,5:aOOQS,5:a,5:aO<[QdO'#HwOOOW'#Dw'#DwOOOW'#Fz'#FzO<lOWO,5:bOOQS,5:b,5:bOOQS'#F}'#F}O<zQtO,5:iO?lQtO,5=`O@VQ#xO,5=`O@vQtO,5=`OOQS,5:},5:}OA_QeO'#GWOBqQdO,5;^OOQV,5=^,5=^OB|QtO'#IPOCkQdO,5;tOOQS-E:[-E:[OOQV,5;s,5;sO4dQdO'#FQOOQV-E9o-E9oOCsQtO,59]OEzQtO,59iOFeQdO'#HVOFpQdO'#HVO1XQdO'#HVOF{QdO'#DTOGTQdO,59mOGYQdO'#HZO'vQdO'#HZO0rQdO,5=tOOQS,5=t,5=tO0rQdO'#EROOQS'#ES'#ESOGwQdO'#GPOHXQdO,58|OHXQdO,58|O*xQdO,5:oOHgQtO'#H]OOQS,5:r,5:rOOQS,5:z,5:zOHzQdO,5;OOI]QdO'#IOO1XQdO'#H}OOQS,5;Q,5;QOOQS'#GT'#GTOIqQtO,5;QOJPQdO,5;QOJUQdO'#IQOOQS,5;T,5;TOJdQdO'#H|OOQS,5;W,5;WOJuQdO,5;YO4iQdO,5;`O4iQdO,5;cOJ}QtO'#ITO'vQdO'#ITOKXQdO,5;eO4VQdO,5;eO0rQdO,5;jO1XQdO,5;lOK^QeO'#EuOLjQgO,5;fO!!kQdO'#IUO4iQdO,5;jO!!vQdO,5;lO!#OQdO,5;qO!#ZQtO,5;vO'vQdO,5;vPOOO,5=[,5=[P!#bOSO,5=[P!#jOdO,5=[O!&bQtO1G.jO!&iQtO1G.jO!)YQtO1G.jO!)dQtO1G.jO!+}QtO1G.jO!,bQtO1G.jO!,uQdO'#HcO!-TQtO'#GuO0rQdO'#HcO!-_QdO'#HbOOQS,5:Z,5:ZO!-gQdO,5:ZO!-lQdO'#HeO!-wQdO'#HeO!.[QdO,5>OOOQS'#Ds'#DsOOQS1G/w1G/wOOQS1G.|1G.|O!/[QtO1G.|O!/cQtO1G.|O1lQdO1G.|O!0OQdO1G/UOOQS'#DZ'#DZO0rQdO,59tOOQS1G.{1G.{O!0VQdO1G/eO!0gQdO1G/eO!0oQdO1G/fO'vQdO'#H[O!0tQdO'#H[O!0yQtO1G.{O!1ZQdO,59iO!2aQdO,5=zO!2qQdO,5=zO!2yQdO1G/mO!3OQtO1G/mOOQS1G/l1G/lO!3`QdO,5=uO!4VQdO,5=uO0rQdO1G/qO!4tQdO1G/sO!4yQtO1G/sO!5ZQtO1G/qOOQS1G/p1G/pOOQS1G/r1G/rOOOW-E9w-E9wOOQS1G/{1G/{O!5kQdO'#HxO0rQdO'#HxO!5|QdO,5>cOOOW-E9x-E9xOOQS1G/|1G/|OOQS-E9{-E9{O!6[Q#xO1G2zO!6{QtO1G2zO'vQdO,5<jOOQS,5<j,5<jOOQS-E9|-E9|OOQS,5<r,5<rOOQS-E:U-E:UOOQV1G0x1G0xO1XQdO'#GRO!7dQtO,5>kOOQS1G1`1G1`O!8RQdO1G1`OOQS'#DV'#DVO0rQdO,5=qOOQS,5=q,5=qO!8WQdO'#FrO!8cQdO,59oO!8kQdO1G/XO!8uQtO,5=uOOQS1G3`1G3`OOQS,5:m,5:mO!9fQdO'#GtOOQS,5<k,5<kOOQS-E9}-E9}O!9wQdO1G.hOOQS1G0Z1G0ZO!:VQdO,5=wO!:gQdO,5=wO0rQdO1G0jO0rQdO1G0jO!:xQdO,5>jO!;ZQdO,5>jO1XQdO,5>jO!;lQdO,5>iOOQS-E:R-E:RO!;qQdO1G0lO!;|QdO1G0lO!<RQdO,5>lO!<aQdO,5>lO!<oQdO,5>hO!=VQdO,5>hO!=hQdO'#EpO0rQdO1G0tO!=sQdO1G0tO!=xQgO1G0zO!AvQgO1G0}O!EqQdO,5>oO!E{QdO,5>oO!FTQtO,5>oO0rQdO1G1PO!F_QdO1G1PO4iQdO1G1UO!!vQdO1G1WOOQV,5;a,5;aO!FdQfO,5;aO!FiQgO1G1QO!JjQdO'#GZO4iQdO1G1QO4iQdO1G1QO!JzQdO,5>pO!KXQdO,5>pO1XQdO,5>pOOQV1G1U1G1UO!KaQdO'#FSO!KrQ!fO1G1WO!KzQdO1G1WOOQV1G1]1G1]O4iQdO1G1]O!LPQdO1G1]O!LXQdO'#F^OOQV1G1b1G1bO!#ZQtO1G1bPOOO1G2v1G2vP!L^OSO1G2vOOQS,5=},5=}OOQS'#Dp'#DpO0rQdO,5=}O!LfQdO,5=|O!LyQdO,5=|OOQS1G/u1G/uO!MRQdO,5>PO!McQdO,5>PO!MkQdO,5>PO!NOQdO,5>PO!N`QdO,5>POOQS1G3j1G3jOOQS7+$h7+$hO!8kQdO7+$pO#!RQdO1G.|O#!YQdO1G.|OOQS1G/`1G/`OOQS,5<`,5<`O'vQdO,5<`OOQS7+%P7+%PO#!aQdO7+%POOQS-E9r-E9rOOQS7+%Q7+%QO#!qQdO,5=vO'vQdO,5=vOOQS7+$g7+$gO#!vQdO7+%PO##OQdO7+%QO##TQdO1G3fOOQS7+%X7+%XO##eQdO1G3fO##mQdO7+%XOOQS,5<_,5<_O'vQdO,5<_O##rQdO1G3aOOQS-E9q-E9qO#$iQdO7+%]OOQS7+%_7+%_O#$wQdO1G3aO#%fQdO7+%_O#%kQdO1G3gO#%{QdO1G3gO#&TQdO7+%]O#&YQdO,5>dO#&sQdO,5>dO#&sQdO,5>dOOQS'#Dx'#DxO#'UO&jO'#DzO#'aO`O'#HyOOOW1G3}1G3}O#'fQdO1G3}O#'nQdO1G3}O#'yQ#xO7+(fO#(jQtO1G2UP#)TQdO'#GOOOQS,5<m,5<mOOQS-E:P-E:POOQS7+&z7+&zOOQS1G3]1G3]OOQS,5<^,5<^OOQS-E9p-E9pOOQS7+$s7+$sO#)bQdO,5=`O#){QdO,5=`O#*^QtO,5<aO#*qQdO1G3cOOQS-E9s-E9sOOQS7+&U7+&UO#+RQdO7+&UO#+aQdO,5<nO#+uQdO1G4UOOQS-E:Q-E:QO#,WQdO1G4UOOQS1G4T1G4TOOQS7+&W7+&WO#,iQdO7+&WOOQS,5<p,5<pO#,tQdO1G4WOOQS-E:S-E:SOOQS,5<l,5<lO#-SQdO1G4SOOQS-E:O-E:OO1XQdO'#EqO#-jQdO'#EqO#-uQdO'#IRO#-}QdO,5;[OOQS7+&`7+&`O0rQdO7+&`O#.SQgO7+&fO!JmQdO'#GXO4iQdO7+&fO4iQdO7+&iO#2QQtO,5<tO'vQdO,5<tO#2[QdO1G4ZOOQS-E:W-E:WO#2fQdO1G4ZO4iQdO7+&kO0rQdO7+&kOOQV7+&p7+&pO!KrQ!fO7+&rO!KzQdO7+&rO`QeO1G0{OOQV-E:X-E:XO4iQdO7+&lO4iQdO7+&lOOQV,5<u,5<uO#2nQdO,5<uO!JmQdO,5<uOOQV7+&l7+&lO#2yQgO7+&lO#6tQdO,5<vO#7PQdO1G4[OOQS-E:Y-E:YO#7^QdO1G4[O#7fQdO'#IWO#7tQdO'#IWO1XQdO'#IWOOQS'#IW'#IWO#8PQdO'#IVOOQS,5;n,5;nO#8XQdO,5;nO0rQdO'#FUOOQV7+&r7+&rO4iQdO7+&rOOQV7+&w7+&wO4iQdO7+&wO#8^QfO,5;xOOQV7+&|7+&|POOO7+(b7+(bO#8cQdO1G3iOOQS,5<c,5<cO#8qQdO1G3hOOQS-E9u-E9uO#9UQdO,5<dO#9aQdO,5<dO#9tQdO1G3kOOQS-E9v-E9vO#:UQdO1G3kO#:^QdO1G3kO#:nQdO1G3kO#:UQdO1G3kOOQS<<H[<<H[O#:yQtO1G1zOOQS<<Hk<<HkP#;WQdO'#FtO8vQdO1G3bO#;eQdO1G3bO#;jQdO<<HkOOQS<<Hl<<HlO#;zQdO7+)QOOQS<<Hs<<HsO#<[QtO1G1yP#<{QdO'#FsO#=YQdO7+)RO#=jQdO7+)RO#=rQdO<<HwO#=wQdO7+({OOQS<<Hy<<HyO#>nQdO,5<bO'vQdO,5<bOOQS-E9t-E9tOOQS<<Hw<<HwOOQS,5<g,5<gO0rQdO,5<gO#>sQdO1G4OOOQS-E9y-E9yO#?^QdO1G4OO<[QdO'#H{OOOO'#D{'#D{OOOO'#F|'#F|O#?oO&jO,5:fOOOW,5>e,5>eOOOW7+)i7+)iO#?zQdO7+)iO#@SQdO1G2zO#@mQdO1G2zP'vQdO'#FuO0rQdO<<IpO1XQdO1G2YP1XQdO'#GSO#AOQdO7+)pO#AaQdO7+)pOOQS<<Ir<<IrP1XQdO'#GUP0rQdO'#GQOOQS,5;],5;]O#ArQdO,5>mO#BQQdO,5>mOOQS1G0v1G0vOOQS<<Iz<<IzOOQV-E:V-E:VO4iQdO<<JQOOQV,5<s,5<sO4iQdO,5<sOOQV<<JQ<<JQOOQV<<JT<<JTO#BYQtO1G2`P#BdQdO'#GYO#BkQdO7+)uO#BuQgO<<JVO4iQdO<<JVOOQV<<J^<<J^O4iQdO<<J^O!KrQ!fO<<J^O#FpQgO7+&gOOQV<<JW<<JWO#FzQgO<<JWOOQV1G2a1G2aO1XQdO1G2aO#JuQdO1G2aO4iQdO<<JWO1XQdO1G2bP0rQdO'#G[O#KQQdO7+)vO#K_QdO7+)vOOQS'#FT'#FTO0rQdO,5>rO#KgQdO,5>rO#KrQdO,5>rO#K}QdO,5>qO#L`QdO,5>qOOQS1G1Y1G1YOOQS,5;p,5;pOOQV<<Jc<<JcO#LhQdO1G1dOOQS7+)T7+)TP#LmQdO'#FwO#L}QdO1G2OO#MbQdO1G2OO#MrQdO1G2OP#M}QdO'#FxO#N[QdO7+)VO#NlQdO7+)VO#NlQdO7+)VO#NtQdO7+)VO$ UQdO7+(|O8vQdO7+(|OOQSAN>VAN>VO$ oQdO<<LmOOQSAN>cAN>cO0rQdO1G1|O$!PQtO1G1|P$!ZQdO'#FvOOQS1G2R1G2RP$!hQdO'#F{O$!uQdO7+)jO$#`QdO,5>gOOOO-E9z-E9zOOOW<<MT<<MTO$#nQdO7+(fOOQSAN?[AN?[OOQS7+'t7+'tO$$XQdO<<M[OOQS,5<q,5<qO$$jQdO1G4XOOQS-E:T-E:TOOQVAN?lAN?lOOQV1G2_1G2_O4iQdOAN?qO$$xQgOAN?qOOQVAN?xAN?xO4iQdOAN?xOOQV<<JR<<JRO4iQdOAN?rO4iQdO7+'{OOQV7+'{7+'{O1XQdO7+'{OOQVAN?rAN?rOOQS7+'|7+'|O$(sQdO<<MbOOQS1G4^1G4^O0rQdO1G4^OOQS,5<w,5<wO$)QQdO1G4]OOQS-E:Z-E:ZOOQU'#G_'#G_O$)cQfO7+'OO$)nQdO'#F_O$*uQdO7+'jO$+VQdO7+'jOOQS7+'j7+'jO$+bQdO<<LqO$+rQdO<<LqO$+rQdO<<LqO$+zQdO'#H^OOQS<<Lh<<LhO$,UQdO<<LhOOQS7+'h7+'hOOQS'#D|'#D|OOOO1G4R1G4RO$,oQdO1G4RO$,wQdO1G4RP!=hQdO'#GVOOQVG25]G25]O4iQdOG25]OOQVG25dG25dOOQVG25^G25^OOQV<<Kg<<KgO4iQdO<<KgOOQS7+)x7+)xP$-SQdO'#G]OOQU-E:]-E:]OOQV<<Jj<<JjO$-vQtO'#FaOOQS'#Fc'#FcO$.WQdO'#FbO$.xQdO'#FbOOQS'#Fb'#FbO$.}QdO'#IYO$)nQdO'#FiO$)nQdO'#FiO$/fQdO'#FjO$)nQdO'#FkO$/mQdO'#IZOOQS'#IZ'#IZO$0[QdO,5;yOOQS<<KU<<KUO$0dQdO<<KUO$0tQdOANB]O$1UQdOANB]O$1^QdO'#H_OOQS'#H_'#H_O1sQdO'#DcO$1wQdO,5=xOOQSANBSANBSOOOO7+)m7+)mO$2`QdO7+)mOOQVLD*wLD*wOOQVANARANARO5uQ!fO'#GaO$2hQtO,5<SO$)nQdO'#FmOOQS,5<W,5<WOOQS'#Fd'#FdO$3YQdO,5;|O$3_QdO,5;|OOQS'#Fg'#FgO$)nQdO'#G`O$4PQdO,5<QO$4kQdO,5>tO$4{QdO,5>tO1XQdO,5<PO$5^QdO,5<TO$5cQdO,5<TO$)nQdO'#I[O$5hQdO'#I[O$5mQdO,5<UOOQS,5<V,5<VO0rQdO'#FpOOQU1G1e1G1eO4iQdO1G1eOOQSAN@pAN@pO$5rQdOG27wO$6SQdO,59}OOQS1G3d1G3dOOOO<<MX<<MXOOQS,5<{,5<{OOQS-E:_-E:_O$6XQtO'#FaO$6`QdO'#I]O$6nQdO'#I]O$6vQdO,5<XOOQS1G1h1G1hO$6{QdO1G1hO$7QQdO,5<zOOQS-E:^-E:^O$7lQdO,5=OO$8TQdO1G4`OOQS-E:b-E:bOOQS1G1k1G1kOOQS1G1o1G1oO$8eQdO,5>vO$)nQdO,5>vOOQS1G1p1G1pOOQS,5<[,5<[OOQU7+'P7+'PO$+zQdO1G/iO$)nQdO,5<YO$8sQdO,5>wO$8zQdO,5>wOOQS1G1s1G1sOOQS7+'S7+'SP$)nQdO'#GdO$9SQdO1G4bO$9^QdO1G4bO$9fQdO1G4bOOQS7+%T7+%TO$9tQdO1G1tO$:SQtO'#FaO$:ZQdO,5<}OOQS,5<},5<}O$:iQdO1G4cOOQS-E:a-E:aO$)nQdO,5<|O$:pQdO,5<|O$:uQdO7+)|OOQS-E:`-E:`O$;PQdO7+)|O$)nQdO,5<ZP$)nQdO'#GcO$;XQdO1G2hO$)nQdO1G2hP$;gQdO'#GbO$;nQdO<<MhO$;xQdO1G1uO$<WQdO7+(SO8vQdO'#C}O8vQdO,59bO8vQdO,59bO8vQdO,59bO$<fQtO,5=`O8vQdO1G.|O0rQdO1G/XO0rQdO7+$pP$<yQdO'#GOO'vQdO'#GtO$=WQdO,59bO$=]QdO,59bO$=dQdO,59mO$=iQdO1G/UO1sQdO'#DRO8vQdO,59j",
  stateData: "$>S~O%cOS%^OSSOS%]PQ~OPdOVaOfoOhYOopOs!POvqO!PrO!Q{O!T!SO!U!RO!XZO!][O!h`O!r`O!s`O!t`O!{tO!}uO#PvO#RwO#TxO#XyO#ZzO#^|O#_|O#a}O#c!OO#l!QO#o!TO#s!UO#u!VO#z!WO#}hO$P!XO%oRO%pRO%tSO%uWO&Z]O&[]O&]]O&^]O&_]O&`]O&a]O&b]O&c^O&d^O&e^O&f^O&g^O&h^O&i^O&j^O~O%]!YO~OV!aO_!aOa!bOh!iO!X!kO!f!mO%j![O%k!]O%l!^O%m!_O%n!_O%o!`O%p!`O%q!aO%r!aO%s!aO~Ok%xXl%xXm%xXn%xXo%xXp%xXs%xXz%xX{%xX!x%xX#g%xX%[%xX%_%xX%z%xXg%xX!T%xX!U%xX%{%xX!W%xX![%xX!Q%xX#[%xXt%xX!m%xX~P%SOfoOhYO!XZO!][O!h`O!r`O!s`O!t`O%oRO%pRO%tSO%uWO&Z]O&[]O&]]O&^]O&_]O&`]O&a]O&b]O&c^O&d^O&e^O&f^O&g^O&h^O&i^O&j^O~Oz%wX{%wX#g%wX%[%wX%_%wX%z%wX~Ok!pOl!qOm!oOn!oOo!rOp!sOs!tO!x%wX~P)pOV!zOg!|Oo0cOv0qO!PrO~P'vOV#OOo0cOv0qO!W#PO~P'vOV#SOa#TOo0cOv0qO![#UO~P'vOQ#XO%`#XO%a#ZO~OQ#^OR#[O%`#^O%a#`O~OV%iX_%iXa%iXh%iXk%iXl%iXm%iXn%iXo%iXp%iXs%iXz%iX!X%iX!f%iX%j%iX%k%iX%l%iX%m%iX%n%iX%o%iX%p%iX%q%iX%r%iX%s%iXg%iX!T%iX!U%iX~O&Z]O&[]O&]]O&^]O&_]O&`]O&a]O&b]O&c^O&d^O&e^O&f^O&g^O&h^O&i^O&j^O{%iX!x%iX#g%iX%[%iX%_%iX%z%iX%{%iX!W%iX![%iX!Q%iX#[%iXt%iX!m%iX~P,eOz#dO{%hX!x%hX#g%hX%[%hX%_%hX%z%hX~Oo0cOv0qO~P'vO#g#gO%[#iO%_#iO~O%uWO~O!T#nO#u!VO#z!WO#}hO~OopO~P'vOV#sOa#tO%uWO{wP~OV#xOo0cOv0qO!Q#yO~P'vO{#{O!x$QO%z#|O#g!yX%[!yX%_!yX~OV#xOo0cOv0qO#g#SX%[#SX%_#SX~P'vOo0cOv0qO#g#WX%[#WX%_#WX~P'vOh$WO%uWO~O!f$YO!r$YO%uWO~OV$eO~P'vO!U$gO#s$hO#u$iO~O{$jO~OV$qO~P'vOS$sO%[$rO%_$rO%c$tO~OV$}Oa$}Og%POo0cOv0qO~P'vOo0cOv0qO{%SO~P'vO&Y%UO~Oa!bOh!iO!X!kO!f!mOVba_bakbalbambanbaobapbasbazba{ba!xba#gba%[ba%_ba%jba%kba%lba%mba%nba%oba%pba%qba%rba%sba%zbagba!Tba!Uba%{ba!Wba![ba!Qba#[batba!mba~On%ZO~Oo%ZO~P'vOo0cO~P'vOk0eOl0fOm0dOn0dOo0mOp0nOs0rOg%wX!T%wX!U%wX%{%wX!W%wX![%wX!Q%wX#[%wX!m%wX~P)pO%{%]Og%vXz%vX!T%vX!U%vX!W%vX{%vX~Og%_Oz%`O!T%dO!U%cO~Og%_O~Oz%gO!T%dO!U%cO!W&SX~O!W%kO~Oz%lO{%nO!T%dO!U%cO![%}X~O![%rO~O![%sO~OQ#XO%`#XO%a%uO~OV%wOo0cOv0qO!PrO~P'vOQ#^OR#[O%`#^O%a%zO~OV!qa_!qaa!qah!qak!qal!qam!qan!qao!qap!qas!qaz!qa{!qa!X!qa!f!qa!x!qa#g!qa%[!qa%_!qa%j!qa%k!qa%l!qa%m!qa%n!qa%o!qa%p!qa%q!qa%r!qa%s!qa%z!qag!qa!T!qa!U!qa%{!qa!W!qa![!qa!Q!qa#[!qat!qa!m!qa~P#yOz%|O{%ha!x%ha#g%ha%[%ha%_%ha%z%ha~P%SOV&OOopOvqO{%ha!x%ha#g%ha%[%ha%_%ha%z%ha~P'vOz%|O{%ha!x%ha#g%ha%[%ha%_%ha%z%ha~OPdOVaOopOvqO!PrO!Q{O!{tO!}uO#PvO#RwO#TxO#XyO#ZzO#^|O#_|O#a}O#c!OO#g$zX%[$zX%_$zX~P'vO#g#gO%[&TO%_&TO~O!f&UOh&sX%[&sXz&sX#[&sX#g&sX%_&sX#Z&sXg&sX~Oh!iO%[&WO~Okealeameaneaoeapeaseazea{ea!xea#gea%[ea%_ea%zeagea!Tea!Uea%{ea!Wea![ea!Qea#[eatea!mea~P%SOsqazqa{qa#gqa%[qa%_qa%zqa~Ok!pOl!qOm!oOn!oOo!rOp!sO!xqa~PEcO%z&YOz%yX{%yX~O%uWOz%yX{%yX~Oz&]O{wX~O{&_O~Oz%lO#g%}X%[%}X%_%}Xg%}X{%}X![%}X!m%}X%z%}X~OV0lOo0cOv0qO!PrO~P'vO%z#|O#gUa%[Ua%_Ua~Oz&hO#g&PX%[&PX%_&PXn&PX~P%SOz&kO!Q&jO#g#Wa%[#Wa%_#Wa~Oz&lO#[&nO#g&rX%[&rX%_&rXg&rX~O!f$YO!r$YO#Z&qO%uWO~O#Z&qO~Oz&sO#g&tX%[&tX%_&tX~Oz&uO#g&pX%[&pX%_&pX{&pX~O!X&wO%z&xO~Oz&|On&wX~P%SOn'PO~OPdOVaOopOvqO!PrO!Q{O!{tO!}uO#PvO#RwO#TxO#XyO#ZzO#^|O#_|O#a}O#c!OO%['UO~P'vOt'YO#p'WO#q'XOP#naV#naf#nah#nao#nas#nav#na!P#na!Q#na!T#na!U#na!X#na!]#na!h#na!r#na!s#na!t#na!{#na!}#na#P#na#R#na#T#na#X#na#Z#na#^#na#_#na#a#na#c#na#l#na#o#na#s#na#u#na#z#na#}#na$P#na%X#na%o#na%p#na%t#na%u#na&Z#na&[#na&]#na&^#na&_#na&`#na&a#na&b#na&c#na&d#na&e#na&f#na&g#na&h#na&i#na&j#na%Z#na%_#na~Oz'ZO#[']O{&xX~Oh'_O!X&wO~Oh!iO{$jO!X&wO~O{'eO~P%SO%['hO%_'hO~OS'iO%['hO%_'hO~OV!aO_!aOa!bOh!iO!X!kO!f!mO%l!^O%m!_O%n!_O%o!`O%p!`O%q!aO%r!aO%s!aOkWilWimWinWioWipWisWizWi{Wi!xWi#gWi%[Wi%_Wi%jWi%zWigWi!TWi!UWi%{Wi!WWi![Wi!QWi#[WitWi!mWi~O%k!]O~P!#uO%kWi~P!#uOV!aO_!aOa!bOh!iO!X!kO!f!mO%o!`O%p!`O%q!aO%r!aO%s!aOkWilWimWinWioWipWisWizWi{Wi!xWi#gWi%[Wi%_Wi%jWi%kWi%lWi%zWigWi!TWi!UWi%{Wi!WWi![Wi!QWi#[WitWi!mWi~O%m!_O%n!_O~P!&pO%mWi%nWi~P!&pOa!bOh!iO!X!kO!f!mOkWilWimWinWioWipWisWizWi{Wi!xWi#gWi%[Wi%_Wi%jWi%kWi%lWi%mWi%nWi%oWi%pWi%zWigWi!TWi!UWi%{Wi!WWi![Wi!QWi#[WitWi!mWi~OV!aO_!aO%q!aO%r!aO%s!aO~P!)nOVWi_Wi%qWi%rWi%sWi~P!)nO!T%dO!U%cOg&VXz&VX~O%z'kO%{'kO~P,eOz'mOg&UX~Og'oO~Oz'pO{'rO!W&XX~Oo0cOv0qOz'pO{'sO!W&XX~P'vO!W'uO~Om!oOn!oOo!rOp!sOkjisjizji{ji!xji#gji%[ji%_ji%zji~Ol!qO~P!.aOlji~P!.aOk0eOl0fOm0dOn0dOo0mOp0nO~Ot'wO~P!/jOV'|Og'}Oo0cOv0qO~P'vOg'}Oz(OO~Og(QO~O!U(SO~Og(TOz(OO!T%dO!U%cO~P%SOk0eOl0fOm0dOn0dOo0mOp0nOgqa!Tqa!Uqa%{qa!Wqa![qa!Qqa#[qatqa!mqa~PEcOV'|Oo0cOv0qO!W&Sa~P'vOz(WO!W&Sa~O!W(XO~Oz(WO!T%dO!U%cO!W&Sa~P%SOV(]Oo0cOv0qO![%}a#g%}a%[%}a%_%}ag%}a{%}a!m%}a%z%}a~P'vOz(^O![%}a#g%}a%[%}a%_%}ag%}a{%}a!m%}a%z%}a~O![(aO~Oz(^O!T%dO!U%cO![%}a~P%SOz(dO!T%dO!U%cO![&Ta~P%SOz(gO{&lX![&lX!m&lX%z&lX~O{(kO![(mO!m(nO%z(jO~OV&OOopOvqO{%hi!x%hi#g%hi%[%hi%_%hi%z%hi~P'vOz(pO{%hi!x%hi#g%hi%[%hi%_%hi%z%hi~O!f&UOh&sa%[&saz&sa#[&sa#g&sa%_&sa#Z&sag&sa~O%[(uO~OV#sOa#tO%uWO~Oz&]O{wa~OopOvqO~P'vOz(^O#g%}a%[%}a%_%}ag%}a{%}a![%}a!m%}a%z%}a~P%SOz(zO#g%hX%[%hX%_%hX%z%hX~O%z#|O#gUi%[Ui%_Ui~O#g&Pa%[&Pa%_&Pan&Pa~P'vOz(}O#g&Pa%[&Pa%_&Pan&Pa~O%uWO#g&ra%[&ra%_&rag&ra~Oz)SO#g&ra%[&ra%_&rag&ra~Og)VO~OV)WOh$WO%uWO~O#Z)XO~O%uWO#g&ta%[&ta%_&ta~Oz)ZO#g&ta%[&ta%_&ta~Oo0cOv0qO#g&pa%[&pa%_&pa{&pa~P'vOz)^O#g&pa%[&pa%_&pa{&pa~OV)`Oa)`O%uWO~O%z)eO~Ot)hO#j)gOP#hiV#hif#hih#hio#his#hiv#hi!P#hi!Q#hi!T#hi!U#hi!X#hi!]#hi!h#hi!r#hi!s#hi!t#hi!{#hi!}#hi#P#hi#R#hi#T#hi#X#hi#Z#hi#^#hi#_#hi#a#hi#c#hi#l#hi#o#hi#s#hi#u#hi#z#hi#}#hi$P#hi%X#hi%o#hi%p#hi%t#hi%u#hi&Z#hi&[#hi&]#hi&^#hi&_#hi&`#hi&a#hi&b#hi&c#hi&d#hi&e#hi&f#hi&g#hi&h#hi&i#hi&j#hi%Z#hi%_#hi~Ot)iOP#kiV#kif#kih#kio#kis#kiv#ki!P#ki!Q#ki!T#ki!U#ki!X#ki!]#ki!h#ki!r#ki!s#ki!t#ki!{#ki!}#ki#P#ki#R#ki#T#ki#X#ki#Z#ki#^#ki#_#ki#a#ki#c#ki#l#ki#o#ki#s#ki#u#ki#z#ki#}#ki$P#ki%X#ki%o#ki%p#ki%t#ki%u#ki&Z#ki&[#ki&]#ki&^#ki&_#ki&`#ki&a#ki&b#ki&c#ki&d#ki&e#ki&f#ki&g#ki&h#ki&i#ki&j#ki%Z#ki%_#ki~OV)kOn&wa~P'vOz)lOn&wa~Oz)lOn&wa~P%SOn)pO~O%Y)tO~Ot)wO#p'WO#q)vOP#niV#nif#nih#nio#nis#niv#ni!P#ni!Q#ni!T#ni!U#ni!X#ni!]#ni!h#ni!r#ni!s#ni!t#ni!{#ni!}#ni#P#ni#R#ni#T#ni#X#ni#Z#ni#^#ni#_#ni#a#ni#c#ni#l#ni#o#ni#s#ni#u#ni#z#ni#}#ni$P#ni%X#ni%o#ni%p#ni%t#ni%u#ni&Z#ni&[#ni&]#ni&^#ni&_#ni&`#ni&a#ni&b#ni&c#ni&d#ni&e#ni&f#ni&g#ni&h#ni&i#ni&j#ni%Z#ni%_#ni~OV)zOo0cOv0qO{$jO~P'vOo0cOv0qO{&xa~P'vOz*OO{&xa~OV*SOa*TOg*WO%q*UO%uWO~O{$jO&{*YO~Oh'_O~Oh!iO{$jO~O%[*_O~O%[*aO%_*aO~OV$}Oa$}Oo0cOv0qOg&Ua~P'vOz*dOg&Ua~Oo0cOv0qO{*gO!W&Xa~P'vOz*hO!W&Xa~Oo0cOv0qOz*hO{*kO!W&Xa~P'vOo0cOv0qOz*hO!W&Xa~P'vOz*hO{*kO!W&Xa~Om0dOn0dOo0mOp0nOgjikjisjizji!Tji!Uji%{ji!Wji{ji![ji#gji%[ji%_ji!Qji#[jitji!mji%zji~Ol0fO~P!NkOlji~P!NkOV'|Og*pOo0cOv0qO~P'vOn*rO~Og*pOz*tO~Og*uO~OV'|Oo0cOv0qO!W&Si~P'vOz*vO!W&Si~O!W*wO~OV(]Oo0cOv0qO![%}i#g%}i%[%}i%_%}ig%}i{%}i!m%}i%z%}i~P'vOz*zO!T%dO!U%cO![&Ti~Oz*}O![%}i#g%}i%[%}i%_%}ig%}i{%}i!m%}i%z%}i~O![+OO~Oa+QOo0cOv0qO![&Ti~P'vOz*zO![&Ti~O![+SO~OV+UOo0cOv0qO{&la![&la!m&la%z&la~P'vOz+VO{&la![&la!m&la%z&la~O!]+YO&n+[O![!nX~O![+^O~O{(kO![+_O~O{(kO![+_O!m+`O~OV&OOopOvqO{%hq!x%hq#g%hq%[%hq%_%hq%z%hq~P'vOz$ri{$ri!x$ri#g$ri%[$ri%_$ri%z$ri~P%SOV&OOopOvqO~P'vOV&OOo0cOv0qO#g%ha%[%ha%_%ha%z%ha~P'vOz+aO#g%ha%[%ha%_%ha%z%ha~Oz$ia#g$ia%[$ia%_$ian$ia~P%SO#g&Pi%[&Pi%_&Pin&Pi~P'vOz+dO#g#Wq%[#Wq%_#Wq~O#[+eOz$va#g$va%[$va%_$vag$va~O%uWO#g&ri%[&ri%_&rig&ri~Oz+gO#g&ri%[&ri%_&rig&ri~OV+iOh$WO%uWO~O%uWO#g&ti%[&ti%_&ti~Oo0cOv0qO#g&pi%[&pi%_&pi{&pi~P'vO{#{Oz#eX!W#eX~Oz+mO!W&uX~O!W+oO~Ot+rO#j)gOP#hqV#hqf#hqh#hqo#hqs#hqv#hq!P#hq!Q#hq!T#hq!U#hq!X#hq!]#hq!h#hq!r#hq!s#hq!t#hq!{#hq!}#hq#P#hq#R#hq#T#hq#X#hq#Z#hq#^#hq#_#hq#a#hq#c#hq#l#hq#o#hq#s#hq#u#hq#z#hq#}#hq$P#hq%X#hq%o#hq%p#hq%t#hq%u#hq&Z#hq&[#hq&]#hq&^#hq&_#hq&`#hq&a#hq&b#hq&c#hq&d#hq&e#hq&f#hq&g#hq&h#hq&i#hq&j#hq%Z#hq%_#hq~On$|az$|a~P%SOV)kOn&wi~P'vOz+yOn&wi~Oz,TO{$jO#[,TO~O#q,VOP#nqV#nqf#nqh#nqo#nqs#nqv#nq!P#nq!Q#nq!T#nq!U#nq!X#nq!]#nq!h#nq!r#nq!s#nq!t#nq!{#nq!}#nq#P#nq#R#nq#T#nq#X#nq#Z#nq#^#nq#_#nq#a#nq#c#nq#l#nq#o#nq#s#nq#u#nq#z#nq#}#nq$P#nq%X#nq%o#nq%p#nq%t#nq%u#nq&Z#nq&[#nq&]#nq&^#nq&_#nq&`#nq&a#nq&b#nq&c#nq&d#nq&e#nq&f#nq&g#nq&h#nq&i#nq&j#nq%Z#nq%_#nq~O#[,WOz%Oa{%Oa~Oo0cOv0qO{&xi~P'vOz,YO{&xi~O{#{O%z,[Og&zXz&zX~O%uWOg&zXz&zX~Oz,`Og&yX~Og,bO~O%Y,eO~O!T%dO!U%cOg&Viz&Vi~OV$}Oa$}Oo0cOv0qOg&Ui~P'vO{,hOz$la!W$la~Oo0cOv0qO{,iOz$la!W$la~P'vOo0cOv0qO{*gO!W&Xi~P'vOz,lO!W&Xi~Oo0cOv0qOz,lO!W&Xi~P'vOz,lO{,oO!W&Xi~Og$hiz$hi!W$hi~P%SOV'|Oo0cOv0qO~P'vOn,qO~OV'|Og,rOo0cOv0qO~P'vOV'|Oo0cOv0qO!W&Sq~P'vOz$gi![$gi#g$gi%[$gi%_$gig$gi{$gi!m$gi%z$gi~P%SOV(]Oo0cOv0qO~P'vOa+QOo0cOv0qO![&Tq~P'vOz,sO![&Tq~O![,tO~OV(]Oo0cOv0qO![%}q#g%}q%[%}q%_%}qg%}q{%}q!m%}q%z%}q~P'vO{,uO~OV+UOo0cOv0qO{&li![&li!m&li%z&li~P'vOz,zO{&li![&li!m&li%z&li~O!]+YO&n+[O![!na~O{(kO![,}O~OV&OOo0cOv0qO#g%hi%[%hi%_%hi%z%hi~P'vOz-OO#g%hi%[%hi%_%hi%z%hi~O%uWO#g&rq%[&rq%_&rqg&rq~Oz-RO#g&rq%[&rq%_&rqg&rq~OV)`Oa)`O%uWO!W&ua~Oz-TO!W&ua~On$|iz$|i~P%SOV)kO~P'vOV)kOn&wq~P'vOt-XOP#myV#myf#myh#myo#mys#myv#my!P#my!Q#my!T#my!U#my!X#my!]#my!h#my!r#my!s#my!t#my!{#my!}#my#P#my#R#my#T#my#X#my#Z#my#^#my#_#my#a#my#c#my#l#my#o#my#s#my#u#my#z#my#}#my$P#my%X#my%o#my%p#my%t#my%u#my&Z#my&[#my&]#my&^#my&_#my&`#my&a#my&b#my&c#my&d#my&e#my&f#my&g#my&h#my&i#my&j#my%Z#my%_#my~O%Z-]O%_-]O~P`O#q-^OP#nyV#nyf#nyh#nyo#nys#nyv#ny!P#ny!Q#ny!T#ny!U#ny!X#ny!]#ny!h#ny!r#ny!s#ny!t#ny!{#ny!}#ny#P#ny#R#ny#T#ny#X#ny#Z#ny#^#ny#_#ny#a#ny#c#ny#l#ny#o#ny#s#ny#u#ny#z#ny#}#ny$P#ny%X#ny%o#ny%p#ny%t#ny%u#ny&Z#ny&[#ny&]#ny&^#ny&_#ny&`#ny&a#ny&b#ny&c#ny&d#ny&e#ny&f#ny&g#ny&h#ny&i#ny&j#ny%Z#ny%_#ny~Oz-aO{$jO#[-aO~Oo0cOv0qO{&xq~P'vOz-dO{&xq~O%z,[Og&zaz&za~O{#{Og&zaz&za~OV*SOa*TO%q*UO%uWOg&ya~Oz-hOg&ya~O$S-lO~OV$}Oa$}Oo0cOv0qO~P'vOo0cOv0qO{-mOz$li!W$li~P'vOo0cOv0qOz$li!W$li~P'vO{-mOz$li!W$li~Oo0cOv0qO{*gO~P'vOo0cOv0qO{*gO!W&Xq~P'vOz-pO!W&Xq~Oo0cOv0qOz-pO!W&Xq~P'vOs-sO!T%dO!U%cOg&Oq!W&Oq![&Oqz&Oq~P!/jOa+QOo0cOv0qO![&Ty~P'vOz$ji![$ji~P%SOa+QOo0cOv0qO~P'vOV+UOo0cOv0qO~P'vOV+UOo0cOv0qO{&lq![&lq!m&lq%z&lq~P'vO{(kO![-xO!m-yO%z-wO~OV&OOo0cOv0qO#g%hq%[%hq%_%hq%z%hq~P'vO%uWO#g&ry%[&ry%_&ryg&ry~OV)`Oa)`O%uWO!W&ui~Ot-}OP#m!RV#m!Rf#m!Rh#m!Ro#m!Rs#m!Rv#m!R!P#m!R!Q#m!R!T#m!R!U#m!R!X#m!R!]#m!R!h#m!R!r#m!R!s#m!R!t#m!R!{#m!R!}#m!R#P#m!R#R#m!R#T#m!R#X#m!R#Z#m!R#^#m!R#_#m!R#a#m!R#c#m!R#l#m!R#o#m!R#s#m!R#u#m!R#z#m!R#}#m!R$P#m!R%X#m!R%o#m!R%p#m!R%t#m!R%u#m!R&Z#m!R&[#m!R&]#m!R&^#m!R&_#m!R&`#m!R&a#m!R&b#m!R&c#m!R&d#m!R&e#m!R&f#m!R&g#m!R&h#m!R&i#m!R&j#m!R%Z#m!R%_#m!R~Oo0cOv0qO{&xy~P'vOV*SOa*TO%q*UO%uWOg&yi~O$S-lO%Z.VO%_.VO~OV.aOh._O!X.^O!].`O!h.YO!s.[O!t.[O%p.XO%uWO&Z]O&[]O&]]O&^]O&_]O&`]O&a]O&b]O~Oo0cOv0qOz$lq!W$lq~P'vO{.fOz$lq!W$lq~Oo0cOv0qO{*gO!W&Xy~P'vOz.gO!W&Xy~Oo0cOv.kO~P'vOs-sO!T%dO!U%cOg&Oy!W&Oy![&Oyz&Oy~P!/jO{(kO![.nO~O{(kO![.nO!m.oO~OV*SOa*TO%q*UO%uWO~Oh.tO!f.rOz$TX#[$TX%j$TXg$TX~Os$TX{$TX!W$TX![$TX~P$-bO%o.vO%p.vOs$UXz$UX{$UX#[$UX%j$UX!W$UXg$UX![$UX~O!h.xO~Oz.|O#[/OO%j.yOs&|X{&|X!W&|Xg&|X~Oa/RO~P$)zOh.tOs&}Xz&}X{&}X#[&}X%j&}X!W&}Xg&}X![&}X~Os/VO{$jO~Oo0cOv0qOz$ly!W$ly~P'vOo0cOv0qO{*gO!W&X!R~P'vOz/ZO!W&X!R~Og&RXs&RX!T&RX!U&RX!W&RX![&RXz&RX~P!/jOs-sO!T%dO!U%cOg&Qa!W&Qa![&Qaz&Qa~O{(kO![/^O~O!f.rOh$[as$[az$[a{$[a#[$[a%j$[a!W$[ag$[a![$[a~O!h/eO~O%o.vO%p.vOs$Uaz$Ua{$Ua#[$Ua%j$Ua!W$Uag$Ua![$Ua~O%j.yOs$Yaz$Ya{$Ya#[$Ya!W$Yag$Ya![$Ya~Os&|a{&|a!W&|ag&|a~P$)nOz/jOs&|a{&|a!W&|ag&|a~O!W/mO~Og/mO~O{/oO~O![/pO~Oo0cOv0qO{*gO!W&X!Z~P'vO{/sO~O%z/tO~P$-bOz/uO#[/OO%j.yOg'PX~Oz/uOg'PX~Og/wO~O!h/xO~O#[/OOs%Saz%Sa{%Sa%j%Sa!W%Sag%Sa![%Sa~O#[/OO%j.yOs%Waz%Wa{%Wa!W%Wag%Wa~Os&|i{&|i!W&|ig&|i~P$)nOz/zO#[/OO%j.yO!['Oa~Og'Pa~P$)nOz0SOg'Pa~Oa0UO!['Oi~P$)zOz0WO!['Oi~Oz0WO#[/OO%j.yO!['Oi~O#[/OO%j.yOg$biz$bi~O%z0ZO~P$-bO#[/OO%j.yOg%Vaz%Va~Og'Pi~P$)nO{0^O~Oa0UO!['Oq~P$)zOz0`O!['Oq~O#[/OO%j.yOz%Ui![%Ui~Oa0UO~P$)zOa0UO!['Oy~P$)zO#[/OO%j.yOg$ciz$ci~O#[/OO%j.yOz%Uq![%Uq~Oz+aO#g%ha%[%ha%_%ha%z%ha~P%SOV&OOo0cOv0qO~P'vOn0hO~Oo0hO~P'vO{0iO~Ot0jO~P!/jO&]&Z&j&h&i&g&f&d&e&c&b&`&a&_&^&[%u~",
  goto: "!=j'QPPPPPP'RP'Z*s+[+t,_,y-fP.SP'Z.r.r'ZPPP'Z2[PPPPPP2[5PPP5PP7b7k=sPP=v>h>kPP'Z'ZPP>zPP'Z'ZPP'Z'Z'Z'Z'Z?O?w'ZP?zP@QDXGuGyPG|HWH['ZPPPH_Hk'RP'R'RP'RP'RP'RP'RP'R'R'RP'RPP'RPP'RP'RPHqH}IVPI^IdPI^PI^I^PPPI^PKrPK{LVL]KrPI^LfPI^PLmLsPLwM]MzNeLwLwNkNxLwLwLwLw! ^! d! g! l! o! y!!P!!]!!o!!u!#P!#V!#s!#y!$P!$Z!$a!$g!$y!%T!%Z!%a!%k!%q!%w!%}!&T!&Z!&e!&k!&u!&{!'U!'[!'k!'s!'}!(UPPPPPPPPPPP!([!(_!(e!(n!(x!)TPPPPPPPPPPPP!-u!/Z!3^!6oPP!6w!7W!7a!8Y!8P!8c!8i!8l!8o!8r!8z!9jPPPPPPPPPPPPPPPPP!9m!9q!9wP!:]!:a!:m!:v!;S!;j!;m!;p!;v!;|!<S!<VP!<_!<h!=d!=g]eOn#g$j)t,P'}`OTYZ[adnoprtxy}!P!Q!R!U!X!c!d!e!f!g!h!i!k!o!p!q!s!t!z#O#S#T#[#d#g#x#y#{#}$Q$e$g$h$j$q$}%S%Z%^%`%c%g%l%n%w%|&O&Z&_&h&j&k&u&x&|'P'W'Z'l'm'p'r's'w'|(O(S(W(](^(d(g(p(r(z(})^)e)g)k)l)p)t)z*O*Y*d*g*h*k*q*r*t*v*y*z*}+Q+U+V+Y+a+c+d+k+x+y,P,X,Y,],g,h,i,k,l,o,q,s,u,w,y,z-O-d-f-m-p-s.f.g/V/Z/s0c0d0e0f0h0i0j0k0l0n0r{!cQ#c#p$R$d$p%e%j%p%q&`'O'g(q(|)j*o*x+w,v0g}!dQ#c#p$R$d$p$u%e%j%p%q&`'O'g(q(|)j*o*x+w,v0g!P!eQ#c#p$R$d$p$u$v%e%j%p%q&`'O'g(q(|)j*o*x+w,v0g!R!fQ#c#p$R$d$p$u$v$w%e%j%p%q&`'O'g(q(|)j*o*x+w,v0g!T!gQ#c#p$R$d$p$u$v$w$x%e%j%p%q&`'O'g(q(|)j*o*x+w,v0g!V!hQ#c#p$R$d$p$u$v$w$x$y%e%j%p%q&`'O'g(q(|)j*o*x+w,v0g!Z!hQ!n#c#p$R$d$p$u$v$w$x$y$z%e%j%p%q&`'O'g(q(|)j*o*x+w,v0g'}TOTYZ[adnoprtxy}!P!Q!R!U!X!c!d!e!f!g!h!i!k!o!p!q!s!t!z#O#S#T#[#d#g#x#y#{#}$Q$e$g$h$j$q$}%S%Z%^%`%c%g%l%n%w%|&O&Z&_&h&j&k&u&x&|'P'W'Z'l'm'p'r's'w'|(O(S(W(](^(d(g(p(r(z(})^)e)g)k)l)p)t)z*O*Y*d*g*h*k*q*r*t*v*y*z*}+Q+U+V+Y+a+c+d+k+x+y,P,X,Y,],g,h,i,k,l,o,q,s,u,w,y,z-O-d-f-m-p-s.f.g/V/Z/s0c0d0e0f0h0i0j0k0l0n0r&eVOYZ[dnprxy}!P!Q!U!i!k!o!p!q!s!t#[#d#g#y#{#}$Q$h$j$}%S%Z%^%`%g%l%n%w%|&Z&_&j&k&u&x'P'W'Z'l'm'p'r's'w(O(W(^(d(g(p(r(z)^)e)g)p)t)z*O*Y*d*g*h*k*q*r*t*v*y*z*}+U+V+Y+a+d+k,P,X,Y,],g,h,i,k,l,o,q,s,u,w,y,z-O-d-f-m-p-s.f.g/V/Z/s0c0d0e0f0h0i0j0k0n0r%oXOYZ[dnrxy}!P!Q!U!i!k#[#d#g#y#{#}$Q$h$j$}%S%^%`%g%l%n%w%|&Z&_&j&k&u&x'P'W'Z'l'm'p'r's'w(O(W(^(d(g(p(r(z)^)e)g)p)t)z*O*Y*d*g*h*k*q*t*v*y*z*}+U+V+Y+a+d+k,P,X,Y,],g,h,i,k,l,o,s,u,w,y,z-O-d-f-m-p.f.g/V/Z0i0j0kQ#vqQ/[.kR0o0q't`OTYZ[adnoprtxy}!P!Q!R!U!X!c!d!e!f!g!h!k!o!p!q!s!t!z#O#S#T#[#d#g#x#y#{#}$Q$e$g$h$j$q$}%S%Z%^%`%c%g%l%n%w%|&O&Z&_&h&j&k&u&x&|'P'W'Z'l'p'r's'w'|(O(S(W(](^(d(g(p(r(z(})^)e)g)k)l)p)t)z*O*Y*g*h*k*q*r*t*v*y*z*}+Q+U+V+Y+a+c+d+k+x+y,P,X,Y,],h,i,k,l,o,q,s,u,w,y,z-O-d-f-m-p-s.f.g/V/Z/s0c0d0e0f0h0i0j0k0l0n0rh#jhz{$W$Z&l&q)S)X+f+g-RW#rq&].k0qQ$]|Q$a!OQ$n!VQ$o!WW$|!i'm*d,gS&[#s#tQ'S$iQ(s&UQ)U&nU)Y&s)Z+jW)a&w+m-T-{Q*Q']W*R'_,`-h.TQ+l)`S,_*S*TQ-Q+eQ-_,TQ-c,WQ.R-al.W-l.^._.a.z.|/R/j/o/t/y0U0Z0^Q/S.`Q/a.tQ/l/OU0P/u0S0[X0V/z0W0_0`R&Z#r!_!wYZ!P!Q!k%S%`%g'p'r's(O(W)g*g*h*k*q*t*v,h,i,k,l,o-m-p.f.g/ZR%^!vQ!{YQ%x#[Q&d#}Q&g$QR,{+YT.j-s/s!Y!jQ!n#c#p$R$d$p$u$v$w$x$y$z%e%j%p%q&`'O'g(q(|)j*o*x+w,v0gQ&X#kQ'c$oR*^'dR'l$|Q%V!mR/_.r'|_OTYZ[adnoprtxy}!P!Q!R!U!X!c!d!e!f!g!h!i!k!o!p!q!s!t!z#O#S#T#[#d#g#x#y#{#}$Q$e$g$h$j$q$}%S%Z%^%`%c%g%l%n%w%|&O&Z&_&h&j&k&u&x&|'P'W'Z'l'm'p'r's'w'|(O(S(W(](^(d(g(p(r(z(})^)e)g)k)l)p)t)z*O*Y*d*g*h*k*q*r*t*v*y*z*}+Q+U+V+Y+a+c+d+k+x+y,P,X,Y,],g,h,i,k,l,o,q,s,u,w,y,z-O-d-f-m-p-s.f.g/V/Z/s0c0d0e0f0h0i0j0k0l0n0rS#a_#b!P.[-l.^._.`.a.t.z.|/R/j/o/t/u/y/z0S0U0W0Z0[0^0_0`'|_OTYZ[adnoprtxy}!P!Q!R!U!X!c!d!e!f!g!h!i!k!o!p!q!s!t!z#O#S#T#[#d#g#x#y#{#}$Q$e$g$h$j$q$}%S%Z%^%`%c%g%l%n%w%|&O&Z&_&h&j&k&u&x&|'P'W'Z'l'm'p'r's'w'|(O(S(W(](^(d(g(p(r(z(})^)e)g)k)l)p)t)z*O*Y*d*g*h*k*q*r*t*v*y*z*}+Q+U+V+Y+a+c+d+k+x+y,P,X,Y,],g,h,i,k,l,o,q,s,u,w,y,z-O-d-f-m-p-s.f.g/V/Z/s0c0d0e0f0h0i0j0k0l0n0rT#a_#bT#^^#_R(o%xa(l%x(n(o+`,{-y-z.oT+[(k+]R-z,{Q$PsQ+l)aQ,^*RR-e,_X#}s$O$P&fQ&y$aQ'a$nQ'd$oR)s'SQ)b&wV-S+m-T-{ZgOn$j)t,PXkOn)t,PQ$k!TQ&z$bQ&{$cQ'^$mQ'b$oQ)q'RQ)x'WQ){'XQ)|'YQ*Z'`S*]'c'dQ+s)gQ+u)hQ+v)iQ+z)oS+|)r*[Q,Q)vQ,R)wS,S)y)zQ,d*^Q-V+rQ-W+tQ-Y+{S-Z+},OQ-`,UQ-b,VQ-|-XQ.O-[Q.P-^Q.Q-_Q.p-}Q.q.RQ/W.dR/r/XWkOn)t,PR#mjQ'`$nS)r'S'aR,O)sQ,]*RR-f,^Q*['`Q+})rR-[,OZiOjn)t,PQ'f$pR*`'gT-j,e-ku.c-l.^._.a.t.z.|/R/j/o/t/u/y0S0U0Z0[0^t.c-l.^._.a.t.z.|/R/j/o/t/u/y0S0U0Z0[0^Q/S.`X0V/z0W0_0`!P.Z-l.^._.`.a.t.z.|/R/j/o/t/u/y/z0S0U0W0Z0[0^0_0`Q.w.YR/f.xg.z.].{/b/i/n/|0O0Q0]0a0bu.b-l.^._.a.t.z.|/R/j/o/t/u/y0S0U0Z0[0^X.u.W.b/a0PR/c.tV0R/u0S0[R/X.dQnOS#on,PR,P)tQ&^#uR(x&^S%m#R#wS(_%m(bT(b%p&`Q%a!yQ%h!}W(P%a%h(U(YQ(U%eR(Y%jQ&i$RR)O&iQ(e%qQ*{(`T+R(e*{Q'n%OR*e'nS'q%R%SY*i'q*j,m-q.hU*j'r's'tU,m*k*l*mS-q,n,oR.h-rQ#Y]R%t#YQ#_^R%y#_Q(h%vS+W(h+XR+X(iQ+](kR,|+]Q#b_R%{#bQ#ebQ%}#cW&Q#e%}({+bQ({&cR+b0gQ$OsS&e$O&fR&f$PQ&v$_R)_&vQ&V#jR(t&VQ&m$VS)T&m+hR+h)UQ$Z{R&p$ZQ&t$]R)[&tQ+n)bR-U+nQ#hfR&S#hQ)f&zR+q)fQ&}$dS)m&})nR)n'OQ'V$kR)u'VQ'[$lS*P'[,ZR,Z*QQ,a*VR-i,aWjOn)t,PR#ljQ-k,eR.U-kd.{.]/b/i/n/|0O0Q0]0a0bR/h.{U.s.W/a0PR/`.sQ/{/nS0X/{0YR0Y/|S/v/b/cR0T/vQ.}.]R/k.}R!ZPXmOn)t,PWlOn)t,PR'T$jYfOn$j)t,PR&R#g[sOn#g$j)t,PR&d#}&dQOYZ[dnprxy}!P!Q!U!i!k!o!p!q!s!t#[#d#g#y#{#}$Q$h$j$}%S%Z%^%`%g%l%n%w%|&Z&_&j&k&u&x'P'W'Z'l'm'p'r's'w(O(W(^(d(g(p(r(z)^)e)g)p)t)z*O*Y*d*g*h*k*q*r*t*v*y*z*}+U+V+Y+a+d+k,P,X,Y,],g,h,i,k,l,o,q,s,u,w,y,z-O-d-f-m-p-s.f.g/V/Z/s0c0d0e0f0h0i0j0k0n0rQ!nTQ#caQ#poU$Rt%c(SS$d!R$gQ$p!XQ$u!cQ$v!dQ$w!eQ$x!fQ$y!gQ$z!hQ%e!zQ%j#OQ%p#SQ%q#TQ&`#xQ'O$eQ'g$qQ(q&OU(|&h(}+cW)j&|)l+x+yQ*o'|Q*x(]Q+w)kQ,v+QR0g0lQ!yYQ!}ZQ$b!PQ$c!QQ%R!kQ't%S^'{%`%g(O(W*q*t*v^*f'p*h,k,l-p.g/ZQ*l'rQ*m'sQ+t)gQ,j*gQ,n*kQ-n,hQ-o,iQ-r,oQ.e-mR/Y.f[bOn#g$j)t,P!^!vYZ!P!Q!k%S%`%g'p'r's(O(W)g*g*h*k*q*t*v,h,i,k,l,o-m-p.f.g/ZQ#R[Q#fdS#wrxQ$UyW$_}$Q'P)pS$l!U$hW${!i'm*d,gS%v#[+Y`&P#d%|(p(r(z+a-O0kQ&a#yQ&b#{Q&c#}Q'j$}Q'z%^W([%l(^*y*}Q(`%nQ(i%wQ(v&ZS(y&_0iQ)P&jQ)Q&kU)]&u)^+kQ)d&xQ)y'WY)}'Z*O,X,Y-dQ*b'lS*n'w0jW+P(d*z,s,wW+T(g+V,y,zQ+p)eQ,U)zQ,c*YQ,x+UQ-P+dQ-e,]Q-v,uQ.S-fR/q/VhUOn#d#g$j%|&_'w(p(r)t,P%U!uYZ[drxy}!P!Q!U!i!k#[#y#{#}$Q$h$}%S%^%`%g%l%n%w&Z&j&k&u&x'P'W'Z'l'm'p'r's(O(W(^(d(g(z)^)e)g)p)z*O*Y*d*g*h*k*q*t*v*y*z*}+U+V+Y+a+d+k,X,Y,],g,h,i,k,l,o,s,u,w,y,z-O-d-f-m-p.f.g/V/Z0i0j0kQ#qpW%W!o!s0d0nQ%X!pQ%Y!qQ%[!tQ%f0cS'v%Z0hQ'x0eQ'y0fQ,p*rQ-u,qS.i-s/sR0p0rU#uq.k0qR(w&][cOn#g$j)t,PZ!xY#[#}$Q+YQ#W[Q#zrR$TxQ%b!yQ%i!}Q%o#RQ'j${Q(V%eQ(Z%jQ(c%pQ(f%qQ*|(`Q,f*bQ-t,pQ.m-uR/].lQ$StQ(R%cR*s(SQ.l-sR/}/sR#QZR#V[R%Q!iQ%O!iV*c'm*d,g!Z!lQ!n#c#p$R$d$p$u$v$w$x$y$z%e%j%p%q&`'O'g(q(|)j*o*x+w,v0gR%T!kT#]^#_Q%x#[R,{+YQ(m%xS+_(n(oQ,}+`Q-x,{S.n-y-zR/^.oT+Z(k+]Q$`}Q&g$QQ)o'PR+{)pQ$XzQ)W&qR+i)XQ$XzQ&o$WQ)W&qR+i)XQ#khW$Vz$W&q)XQ$[{Q&r$ZZ)R&l)S+f+g-RR$^|R)c&wXlOn)t,PQ$f!RR'Q$gQ$m!UR'R$hR*X'_Q*V'_V-g,`-h.TQ.d-lQ/P.^R/Q._U.]-l.^._Q/U.aQ/b.tQ/g.zU/i.|/j/yQ/n/RQ/|/oQ0O/tU0Q/u0S0[Q0]0UQ0a0ZR0b0^R/T.`R/d.t",
  nodeNames: "\u26A0 print Escape { Comment Script AssignStatement * BinaryExpression BitOp BitOp BitOp BitOp ArithOp ArithOp @ ArithOp ** UnaryExpression ArithOp BitOp AwaitExpression await ) ( ParenthesizedExpression BinaryExpression or and CompareOp in not is UnaryExpression ConditionalExpression if else LambdaExpression lambda ParamList VariableName AssignOp , : NamedExpression AssignOp YieldExpression yield from TupleExpression ComprehensionExpression async for LambdaExpression ] [ ArrayExpression ArrayComprehensionExpression } { DictionaryExpression DictionaryComprehensionExpression SetExpression SetComprehensionExpression CallExpression ArgList AssignOp MemberExpression . PropertyName Number String FormatString FormatReplacement FormatSelfDoc FormatConversion FormatSpec FormatReplacement FormatSelfDoc ContinuedString Ellipsis None Boolean TypeDef AssignOp UpdateStatement UpdateOp ExpressionStatement DeleteStatement del PassStatement pass BreakStatement break ContinueStatement continue ReturnStatement return YieldStatement PrintStatement RaiseStatement raise ImportStatement import as ScopeStatement global nonlocal AssertStatement assert TypeDefinition type TypeParamList TypeParam StatementGroup ; IfStatement Body elif WhileStatement while ForStatement TryStatement try except finally WithStatement with FunctionDefinition def ParamList AssignOp TypeDef ClassDefinition class DecoratedStatement Decorator At MatchStatement match MatchBody MatchClause case CapturePattern LiteralPattern ArithOp ArithOp AsPattern OrPattern LogicOp AttributePattern SequencePattern MappingPattern StarPattern ClassPattern PatternArgList KeywordPattern KeywordPattern Guard",
  maxTerm: 277,
  context: trackIndent,
  nodeProps: [
    ["isolate", -5, 4, 71, 72, 73, 77, ""],
    ["group", -15, 6, 85, 87, 88, 90, 92, 94, 96, 98, 99, 100, 102, 105, 108, 110, "Statement Statement", -22, 8, 18, 21, 25, 40, 49, 50, 56, 57, 60, 61, 62, 63, 64, 67, 70, 71, 72, 79, 80, 81, 82, "Expression", -10, 114, 116, 119, 121, 122, 126, 128, 133, 135, 138, "Statement", -9, 143, 144, 147, 148, 150, 151, 152, 153, 154, "Pattern"],
    ["openedBy", 23, "(", 54, "[", 58, "{"],
    ["closedBy", 24, ")", 55, "]", 59, "}"]
  ],
  propSources: [pythonHighlighting],
  skippedNodes: [0, 4],
  repeatNodeCount: 34,
  tokenData: "!2|~R!`OX%TXY%oY[%T[]%o]p%Tpq%oqr'ars)Yst*xtu%Tuv,dvw-hwx.Uxy/tyz0[z{0r{|2S|}2p}!O3W!O!P4_!P!Q:Z!Q!R;k!R![>_![!]Do!]!^Es!^!_FZ!_!`Gk!`!aHX!a!b%T!b!cIf!c!dJU!d!eK^!e!hJU!h!i!#f!i!tJU!t!u!,|!u!wJU!w!x!.t!x!}JU!}#O!0S#O#P&o#P#Q!0j#Q#R!1Q#R#SJU#S#T%T#T#UJU#U#VK^#V#YJU#Y#Z!#f#Z#fJU#f#g!,|#g#iJU#i#j!.t#j#oJU#o#p!1n#p#q!1s#q#r!2a#r#s!2f#s$g%T$g;'SJU;'S;=`KW<%lOJU`%YT&n`O#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%T`%lP;=`<%l%To%v]&n`%c_OX%TXY%oY[%T[]%o]p%Tpq%oq#O%T#O#P&o#P#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%To&tX&n`OY%TYZ%oZ]%T]^%o^#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tc'f[&n`O!_%T!_!`([!`#T%T#T#U(r#U#f%T#f#g(r#g#h(r#h#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tc(cTmR&n`O#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tc(yT!mR&n`O#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk)aV&n`&[ZOr%Trs)vs#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk){V&n`Or%Trs*bs#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk*iT&n`&^ZO#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%To+PZS_&n`OY*xYZ%TZ]*x]^%T^#o*x#o#p+r#p#q*x#q#r+r#r;'S*x;'S;=`,^<%lO*x_+wTS_OY+rZ]+r^;'S+r;'S;=`,W<%lO+r_,ZP;=`<%l+ro,aP;=`<%l*xj,kV%rQ&n`O!_%T!_!`-Q!`#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tj-XT!xY&n`O#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tj-oV%lQ&n`O!_%T!_!`-Q!`#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk.]V&n`&ZZOw%Twx.rx#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk.wV&n`Ow%Twx/^x#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk/eT&n`&]ZO#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk/{ThZ&n`O#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tc0cTgR&n`O#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk0yXVZ&n`Oz%Tz{1f{!_%T!_!`-Q!`#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk1mVaR&n`O!_%T!_!`-Q!`#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk2ZV%oZ&n`O!_%T!_!`-Q!`#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tc2wTzR&n`O#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%To3_W%pZ&n`O!_%T!_!`-Q!`!a3w!a#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Td4OT&{S&n`O#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk4fX!fQ&n`O!O%T!O!P5R!P!Q%T!Q![6T![#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk5WV&n`O!O%T!O!P5m!P#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk5tT!rZ&n`O#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Ti6[a!hX&n`O!Q%T!Q![6T![!g%T!g!h7a!h!l%T!l!m9s!m#R%T#R#S6T#S#X%T#X#Y7a#Y#^%T#^#_9s#_#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Ti7fZ&n`O{%T{|8X|}%T}!O8X!O!Q%T!Q![8s![#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Ti8^V&n`O!Q%T!Q![8s![#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Ti8z]!hX&n`O!Q%T!Q![8s![!l%T!l!m9s!m#R%T#R#S8s#S#^%T#^#_9s#_#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Ti9zT!hX&n`O#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk:bX%qR&n`O!P%T!P!Q:}!Q!_%T!_!`-Q!`#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tj;UV%sQ&n`O!_%T!_!`-Q!`#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Ti;ro!hX&n`O!O%T!O!P=s!P!Q%T!Q![>_![!d%T!d!e?q!e!g%T!g!h7a!h!l%T!l!m9s!m!q%T!q!rA]!r!z%T!z!{Bq!{#R%T#R#S>_#S#U%T#U#V?q#V#X%T#X#Y7a#Y#^%T#^#_9s#_#c%T#c#dA]#d#l%T#l#mBq#m#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Ti=xV&n`O!Q%T!Q![6T![#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Ti>fc!hX&n`O!O%T!O!P=s!P!Q%T!Q![>_![!g%T!g!h7a!h!l%T!l!m9s!m#R%T#R#S>_#S#X%T#X#Y7a#Y#^%T#^#_9s#_#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Ti?vY&n`O!Q%T!Q!R@f!R!S@f!S#R%T#R#S@f#S#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Ti@mY!hX&n`O!Q%T!Q!R@f!R!S@f!S#R%T#R#S@f#S#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%TiAbX&n`O!Q%T!Q!YA}!Y#R%T#R#SA}#S#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%TiBUX!hX&n`O!Q%T!Q!YA}!Y#R%T#R#SA}#S#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%TiBv]&n`O!Q%T!Q![Co![!c%T!c!iCo!i#R%T#R#SCo#S#T%T#T#ZCo#Z#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%TiCv]!hX&n`O!Q%T!Q![Co![!c%T!c!iCo!i#R%T#R#SCo#S#T%T#T#ZCo#Z#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%ToDvV{_&n`O!_%T!_!`E]!`#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%TcEdT%{R&n`O#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%TkEzT#gZ&n`O#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%TkFbXmR&n`O!^%T!^!_F}!_!`([!`!a([!a#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%TjGUV%mQ&n`O!_%T!_!`-Q!`#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%TkGrV%zZ&n`O!_%T!_!`([!`#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%TkH`WmR&n`O!_%T!_!`([!`!aHx!a#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%TjIPV%nQ&n`O!_%T!_!`-Q!`#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%TkIoV_Q#}P&n`O!_%T!_!`-Q!`#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%ToJ_]&n`&YS%uZO!Q%T!Q![JU![!c%T!c!}JU!}#R%T#R#SJU#S#T%T#T#oJU#p#q%T#r$g%T$g;'SJU;'S;=`KW<%lOJUoKZP;=`<%lJUoKge&n`&YS%uZOr%Trs)Ysw%Twx.Ux!Q%T!Q![JU![!c%T!c!tJU!t!uLx!u!}JU!}#R%T#R#SJU#S#T%T#T#fJU#f#gLx#g#oJU#p#q%T#r$g%T$g;'SJU;'S;=`KW<%lOJUoMRa&n`&YS%uZOr%TrsNWsw%Twx! vx!Q%T!Q![JU![!c%T!c!}JU!}#R%T#R#SJU#S#T%T#T#oJU#p#q%T#r$g%T$g;'SJU;'S;=`KW<%lOJUkN_V&n`&`ZOr%TrsNts#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%TkNyV&n`Or%Trs! `s#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk! gT&n`&bZO#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk! }V&n`&_ZOw%Twx!!dx#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk!!iV&n`Ow%Twx!#Ox#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk!#VT&n`&aZO#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%To!#oe&n`&YS%uZOr%Trs!%Qsw%Twx!&px!Q%T!Q![JU![!c%T!c!tJU!t!u!(`!u!}JU!}#R%T#R#SJU#S#T%T#T#fJU#f#g!(`#g#oJU#p#q%T#r$g%T$g;'SJU;'S;=`KW<%lOJUk!%XV&n`&dZOr%Trs!%ns#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk!%sV&n`Or%Trs!&Ys#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk!&aT&n`&fZO#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk!&wV&n`&cZOw%Twx!'^x#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk!'cV&n`Ow%Twx!'xx#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk!(PT&n`&eZO#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%To!(ia&n`&YS%uZOr%Trs!)nsw%Twx!+^x!Q%T!Q![JU![!c%T!c!}JU!}#R%T#R#SJU#S#T%T#T#oJU#p#q%T#r$g%T$g;'SJU;'S;=`KW<%lOJUk!)uV&n`&hZOr%Trs!*[s#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk!*aV&n`Or%Trs!*vs#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk!*}T&n`&jZO#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk!+eV&n`&gZOw%Twx!+zx#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk!,PV&n`Ow%Twx!,fx#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tk!,mT&n`&iZO#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%To!-Vi&n`&YS%uZOr%TrsNWsw%Twx! vx!Q%T!Q![JU![!c%T!c!dJU!d!eLx!e!hJU!h!i!(`!i!}JU!}#R%T#R#SJU#S#T%T#T#UJU#U#VLx#V#YJU#Y#Z!(`#Z#oJU#p#q%T#r$g%T$g;'SJU;'S;=`KW<%lOJUo!.}a&n`&YS%uZOr%Trs)Ysw%Twx.Ux!Q%T!Q![JU![!c%T!c!}JU!}#R%T#R#SJU#S#T%T#T#oJU#p#q%T#r$g%T$g;'SJU;'S;=`KW<%lOJUk!0ZT!XZ&n`O#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tc!0qT!WR&n`O#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%Tj!1XV%kQ&n`O!_%T!_!`-Q!`#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%T~!1sO!]~k!1zV%jR&n`O!_%T!_!`-Q!`#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%T~!2fO![~i!2mT%tX&n`O#o%T#p#q%T#r;'S%T;'S;=`%i<%lO%T",
  tokenizers: [legacyPrint, indentation, newlines, strings, 0, 1, 2, 3, 4],
  topRules: { "Script": [0, 5] },
  specialized: [{ term: 221, get: (value) => spec_identifier[value] || -1 }],
  tokenPrec: 7668
});
function runpyReturnError(code) {
  if (typeof code !== "string" || !/\breturn\b/.test(code))
    return;
  const source = code.replace(/\r\n?/g, "\n").replace(/^[ \t\f]*\f/gm, "");
  const cursor = parser.parse(source).cursor();
  do {
    if (cursor.name !== "ReturnStatement")
      continue;
    let scope = cursor.node.parent;
    while (scope && scope.name !== "FunctionDefinition" && scope.name !== "ClassDefinition")
      scope = scope.parent;
    if (scope?.name !== "FunctionDefinition") {
      const line = source.slice(0, cursor.from).split("\n").length;
      return `line ${line}: 'return' outside function. Run Python uses the final expression as the query result. Use an expression at module level, or put the return inside a function and call it.`;
    }
  } while (cursor.next());
}
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
  const strings2 = isPlainObject(options) ? QUERY_TOGGLES.filter((key) => typeof options[key] === "string") : [];
  const messages = [
    ...issues.map((issue2) => issue2.message),
    ...strings2.filter((key) => !issues.some((issue2) => issue2.path === key)).map((key) => `${key} must be sent as a boolean, not ${JSON.stringify(options[key])}.`)
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
var propertyName2 = (n) => n.computed ? n.property?.type === "StringLiteral" ? n.property.value : void 0 : n.property?.name;
var keyName = (p) => p.computed ? void 0 : p.key?.type === "Identifier" ? p.key.name : p.key?.type === "StringLiteral" ? p.key.value : void 0;
var property2 = (n, key) => n?.type === "ObjectExpression" ? n.properties.find((p) => p.type === "ObjectProperty" && keyName(p) === key)?.value : void 0;
function unwrap(n) {
  while (n?.type === "CallExpression") {
    if (isMember(n.callee) && n.callee.object?.name === "JSON" && propertyName2(n.callee) === "stringify" && n.arguments.length >= 1) {
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
    const method = isMember(callee) ? propertyName2(callee) ?? "" : "";
    if (ARRAY_METHODS.has(method)) {
      return !STRING_OR_ARRAY_METHODS.has(method) || isArrayValue(callee.object);
    }
    if (isMember(callee) && ["Array", "Object"].includes(callee.object?.name) && ["from", "values"].includes(propertyName2(callee) ?? ""))
      return true;
    return false;
  }
  return isMember(n) && ROW_COLLECTIONS.has(propertyName2(n) ?? "");
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
    if (typeof value !== "string" || (field === "workflowId" ? !UUID.test(value) : !value.trim() || value.length > 255))
      errors.push({
        code: "invalid_workflow_target",
        path: field,
        message: `Workflow query options.${field} must be a literal workflow ${field === "workflowId" ? "ID from list_workflows/get_workflow" : "version name, __current_branch__, __default_branch_draft__, or legacy version UUID"}. A query and its success/failure handlers do not establish the workflow mapping.`
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
    const operator2 = raw === "," || raw === "(" ? "a function argument" : raw;
    if (seen.has(operator2))
      continue;
    seen.add(operator2);
    issues.push({
      code: "unquoted_sql_binding",
      path: "query",
      message: `SQL uses an unquoted binding (as ${operator2}). ToolJet splices bindings in as raw text, so when that component is empty \u2014 its state on page load \u2014 the statement becomes nothing at that position and fails with a SQL syntax error; the table then shows "No data" and the page looks broken on first open. Pass it as a parameter instead: put \`:name\` in the statement and the binding in query_params, e.g. \`WHERE priority = :priority\` with query_params [["priority", "{{components.priorityFilter.value}}"]]. That fixes the empty case and the escaping together. Quoting it ('{{...}}') only fixes the empty case and leaves the value spliced into the statement as text.`
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
  if (kind === "runpy") {
    const message = runpyReturnError(options.code);
    if (message)
      errors.push({ code: "runpy_return_outside_function", path: "code", message });
  }
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
  const own = [...allowedTopLevel].filter((k) => !(k in COMMON_QUERY_OPTION_FIELDS));
  for (const key of Object.keys(options)) {
    if (allowedTopLevel.has(key))
      continue;
    const exactReplacement = KNOWN_IGNORED_KEYS[key];
    const nestedReplacement = suffixSuggestion(key, fields);
    const replacement = exactReplacement ?? nestedReplacement;
    const meant = key.length >= 4 ? own.filter((f) => f !== key && options[f] === void 0 && (f.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(f.toLowerCase()))) : [];
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
      const nested = Object.entries(columns).find(([, clause]) => isObject(clause) && (isColumnRecordMap(clause) || isColumnRecordMap(clause.value)));
      if (nested) {
        errors.push({
          code: "malformed_write_columns",
          path: `${columnsPath}.${nested[0]}`,
          message: `ToolJet DB ${operation} "${columnsPath}" holds a whole column map inside "${nested[0]}". ToolJet writes each entry as one column, so this inserts a column named "${nested[1].column ?? nested[0]}" and fails with "Could not find the column ... in the schema cache". Put the {column, value} entries directly under "${columnsPath}" (ToolJet DB has no "columns" level; that is the SQL plugins' shape).`
        });
      } else if (flat.length > 0) {
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
  if (kind === "tooljetdb" && operation === "delete_rows") {
    const limit = valueAtPath(options, "delete_rows.limit");
    const hasOrder = ["order_column", "order_column_id"].some((key) => {
      const value = valueAtPath(options, `delete_rows.${key}`);
      return typeof value === "string" && value.trim() !== "";
    });
    if ((limit === void 0 || Boolean(limit)) && !hasOrder) {
      errors.push({
        code: "missing_delete_order",
        path: "delete_rows.order_column",
        message: "ToolJet DB delete_rows defaults to limit 1 and bounded deletes require an explicit order. Set delete_rows.order_column or order_column_id to the actual primary key from get_table_schema. Preserve the intended filters and limit; do not assume the primary key is named id."
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
function isColumnRecordMap(value) {
  return isObject(value) && Object.keys(value).length > 0 && Object.values(value).every((clause) => isObject(clause) && typeof clause.column === "string" && clause.column !== "");
}
function normalizeWriteColumnMap(columns) {
  if (!isObject(columns) || Object.keys(columns).length === 0)
    return null;
  const entries = Object.entries(columns);
  if (entries.every(([, clause]) => isObject(clause) && typeof clause.column === "string" && clause.column !== "")) {
    return null;
  }
  if (entries.some(([, clause]) => isColumnRecordMap(clause)))
    return null;
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
    const createRow = options.create_row;
    const only = isObject(createRow) && Object.keys(createRow).length === 1 ? Object.values(createRow)[0] : void 0;
    const unwrapped = isColumnRecordMap(createRow?.columns) ? createRow.columns : isObject(only) && only.column === "columns" && isColumnRecordMap(only.value) ? only.value : createRow;
    const normalized = normalizeWriteColumnMap(unwrapped);
    if (normalized)
      return { ...options, create_row: normalized };
    return unwrapped === createRow ? options : { ...options, create_row: unwrapped };
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
export {
  assertPersistableQueryToggles as a,
  bindingSpans as b,
  normalizeWorkflowQueryOptions as c,
  assertWorkflowQueryOptions as d,
  normalizeQueryToggles as e,
  arithmeticWriteWarning as f,
  issueMessages as i,
  lintBindingNames as l,
  normalizeQueryOptions as n,
  queryToggleIssues as q,
  runpyReturnError as r,
  toggleRewriteWarning as t,
  validateQueryOptions as v,
  workflowMappingMatches as w
};
