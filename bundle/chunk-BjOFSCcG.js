import { createRequire } from "node:module";
import { L as LoopLabelKind, O as OptionFlags, E as ExpressionErrors, f as functionFlags, n as newParameterDeclarationScope, P as ParseBindingListFlags, a as ParamKind, b as newExpressionScope, c as LValParser, d as newAsyncArrowScope, s as setInnerComments, e as newArrowHeadScope, T as Token } from "./chunk-qhyW4MeS.js";
import { t as tt, E as Errors, a9 as createPositionWithColumnOffset, D as equalsTo, a4 as colon, a6 as semicolon, z as isIdentifierStart, c as isIdentifierChar, A as backslash, y as leftSquareBracket, x as leftCurlyBrace, a8 as leftParenthesis, C as dot, aC as tokenIsIdentifier, e as ScopeFlag, B as BindingFlag, aO as tokenIsLoop, a7 as rightParenthesis, ak as ClassElementType, a5 as comma, P as quotationMark, O as apostrophe, aD as tokenIsKeywordOrIdentifier, au as lowercaseF, aP as tokenIsAssignment, aH as tokenCanStartExpression, aI as tokenOperatorPrecedence, aQ as tokenIsOperator, aR as tokenIsRightAssociative, aS as UnparenthesizedPipeBodyDescriptions, aT as tokenIsPrefix, aU as tokenIsPostfix, aG as tokenIsTemplate, g as greaterThan, ai as tokenLabelName, aV as canBeReservedWord, aW as isKeyword, aX as isReservedWord, i as isStrictBindReservedWord, aY as isStrictReservedWord, r as rightSquareBracket, a as rightCurlyBrace, aZ as getExportedToken, a3 as graveAccent, a_ as tokenKeywordOrIdentifierIsKeyword } from "./chunk-CPO3lpSy.js";
createRequire(import.meta.url);
var ExpressionParser = class extends LValParser {
  // For object literal, check if property __proto__ has been used more than once.
  // If the expression is a destructuring assignment, then __proto__ may appear
  // multiple times. Otherwise, __proto__ is a duplicated key.
  // For record expression, check if property __proto__ exists
  checkProto(prop, isRecord, sawProto, refExpressionErrors) {
    if (prop.type === "SpreadElement" || this.isObjectMethod(prop) || prop.computed || prop.shorthand) {
      return sawProto;
    }
    const key = prop.key;
    const name = key.type === "Identifier" ? key.name : key.value;
    if (name === "__proto__") {
      if (isRecord) {
        this.raise(Errors.RecordNoProto, key);
        return true;
      }
      if (sawProto) {
        if (refExpressionErrors) {
          if (refExpressionErrors.doubleProtoLoc === null) {
            refExpressionErrors.doubleProtoLoc = key.loc.start;
          }
        } else {
          this.raise(Errors.DuplicateProto, key);
        }
      }
      return true;
    }
    return sawProto;
  }
  shouldExitDescending(expr, potentialArrowAt) {
    return expr.type === "ArrowFunctionExpression" && this.offsetToSourcePos(expr.start) === potentialArrowAt;
  }
  // Convenience method to parse an Expression only
  getExpression() {
    this.enterInitialScopes();
    this.nextToken();
    if (this.match(tt.eof)) {
      throw this.raise(Errors.ParseExpressionEmptyInput, this.state.startLoc);
    }
    const expr = this.parseExpression();
    if (!this.match(tt.eof)) {
      throw this.raise(Errors.ParseExpressionExpectsEOF, this.state.startLoc, {
        unexpected: this.input.codePointAt(this.state.start)
      });
    }
    this.finalizeRemainingComments();
    expr.comments = this.comments;
    expr.errors = this.state.errors;
    if (this.optionFlags & OptionFlags.Tokens) {
      expr.tokens = this.tokens;
    }
    return expr;
  }
  // ### Expression parsing
  // These nest, from the most general expression type at the top to
  // 'atomic', nondivisible expression types at the bottom. Most of
  // the functions will simply let the function (s) below them parse,
  // and, *if* the syntactic construct they handle is present, wrap
  // the AST node that the inner parser gave them in another node.
  // Parse a full expression.
  // - `disallowIn`
  //   is used to forbid the `in` operator (in for loops initialization expressions)
  //   When `disallowIn` is true, the production parameter [In] is not present.
  // - `refExpressionErrors `
  //   provides reference for storing '=' operator inside shorthand
  //   property assignment in contexts where both object expression
  //   and object pattern might appear (so it's possible to raise
  //   delayed syntax error at correct position).
  parseExpression(disallowIn, refExpressionErrors) {
    if (disallowIn) {
      return this.disallowInAnd(
        () => this.parseExpressionBase(refExpressionErrors)
      );
    }
    return this.allowInAnd(() => this.parseExpressionBase(refExpressionErrors));
  }
  // https://tc39.es/ecma262/#prod-Expression
  parseExpressionBase(refExpressionErrors) {
    const startLoc = this.state.startLoc;
    const expr = this.parseMaybeAssign(refExpressionErrors);
    if (this.match(tt.comma)) {
      const node = this.startNodeAt(startLoc);
      node.expressions = [expr];
      while (this.eat(tt.comma)) {
        node.expressions.push(this.parseMaybeAssign(refExpressionErrors));
      }
      this.toReferencedList(node.expressions);
      return this.finishNode(node, "SequenceExpression");
    }
    return expr;
  }
  // Set [~In] parameter for assignment expression
  parseMaybeAssignDisallowIn(refExpressionErrors, afterLeftParse) {
    return this.disallowInAnd(
      () => this.parseMaybeAssign(refExpressionErrors, afterLeftParse)
    );
  }
  // Set [+In] parameter for assignment expression
  parseMaybeAssignAllowIn(refExpressionErrors, afterLeftParse) {
    return this.allowInAnd(
      () => this.parseMaybeAssign(refExpressionErrors, afterLeftParse)
    );
  }
  // This method is only used by
  // the typescript and flow plugins.
  setOptionalParametersError(refExpressionErrors) {
    refExpressionErrors.optionalParametersLoc = this.state.startLoc;
  }
  // Parse an assignment expression. This includes applications of
  // operators like `+=`.
  // https://tc39.es/ecma262/#prod-AssignmentExpression
  parseMaybeAssign(refExpressionErrors, afterLeftParse) {
    const startLoc = this.state.startLoc;
    const isYield = this.isContextual(tt._yield);
    if (isYield) {
      if (this.prodParam.hasYield) {
        this.next();
        let left2 = this.parseYield(startLoc);
        if (afterLeftParse) {
          left2 = afterLeftParse.call(this, left2, startLoc);
        }
        return left2;
      }
    }
    let ownExpressionErrors;
    if (refExpressionErrors) {
      ownExpressionErrors = false;
    } else {
      refExpressionErrors = new ExpressionErrors();
      ownExpressionErrors = true;
    }
    const { type } = this.state;
    if (type === tt.parenL || tokenIsIdentifier(type)) {
      this.state.potentialArrowAt = this.state.start;
    }
    let left = this.parseMaybeConditional(refExpressionErrors);
    if (afterLeftParse) {
      left = afterLeftParse.call(this, left, startLoc);
    }
    if (tokenIsAssignment(this.state.type)) {
      const node = this.startNodeAt(startLoc);
      const operator = this.state.value;
      node.operator = operator;
      if (this.match(tt.eq)) {
        this.toAssignable(
          left,
          /* isLHS */
          true
        );
        node.left = left;
        const startIndex = startLoc.index;
        if (refExpressionErrors.doubleProtoLoc != null && refExpressionErrors.doubleProtoLoc.index >= startIndex) {
          refExpressionErrors.doubleProtoLoc = null;
        }
        if (refExpressionErrors.shorthandAssignLoc != null && refExpressionErrors.shorthandAssignLoc.index >= startIndex) {
          refExpressionErrors.shorthandAssignLoc = null;
        }
        if (refExpressionErrors.privateKeyLoc != null && refExpressionErrors.privateKeyLoc.index >= startIndex) {
          this.checkDestructuringPrivate(refExpressionErrors);
          refExpressionErrors.privateKeyLoc = null;
        }
        if (refExpressionErrors.voidPatternLoc != null && refExpressionErrors.voidPatternLoc.index >= startIndex) {
          refExpressionErrors.voidPatternLoc = null;
        }
      } else {
        node.left = left;
      }
      this.next();
      node.right = this.parseMaybeAssign();
      this.checkLVal(
        left,
        this.finishNode(node, "AssignmentExpression"),
        void 0,
        void 0,
        void 0,
        void 0,
        operator === "||=" || operator === "&&=" || operator === "??="
      );
      return node;
    } else if (ownExpressionErrors) {
      this.checkExpressionErrors(refExpressionErrors, true);
    }
    if (isYield) {
      const { type: type2 } = this.state;
      const startsExpr = this.hasPlugin("v8intrinsic") ? tokenCanStartExpression(type2) : tokenCanStartExpression(type2) && !this.match(tt.modulo);
      if (startsExpr && !this.isAmbiguousPrefixOrIdentifier()) {
        this.raiseOverwrite(Errors.YieldNotInGeneratorFunction, startLoc);
        return this.parseYield(startLoc);
      }
    }
    return left;
  }
  // Parse a ternary conditional (`?:`) operator.
  // https://tc39.es/ecma262/#prod-ConditionalExpression
  parseMaybeConditional(refExpressionErrors) {
    const startLoc = this.state.startLoc;
    const potentialArrowAt = this.state.potentialArrowAt;
    const expr = this.parseExprOps(refExpressionErrors);
    if (this.shouldExitDescending(expr, potentialArrowAt)) {
      return expr;
    }
    return this.parseConditional(expr, startLoc, refExpressionErrors);
  }
  parseConditional(expr, startLoc, refExpressionErrors) {
    if (this.eat(tt.question)) {
      const node = this.startNodeAt(startLoc);
      node.test = expr;
      node.consequent = this.parseMaybeAssignAllowIn();
      this.expect(tt.colon);
      node.alternate = this.parseMaybeAssign();
      return this.finishNode(node, "ConditionalExpression");
    }
    return expr;
  }
  parseMaybeUnaryOrPrivate(refExpressionErrors) {
    return this.match(tt.privateName) ? this.parsePrivateName() : this.parseMaybeUnary(refExpressionErrors);
  }
  // Start the precedence parser.
  // https://tc39.es/ecma262/#prod-ShortCircuitExpression
  parseExprOps(refExpressionErrors) {
    const startLoc = this.state.startLoc;
    const potentialArrowAt = this.state.potentialArrowAt;
    const expr = this.parseMaybeUnaryOrPrivate(refExpressionErrors);
    if (this.shouldExitDescending(expr, potentialArrowAt)) {
      return expr;
    }
    return this.parseExprOp(expr, startLoc, -1);
  }
  // Parse binary operators with the operator precedence parsing
  // algorithm. `left` is the left-hand side of the operator.
  // `minPrec` provides context that allows the function to stop and
  // defer further parser to one of its callers when it encounters an
  // operator that has a lower precedence than the set it is parsing.
  parseExprOp(left, leftStartLoc, minPrec) {
    if (this.isPrivateName(left)) {
      const value = this.getPrivateNameSV(left);
      if (minPrec >= tokenOperatorPrecedence(tt._in) || !this.prodParam.hasIn || !this.match(tt._in)) {
        this.raise(Errors.PrivateInExpectedIn, left, {
          identifierName: value
        });
      }
      this.classScope.usePrivateName(value, left.loc.start);
    }
    const op = this.state.type;
    if (tokenIsOperator(op) && (this.prodParam.hasIn || !this.match(tt._in))) {
      let prec = tokenOperatorPrecedence(op);
      if (prec > minPrec) {
        if (op === tt.pipeline) {
          this.expectPlugin("pipelineOperator");
          if (this.state.inFSharpPipelineDirectBody) {
            return left;
          }
          this.checkPipelineAtInfixOperator(left, leftStartLoc);
        }
        const node = this.startNodeAt(
          leftStartLoc
        );
        node.left = left;
        node.operator = this.state.value;
        const logical = op === tt.logicalOR || op === tt.logicalAND;
        const coalesce = op === tt.nullishCoalescing;
        if (coalesce) {
          prec = tokenOperatorPrecedence(tt.logicalAND);
        }
        this.next();
        if (op === tt.pipeline && // @ts-expect-error: Only in Babel 7
        this.hasPlugin(["pipelineOperator", { proposal: "minimal" }])) {
          if (this.state.type === tt._await && this.prodParam.hasAwait) {
            throw this.raise(
              Errors.UnexpectedAwaitAfterPipelineBody,
              this.state.startLoc
            );
          }
        }
        node.right = this.parseExprOpRightExpr(op, prec);
        const finishedNode = this.finishNode(
          node,
          logical || coalesce ? "LogicalExpression" : "BinaryExpression"
        );
        const nextOp = this.state.type;
        if (coalesce && (nextOp === tt.logicalOR || nextOp === tt.logicalAND) || logical && nextOp === tt.nullishCoalescing) {
          throw this.raise(
            Errors.MixingCoalesceWithLogical,
            this.state.startLoc
          );
        }
        return this.parseExprOp(finishedNode, leftStartLoc, minPrec);
      }
    }
    return left;
  }
  // Helper function for `parseExprOp`. Parse the right-hand side of binary-
  // operator expressions, then apply any operator-specific functions.
  parseExprOpRightExpr(op, prec) {
    const startLoc = this.state.startLoc;
    switch (op) {
      case tt.pipeline:
        switch (this.getPluginOption("pipelineOperator", "proposal")) {
          case "hack":
            return this.withTopicBindingContext(() => {
              return this.parseHackPipeBody();
            });
          case "fsharp":
            return this.withSoloAwaitPermittingContext(() => {
              return this.parseFSharpPipelineBody(prec);
            });
        }
        if (
          // @ts-expect-error: Babel 7 only
          this.getPluginOption("pipelineOperator", "proposal") === "smart"
        ) {
          return this.withTopicBindingContext(() => {
            if (this.prodParam.hasYield && this.isContextual(tt._yield)) {
              throw this.raise(Errors.PipeBodyIsTighter, this.state.startLoc);
            }
            return this.parseSmartPipelineBodyInStyle(
              this.parseExprOpBaseRightExpr(op, prec),
              startLoc
            );
          });
        }
      // Falls through.
      default:
        return this.parseExprOpBaseRightExpr(op, prec);
    }
  }
  // Helper function for `parseExprOpRightExpr`. Parse the right-hand side of
  // binary-operator expressions without applying any operator-specific functions.
  parseExprOpBaseRightExpr(op, prec) {
    const startLoc = this.state.startLoc;
    return this.parseExprOp(
      this.parseMaybeUnaryOrPrivate(),
      startLoc,
      tokenIsRightAssociative(op) ? prec - 1 : prec
    );
  }
  parseHackPipeBody() {
    const { startLoc } = this.state;
    const body = this.parseMaybeAssign();
    const requiredParentheses = UnparenthesizedPipeBodyDescriptions.has(
      // @ts-expect-error TS2345: Argument of type 'string' is not assignable to parameter of type '"ArrowFunctionExpression" | "YieldExpression" | "AssignmentExpression" | "ConditionalExpression"'.
      body.type
    );
    if (requiredParentheses && !body.extra?.parenthesized) {
      this.raise(Errors.PipeUnparenthesizedBody, startLoc, {
        type: body.type
      });
    }
    if (!this.topicReferenceWasUsedInCurrentContext()) {
      this.raise(Errors.PipeTopicUnused, startLoc);
    }
    return body;
  }
  checkExponentialAfterUnary(node) {
    if (this.match(tt.exponent)) {
      this.raise(Errors.UnexpectedTokenUnaryExponentiation, node.argument);
    }
  }
  // Parse unary operators, both prefix and postfix.
  // https://tc39.es/ecma262/#prod-UnaryExpression
  parseMaybeUnary(refExpressionErrors, sawUnary) {
    const startLoc = this.state.startLoc;
    const isAwait = this.isContextual(tt._await);
    if (isAwait && this.recordAwaitIfAllowed()) {
      this.next();
      const expr2 = this.parseAwait(startLoc);
      if (!sawUnary) this.checkExponentialAfterUnary(expr2);
      return expr2;
    }
    const update = this.match(tt.incDec);
    const node = this.startNode();
    if (tokenIsPrefix(this.state.type)) {
      node.operator = this.state.value;
      node.prefix = true;
      if (this.match(tt._throw)) {
        this.expectPlugin("throwExpressions");
      }
      const isDelete = this.match(tt._delete);
      this.next();
      node.argument = this.parseMaybeUnary(null, true);
      this.checkExpressionErrors(refExpressionErrors, true);
      if (this.state.strict && isDelete) {
        const arg = node.argument;
        if (arg.type === "Identifier") {
          this.raise(Errors.StrictDelete, node);
        } else if (this.hasPropertyAsPrivateName(arg)) {
          this.raise(Errors.DeletePrivateField, node);
        }
      }
      if (!update) {
        if (!sawUnary) {
          this.checkExponentialAfterUnary(node);
        }
        return this.finishNode(node, "UnaryExpression");
      }
    }
    const expr = this.parseUpdate(
      // @ts-expect-error using "Undone" node as "done"
      node,
      update,
      refExpressionErrors
    );
    if (isAwait) {
      const { type } = this.state;
      const startsExpr = this.hasPlugin("v8intrinsic") ? tokenCanStartExpression(type) : tokenCanStartExpression(type) && !this.match(tt.modulo);
      if (startsExpr && !this.isAmbiguousPrefixOrIdentifier()) {
        this.raiseOverwrite(Errors.AwaitNotInAsyncContext, startLoc);
        return this.parseAwait(startLoc);
      }
    }
    return expr;
  }
  // https://tc39.es/ecma262/#prod-UpdateExpression
  parseUpdate(node, update, refExpressionErrors) {
    if (update) {
      const updateExpressionNode = node;
      this.checkLVal(
        updateExpressionNode.argument,
        this.finishNode(updateExpressionNode, "UpdateExpression")
      );
      return node;
    }
    const startLoc = this.state.startLoc;
    let expr = this.parseExprSubscripts(refExpressionErrors);
    if (this.checkExpressionErrors(refExpressionErrors, false)) return expr;
    while (tokenIsPostfix(this.state.type) && !this.canInsertSemicolon()) {
      const node2 = this.startNodeAt(startLoc);
      node2.operator = this.state.value;
      node2.prefix = false;
      node2.argument = expr;
      this.next();
      this.checkLVal(expr, expr = this.finishNode(node2, "UpdateExpression"));
    }
    return expr;
  }
  // Parse call, dot, and `[]`-subscript expressions.
  // https://tc39.es/ecma262/#prod-LeftHandSideExpression
  parseExprSubscripts(refExpressionErrors) {
    const startLoc = this.state.startLoc;
    const potentialArrowAt = this.state.potentialArrowAt;
    const expr = this.parseExprAtom(refExpressionErrors);
    if (this.shouldExitDescending(expr, potentialArrowAt)) {
      return expr;
    }
    return this.parseSubscripts(expr, startLoc);
  }
  parseSubscripts(base, startLoc, noCalls) {
    const state = {
      optionalChainMember: false,
      maybeAsyncArrow: this.atPossibleAsyncArrow(base),
      stop: false
    };
    do {
      base = this.parseSubscript(base, startLoc, noCalls, state);
      state.maybeAsyncArrow = false;
    } while (!state.stop);
    return base;
  }
  /**
   * @param state Set 'state.stop = true' to indicate that we should stop parsing subscripts.
   *   state.optionalChainMember to indicate that the member is currently in OptionalChain
   */
  parseSubscript(base, startLoc, noCalls, state) {
    const { type } = this.state;
    if (!noCalls && type === tt.doubleColon) {
      return this.parseBind(base, startLoc, state);
    } else if (tokenIsTemplate(type)) {
      return this.parseTaggedTemplateExpression(base, startLoc, state);
    }
    let optional = false;
    if (type === tt.questionDot) {
      if (noCalls) {
        this.raise(Errors.OptionalChainingNoNew, this.state.startLoc);
        if (this.lookaheadCharCode() === leftParenthesis) {
          return this.stopParseSubscript(base, state);
        }
      }
      state.optionalChainMember = optional = true;
      this.next();
    }
    if (!noCalls && this.match(tt.parenL)) {
      return this.parseCoverCallAndAsyncArrowHead(
        base,
        startLoc,
        state,
        optional
      );
    } else {
      const computed = this.eat(tt.bracketL);
      if (computed || optional || this.eat(tt.dot)) {
        return this.parseMember(base, startLoc, state, computed, optional);
      } else {
        return this.stopParseSubscript(base, state);
      }
    }
  }
  stopParseSubscript(base, state) {
    state.stop = true;
    return base;
  }
  // base[?Yield, ?Await] [ Expression[+In, ?Yield, ?Await] ]
  // base[?Yield, ?Await] . IdentifierName
  // base[?Yield, ?Await] . PrivateIdentifier
  //   where `base` is one of CallExpression, MemberExpression and OptionalChain
  parseMember(base, startLoc, state, computed, optional) {
    const node = this.startNodeAt(startLoc);
    node.object = base;
    node.computed = computed;
    if (computed) {
      node.property = this.parseExpression();
      this.expect(tt.bracketR);
    } else if (this.match(tt.privateName)) {
      if (base.type === "Super") {
        this.raise(Errors.SuperPrivateField, startLoc);
      }
      this.classScope.usePrivateName(this.state.value, this.state.startLoc);
      node.property = this.parsePrivateName();
    } else {
      node.property = this.parseIdentifier(true);
    }
    if (state.optionalChainMember) {
      node.optional = optional;
      return this.finishNode(node, "OptionalMemberExpression");
    } else {
      return this.finishNode(node, "MemberExpression");
    }
  }
  // https://github.com/tc39/proposal-bind-operator#syntax
  parseBind(base, startLoc, state) {
    const node = this.startNodeAt(startLoc);
    node.object = base;
    this.next();
    const isImport = this.match(tt._import);
    const callee = this.parseNoCallExpr();
    if (callee.type === "Super" || isImport && callee.type === "ImportExpression" || callee.type === "Import") {
      throw this.raise(Errors.UnsupportedBindRHS, callee);
    }
    node.callee = callee;
    state.stop = true;
    return this.parseSubscripts(
      this.finishNode(node, "BindExpression"),
      startLoc,
      false
    );
  }
  // https://tc39.es/ecma262/#prod-CoverCallExpressionAndAsyncArrowHead
  // CoverCallExpressionAndAsyncArrowHead
  // CallExpression[?Yield, ?Await] Arguments[?Yield, ?Await]
  // OptionalChain[?Yield, ?Await] Arguments[?Yield, ?Await]
  parseCoverCallAndAsyncArrowHead(base, startLoc, state, optional) {
    const oldMaybeInArrowParameters = this.state.maybeInArrowParameters;
    let refExpressionErrors = null;
    this.state.maybeInArrowParameters = true;
    this.next();
    const node = this.startNodeAt(
      startLoc
    );
    node.callee = base;
    const { maybeAsyncArrow, optionalChainMember } = state;
    if (maybeAsyncArrow) {
      this.expressionScope.enter(newAsyncArrowScope());
      refExpressionErrors = new ExpressionErrors();
    }
    if (optionalChainMember) {
      node.optional = optional;
    }
    if (optional) {
      node.arguments = this.parseCallExpressionArguments();
    } else {
      node.arguments = this.parseCallExpressionArguments(
        base.type !== "Super",
        node,
        refExpressionErrors
      );
    }
    let finishedNode = this.finishCallExpression(
      node,
      optionalChainMember
    );
    if (maybeAsyncArrow && this.shouldParseAsyncArrow() && !optional) {
      state.stop = true;
      this.checkDestructuringPrivate(refExpressionErrors);
      this.expressionScope.validateAsPattern();
      this.expressionScope.exit();
      finishedNode = this.parseAsyncArrowFromCallExpression(
        this.startNodeAt(startLoc),
        finishedNode
      );
    } else {
      if (maybeAsyncArrow) {
        this.checkExpressionErrors(refExpressionErrors, true);
        this.expressionScope.exit();
      }
      this.toReferencedArguments(finishedNode);
    }
    this.state.maybeInArrowParameters = oldMaybeInArrowParameters;
    return finishedNode;
  }
  toReferencedArguments(node, isParenthesizedExpr) {
    this.toReferencedListDeep(node.arguments, isParenthesizedExpr);
  }
  // MemberExpression [?Yield, ?Await] TemplateLiteral[?Yield, ?Await, +Tagged]
  // CallExpression [?Yield, ?Await] TemplateLiteral[?Yield, ?Await, +Tagged]
  parseTaggedTemplateExpression(base, startLoc, state) {
    const node = this.startNodeAt(startLoc);
    node.tag = base;
    node.quasi = this.parseTemplate(true);
    if (state.optionalChainMember) {
      this.raise(Errors.OptionalChainingNoTemplate, startLoc);
    }
    return this.finishNode(node, "TaggedTemplateExpression");
  }
  atPossibleAsyncArrow(base) {
    return base.type === "Identifier" && base.name === "async" && this.state.lastTokEndLoc.index === base.end && !this.canInsertSemicolon() && // check there are no escape sequences, such as \u{61}sync
    base.end - base.start === 5 && this.offsetToSourcePos(base.start) === this.state.potentialArrowAt;
  }
  finishCallExpression(node, optional) {
    if (node.callee.type === "Import") {
      if (node.arguments.length === 0 || node.arguments.length > 2) {
        this.raise(Errors.ImportCallArity, node);
      } else {
        for (const arg of node.arguments) {
          if (arg.type === "SpreadElement") {
            this.raise(Errors.ImportCallSpreadArgument, arg);
          }
        }
      }
    }
    return this.finishNode(
      node,
      optional ? "OptionalCallExpression" : "CallExpression"
    );
  }
  parseCallExpressionArguments(allowPlaceholder, nodeForExtra, refExpressionErrors) {
    const elts = [];
    let first = true;
    const oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
    this.state.inFSharpPipelineDirectBody = false;
    while (!this.eat(tt.parenR)) {
      if (first) {
        first = false;
      } else {
        this.expect(tt.comma);
        if (this.match(tt.parenR)) {
          if (nodeForExtra) {
            this.addTrailingCommaExtraToNode(nodeForExtra);
          }
          this.next();
          break;
        }
      }
      elts.push(
        this.parseExprListItem(
          tt.parenR,
          false,
          refExpressionErrors,
          allowPlaceholder
        )
      );
    }
    this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody;
    return elts;
  }
  shouldParseAsyncArrow() {
    return this.match(tt.arrow) && !this.canInsertSemicolon();
  }
  parseAsyncArrowFromCallExpression(node, call) {
    this.resetPreviousNodeTrailingComments(call);
    this.expect(tt.arrow);
    this.parseArrowExpression(
      node,
      call.arguments,
      true,
      call.extra?.trailingCommaLoc
    );
    if (call.innerComments) {
      setInnerComments(node, call.innerComments);
    }
    if (call.callee.trailingComments) {
      setInnerComments(node, call.callee.trailingComments);
    }
    return node;
  }
  // Parse a no-call expression (like argument of `new` or `::` operators).
  // https://tc39.es/ecma262/#prod-MemberExpression
  parseNoCallExpr() {
    const startLoc = this.state.startLoc;
    return this.parseSubscripts(this.parseExprAtom(), startLoc, true);
  }
  // Parse an atomic expression — either a single token that is an
  // expression, an expression started by a keyword like `function` or
  // `new`, or an expression wrapped in punctuation like `()`, `[]`,
  // or `{}`.
  // https://tc39.es/ecma262/#prod-PrimaryExpression
  // https://tc39.es/ecma262/#prod-AsyncArrowFunction
  // PrimaryExpression
  // Super
  // Import
  // AsyncArrowFunction
  parseExprAtom(refExpressionErrors) {
    let node;
    let decorators = null;
    const { type } = this.state;
    switch (type) {
      case tt._super:
        return this.parseSuper();
      case tt._import:
        node = this.startNode();
        this.next();
        if (this.match(tt.dot)) {
          return this.parseImportMetaPropertyOrPhaseCall(
            node
          );
        }
        if (this.match(tt.parenL)) {
          if (this.optionFlags & OptionFlags.CreateImportExpressions) {
            return this.parseImportCall(node);
          } else {
            return this.finishNode(node, "Import");
          }
        } else {
          this.raise(Errors.UnsupportedImport, this.state.lastTokStartLoc);
          return this.finishNode(node, "Import");
        }
      case tt._this:
        node = this.startNode();
        this.next();
        return this.finishNode(node, "ThisExpression");
      case tt._do: {
        return this.parseDo(this.startNode(), false);
      }
      case tt.slash:
      case tt.slashAssign: {
        this.readRegexp();
        return this.parseRegExpLiteral(this.state.value);
      }
      case tt.num:
        return this.parseNumericLiteral(this.state.value);
      case tt.bigint:
        return this.parseBigIntLiteral(this.state.value);
      case tt.string:
        return this.parseStringLiteral(this.state.value);
      case tt._null:
        return this.parseNullLiteral();
      case tt._true:
        return this.parseBooleanLiteral(true);
      case tt._false:
        return this.parseBooleanLiteral(false);
      case tt.parenL: {
        const canBeArrow = this.state.potentialArrowAt === this.state.start;
        return this.parseParenAndDistinguishExpression(canBeArrow);
      }
      case tt.bracketL: {
        return this.parseArrayLike(
          tt.bracketR,
          /* isTuple */
          false,
          refExpressionErrors
        );
      }
      case tt.braceL: {
        return this.parseObjectLike(
          tt.braceR,
          /* isPattern */
          false,
          /* isRecord */
          false,
          refExpressionErrors
        );
      }
      case tt._function:
        return this.parseFunctionOrFunctionSent();
      case tt.at:
        decorators = this.parseDecorators();
      // fall through
      case tt._class:
        return this.parseClass(
          this.maybeTakeDecorators(
            decorators,
            this.startNode()
          ),
          false
        );
      case tt._new:
        return this.parseNewOrNewTarget();
      case tt.templateNonTail:
      case tt.templateTail:
        return this.parseTemplate(false);
      // BindExpression[Yield]
      //   :: MemberExpression[?Yield]
      case tt.doubleColon: {
        node = this.startNode();
        this.next();
        node.object = null;
        const callee = node.callee = this.parseNoCallExpr();
        if (callee.type === "MemberExpression") {
          return this.finishNode(node, "BindExpression");
        } else {
          throw this.raise(Errors.UnsupportedBind, callee);
        }
      }
      case tt.privateName: {
        this.raise(Errors.PrivateInExpectedIn, this.state.startLoc, {
          identifierName: this.state.value
        });
        return this.parsePrivateName();
      }
      case tt.moduloAssign: {
        return this.parseTopicReferenceThenEqualsSign(tt.modulo, "%");
      }
      case tt.xorAssign: {
        return this.parseTopicReferenceThenEqualsSign(tt.bitwiseXOR, "^");
      }
      case tt.doubleCaret:
      case tt.doubleAt: {
        return this.parseTopicReference("hack");
      }
      case tt.bitwiseXOR:
      case tt.modulo:
      case tt.hash: {
        const pipeProposal = this.getPluginOption(
          "pipelineOperator",
          "proposal"
        );
        if (pipeProposal) {
          return this.parseTopicReference(pipeProposal);
        }
        throw this.unexpected();
      }
      case tt.lt: {
        const lookaheadCh = this.input.codePointAt(this.nextTokenStart());
        if (isIdentifierStart(lookaheadCh) || // Element/Type Parameter <foo>
        lookaheadCh === greaterThan) {
          throw this.expectOnePlugin(["jsx", "flow", "typescript"]);
        }
        throw this.unexpected();
      }
      default:
        {
          if (type === tt.decimal) {
            return this.parseDecimalLiteral(this.state.value);
          } else if (type === tt.bracketBarL || type === tt.bracketHashL) {
            return this.parseArrayLike(
              this.state.type === tt.bracketBarL ? tt.bracketBarR : tt.bracketR,
              /* isTuple */
              true
            );
          } else if (type === tt.braceBarL || type === tt.braceHashL) {
            return this.parseObjectLike(
              this.state.type === tt.braceBarL ? tt.braceBarR : tt.braceR,
              /* isPattern */
              false,
              /* isRecord */
              true
            );
          }
        }
        if (tokenIsIdentifier(type)) {
          if (this.isContextual(tt._module) && this.lookaheadInLineCharCode() === leftCurlyBrace) {
            return this.parseModuleExpression();
          }
          const canBeArrow = this.state.potentialArrowAt === this.state.start;
          const containsEsc = this.state.containsEsc;
          const id = this.parseIdentifier();
          if (!containsEsc && id.name === "async" && !this.canInsertSemicolon()) {
            const { type: type2 } = this.state;
            if (type2 === tt._function) {
              this.resetPreviousNodeTrailingComments(id);
              this.next();
              return this.parseAsyncFunctionExpression(
                this.startNodeAtNode(id)
              );
            } else if (tokenIsIdentifier(type2)) {
              if (canBeArrow && this.lookaheadCharCode() === equalsTo) {
                return this.parseAsyncArrowUnaryFunction(
                  this.startNodeAtNode(id)
                );
              } else {
                return id;
              }
            } else if (type2 === tt._do) {
              this.resetPreviousNodeTrailingComments(id);
              return this.parseDo(this.startNodeAtNode(id), true);
            }
          }
          if (canBeArrow && this.match(tt.arrow) && !this.canInsertSemicolon()) {
            this.next();
            return this.parseArrowExpression(
              this.startNodeAtNode(id),
              [id],
              false
            );
          }
          return id;
        } else {
          throw this.unexpected();
        }
    }
  }
  // This helper method should only be called
  // when the parser has reached a potential Hack pipe topic token
  // that is followed by an equals sign.
  // See <https://github.com/js-choi/proposal-hack-pipes>.
  // If we find ^= or %= in an expression position
  // (i.e., the tt.moduloAssign or tt.xorAssign token types), and if the
  // Hack-pipes proposal is active with ^ or % as its topicToken, then the ^ or
  // % could be the topic token (e.g., in x |> ^==y or x |> ^===y), and so we
  // reparse the current token as ^ or %.
  // Otherwise, this throws an unexpected-token error.
  parseTopicReferenceThenEqualsSign(topicTokenType, topicTokenValue) {
    const pipeProposal = this.getPluginOption("pipelineOperator", "proposal");
    if (pipeProposal) {
      this.state.type = topicTokenType;
      this.state.value = topicTokenValue;
      this.state.pos--;
      this.state.end--;
      this.state.endLoc = createPositionWithColumnOffset(this.state.endLoc, -1);
      return this.parseTopicReference(pipeProposal);
    }
    throw this.unexpected();
  }
  // This helper method should only be called
  // when the proposal-pipeline-operator plugin is active,
  // and when the parser has reached a potential Hack pipe topic token.
  // Although a pipe-operator proposal is assumed to be active,
  // its configuration might not match the current token’s type.
  // See <https://github.com/js-choi/proposal-hack-pipes>.
  parseTopicReference(pipeProposal) {
    const node = this.startNode();
    const startLoc = this.state.startLoc;
    const tokenType = this.state.type;
    this.next();
    return this.finishTopicReference(node, startLoc, pipeProposal, tokenType);
  }
  // This helper method attempts to finish the given `node`
  // into a topic-reference node for the given `pipeProposal`.
  // See <https://github.com/js-choi/proposal-hack-pipes>.
  //
  // The method assumes that any topic token was consumed before it was called.
  //
  // If the `pipelineOperator` plugin is active,
  // and if the given `tokenType` matches the plugin’s configuration,
  // then this method will return the finished `node`.
  //
  // If the `pipelineOperator` plugin is active,
  // but if the given `tokenType` does not match the plugin’s configuration,
  // then this method will throw a `PipeTopicUnconfiguredToken` error.
  finishTopicReference(node, startLoc, pipeProposal, tokenType) {
    if (this.testTopicReferenceConfiguration(pipeProposal, startLoc, tokenType)) {
      if (pipeProposal === "hack") {
        if (!this.topicReferenceIsAllowedInCurrentContext()) {
          this.raise(Errors.PipeTopicUnbound, startLoc);
        }
        this.registerTopicReference();
        return this.finishNode(node, "TopicReference");
      } else {
        if (!this.topicReferenceIsAllowedInCurrentContext()) {
          this.raise(Errors.PrimaryTopicNotAllowed, startLoc);
        }
        this.registerTopicReference();
        return this.finishNode(node, "PipelinePrimaryTopicReference");
      }
    } else {
      throw this.raise(Errors.PipeTopicUnconfiguredToken, startLoc, {
        token: tokenLabelName(tokenType)
      });
    }
  }
  // This helper method tests whether the given token type
  // matches the pipelineOperator parser plugin’s configuration.
  // If the active pipe proposal is Hack style,
  // and if the given token is the same as the plugin configuration’s `topicToken`,
  // then this is a valid topic reference.
  // If the active pipe proposal is smart mix,
  // then the topic token must always be `#`.
  // If the active pipe proposal is neither (e.g., "minimal"(Babel 7) or "fsharp"),
  // then an error is thrown.
  testTopicReferenceConfiguration(pipeProposal, startLoc, tokenType) {
    switch (pipeProposal) {
      case "hack": {
        return this.hasPlugin([
          "pipelineOperator",
          {
            // @ts-expect-error token must have a label
            topicToken: tokenLabelName(tokenType)
          }
        ]);
      }
      case "smart":
        return tokenType === tt.hash;
      default:
        throw this.raise(Errors.PipeTopicRequiresHackPipes, startLoc);
    }
  }
  // async [no LineTerminator here] AsyncArrowBindingIdentifier[?Yield] [no LineTerminator here] => AsyncConciseBody[?In]
  parseAsyncArrowUnaryFunction(node) {
    this.prodParam.enter(functionFlags(true, this.prodParam.hasYield));
    const params = [this.parseIdentifier()];
    this.prodParam.exit();
    if (this.hasPrecedingLineBreak()) {
      this.raise(Errors.LineTerminatorBeforeArrow, this.state.curPosition());
    }
    this.expect(tt.arrow);
    return this.parseArrowExpression(node, params, true);
  }
  // https://github.com/tc39/proposal-do-expressions
  // https://github.com/tc39/proposal-async-do-expressions
  parseDo(node, isAsync) {
    this.expectPlugin("doExpressions");
    if (isAsync) {
      this.expectPlugin("asyncDoExpressions");
    }
    node.async = isAsync;
    this.next();
    const oldLabels = this.state.labels;
    this.state.labels = [];
    if (isAsync) {
      this.prodParam.enter(ParamKind.PARAM_AWAIT);
      node.body = this.parseBlock();
      this.prodParam.exit();
    } else {
      node.body = this.parseBlock();
    }
    this.state.labels = oldLabels;
    return this.finishNode(node, "DoExpression");
  }
  // Parse the `super` keyword
  parseSuper() {
    const node = this.startNode();
    this.next();
    if (this.match(tt.parenL) && !this.scope.allowDirectSuper) {
      {
        if (!(this.optionFlags & OptionFlags.AllowSuperOutsideMethod)) {
          this.raise(Errors.SuperNotAllowed, node);
        }
      }
    } else if (!this.scope.allowSuper) {
      {
        if (!(this.optionFlags & OptionFlags.AllowSuperOutsideMethod)) {
          this.raise(Errors.UnexpectedSuper, node);
        }
      }
    }
    if (!this.match(tt.parenL) && !this.match(tt.bracketL) && !this.match(tt.dot)) {
      this.raise(Errors.UnsupportedSuper, node);
    }
    return this.finishNode(node, "Super");
  }
  parsePrivateName() {
    const node = this.startNode();
    const id = this.startNodeAt(
      // The position is hardcoded because we merge `#` and name into a single
      // tt.privateName token
      createPositionWithColumnOffset(this.state.startLoc, 1)
    );
    const name = this.state.value;
    this.next();
    node.id = this.createIdentifier(id, name);
    return this.finishNode(node, "PrivateName");
  }
  parseFunctionOrFunctionSent() {
    const node = this.startNode();
    this.next();
    if (this.prodParam.hasYield && this.match(tt.dot)) {
      const meta = this.createIdentifier(
        this.startNodeAtNode(node),
        "function"
      );
      this.next();
      if (this.match(tt._sent)) {
        this.expectPlugin("functionSent");
      } else if (!this.hasPlugin("functionSent")) {
        this.unexpected();
      }
      return this.parseMetaProperty(
        node,
        meta,
        "sent"
      );
    }
    return this.parseFunction(node);
  }
  parseMetaProperty(node, meta, propertyName) {
    node.meta = meta;
    const containsEsc = this.state.containsEsc;
    node.property = this.parseIdentifier(true);
    if (node.property.name !== propertyName || containsEsc) {
      this.raise(Errors.UnsupportedMetaProperty, node.property, {
        target: meta.name,
        onlyValidPropertyName: propertyName
      });
    }
    return this.finishNode(node, "MetaProperty");
  }
  // https://tc39.es/ecma262/#prod-ImportMeta
  // https://tc39.es/proposal-source-phase-imports/
  parseImportMetaPropertyOrPhaseCall(node) {
    this.next();
    if (this.isContextual(tt._source) || this.isContextual(tt._defer)) {
      const isSource = this.isContextual(tt._source);
      this.expectPlugin(
        isSource ? "sourcePhaseImports" : "deferredImportEvaluation"
      );
      this.next();
      node.phase = isSource ? "source" : "defer";
      return this.parseImportCall(node);
    } else {
      const id = this.createIdentifierAt(
        this.startNodeAtNode(node),
        "import",
        this.state.lastTokStartLoc
      );
      if (this.isContextual(tt._meta)) {
        if (!this.inModule) {
          this.raise(Errors.ImportMetaOutsideModule, id);
        }
        this.sawUnambiguousESM = true;
      }
      return this.parseMetaProperty(node, id, "meta");
    }
  }
  parseLiteralAtNode(value, type, node) {
    this.addExtra(node, "rawValue", value);
    this.addExtra(
      node,
      "raw",
      this.input.slice(this.offsetToSourcePos(node.start), this.state.end)
    );
    node.value = value;
    this.next();
    return this.finishNode(node, type);
  }
  parseLiteral(value, type) {
    const node = this.startNode();
    return this.parseLiteralAtNode(value, type, node);
  }
  parseStringLiteral(value) {
    return this.parseLiteral(value, "StringLiteral");
  }
  parseNumericLiteral(value) {
    return this.parseLiteral(value, "NumericLiteral");
  }
  parseBigIntLiteral(value) {
    {
      return this.parseLiteral(value, "BigIntLiteral");
    }
  }
  // TODO: Remove this in Babel 8
  parseDecimalLiteral(value) {
    return this.parseLiteral(value, "DecimalLiteral");
  }
  parseRegExpLiteral(value) {
    const node = this.startNode();
    this.addExtra(
      node,
      "raw",
      this.input.slice(this.offsetToSourcePos(node.start), this.state.end)
    );
    node.pattern = value.pattern;
    node.flags = value.flags;
    this.next();
    return this.finishNode(node, "RegExpLiteral");
  }
  parseBooleanLiteral(value) {
    const node = this.startNode();
    node.value = value;
    this.next();
    return this.finishNode(node, "BooleanLiteral");
  }
  parseNullLiteral() {
    const node = this.startNode();
    this.next();
    return this.finishNode(node, "NullLiteral");
  }
  // https://tc39.es/ecma262/#prod-CoverParenthesizedExpressionAndArrowParameterList
  parseParenAndDistinguishExpression(canBeArrow) {
    const startLoc = this.state.startLoc;
    let val;
    this.next();
    this.expressionScope.enter(newArrowHeadScope());
    const oldMaybeInArrowParameters = this.state.maybeInArrowParameters;
    const oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
    this.state.maybeInArrowParameters = true;
    this.state.inFSharpPipelineDirectBody = false;
    const innerStartLoc = this.state.startLoc;
    const exprList = [];
    const refExpressionErrors = new ExpressionErrors();
    let first = true;
    let spreadStartLoc;
    let optionalCommaStartLoc;
    while (!this.match(tt.parenR)) {
      if (first) {
        first = false;
      } else {
        this.expect(
          tt.comma,
          refExpressionErrors.optionalParametersLoc === null ? null : refExpressionErrors.optionalParametersLoc
        );
        if (this.match(tt.parenR)) {
          optionalCommaStartLoc = this.state.startLoc;
          break;
        }
      }
      if (this.match(tt.ellipsis)) {
        const spreadNodeStartLoc = this.state.startLoc;
        spreadStartLoc = this.state.startLoc;
        exprList.push(
          this.parseParenItem(this.parseRestBinding(), spreadNodeStartLoc)
        );
        if (!this.checkCommaAfterRest(rightParenthesis)) {
          break;
        }
      } else {
        exprList.push(
          this.parseMaybeAssignAllowInOrVoidPattern(
            tt.parenR,
            refExpressionErrors,
            this.parseParenItem
          )
        );
      }
    }
    const innerEndLoc = this.state.lastTokEndLoc;
    this.expect(tt.parenR);
    this.state.maybeInArrowParameters = oldMaybeInArrowParameters;
    this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody;
    let arrowNode = this.startNodeAt(startLoc);
    if (canBeArrow && this.shouldParseArrow(exprList) && (arrowNode = this.parseArrow(arrowNode))) {
      this.checkDestructuringPrivate(refExpressionErrors);
      this.expressionScope.validateAsPattern();
      this.expressionScope.exit();
      this.parseArrowExpression(arrowNode, exprList, false);
      return arrowNode;
    }
    this.expressionScope.exit();
    if (!exprList.length) {
      this.unexpected(this.state.lastTokStartLoc);
    }
    if (optionalCommaStartLoc) this.unexpected(optionalCommaStartLoc);
    if (spreadStartLoc) this.unexpected(spreadStartLoc);
    this.checkExpressionErrors(refExpressionErrors, true);
    this.toReferencedListDeep(
      exprList,
      /* isParenthesizedExpr */
      true
    );
    if (exprList.length > 1) {
      val = this.startNodeAt(innerStartLoc);
      val.expressions = exprList;
      this.finishNode(val, "SequenceExpression");
      this.resetEndLocation(val, innerEndLoc);
    } else {
      val = exprList[0];
    }
    return this.wrapParenthesis(
      startLoc,
      // @ts-expect-error todo(flow->ts)
      val
    );
  }
  wrapParenthesis(startLoc, expression) {
    if (!(this.optionFlags & OptionFlags.CreateParenthesizedExpressions)) {
      this.addExtra(expression, "parenthesized", true);
      this.addExtra(expression, "parenStart", startLoc.index);
      this.takeSurroundingComments(
        expression,
        startLoc.index,
        this.state.lastTokEndLoc.index
      );
      return expression;
    }
    const parenExpression = this.startNodeAt(startLoc);
    parenExpression.expression = expression;
    return this.finishNode(parenExpression, "ParenthesizedExpression");
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- `params` is used in typescript plugin
  shouldParseArrow(params) {
    return !this.canInsertSemicolon();
  }
  parseArrow(node) {
    if (this.eat(tt.arrow)) {
      return node;
    }
  }
  parseParenItem(node, startLoc) {
    return node;
  }
  parseNewOrNewTarget() {
    const node = this.startNode();
    this.next();
    if (this.match(tt.dot)) {
      const meta = this.createIdentifier(
        this.startNodeAtNode(node),
        "new"
      );
      this.next();
      const metaProp = this.parseMetaProperty(
        node,
        meta,
        "target"
      );
      if (!this.scope.allowNewTarget) {
        this.raise(Errors.UnexpectedNewTarget, metaProp);
      }
      return metaProp;
    }
    return this.parseNew(node);
  }
  // New's precedence is slightly tricky. It must allow its argument to
  // be a `[]` or dot subscript expression, but not a call — at least,
  // not without wrapping it in parentheses. Thus, it uses the noCalls
  // argument to parseSubscripts to prevent it from consuming the
  // argument list.
  // https://tc39.es/ecma262/#prod-NewExpression
  parseNew(node) {
    this.parseNewCallee(node);
    if (this.eat(tt.parenL)) {
      const args = this.parseExprList(tt.parenR);
      this.toReferencedList(args);
      node.arguments = args;
    } else {
      node.arguments = [];
    }
    return this.finishNode(node, "NewExpression");
  }
  parseNewCallee(node) {
    const isImport = this.match(tt._import);
    const callee = this.parseNoCallExpr();
    node.callee = callee;
    if (isImport && callee.type === "ImportExpression" || callee.type === "Import") {
      this.raise(Errors.ImportCallNotNewExpression, callee);
    }
    if (callee.type === "Super") {
      this.raise(Errors.SuperCallNotNewExpression, callee);
    }
  }
  // Parse template expression.
  parseTemplateElement(isTagged) {
    const { start, startLoc, end, value } = this.state;
    const elemStart = start + 1;
    const elem = this.startNodeAt(
      createPositionWithColumnOffset(startLoc, 1)
    );
    if (value === null) {
      if (!isTagged) {
        this.raise(
          Errors.InvalidEscapeSequenceTemplate,
          // FIXME: Adding 1 is probably wrong.
          createPositionWithColumnOffset(
            this.state.firstInvalidTemplateEscapePos,
            1
          )
        );
      }
    }
    const isTail = this.match(tt.templateTail);
    const endOffset = isTail ? -1 : -2;
    const elemEnd = end + endOffset;
    elem.value = {
      raw: this.input.slice(elemStart, elemEnd).replace(/\r\n?/g, "\n"),
      cooked: value === null ? null : value.slice(1, endOffset)
    };
    elem.tail = isTail;
    this.next();
    const finishedNode = this.finishNode(elem, "TemplateElement");
    this.resetEndLocation(
      finishedNode,
      createPositionWithColumnOffset(this.state.lastTokEndLoc, endOffset)
    );
    return finishedNode;
  }
  // https://tc39.es/ecma262/#prod-TemplateLiteral
  parseTemplate(isTagged) {
    const node = this.startNode();
    let curElt = this.parseTemplateElement(isTagged);
    const quasis = [curElt];
    const substitutions = [];
    while (!curElt.tail) {
      substitutions.push(this.parseTemplateSubstitution());
      this.readTemplateContinuation();
      quasis.push(curElt = this.parseTemplateElement(isTagged));
    }
    node.expressions = substitutions;
    node.quasis = quasis;
    return this.finishNode(node, "TemplateLiteral");
  }
  // This is overwritten by the TypeScript plugin to parse template types
  parseTemplateSubstitution() {
    return this.parseExpression();
  }
  parseObjectLike(close, isPattern, isRecord, refExpressionErrors) {
    if (isRecord) {
      this.expectPlugin("recordAndTuple");
    }
    const oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
    this.state.inFSharpPipelineDirectBody = false;
    let sawProto = false;
    let first = true;
    const node = this.startNode();
    node.properties = [];
    this.next();
    while (!this.match(close)) {
      if (first) {
        first = false;
      } else {
        this.expect(tt.comma);
        if (this.match(close)) {
          this.addTrailingCommaExtraToNode(node);
          break;
        }
      }
      let prop;
      if (isPattern) {
        prop = this.parseBindingProperty();
      } else {
        prop = this.parsePropertyDefinition(refExpressionErrors);
        sawProto = this.checkProto(
          prop,
          isRecord,
          sawProto,
          refExpressionErrors
        );
      }
      if (isRecord && !this.isObjectProperty(prop) && prop.type !== "SpreadElement") {
        this.raise(Errors.InvalidRecordProperty, prop);
      }
      {
        if (prop.shorthand) {
          this.addExtra(prop, "shorthand", true);
        }
      }
      node.properties.push(prop);
    }
    this.next();
    this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody;
    let type = "ObjectExpression";
    if (isPattern) {
      type = "ObjectPattern";
    } else if (isRecord) {
      type = "RecordExpression";
    }
    return this.finishNode(node, type);
  }
  addTrailingCommaExtraToNode(node) {
    this.addExtra(node, "trailingComma", this.state.lastTokStartLoc.index);
    this.addExtra(node, "trailingCommaLoc", this.state.lastTokStartLoc, false);
  }
  // Check grammar production:
  //   IdentifierName *_opt PropertyName
  // It is used in `parsePropertyDefinition` to detect AsyncMethod and Accessors
  maybeAsyncOrAccessorProp(prop) {
    return !prop.computed && prop.key.type === "Identifier" && (this.isLiteralPropertyName() || this.match(tt.bracketL) || this.match(tt.star));
  }
  // https://tc39.es/ecma262/#prod-PropertyDefinition
  parsePropertyDefinition(refExpressionErrors) {
    let decorators = [];
    if (this.match(tt.at)) {
      if (this.hasPlugin("decorators")) {
        this.raise(Errors.UnsupportedPropertyDecorator, this.state.startLoc);
      }
      while (this.match(tt.at)) {
        decorators.push(this.parseDecorator());
      }
    }
    const prop = this.startNode();
    let isAsync = false;
    let isAccessor = false;
    let startLoc;
    if (this.match(tt.ellipsis)) {
      if (decorators.length) this.unexpected();
      return this.parseSpread();
    }
    if (decorators.length) {
      prop.decorators = decorators;
      decorators = [];
    }
    prop.method = false;
    if (refExpressionErrors) {
      startLoc = this.state.startLoc;
    }
    let isGenerator = this.eat(tt.star);
    this.parsePropertyNamePrefixOperator(prop);
    const containsEsc = this.state.containsEsc;
    this.parsePropertyName(prop, refExpressionErrors);
    if (!isGenerator && !containsEsc && this.maybeAsyncOrAccessorProp(prop)) {
      const { key } = prop;
      const keyName = key.name;
      if (keyName === "async" && !this.hasPrecedingLineBreak()) {
        isAsync = true;
        this.resetPreviousNodeTrailingComments(key);
        isGenerator = this.eat(tt.star);
        this.parsePropertyName(prop);
      }
      if (keyName === "get" || keyName === "set") {
        isAccessor = true;
        this.resetPreviousNodeTrailingComments(key);
        prop.kind = keyName;
        if (this.match(tt.star)) {
          isGenerator = true;
          this.raise(Errors.AccessorIsGenerator, this.state.curPosition(), {
            kind: keyName
          });
          this.next();
        }
        this.parsePropertyName(prop);
      }
    }
    return this.parseObjPropValue(
      prop,
      startLoc,
      isGenerator,
      isAsync,
      false,
      isAccessor,
      refExpressionErrors
    );
  }
  getGetterSetterExpectedParamCount(method) {
    return method.kind === "get" ? 0 : 1;
  }
  // This exists so we can override within the ESTree plugin
  getObjectOrClassMethodParams(method) {
    return method.params;
  }
  // get methods aren't allowed to have any parameters
  // set methods must have exactly 1 parameter which is not a rest parameter
  checkGetterSetterParams(method) {
    const paramCount = this.getGetterSetterExpectedParamCount(method);
    const params = this.getObjectOrClassMethodParams(method);
    if (params.length !== paramCount) {
      this.raise(
        method.kind === "get" ? Errors.BadGetterArity : Errors.BadSetterArity,
        method
      );
    }
    if (method.kind === "set" && params[params.length - 1]?.type === "RestElement") {
      this.raise(Errors.BadSetterRestParameter, method);
    }
  }
  // https://tc39.es/ecma262/#prod-MethodDefinition
  parseObjectMethod(prop, isGenerator, isAsync, isPattern, isAccessor) {
    if (isAccessor) {
      const finishedProp = this.parseMethod(
        prop,
        // This _should_ be false, but with error recovery, we allow it to be
        // set for informational purposes
        isGenerator,
        /* isAsync */
        false,
        /* isConstructor */
        false,
        false,
        "ObjectMethod"
      );
      this.checkGetterSetterParams(finishedProp);
      return finishedProp;
    }
    if (isAsync || isGenerator || this.match(tt.parenL)) {
      if (isPattern) this.unexpected();
      prop.kind = "method";
      prop.method = true;
      return this.parseMethod(
        prop,
        isGenerator,
        isAsync,
        /* isConstructor */
        false,
        false,
        "ObjectMethod"
      );
    }
  }
  // if `isPattern` is true, parse https://tc39.es/ecma262/#prod-BindingProperty
  // else https://tc39.es/ecma262/#prod-PropertyDefinition
  parseObjectProperty(prop, startLoc, isPattern, refExpressionErrors) {
    prop.shorthand = false;
    if (this.eat(tt.colon)) {
      prop.value = isPattern ? this.parseMaybeDefault(this.state.startLoc) : this.parseMaybeAssignAllowInOrVoidPattern(
        tt.braceR,
        refExpressionErrors
      );
      return this.finishObjectProperty(prop);
    }
    if (!prop.computed && prop.key.type === "Identifier") {
      this.checkReservedWord(prop.key.name, prop.key.loc.start, true, false);
      if (isPattern) {
        prop.value = this.parseMaybeDefault(
          startLoc,
          this.cloneIdentifier(prop.key)
        );
      } else if (this.match(tt.eq)) {
        const shorthandAssignLoc = this.state.startLoc;
        if (refExpressionErrors != null) {
          if (refExpressionErrors.shorthandAssignLoc === null) {
            refExpressionErrors.shorthandAssignLoc = shorthandAssignLoc;
          }
        } else {
          this.raise(Errors.InvalidCoverInitializedName, shorthandAssignLoc);
        }
        prop.value = this.parseMaybeDefault(
          startLoc,
          this.cloneIdentifier(prop.key)
        );
      } else {
        prop.value = this.cloneIdentifier(prop.key);
      }
      prop.shorthand = true;
      return this.finishObjectProperty(prop);
    }
  }
  finishObjectProperty(node) {
    return this.finishNode(node, "ObjectProperty");
  }
  parseObjPropValue(prop, startLoc, isGenerator, isAsync, isPattern, isAccessor, refExpressionErrors) {
    const node = this.parseObjectMethod(
      prop,
      isGenerator,
      isAsync,
      isPattern,
      isAccessor
    ) || this.parseObjectProperty(
      prop,
      startLoc,
      isPattern,
      refExpressionErrors
    );
    if (!node) this.unexpected();
    return node;
  }
  // https://tc39.es/ecma262/#prod-PropertyName
  // when refExpressionErrors presents, it will parse private name
  // and record the position of the first private name
  parsePropertyName(prop, refExpressionErrors) {
    if (this.eat(tt.bracketL)) {
      prop.computed = true;
      prop.key = this.parseMaybeAssignAllowIn();
      this.expect(tt.bracketR);
    } else {
      const { type, value } = this.state;
      let key;
      if (tokenIsKeywordOrIdentifier(type)) {
        key = this.parseIdentifier(true);
      } else {
        switch (type) {
          case tt.num:
            key = this.parseNumericLiteral(value);
            break;
          case tt.string:
            key = this.parseStringLiteral(value);
            break;
          case tt.bigint:
            key = this.parseBigIntLiteral(value);
            break;
          case tt.privateName: {
            const privateKeyLoc = this.state.startLoc;
            if (refExpressionErrors != null) {
              if (refExpressionErrors.privateKeyLoc === null) {
                refExpressionErrors.privateKeyLoc = privateKeyLoc;
              }
            } else {
              this.raise(Errors.UnexpectedPrivateField, privateKeyLoc);
            }
            key = this.parsePrivateName();
            break;
          }
          default:
            if (type === tt.decimal) {
              key = this.parseDecimalLiteral(value);
              break;
            }
            this.unexpected();
        }
      }
      prop.key = key;
      if (type !== tt.privateName) {
        prop.computed = false;
      }
    }
  }
  // Initialize empty function node.
  initFunction(node, isAsync) {
    node.id = null;
    node.generator = false;
    node.async = isAsync;
  }
  // Parse object or class method.
  parseMethod(node, isGenerator, isAsync, isConstructor, allowDirectSuper, type, inClassScope = false) {
    this.initFunction(node, isAsync);
    node.generator = isGenerator;
    this.scope.enter(
      ScopeFlag.FUNCTION | ScopeFlag.SUPER | (inClassScope ? ScopeFlag.CLASS : 0) | (allowDirectSuper ? ScopeFlag.DIRECT_SUPER : 0)
    );
    this.prodParam.enter(functionFlags(isAsync, node.generator));
    this.parseFunctionParams(node, isConstructor);
    const finishedNode = this.parseFunctionBodyAndFinish(node, type, true);
    this.prodParam.exit();
    this.scope.exit();
    return finishedNode;
  }
  // parse an array literal or tuple literal
  // https://tc39.es/ecma262/#prod-ArrayLiteral
  // https://tc39.es/proposal-record-tuple/#prod-TupleLiteral
  parseArrayLike(close, isTuple, refExpressionErrors) {
    if (isTuple) {
      this.expectPlugin("recordAndTuple");
    }
    const oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
    this.state.inFSharpPipelineDirectBody = false;
    const node = this.startNode();
    this.next();
    node.elements = this.parseExprList(
      close,
      /* allowEmpty */
      !isTuple,
      refExpressionErrors,
      node
    );
    this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody;
    return this.finishNode(
      node,
      isTuple ? "TupleExpression" : "ArrayExpression"
    );
  }
  // Parse arrow function expression.
  // If the parameters are provided, they will be converted to an
  // assignable list.
  parseArrowExpression(node, params, isAsync, trailingCommaLoc) {
    this.scope.enter(ScopeFlag.FUNCTION | ScopeFlag.ARROW);
    let flags = functionFlags(isAsync, false);
    if (!this.match(tt.braceL) && this.prodParam.hasIn) {
      flags |= ParamKind.PARAM_IN;
    }
    this.prodParam.enter(flags);
    this.initFunction(node, isAsync);
    const oldMaybeInArrowParameters = this.state.maybeInArrowParameters;
    if (params) {
      this.state.maybeInArrowParameters = true;
      this.setArrowFunctionParameters(node, params, trailingCommaLoc);
    }
    this.state.maybeInArrowParameters = false;
    this.parseFunctionBody(node, true);
    this.prodParam.exit();
    this.scope.exit();
    this.state.maybeInArrowParameters = oldMaybeInArrowParameters;
    return this.finishNode(node, "ArrowFunctionExpression");
  }
  setArrowFunctionParameters(node, params, trailingCommaLoc) {
    this.toAssignableList(params, trailingCommaLoc, false);
    node.params = params;
  }
  parseFunctionBodyAndFinish(node, type, isMethod = false) {
    this.parseFunctionBody(node, false, isMethod);
    return this.finishNode(node, type);
  }
  // Parse function body and check parameters.
  parseFunctionBody(node, allowExpression, isMethod = false) {
    const isExpression = allowExpression && !this.match(tt.braceL);
    this.expressionScope.enter(newExpressionScope());
    if (isExpression) {
      node.body = this.parseMaybeAssign();
      this.checkParams(node, false, allowExpression, false);
    } else {
      const oldStrict = this.state.strict;
      const oldLabels = this.state.labels;
      this.state.labels = [];
      this.prodParam.enter(
        this.prodParam.currentFlags() | ParamKind.PARAM_RETURN
      );
      node.body = this.parseBlock(
        true,
        false,
        // Strict mode function checks after we parse the statements in the function body.
        (hasStrictModeDirective) => {
          const nonSimple = !this.isSimpleParamList(node.params);
          if (hasStrictModeDirective && nonSimple) {
            this.raise(
              Errors.IllegalLanguageModeDirective,
              // @ts-expect-error kind may not index node
              (node.kind === "method" || node.kind === "constructor") && // @ts-expect-error key may not index node
              !!node.key ? (
                // @ts-expect-error node.key has been guarded
                node.key.loc.end
              ) : node
            );
          }
          const strictModeChanged = !oldStrict && this.state.strict;
          this.checkParams(
            node,
            !this.state.strict && !allowExpression && !isMethod && !nonSimple,
            allowExpression,
            strictModeChanged
          );
          if (this.state.strict && node.id) {
            this.checkIdentifier(
              node.id,
              BindingFlag.TYPE_OUTSIDE,
              strictModeChanged
            );
          }
        }
      );
      this.prodParam.exit();
      this.state.labels = oldLabels;
    }
    this.expressionScope.exit();
  }
  isSimpleParameter(node) {
    return node.type === "Identifier";
  }
  isSimpleParamList(params) {
    for (let i = 0, len = params.length; i < len; i++) {
      if (!this.isSimpleParameter(params[i])) return false;
    }
    return true;
  }
  checkParams(node, allowDuplicates, isArrowFunction, strictModeChanged = true) {
    const checkClashes = !allowDuplicates && /* @__PURE__ */ new Set();
    const formalParameters = { type: "FormalParameters" };
    for (const param of node.params) {
      this.checkLVal(
        param,
        formalParameters,
        BindingFlag.TYPE_VAR,
        checkClashes,
        strictModeChanged
      );
    }
  }
  // Parses a comma-separated list of expressions, and returns them as
  // an array. `close` is the token type that ends the list, and
  // `allowEmpty` can be turned on to allow subsequent commas with
  // nothing in between them to be parsed as `null` (which is needed
  // for array literals).
  // https://tc39.es/ecma262/#prod-ElementList
  parseExprList(close, allowEmpty, refExpressionErrors, nodeForExtra) {
    const elts = [];
    let first = true;
    while (!this.eat(close)) {
      if (first) {
        first = false;
      } else {
        this.expect(tt.comma);
        if (this.match(close)) {
          if (nodeForExtra) {
            this.addTrailingCommaExtraToNode(nodeForExtra);
          }
          this.next();
          break;
        }
      }
      elts.push(this.parseExprListItem(close, allowEmpty, refExpressionErrors));
    }
    return elts;
  }
  parseExprListItem(close, allowEmpty, refExpressionErrors, allowPlaceholder) {
    let elt;
    if (this.match(tt.comma)) {
      if (!allowEmpty) {
        this.raise(Errors.UnexpectedToken, this.state.curPosition(), {
          unexpected: ","
        });
      }
      elt = null;
    } else if (this.match(tt.ellipsis)) {
      const spreadNodeStartLoc = this.state.startLoc;
      elt = this.parseParenItem(
        this.parseSpread(refExpressionErrors),
        spreadNodeStartLoc
      );
    } else if (this.match(tt.question)) {
      this.expectPlugin("partialApplication");
      if (!allowPlaceholder) {
        this.raise(Errors.UnexpectedArgumentPlaceholder, this.state.startLoc);
      }
      const node = this.startNode();
      this.next();
      elt = this.finishNode(node, "ArgumentPlaceholder");
    } else {
      elt = this.parseMaybeAssignAllowInOrVoidPattern(
        close,
        refExpressionErrors,
        this.parseParenItem
      );
    }
    return elt;
  }
  // Parse the next token as an identifier. If `liberal` is true (used
  // when parsing properties), it will also convert keywords into
  // identifiers.
  // This shouldn't be used to parse the keywords of meta properties, since they
  // are not identifiers and cannot contain escape sequences.
  parseIdentifier(liberal) {
    const node = this.startNode();
    const name = this.parseIdentifierName(liberal);
    return this.createIdentifier(node, name);
  }
  createIdentifier(node, name) {
    node.name = name;
    node.loc.identifierName = name;
    return this.finishNode(node, "Identifier");
  }
  createIdentifierAt(node, name, endLoc) {
    node.name = name;
    node.loc.identifierName = name;
    return this.finishNodeAt(node, "Identifier", endLoc);
  }
  parseIdentifierName(liberal) {
    let name;
    const { startLoc, type } = this.state;
    if (tokenIsKeywordOrIdentifier(type)) {
      name = this.state.value;
    } else {
      this.unexpected();
    }
    const tokenIsKeyword = tokenKeywordOrIdentifierIsKeyword(type);
    if (liberal) {
      if (tokenIsKeyword) {
        this.replaceToken(tt.name);
      }
    } else {
      this.checkReservedWord(name, startLoc, tokenIsKeyword, false);
    }
    this.next();
    return name;
  }
  checkReservedWord(word, startLoc, checkKeywords, isBinding) {
    if (word.length > 10) {
      return;
    }
    if (!canBeReservedWord(word)) {
      return;
    }
    if (checkKeywords && isKeyword(word)) {
      this.raise(Errors.UnexpectedKeyword, startLoc, {
        keyword: word
      });
      return;
    }
    const reservedTest = !this.state.strict ? isReservedWord : isBinding ? isStrictBindReservedWord : isStrictReservedWord;
    if (reservedTest(word, this.inModule)) {
      this.raise(Errors.UnexpectedReservedWord, startLoc, {
        reservedWord: word
      });
      return;
    } else if (word === "yield") {
      if (this.prodParam.hasYield) {
        this.raise(Errors.YieldBindingIdentifier, startLoc);
        return;
      }
    } else if (word === "await") {
      if (this.prodParam.hasAwait) {
        this.raise(Errors.AwaitBindingIdentifier, startLoc);
        return;
      }
      if (this.scope.inStaticBlock) {
        this.raise(Errors.AwaitBindingIdentifierInStaticBlock, startLoc);
        return;
      }
      this.expressionScope.recordAsyncArrowParametersError(startLoc);
    } else if (word === "arguments") {
      if (this.scope.inClassAndNotInNonArrowFunction) {
        this.raise(Errors.ArgumentsInClass, startLoc);
        return;
      }
    }
  }
  // Returns whether `await` is allowed or not in this context, and if it is
  // keeps track of it to determine whether a module uses top-level await.
  recordAwaitIfAllowed() {
    const isAwaitAllowed = this.prodParam.hasAwait;
    if (isAwaitAllowed && !this.scope.inFunction) {
      this.state.hasTopLevelAwait = true;
    }
    return isAwaitAllowed;
  }
  // Parses await expression inside async function.
  parseAwait(startLoc) {
    const node = this.startNodeAt(startLoc);
    this.expressionScope.recordParameterInitializerError(
      Errors.AwaitExpressionFormalParameter,
      node
    );
    if (this.eat(tt.star)) {
      this.raise(Errors.ObsoleteAwaitStar, node);
    }
    if (!this.scope.inFunction && !(this.optionFlags & OptionFlags.AllowAwaitOutsideFunction)) {
      if (this.isAmbiguousPrefixOrIdentifier()) {
        this.ambiguousScriptDifferentAst = true;
      } else {
        this.sawUnambiguousESM = true;
      }
    }
    if (!this.state.soloAwait) {
      node.argument = this.parseMaybeUnary(null, true);
    }
    return this.finishNode(node, "AwaitExpression");
  }
  isAmbiguousPrefixOrIdentifier() {
    if (this.hasPrecedingLineBreak()) return true;
    const { type } = this.state;
    return (
      // All the following expressions are ambiguous:
      //   await + 0, await - 0, await ( 0 ), await [ 0 ], await / 0 /u, await ``, await of []
      type === tt.plusMin || type === tt.parenL || type === tt.bracketL || tokenIsTemplate(type) || type === tt._of && !this.state.containsEsc || // Sometimes the tokenizer generates tt.slash for regexps, and this is
      // handler by parseExprAtom
      type === tt.regexp || type === tt.slash || // This code could be parsed both as a modulo operator or as an intrinsic:
      //   await %x(0)
      this.hasPlugin("v8intrinsic") && type === tt.modulo
    );
  }
  // Parses yield expression inside generator.
  parseYield(startLoc) {
    const node = this.startNodeAt(startLoc);
    this.expressionScope.recordParameterInitializerError(
      Errors.YieldInParameter,
      node
    );
    let delegating = false;
    let argument = null;
    if (!this.hasPrecedingLineBreak()) {
      delegating = this.eat(tt.star);
      switch (this.state.type) {
        case tt.semi:
        case tt.eof:
        case tt.braceR:
        case tt.parenR:
        case tt.bracketR:
        case tt.braceBarR:
        case tt.colon:
        case tt.comma:
          if (!delegating) break;
        /* fallthrough */
        default:
          argument = this.parseMaybeAssign();
      }
    }
    node.delegate = delegating;
    node.argument = argument;
    return this.finishNode(node, "YieldExpression");
  }
  // https://tc39.es/ecma262/#prod-ImportCall
  parseImportCall(node) {
    this.next();
    node.source = this.parseMaybeAssignAllowIn();
    node.options = null;
    if (this.eat(tt.comma)) {
      if (!this.match(tt.parenR)) {
        node.options = this.parseMaybeAssignAllowIn();
        if (this.eat(tt.comma)) {
          this.addTrailingCommaExtraToNode(node.options);
          if (!this.match(tt.parenR)) {
            do {
              this.parseMaybeAssignAllowIn();
            } while (this.eat(tt.comma) && !this.match(tt.parenR));
            this.raise(Errors.ImportCallArity, node);
          }
        }
      } else {
        this.addTrailingCommaExtraToNode(node.source);
      }
    }
    this.expect(tt.parenR);
    return this.finishNode(node, "ImportExpression");
  }
  // Validates a pipeline (for any of the pipeline Babylon plugins) at the point
  // of the infix operator `|>`.
  checkPipelineAtInfixOperator(left, leftStartLoc) {
    if (this.hasPlugin(["pipelineOperator", { proposal: "smart" }])) {
      if (left.type === "SequenceExpression") {
        this.raise(Errors.PipelineHeadSequenceExpression, leftStartLoc);
      }
    }
  }
  parseSmartPipelineBodyInStyle(childExpr, startLoc) {
    if (this.isSimpleReference(childExpr)) {
      const bodyNode = this.startNodeAt(startLoc);
      bodyNode.callee = childExpr;
      return this.finishNode(bodyNode, "PipelineBareFunction");
    } else {
      const bodyNode = this.startNodeAt(startLoc);
      this.checkSmartPipeTopicBodyEarlyErrors(startLoc);
      bodyNode.expression = childExpr;
      return this.finishNode(bodyNode, "PipelineTopicExpression");
    }
  }
  isSimpleReference(expression) {
    switch (expression.type) {
      case "MemberExpression":
        return !expression.computed && this.isSimpleReference(expression.object);
      case "Identifier":
        return true;
      default:
        return false;
    }
  }
  // This helper method is to be called immediately
  // after a topic-style smart-mix pipe body is parsed.
  // The `startLoc` is the starting position of the pipe body.
  checkSmartPipeTopicBodyEarlyErrors(startLoc) {
    if (this.match(tt.arrow)) {
      throw this.raise(Errors.PipelineBodyNoArrow, this.state.startLoc);
    }
    if (!this.topicReferenceWasUsedInCurrentContext()) {
      this.raise(Errors.PipelineTopicUnused, startLoc);
    }
  }
  // Enable topic references from outer contexts within Hack-style pipe bodies.
  // The function modifies the parser's topic-context state to enable or disable
  // the use of topic references.
  // The function then calls a callback, then resets the parser
  // to the old topic-context state that it had before the function was called.
  withTopicBindingContext(callback) {
    const outerContextTopicState = this.state.topicContext;
    this.state.topicContext = {
      // Enable the use of the primary topic reference.
      maxNumOfResolvableTopics: 1,
      // Hide the use of any topic references from outer contexts.
      maxTopicIndex: null
    };
    try {
      return callback();
    } finally {
      this.state.topicContext = outerContextTopicState;
    }
  }
  // This helper method is used only with the deprecated smart-mix pipe proposal.
  // Disables topic references from outer contexts within syntax constructs
  // such as the bodies of iteration statements.
  // The function modifies the parser's topic-context state to enable or disable
  // the use of topic references with the smartPipelines plugin. They then run a
  // callback, then they reset the parser to the old topic-context state that it
  // had before the function was called.
  withSmartMixTopicForbiddingContext(callback) {
    if (
      // @ts-expect-error Babel 7 only
      this.hasPlugin(["pipelineOperator", { proposal: "smart" }])
    ) {
      const outerContextTopicState = this.state.topicContext;
      this.state.topicContext = {
        // Disable the use of the primary topic reference.
        maxNumOfResolvableTopics: 0,
        // Hide the use of any topic references from outer contexts.
        maxTopicIndex: null
      };
      try {
        return callback();
      } finally {
        this.state.topicContext = outerContextTopicState;
      }
    } else {
      return callback();
    }
  }
  withSoloAwaitPermittingContext(callback) {
    const outerContextSoloAwaitState = this.state.soloAwait;
    this.state.soloAwait = true;
    try {
      return callback();
    } finally {
      this.state.soloAwait = outerContextSoloAwaitState;
    }
  }
  allowInAnd(callback) {
    const flags = this.prodParam.currentFlags();
    const prodParamToSet = ParamKind.PARAM_IN & ~flags;
    if (prodParamToSet) {
      this.prodParam.enter(flags | ParamKind.PARAM_IN);
      try {
        return callback();
      } finally {
        this.prodParam.exit();
      }
    }
    return callback();
  }
  disallowInAnd(callback) {
    const flags = this.prodParam.currentFlags();
    const prodParamToClear = ParamKind.PARAM_IN & flags;
    if (prodParamToClear) {
      this.prodParam.enter(flags & ~ParamKind.PARAM_IN);
      try {
        return callback();
      } finally {
        this.prodParam.exit();
      }
    }
    return callback();
  }
  // Register the use of a topic reference within the current
  // topic-binding context.
  registerTopicReference() {
    this.state.topicContext.maxTopicIndex = 0;
  }
  topicReferenceIsAllowedInCurrentContext() {
    return this.state.topicContext.maxNumOfResolvableTopics >= 1;
  }
  topicReferenceWasUsedInCurrentContext() {
    return this.state.topicContext.maxTopicIndex != null && this.state.topicContext.maxTopicIndex >= 0;
  }
  parseFSharpPipelineBody(prec) {
    const startLoc = this.state.startLoc;
    this.state.potentialArrowAt = this.state.start;
    const oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
    this.state.inFSharpPipelineDirectBody = true;
    const ret = this.parseExprOp(
      this.parseMaybeUnaryOrPrivate(),
      startLoc,
      prec
    );
    this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody;
    return ret;
  }
  // https://github.com/tc39/proposal-js-module-blocks
  parseModuleExpression() {
    this.expectPlugin("moduleBlocks");
    const node = this.startNode();
    this.next();
    if (!this.match(tt.braceL)) {
      this.unexpected(null, tt.braceL);
    }
    const program = this.startNodeAt(this.state.endLoc);
    this.next();
    const revertScopes = this.initializeScopes(
      /** inModule */
      true
    );
    this.enterInitialScopes();
    try {
      node.body = this.parseProgram(program, tt.braceR, "module");
    } finally {
      revertScopes();
    }
    return this.finishNode(node, "ModuleExpression");
  }
  parseVoidPattern(refExpressionErrors) {
    this.expectPlugin("discardBinding");
    const node = this.startNode();
    if (refExpressionErrors != null) {
      refExpressionErrors.voidPatternLoc = this.state.startLoc;
    }
    this.next();
    return this.finishNode(node, "VoidPattern");
  }
  parseMaybeAssignAllowInOrVoidPattern(close, refExpressionErrors, afterLeftParse) {
    if (refExpressionErrors != null && this.match(tt._void)) {
      const nextCode = this.lookaheadCharCode();
      if (nextCode === comma || nextCode === (close === tt.bracketR ? rightSquareBracket : close === tt.braceR ? rightCurlyBrace : rightParenthesis) || nextCode === equalsTo) {
        return this.parseMaybeDefault(
          this.state.startLoc,
          this.parseVoidPattern(refExpressionErrors)
        );
      }
    }
    return this.parseMaybeAssignAllowIn(refExpressionErrors, afterLeftParse);
  }
  // Used in Flow plugin
  parsePropertyNamePrefixOperator(prop) {
  }
};
var loopLabel = { kind: LoopLabelKind.Loop };
var switchLabel = { kind: LoopLabelKind.Switch };
var loneSurrogate = /[\uD800-\uDFFF]/u;
var keywordRelationalOperator = /in(?:stanceof)?/y;
function babel7CompatTokens(tokens, input, startIndex) {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const { type } = token;
    if (typeof type === "number") {
      {
        if (type === tt.privateName) {
          const { loc, start, value, end } = token;
          const hashEndPos = start + 1;
          const hashEndLoc = createPositionWithColumnOffset(loc.start, 1);
          tokens.splice(
            i,
            1,
            new Token({
              // @ts-expect-error: hacky way to create token
              type: getExportedToken(tt.hash),
              value: "#",
              start,
              end: hashEndPos,
              startLoc: loc.start,
              endLoc: hashEndLoc
            }),
            new Token({
              // @ts-expect-error: hacky way to create token
              type: getExportedToken(tt.name),
              value,
              start: hashEndPos,
              end,
              startLoc: hashEndLoc,
              endLoc: loc.end
            })
          );
          i++;
          continue;
        }
        if (tokenIsTemplate(type)) {
          const { loc, start, value, end } = token;
          const backquoteEnd = start + 1;
          const backquoteEndLoc = createPositionWithColumnOffset(loc.start, 1);
          let startToken;
          if (input.charCodeAt(start - startIndex) === graveAccent) {
            startToken = new Token({
              // @ts-expect-error: hacky way to create token
              type: getExportedToken(tt.backQuote),
              value: "`",
              start,
              end: backquoteEnd,
              startLoc: loc.start,
              endLoc: backquoteEndLoc
            });
          } else {
            startToken = new Token({
              // @ts-expect-error: hacky way to create token
              type: getExportedToken(tt.braceR),
              value: "}",
              start,
              end: backquoteEnd,
              startLoc: loc.start,
              endLoc: backquoteEndLoc
            });
          }
          let templateValue, templateElementEnd, templateElementEndLoc, endToken;
          if (type === tt.templateTail) {
            templateElementEnd = end - 1;
            templateElementEndLoc = createPositionWithColumnOffset(loc.end, -1);
            templateValue = value === null ? null : value.slice(1, -1);
            endToken = new Token({
              // @ts-expect-error: hacky way to create token
              type: getExportedToken(tt.backQuote),
              value: "`",
              start: templateElementEnd,
              end,
              startLoc: templateElementEndLoc,
              endLoc: loc.end
            });
          } else {
            templateElementEnd = end - 2;
            templateElementEndLoc = createPositionWithColumnOffset(loc.end, -2);
            templateValue = value === null ? null : value.slice(1, -2);
            endToken = new Token({
              // @ts-expect-error: hacky way to create token
              type: getExportedToken(tt.dollarBraceL),
              value: "${",
              start: templateElementEnd,
              end,
              startLoc: templateElementEndLoc,
              endLoc: loc.end
            });
          }
          tokens.splice(
            i,
            1,
            startToken,
            new Token({
              // @ts-expect-error: hacky way to create token
              type: getExportedToken(tt.template),
              value: templateValue,
              start: backquoteEnd,
              end: templateElementEnd,
              startLoc: backquoteEndLoc,
              endLoc: templateElementEndLoc
            }),
            endToken
          );
          i += 2;
          continue;
        }
      }
      token.type = getExportedToken(type);
    }
  }
  return tokens;
}
var StatementParser = class extends ExpressionParser {
  // ### Statement parsing
  // Parse a program. Initializes the parser, reads any number of
  // statements, and wraps them in a Program node.  Optionally takes a
  // `program` argument.  If present, the statements will be appended
  // to its body instead of creating a new node.
  parseTopLevel(file, program) {
    file.program = this.parseProgram(
      program,
      tt.eof,
      this.options.sourceType === "module" ? "module" : "script"
    );
    file.comments = this.comments;
    if (this.optionFlags & OptionFlags.Tokens) {
      file.tokens = babel7CompatTokens(
        this.tokens,
        this.input,
        this.startIndex
      );
    }
    return this.finishNode(file, "File");
  }
  parseProgram(program, end, sourceType) {
    program.sourceType = sourceType;
    program.interpreter = this.parseInterpreterDirective();
    this.parseBlockBody(program, true, true, end);
    if (this.inModule) {
      if (!(this.optionFlags & OptionFlags.AllowUndeclaredExports) && this.scope.undefinedExports.size > 0) {
        for (const [localName, at] of Array.from(this.scope.undefinedExports)) {
          this.raise(Errors.ModuleExportUndefined, at, { localName });
        }
      }
      this.addExtra(program, "topLevelAwait", this.state.hasTopLevelAwait);
    }
    let finishedProgram;
    if (end === tt.eof) {
      finishedProgram = this.finishNode(program, "Program");
    } else {
      finishedProgram = this.finishNodeAt(
        program,
        "Program",
        createPositionWithColumnOffset(this.state.startLoc, -1)
      );
    }
    return finishedProgram;
  }
  /**
   * cast a Statement to a Directive. This method mutates input statement.
   */
  stmtToDirective(stmt) {
    const directive = this.castNodeTo(stmt, "Directive");
    const directiveLiteral = this.castNodeTo(
      stmt.expression,
      "DirectiveLiteral"
    );
    const expressionValue = directiveLiteral.value;
    const raw = this.input.slice(
      this.offsetToSourcePos(directiveLiteral.start),
      this.offsetToSourcePos(directiveLiteral.end)
    );
    const val = directiveLiteral.value = raw.slice(1, -1);
    this.addExtra(directiveLiteral, "raw", raw);
    this.addExtra(directiveLiteral, "rawValue", val);
    this.addExtra(directiveLiteral, "expressionValue", expressionValue);
    directive.value = directiveLiteral;
    delete stmt.expression;
    return directive;
  }
  parseInterpreterDirective() {
    if (!this.match(tt.interpreterDirective)) {
      return null;
    }
    const node = this.startNode();
    node.value = this.state.value;
    this.next();
    return this.finishNode(node, "InterpreterDirective");
  }
  isLet() {
    if (!this.isContextual(tt._let)) {
      return false;
    }
    return this.hasFollowingBindingAtom();
  }
  isUsing() {
    if (!this.isContextual(tt._using)) {
      return false;
    }
    return this.nextTokenIsIdentifierOnSameLine();
  }
  isForUsing() {
    if (!this.isContextual(tt._using)) {
      return false;
    }
    const next = this.nextTokenInLineStart();
    const nextCh = this.codePointAtPos(next);
    if (this.isUnparsedContextual(next, "of")) {
      const nextCharAfterOf = this.lookaheadCharCodeSince(next + 2);
      if (nextCharAfterOf !== equalsTo && nextCharAfterOf !== colon && // recover from `for(using of;...);`
      nextCharAfterOf !== semicolon) {
        return false;
      }
    }
    if (this.chStartsBindingIdentifier(nextCh, next) || this.isUnparsedContextual(next, "void")) {
      return true;
    }
    return false;
  }
  nextTokenIsIdentifierOnSameLine() {
    const next = this.nextTokenInLineStart();
    const nextCh = this.codePointAtPos(next);
    return this.chStartsBindingIdentifier(nextCh, next);
  }
  isAwaitUsing() {
    if (!this.isContextual(tt._await)) {
      return false;
    }
    let next = this.nextTokenInLineStart();
    if (this.isUnparsedContextual(next, "using")) {
      next = this.nextTokenInLineStartSince(next + 5);
      const nextCh = this.codePointAtPos(next);
      if (this.chStartsBindingIdentifier(nextCh, next)) {
        return true;
      }
    }
    return false;
  }
  chStartsBindingIdentifier(ch, pos) {
    if (isIdentifierStart(ch)) {
      keywordRelationalOperator.lastIndex = pos;
      if (keywordRelationalOperator.test(this.input)) {
        const endCh = this.codePointAtPos(keywordRelationalOperator.lastIndex);
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
  chStartsBindingPattern(ch) {
    return ch === leftSquareBracket || ch === leftCurlyBrace;
  }
  /**
   * Assuming we have seen a contextual `let` and declaration is allowed, check if it
   * starts a variable declaration so that it should be interpreted as a keyword.
   */
  hasFollowingBindingAtom() {
    const next = this.nextTokenStart();
    const nextCh = this.codePointAtPos(next);
    return this.chStartsBindingPattern(nextCh) || this.chStartsBindingIdentifier(nextCh, next);
  }
  /**
   * Assuming we have seen a contextual `using` and declaration is allowed, check if it
   * starts a variable declaration in the same line so that it should be interpreted as
   * a keyword.
   */
  hasInLineFollowingBindingIdentifierOrBrace() {
    const next = this.nextTokenInLineStart();
    const nextCh = this.codePointAtPos(next);
    return nextCh === leftCurlyBrace || this.chStartsBindingIdentifier(nextCh, next);
  }
  allowsUsing() {
    return (this.scope.inModule || !this.scope.inTopLevel) && !this.scope.inBareCaseStatement;
  }
  // https://tc39.es/ecma262/#prod-ModuleItem
  parseModuleItem() {
    return this.parseStatementLike(
      1 | 2 | 4 | // This function is actually also used to parse StatementItems,
      // which with Annex B enabled allows labeled functions.
      8
      /* AllowLabeledFunction */
    );
  }
  // https://tc39.es/ecma262/#prod-StatementListItem
  parseStatementListItem() {
    return this.parseStatementLike(
      2 | 4 | (!this.options.annexB || this.state.strict ? 0 : 8)
    );
  }
  parseStatementOrSloppyAnnexBFunctionDeclaration(allowLabeledFunction = false) {
    let flags = 0;
    if (this.options.annexB && !this.state.strict) {
      flags |= 4;
      if (allowLabeledFunction) {
        flags |= 8;
      }
    }
    return this.parseStatementLike(flags);
  }
  // Parse a single statement.
  //
  // If expecting a statement and finding a slash operator, parse a
  // regular expression literal. This is to handle cases like
  // `if (foo) /blah/.exec(foo)`, where looking at the previous token
  // does not help.
  // https://tc39.es/ecma262/#prod-Statement
  parseStatement() {
    return this.parseStatementLike(
      0
      /* StatementOnly */
    );
  }
  // ImportDeclaration and ExportDeclaration are also handled here so we can throw recoverable errors
  // when they are not at the top level
  parseStatementLike(flags) {
    let decorators = null;
    if (this.match(tt.at)) {
      decorators = this.parseDecorators(true);
    }
    return this.parseStatementContent(flags, decorators);
  }
  parseStatementContent(flags, decorators) {
    const startType = this.state.type;
    const node = this.startNode();
    const allowDeclaration = !!(flags & 2);
    const allowFunctionDeclaration = !!(flags & 4);
    const topLevel = flags & 1;
    switch (startType) {
      case tt._break:
        return this.parseBreakContinueStatement(
          node,
          /* isBreak */
          true
        );
      case tt._continue:
        return this.parseBreakContinueStatement(
          node,
          /* isBreak */
          false
        );
      case tt._debugger:
        return this.parseDebuggerStatement(node);
      case tt._do:
        return this.parseDoWhileStatement(node);
      case tt._for:
        return this.parseForStatement(node);
      case tt._function:
        if (this.lookaheadCharCode() === dot) break;
        if (!allowFunctionDeclaration) {
          this.raise(
            this.state.strict ? Errors.StrictFunction : this.options.annexB ? Errors.SloppyFunctionAnnexB : Errors.SloppyFunction,
            this.state.startLoc
          );
        }
        return this.parseFunctionStatement(
          node,
          false,
          !allowDeclaration && allowFunctionDeclaration
        );
      case tt._class:
        if (!allowDeclaration) this.unexpected();
        return this.parseClass(
          this.maybeTakeDecorators(
            decorators,
            node
          ),
          true
        );
      case tt._if:
        return this.parseIfStatement(node);
      case tt._return:
        return this.parseReturnStatement(node);
      case tt._switch:
        return this.parseSwitchStatement(node);
      case tt._throw:
        return this.parseThrowStatement(node);
      case tt._try:
        return this.parseTryStatement(node);
      case tt._await:
        if (this.isAwaitUsing()) {
          if (!this.allowsUsing()) {
            this.raise(Errors.UnexpectedUsingDeclaration, node);
          } else if (!allowDeclaration) {
            this.raise(Errors.UnexpectedLexicalDeclaration, node);
          } else if (!this.recordAwaitIfAllowed()) {
            this.raise(Errors.AwaitUsingNotInAsyncContext, node);
          }
          this.next();
          return this.parseVarStatement(
            node,
            "await using"
          );
        }
        break;
      case tt._using:
        if (this.state.containsEsc || !this.hasInLineFollowingBindingIdentifierOrBrace()) {
          break;
        }
        if (!this.allowsUsing()) {
          this.raise(Errors.UnexpectedUsingDeclaration, this.state.startLoc);
        } else if (!allowDeclaration) {
          this.raise(Errors.UnexpectedLexicalDeclaration, this.state.startLoc);
        }
        return this.parseVarStatement(
          node,
          "using"
        );
      case tt._let: {
        if (this.state.containsEsc) {
          break;
        }
        const next = this.nextTokenStart();
        const nextCh = this.codePointAtPos(next);
        if (nextCh !== leftSquareBracket) {
          if (!allowDeclaration && this.hasFollowingLineBreak()) break;
          if (!this.chStartsBindingIdentifier(nextCh, next) && nextCh !== leftCurlyBrace) {
            break;
          }
        }
      }
      // fall through
      case tt._const: {
        if (!allowDeclaration) {
          this.raise(Errors.UnexpectedLexicalDeclaration, this.state.startLoc);
        }
      }
      // fall through
      case tt._var: {
        const kind = this.state.value;
        return this.parseVarStatement(
          node,
          kind
        );
      }
      case tt._while:
        return this.parseWhileStatement(node);
      case tt._with:
        return this.parseWithStatement(node);
      case tt.braceL:
        return this.parseBlock();
      case tt.semi:
        return this.parseEmptyStatement(node);
      case tt._import: {
        const nextTokenCharCode = this.lookaheadCharCode();
        if (nextTokenCharCode === leftParenthesis || // import()
        nextTokenCharCode === dot) {
          break;
        }
      }
      // fall through
      case tt._export: {
        if (!(this.optionFlags & OptionFlags.AllowImportExportEverywhere) && !topLevel) {
          this.raise(Errors.UnexpectedImportExport, this.state.startLoc);
        }
        this.next();
        let result;
        if (startType === tt._import) {
          result = this.parseImport(node);
        } else {
          result = this.parseExport(
            node,
            decorators
          );
        }
        this.assertModuleNodeAllowed(result);
        return result;
      }
      default: {
        if (this.isAsyncFunction()) {
          if (!allowDeclaration) {
            this.raise(
              Errors.AsyncFunctionInSingleStatementContext,
              this.state.startLoc
            );
          }
          this.next();
          return this.parseFunctionStatement(
            node,
            true,
            !allowDeclaration && allowFunctionDeclaration
          );
        }
      }
    }
    const maybeName = this.state.value;
    const expr = this.parseExpression();
    if (tokenIsIdentifier(startType) && expr.type === "Identifier" && this.eat(tt.colon)) {
      return this.parseLabeledStatement(
        node,
        maybeName,
        expr,
        flags
      );
    } else {
      return this.parseExpressionStatement(
        node,
        expr,
        decorators
      );
    }
  }
  assertModuleNodeAllowed(node) {
    if (!(this.optionFlags & OptionFlags.AllowImportExportEverywhere) && !this.inModule) {
      this.raise(Errors.ImportOutsideModule, node);
    }
  }
  decoratorsEnabledBeforeExport() {
    if (this.hasPlugin("decorators-legacy")) return true;
    return this.hasPlugin("decorators") && this.getPluginOption("decorators", "decoratorsBeforeExport") !== false;
  }
  // Attach the decorators to the given class.
  // NOTE: This method changes the .start location of the class, and thus
  // can affect comment attachment. Calling it before or after finalizing
  // the class node (and thus finalizing its comments) changes how comments
  // before the `class` keyword or before the final .start location of the
  // class are attached.
  maybeTakeDecorators(maybeDecorators, classNode, exportNode) {
    if (maybeDecorators) {
      if (classNode.decorators?.length) {
        if (typeof this.getPluginOption(
          "decorators",
          "decoratorsBeforeExport"
        ) !== "boolean") {
          this.raise(
            Errors.DecoratorsBeforeAfterExport,
            classNode.decorators[0]
          );
        }
        classNode.decorators.unshift(...maybeDecorators);
      } else {
        classNode.decorators = maybeDecorators;
      }
      this.resetStartLocationFromNode(classNode, maybeDecorators[0]);
      if (exportNode) this.resetStartLocationFromNode(exportNode, classNode);
    }
    return classNode;
  }
  canHaveLeadingDecorator() {
    return this.match(tt._class);
  }
  parseDecorators(allowExport) {
    const decorators = [];
    do {
      decorators.push(this.parseDecorator());
    } while (this.match(tt.at));
    if (this.match(tt._export)) {
      if (!allowExport) {
        this.unexpected();
      }
      if (!this.decoratorsEnabledBeforeExport()) {
        this.raise(Errors.DecoratorExportClass, this.state.startLoc);
      }
    } else if (!this.canHaveLeadingDecorator()) {
      throw this.raise(Errors.UnexpectedLeadingDecorator, this.state.startLoc);
    }
    return decorators;
  }
  parseDecorator() {
    this.expectOnePlugin(["decorators", "decorators-legacy"]);
    const node = this.startNode();
    this.next();
    if (this.hasPlugin("decorators")) {
      const startLoc = this.state.startLoc;
      let expr;
      if (this.match(tt.parenL)) {
        const startLoc2 = this.state.startLoc;
        this.next();
        expr = this.parseExpression();
        this.expect(tt.parenR);
        expr = this.wrapParenthesis(startLoc2, expr);
        const paramsStartLoc = this.state.startLoc;
        node.expression = this.parseMaybeDecoratorArguments(expr, startLoc2);
        if (this.getPluginOption("decorators", "allowCallParenthesized") === false && node.expression !== expr) {
          this.raise(
            Errors.DecoratorArgumentsOutsideParentheses,
            paramsStartLoc
          );
        }
      } else {
        expr = this.parseIdentifier(false);
        while (this.eat(tt.dot)) {
          const node2 = this.startNodeAt(startLoc);
          node2.object = expr;
          if (this.match(tt.privateName)) {
            this.classScope.usePrivateName(
              this.state.value,
              this.state.startLoc
            );
            node2.property = this.parsePrivateName();
          } else {
            node2.property = this.parseIdentifier(true);
          }
          node2.computed = false;
          expr = this.finishNode(node2, "MemberExpression");
        }
        node.expression = this.parseMaybeDecoratorArguments(expr, startLoc);
      }
    } else {
      node.expression = this.parseExprSubscripts();
    }
    return this.finishNode(node, "Decorator");
  }
  parseMaybeDecoratorArguments(expr, startLoc) {
    if (this.eat(tt.parenL)) {
      const node = this.startNodeAt(startLoc);
      node.callee = expr;
      node.arguments = this.parseCallExpressionArguments();
      this.toReferencedList(node.arguments);
      return this.finishNode(node, "CallExpression");
    }
    return expr;
  }
  parseBreakContinueStatement(node, isBreak) {
    this.next();
    if (this.isLineTerminator()) {
      node.label = null;
    } else {
      node.label = this.parseIdentifier();
      this.semicolon();
    }
    this.verifyBreakContinue(node, isBreak);
    return this.finishNode(
      node,
      isBreak ? "BreakStatement" : "ContinueStatement"
    );
  }
  verifyBreakContinue(node, isBreak) {
    let i;
    for (i = 0; i < this.state.labels.length; ++i) {
      const lab = this.state.labels[i];
      if (node.label == null || lab.name === node.label.name) {
        if (lab.kind != null && (isBreak || lab.kind === LoopLabelKind.Loop)) {
          break;
        }
        if (node.label && isBreak) break;
      }
    }
    if (i === this.state.labels.length) {
      const type = isBreak ? "BreakStatement" : "ContinueStatement";
      this.raise(Errors.IllegalBreakContinue, node, { type });
    }
  }
  parseDebuggerStatement(node) {
    this.next();
    this.semicolon();
    return this.finishNode(node, "DebuggerStatement");
  }
  parseHeaderExpression() {
    this.expect(tt.parenL);
    const val = this.parseExpression();
    this.expect(tt.parenR);
    return val;
  }
  // https://tc39.es/ecma262/#prod-DoWhileStatement
  parseDoWhileStatement(node) {
    this.next();
    this.state.labels.push(loopLabel);
    node.body = // For the smartPipelines plugin: Disable topic references from outer
    // contexts within the loop body. They are permitted in test expressions,
    // outside of the loop body.
    this.withSmartMixTopicForbiddingContext(
      () => (
        // Parse the loop body's body.
        this.parseStatement()
      )
    );
    this.state.labels.pop();
    this.expect(tt._while);
    node.test = this.parseHeaderExpression();
    this.eat(tt.semi);
    return this.finishNode(node, "DoWhileStatement");
  }
  // Disambiguating between a `for` and a `for`/`in` or `for`/`of`
  // loop is non-trivial. Basically, we have to parse the init `var`
  // statement or expression, disallowing the `in` operator (see
  // the second parameter to `parseExpression`), and then check
  // whether the next token is `in` or `of`. When there is no init
  // part (semicolon immediately after the opening parenthesis), it
  // is a regular `for` loop.
  parseForStatement(node) {
    this.next();
    this.state.labels.push(loopLabel);
    let awaitAt = null;
    if (this.isContextual(tt._await) && this.recordAwaitIfAllowed()) {
      awaitAt = this.state.startLoc;
      this.next();
    }
    this.scope.enter(ScopeFlag.OTHER);
    this.expect(tt.parenL);
    if (this.match(tt.semi)) {
      if (awaitAt !== null) {
        this.unexpected(awaitAt);
      }
      return this.parseFor(node, null);
    }
    const startsWithLet = this.isContextual(tt._let);
    {
      const startsWithAwaitUsing = this.isAwaitUsing();
      const starsWithUsingDeclaration = startsWithAwaitUsing || this.isForUsing();
      const isLetOrUsing = startsWithLet && this.hasFollowingBindingAtom() || starsWithUsingDeclaration;
      if (this.match(tt._var) || this.match(tt._const) || isLetOrUsing) {
        const initNode = this.startNode();
        let kind;
        if (startsWithAwaitUsing) {
          kind = "await using";
          if (!this.recordAwaitIfAllowed()) {
            this.raise(Errors.AwaitUsingNotInAsyncContext, this.state.startLoc);
          }
          this.next();
        } else {
          kind = this.state.value;
        }
        this.next();
        this.parseVar(initNode, true, kind);
        const init2 = this.finishNode(initNode, "VariableDeclaration");
        const isForIn = this.match(tt._in);
        if (isForIn && starsWithUsingDeclaration) {
          this.raise(Errors.ForInUsing, init2);
        }
        if ((isForIn || this.isContextual(tt._of)) && init2.declarations.length === 1) {
          return this.parseForIn(node, init2, awaitAt);
        }
        if (awaitAt !== null) {
          this.unexpected(awaitAt);
        }
        return this.parseFor(node, init2);
      }
    }
    const startsWithAsync = this.isContextual(tt._async);
    const refExpressionErrors = new ExpressionErrors();
    const init = this.parseExpression(true, refExpressionErrors);
    const isForOf = this.isContextual(tt._of);
    if (isForOf) {
      if (startsWithLet) {
        this.raise(Errors.ForOfLet, init);
      }
      if (
        // `for await (async of []);` is allowed.
        awaitAt === null && startsWithAsync && init.type === "Identifier"
      ) {
        this.raise(Errors.ForOfAsync, init);
      }
    }
    if (isForOf || this.match(tt._in)) {
      this.checkDestructuringPrivate(refExpressionErrors);
      this.toAssignable(
        init,
        /* isLHS */
        true
      );
      const type = isForOf ? "ForOfStatement" : "ForInStatement";
      this.checkLVal(init, { type });
      return this.parseForIn(
        node,
        // @ts-expect-error init has been transformed to an assignable
        init,
        awaitAt
      );
    } else {
      this.checkExpressionErrors(refExpressionErrors, true);
    }
    if (awaitAt !== null) {
      this.unexpected(awaitAt);
    }
    return this.parseFor(node, init);
  }
  // https://tc39.es/ecma262/#prod-HoistableDeclaration
  parseFunctionStatement(node, isAsync, isHangingDeclaration) {
    this.next();
    return this.parseFunction(
      node,
      1 | (isHangingDeclaration ? 2 : 0) | (isAsync ? 8 : 0)
    );
  }
  // https://tc39.es/ecma262/#prod-IfStatement
  parseIfStatement(node) {
    this.next();
    node.test = this.parseHeaderExpression();
    node.consequent = this.parseStatementOrSloppyAnnexBFunctionDeclaration();
    node.alternate = this.eat(tt._else) ? this.parseStatementOrSloppyAnnexBFunctionDeclaration() : null;
    return this.finishNode(node, "IfStatement");
  }
  parseReturnStatement(node) {
    if (!this.prodParam.hasReturn) {
      this.raise(Errors.IllegalReturn, this.state.startLoc);
    }
    this.next();
    if (this.isLineTerminator()) {
      node.argument = null;
    } else {
      node.argument = this.parseExpression();
      this.semicolon();
    }
    return this.finishNode(node, "ReturnStatement");
  }
  // https://tc39.es/ecma262/#prod-SwitchStatement
  parseSwitchStatement(node) {
    this.next();
    node.discriminant = this.parseHeaderExpression();
    const cases = node.cases = [];
    this.expect(tt.braceL);
    this.state.labels.push(switchLabel);
    this.scope.enter(ScopeFlag.SWITCH);
    let cur;
    for (let sawDefault; !this.match(tt.braceR); ) {
      if (this.match(tt._case) || this.match(tt._default)) {
        const isCase = this.match(tt._case);
        if (cur) this.finishNode(cur, "SwitchCase");
        cases.push(cur = this.startNode());
        cur.consequent = [];
        this.next();
        if (isCase) {
          cur.test = this.parseExpression();
        } else {
          if (sawDefault) {
            this.raise(
              Errors.MultipleDefaultsInSwitch,
              this.state.lastTokStartLoc
            );
          }
          sawDefault = true;
          cur.test = null;
        }
        this.expect(tt.colon);
      } else {
        if (cur) {
          cur.consequent.push(this.parseStatementListItem());
        } else {
          this.unexpected();
        }
      }
    }
    this.scope.exit();
    if (cur) this.finishNode(cur, "SwitchCase");
    this.next();
    this.state.labels.pop();
    return this.finishNode(node, "SwitchStatement");
  }
  parseThrowStatement(node) {
    this.next();
    if (this.hasPrecedingLineBreak()) {
      this.raise(Errors.NewlineAfterThrow, this.state.lastTokEndLoc);
    }
    node.argument = this.parseExpression();
    this.semicolon();
    return this.finishNode(node, "ThrowStatement");
  }
  parseCatchClauseParam() {
    const param = this.parseBindingAtom();
    this.scope.enter(
      this.options.annexB && param.type === "Identifier" ? ScopeFlag.SIMPLE_CATCH : ScopeFlag.OTHER
    );
    this.checkLVal(
      param,
      { type: "CatchClause" },
      BindingFlag.TYPE_CATCH_PARAM
    );
    return param;
  }
  parseTryStatement(node) {
    this.next();
    node.block = this.parseBlock();
    node.handler = null;
    if (this.match(tt._catch)) {
      const clause = this.startNode();
      this.next();
      if (this.match(tt.parenL)) {
        this.expect(tt.parenL);
        clause.param = this.parseCatchClauseParam();
        this.expect(tt.parenR);
      } else {
        clause.param = null;
        this.scope.enter(ScopeFlag.OTHER);
      }
      clause.body = // For the smartPipelines plugin: Disable topic references from outer
      // contexts within the catch clause's body.
      this.withSmartMixTopicForbiddingContext(
        () => (
          // Parse the catch clause's body.
          this.parseBlock(false, false)
        )
      );
      this.scope.exit();
      node.handler = this.finishNode(clause, "CatchClause");
    }
    node.finalizer = this.eat(tt._finally) ? this.parseBlock() : null;
    if (!node.handler && !node.finalizer) {
      this.raise(Errors.NoCatchOrFinally, node);
    }
    return this.finishNode(node, "TryStatement");
  }
  // https://tc39.es/ecma262/#prod-VariableStatement
  // https://tc39.es/ecma262/#prod-LexicalDeclaration
  parseVarStatement(node, kind, allowMissingInitializer = false) {
    this.next();
    this.parseVar(node, false, kind, allowMissingInitializer);
    this.semicolon();
    return this.finishNode(node, "VariableDeclaration");
  }
  // https://tc39.es/ecma262/#prod-WhileStatement
  parseWhileStatement(node) {
    this.next();
    node.test = this.parseHeaderExpression();
    this.state.labels.push(loopLabel);
    node.body = // For the smartPipelines plugin:
    // Disable topic references from outer contexts within the loop body.
    // They are permitted in test expressions, outside of the loop body.
    this.withSmartMixTopicForbiddingContext(
      () => (
        // Parse loop body.
        this.parseStatement()
      )
    );
    this.state.labels.pop();
    return this.finishNode(node, "WhileStatement");
  }
  parseWithStatement(node) {
    if (this.state.strict) {
      this.raise(Errors.StrictWith, this.state.startLoc);
    }
    this.next();
    node.object = this.parseHeaderExpression();
    node.body = // For the smartPipelines plugin:
    // Disable topic references from outer contexts within the with statement's body.
    // They are permitted in function default-parameter expressions, which are
    // part of the outer context, outside of the with statement's body.
    this.withSmartMixTopicForbiddingContext(
      () => (
        // Parse the statement body.
        this.parseStatement()
      )
    );
    return this.finishNode(node, "WithStatement");
  }
  parseEmptyStatement(node) {
    this.next();
    return this.finishNode(node, "EmptyStatement");
  }
  // https://tc39.es/ecma262/#prod-LabelledStatement
  parseLabeledStatement(node, maybeName, expr, flags) {
    for (const label of this.state.labels) {
      if (label.name === maybeName) {
        this.raise(Errors.LabelRedeclaration, expr, {
          labelName: maybeName
        });
      }
    }
    const kind = tokenIsLoop(this.state.type) ? LoopLabelKind.Loop : this.match(tt._switch) ? LoopLabelKind.Switch : null;
    for (let i = this.state.labels.length - 1; i >= 0; i--) {
      const label = this.state.labels[i];
      if (label.statementStart === node.start) {
        label.statementStart = this.sourceToOffsetPos(this.state.start);
        label.kind = kind;
      } else {
        break;
      }
    }
    this.state.labels.push({
      name: maybeName,
      kind,
      statementStart: this.sourceToOffsetPos(this.state.start)
    });
    node.body = flags & 8 ? this.parseStatementOrSloppyAnnexBFunctionDeclaration(true) : this.parseStatement();
    this.state.labels.pop();
    node.label = expr;
    return this.finishNode(node, "LabeledStatement");
  }
  parseExpressionStatement(node, expr, decorators) {
    node.expression = expr;
    this.semicolon();
    return this.finishNode(node, "ExpressionStatement");
  }
  // Parse a semicolon-enclosed block of statements, handling `"use
  // strict"` declarations when `allowDirectives` is true (used for
  // function bodies).
  parseBlock(allowDirectives = false, createNewLexicalScope = true, afterBlockParse) {
    const node = this.startNode();
    if (allowDirectives) {
      this.state.strictErrors.clear();
    }
    this.expect(tt.braceL);
    if (createNewLexicalScope) {
      this.scope.enter(ScopeFlag.OTHER);
    }
    this.parseBlockBody(
      node,
      allowDirectives,
      false,
      tt.braceR,
      afterBlockParse
    );
    if (createNewLexicalScope) {
      this.scope.exit();
    }
    return this.finishNode(node, "BlockStatement");
  }
  isValidDirective(stmt) {
    return stmt.type === "ExpressionStatement" && stmt.expression.type === "StringLiteral" && !stmt.expression.extra.parenthesized;
  }
  parseBlockBody(node, allowDirectives, topLevel, end, afterBlockParse) {
    const body = node.body = [];
    const directives = node.directives = [];
    this.parseBlockOrModuleBlockBody(
      body,
      allowDirectives ? directives : void 0,
      topLevel,
      end,
      afterBlockParse
    );
  }
  // Undefined directives means that directives are not allowed.
  // https://tc39.es/ecma262/#prod-Block
  // https://tc39.es/ecma262/#prod-ModuleBody
  parseBlockOrModuleBlockBody(body, directives, topLevel, end, afterBlockParse) {
    const oldStrict = this.state.strict;
    let hasStrictModeDirective = false;
    let parsedNonDirective = false;
    while (!this.match(end)) {
      const stmt = topLevel ? this.parseModuleItem() : this.parseStatementListItem();
      if (directives && !parsedNonDirective) {
        if (this.isValidDirective(stmt)) {
          const directive = this.stmtToDirective(stmt);
          directives.push(directive);
          if (!hasStrictModeDirective && directive.value.value === "use strict") {
            hasStrictModeDirective = true;
            this.setStrict(true);
          }
          continue;
        }
        parsedNonDirective = true;
        this.state.strictErrors.clear();
      }
      body.push(stmt);
    }
    afterBlockParse?.call(this, hasStrictModeDirective);
    if (!oldStrict) {
      this.setStrict(false);
    }
    this.next();
  }
  // Parse a regular `for` loop. The disambiguation code in
  // `parseStatement` will already have parsed the init statement or
  // expression.
  parseFor(node, init) {
    node.init = init;
    this.semicolon(
      /* allowAsi */
      false
    );
    node.test = this.match(tt.semi) ? null : this.parseExpression();
    this.semicolon(
      /* allowAsi */
      false
    );
    node.update = this.match(tt.parenR) ? null : this.parseExpression();
    this.expect(tt.parenR);
    node.body = // For the smartPipelines plugin: Disable topic references from outer
    // contexts within the loop body. They are permitted in test expressions,
    // outside of the loop body.
    this.withSmartMixTopicForbiddingContext(
      () => (
        // Parse the loop body.
        this.parseStatement()
      )
    );
    this.scope.exit();
    this.state.labels.pop();
    return this.finishNode(node, "ForStatement");
  }
  // Parse a `for`/`in` and `for`/`of` loop, which are almost
  // same from parser's perspective.
  parseForIn(node, init, awaitAt) {
    const isForIn = this.match(tt._in);
    this.next();
    if (isForIn) {
      if (awaitAt !== null) this.unexpected(awaitAt);
    } else {
      node.await = awaitAt !== null;
    }
    if (init.type === "VariableDeclaration" && init.declarations[0].init != null && (!isForIn || !this.options.annexB || this.state.strict || init.kind !== "var" || init.declarations[0].id.type !== "Identifier")) {
      this.raise(Errors.ForInOfLoopInitializer, init, {
        type: isForIn ? "ForInStatement" : "ForOfStatement"
      });
    }
    if (init.type === "AssignmentPattern") {
      this.raise(Errors.InvalidLhs, init, {
        ancestor: { type: "ForStatement" }
      });
    }
    node.left = init;
    node.right = isForIn ? this.parseExpression() : this.parseMaybeAssignAllowIn();
    this.expect(tt.parenR);
    node.body = // For the smartPipelines plugin:
    // Disable topic references from outer contexts within the loop body.
    // They are permitted in test expressions, outside of the loop body.
    this.withSmartMixTopicForbiddingContext(
      () => (
        // Parse loop body.
        this.parseStatement()
      )
    );
    this.scope.exit();
    this.state.labels.pop();
    return this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement");
  }
  // Parse a list of variable declarations.
  parseVar(node, isFor, kind, allowMissingInitializer = false) {
    const declarations = node.declarations = [];
    node.kind = kind;
    for (; ; ) {
      const decl = this.startNode();
      this.parseVarId(decl, kind);
      decl.init = !this.eat(tt.eq) ? null : isFor ? this.parseMaybeAssignDisallowIn() : this.parseMaybeAssignAllowIn();
      if (decl.init === null && !allowMissingInitializer) {
        if (decl.id.type !== "Identifier" && !(isFor && (this.match(tt._in) || this.isContextual(tt._of)))) {
          this.raise(
            Errors.DeclarationMissingInitializer,
            this.state.lastTokEndLoc,
            {
              kind: "destructuring"
            }
          );
        } else if ((kind === "const" || kind === "using" || kind === "await using") && !(this.match(tt._in) || this.isContextual(tt._of))) {
          this.raise(
            Errors.DeclarationMissingInitializer,
            this.state.lastTokEndLoc,
            { kind }
          );
        }
      }
      declarations.push(this.finishNode(decl, "VariableDeclarator"));
      if (!this.eat(tt.comma)) break;
    }
    return node;
  }
  parseVarId(decl, kind) {
    const id = this.parseBindingAtom();
    if (kind === "using" || kind === "await using") {
      if (id.type === "ArrayPattern" || id.type === "ObjectPattern") {
        this.raise(Errors.UsingDeclarationHasBindingPattern, id.loc.start);
      }
    } else {
      if (id.type === "VoidPattern") {
        this.raise(Errors.UnexpectedVoidPattern, id.loc.start);
      }
    }
    this.checkLVal(
      id,
      { type: "VariableDeclarator" },
      kind === "var" ? BindingFlag.TYPE_VAR : BindingFlag.TYPE_LEXICAL
    );
    decl.id = id;
  }
  // https://tc39.es/ecma262/#prod-AsyncFunctionExpression
  parseAsyncFunctionExpression(node) {
    return this.parseFunction(
      node,
      8
      /* Async */
    );
  }
  // Parse a function declaration or expression (depending on the
  // ParseFunctionFlag.Declaration flag).
  parseFunction(node, flags = 0) {
    const hangingDeclaration = flags & 2;
    const isDeclaration = !!(flags & 1);
    const requireId = isDeclaration && !(flags & 4);
    const isAsync = !!(flags & 8);
    this.initFunction(node, isAsync);
    if (this.match(tt.star)) {
      if (hangingDeclaration) {
        this.raise(
          Errors.GeneratorInSingleStatementContext,
          this.state.startLoc
        );
      }
      this.next();
      node.generator = true;
    }
    if (isDeclaration) {
      node.id = this.parseFunctionId(requireId);
    }
    const oldMaybeInArrowParameters = this.state.maybeInArrowParameters;
    this.state.maybeInArrowParameters = false;
    this.scope.enter(ScopeFlag.FUNCTION);
    this.prodParam.enter(functionFlags(isAsync, node.generator));
    if (!isDeclaration) {
      node.id = this.parseFunctionId();
    }
    this.parseFunctionParams(
      node,
      /* isConstructor */
      false
    );
    this.withSmartMixTopicForbiddingContext(() => {
      this.parseFunctionBodyAndFinish(
        node,
        isDeclaration ? "FunctionDeclaration" : "FunctionExpression"
      );
    });
    this.prodParam.exit();
    this.scope.exit();
    if (isDeclaration && !hangingDeclaration) {
      this.registerFunctionStatementId(node);
    }
    this.state.maybeInArrowParameters = oldMaybeInArrowParameters;
    return node;
  }
  parseFunctionId(requireId) {
    return requireId || tokenIsIdentifier(this.state.type) ? this.parseIdentifier() : null;
  }
  parseFunctionParams(node, isConstructor) {
    this.expect(tt.parenL);
    this.expressionScope.enter(newParameterDeclarationScope());
    node.params = this.parseBindingList(
      tt.parenR,
      rightParenthesis,
      ParseBindingListFlags.IS_FUNCTION_PARAMS | (isConstructor ? ParseBindingListFlags.IS_CONSTRUCTOR_PARAMS : 0)
    );
    this.expressionScope.exit();
  }
  registerFunctionStatementId(node) {
    if (!node.id) return;
    this.scope.declareName(
      node.id.name,
      !this.options.annexB || this.state.strict || node.generator || node.async ? this.scope.treatFunctionsAsVar ? BindingFlag.TYPE_VAR : BindingFlag.TYPE_LEXICAL : BindingFlag.TYPE_FUNCTION,
      node.id.loc.start
    );
  }
  // Parse a class declaration or literal (depending on the
  // `isStatement` parameter).
  parseClass(node, isStatement, optionalId) {
    this.next();
    const oldStrict = this.state.strict;
    this.state.strict = true;
    this.parseClassId(node, isStatement, optionalId);
    this.parseClassSuper(node);
    node.body = this.parseClassBody(!!node.superClass, oldStrict);
    return this.finishNode(
      node,
      isStatement ? "ClassDeclaration" : "ClassExpression"
    );
  }
  isClassProperty() {
    return this.match(tt.eq) || this.match(tt.semi) || this.match(tt.braceR);
  }
  isClassMethod() {
    return this.match(tt.parenL);
  }
  nameIsConstructor(key) {
    return key.type === "Identifier" && key.name === "constructor" || key.type === "StringLiteral" && key.value === "constructor";
  }
  isNonstaticConstructor(method) {
    return !method.computed && !method.static && this.nameIsConstructor(method.key);
  }
  // https://tc39.es/ecma262/#prod-ClassBody
  parseClassBody(hadSuperClass, oldStrict) {
    this.classScope.enter();
    const state = {
      hadConstructor: false,
      hadSuperClass
    };
    let decorators = [];
    const classBody = this.startNode();
    classBody.body = [];
    this.expect(tt.braceL);
    this.withSmartMixTopicForbiddingContext(() => {
      while (!this.match(tt.braceR)) {
        if (this.eat(tt.semi)) {
          if (decorators.length > 0) {
            throw this.raise(
              Errors.DecoratorSemicolon,
              this.state.lastTokEndLoc
            );
          }
          continue;
        }
        if (this.match(tt.at)) {
          decorators.push(this.parseDecorator());
          continue;
        }
        const member = this.startNode();
        if (decorators.length) {
          member.decorators = decorators;
          this.resetStartLocationFromNode(member, decorators[0]);
          decorators = [];
        }
        this.parseClassMember(classBody, member, state);
        if (
          // @ts-expect-error Fixme
          member.kind === "constructor" && // @ts-expect-error Fixme
          member.decorators && // @ts-expect-error Fixme
          member.decorators.length > 0
        ) {
          this.raise(Errors.DecoratorConstructor, member);
        }
      }
    });
    this.state.strict = oldStrict;
    this.next();
    if (decorators.length) {
      throw this.raise(Errors.TrailingDecorator, this.state.startLoc);
    }
    this.classScope.exit();
    return this.finishNode(classBody, "ClassBody");
  }
  // returns true if the current identifier is a method/field name,
  // false if it is a modifier
  parseClassMemberFromModifier(classBody, member) {
    const key = this.parseIdentifier(true);
    if (this.isClassMethod()) {
      const method = member;
      method.kind = "method";
      method.computed = false;
      method.key = key;
      method.static = false;
      this.pushClassMethod(
        classBody,
        method,
        false,
        false,
        /* isConstructor */
        false,
        false
      );
      return true;
    } else if (this.isClassProperty()) {
      const prop = member;
      prop.computed = false;
      prop.key = key;
      prop.static = false;
      classBody.body.push(this.parseClassProperty(prop));
      return true;
    }
    this.resetPreviousNodeTrailingComments(key);
    return false;
  }
  parseClassMember(classBody, member, state) {
    const isStatic = this.isContextual(tt._static);
    if (isStatic) {
      if (this.parseClassMemberFromModifier(classBody, member)) {
        return;
      }
      if (this.eat(tt.braceL)) {
        this.parseClassStaticBlock(classBody, member);
        return;
      }
    }
    this.parseClassMemberWithIsStatic(classBody, member, state, isStatic);
  }
  parseClassMemberWithIsStatic(classBody, member, state, isStatic) {
    const publicMethod = member;
    const privateMethod = member;
    const publicProp = member;
    const privateProp = member;
    const accessorProp = member;
    const method = publicMethod;
    const publicMember = publicMethod;
    member.static = isStatic;
    this.parsePropertyNamePrefixOperator(member);
    if (this.eat(tt.star)) {
      method.kind = "method";
      const isPrivateName = this.match(tt.privateName);
      this.parseClassElementName(method);
      this.parsePostMemberNameModifiers(method);
      if (isPrivateName) {
        this.pushClassPrivateMethod(classBody, privateMethod, true, false);
        return;
      }
      if (this.isNonstaticConstructor(publicMethod)) {
        this.raise(Errors.ConstructorIsGenerator, publicMethod.key);
      }
      this.pushClassMethod(
        classBody,
        publicMethod,
        true,
        false,
        /* isConstructor */
        false,
        false
      );
      return;
    }
    const isContextual = !this.state.containsEsc && tokenIsIdentifier(this.state.type);
    const key = this.parseClassElementName(member);
    const maybeContextualKw = isContextual ? key.name : null;
    const isPrivate = this.isPrivateName(key);
    const maybeQuestionTokenStartLoc = this.state.startLoc;
    this.parsePostMemberNameModifiers(publicMember);
    if (this.isClassMethod()) {
      method.kind = "method";
      if (isPrivate) {
        this.pushClassPrivateMethod(classBody, privateMethod, false, false);
        return;
      }
      const isConstructor = this.isNonstaticConstructor(publicMethod);
      let allowsDirectSuper = false;
      if (isConstructor) {
        publicMethod.kind = "constructor";
        if (state.hadConstructor && !this.hasPlugin("typescript")) {
          this.raise(Errors.DuplicateConstructor, key);
        }
        if (isConstructor && this.hasPlugin("typescript") && member.override) {
          this.raise(Errors.OverrideOnConstructor, key);
        }
        state.hadConstructor = true;
        allowsDirectSuper = state.hadSuperClass;
      }
      this.pushClassMethod(
        classBody,
        publicMethod,
        false,
        false,
        isConstructor,
        allowsDirectSuper
      );
    } else if (this.isClassProperty()) {
      if (isPrivate) {
        this.pushClassPrivateProperty(classBody, privateProp);
      } else {
        this.pushClassProperty(classBody, publicProp);
      }
    } else if (maybeContextualKw === "async" && !this.isLineTerminator()) {
      this.resetPreviousNodeTrailingComments(key);
      const isGenerator = this.eat(tt.star);
      if (publicMember.optional) {
        this.unexpected(maybeQuestionTokenStartLoc);
      }
      method.kind = "method";
      const isPrivate2 = this.match(tt.privateName);
      this.parseClassElementName(method);
      this.parsePostMemberNameModifiers(publicMember);
      if (isPrivate2) {
        this.pushClassPrivateMethod(
          classBody,
          privateMethod,
          isGenerator,
          true
        );
      } else {
        if (this.isNonstaticConstructor(publicMethod)) {
          this.raise(Errors.ConstructorIsAsync, publicMethod.key);
        }
        this.pushClassMethod(
          classBody,
          publicMethod,
          isGenerator,
          true,
          /* isConstructor */
          false,
          false
        );
      }
    } else if ((maybeContextualKw === "get" || maybeContextualKw === "set") && !(this.match(tt.star) && this.isLineTerminator())) {
      this.resetPreviousNodeTrailingComments(key);
      method.kind = maybeContextualKw;
      const isPrivate2 = this.match(tt.privateName);
      this.parseClassElementName(publicMethod);
      if (isPrivate2) {
        this.pushClassPrivateMethod(classBody, privateMethod, false, false);
      } else {
        if (this.isNonstaticConstructor(publicMethod)) {
          this.raise(Errors.ConstructorIsAccessor, publicMethod.key);
        }
        this.pushClassMethod(
          classBody,
          publicMethod,
          false,
          false,
          /* isConstructor */
          false,
          false
        );
      }
      this.checkGetterSetterParams(publicMethod);
    } else if (maybeContextualKw === "accessor" && !this.isLineTerminator()) {
      this.expectPlugin("decoratorAutoAccessors");
      this.resetPreviousNodeTrailingComments(key);
      const isPrivate2 = this.match(tt.privateName);
      this.parseClassElementName(publicProp);
      this.pushClassAccessorProperty(classBody, accessorProp, isPrivate2);
    } else if (this.isLineTerminator()) {
      if (isPrivate) {
        this.pushClassPrivateProperty(classBody, privateProp);
      } else {
        this.pushClassProperty(classBody, publicProp);
      }
    } else {
      this.unexpected();
    }
  }
  // https://tc39.es/ecma262/#prod-ClassElementName
  parseClassElementName(member) {
    const { type, value } = this.state;
    if ((type === tt.name || type === tt.string) && member.static && value === "prototype") {
      this.raise(Errors.StaticPrototype, this.state.startLoc);
    }
    if (type === tt.privateName) {
      if (value === "constructor") {
        this.raise(Errors.ConstructorClassPrivateField, this.state.startLoc);
      }
      const key = this.parsePrivateName();
      member.key = key;
      return key;
    }
    this.parsePropertyName(member);
    return member.key;
  }
  parseClassStaticBlock(classBody, member) {
    this.scope.enter(
      ScopeFlag.CLASS | ScopeFlag.STATIC_BLOCK | ScopeFlag.SUPER
    );
    const oldLabels = this.state.labels;
    this.state.labels = [];
    this.prodParam.enter(ParamKind.PARAM);
    const body = member.body = [];
    this.parseBlockOrModuleBlockBody(body, void 0, false, tt.braceR);
    this.prodParam.exit();
    this.scope.exit();
    this.state.labels = oldLabels;
    classBody.body.push(this.finishNode(member, "StaticBlock"));
    if (member.decorators?.length) {
      this.raise(Errors.DecoratorStaticBlock, member);
    }
  }
  pushClassProperty(classBody, prop) {
    if (!prop.computed && this.nameIsConstructor(prop.key)) {
      this.raise(Errors.ConstructorClassField, prop.key);
    }
    classBody.body.push(this.parseClassProperty(prop));
  }
  pushClassPrivateProperty(classBody, prop) {
    const node = this.parseClassPrivateProperty(prop);
    classBody.body.push(node);
    this.classScope.declarePrivateName(
      this.getPrivateNameSV(node.key),
      ClassElementType.OTHER,
      node.key.loc.start
    );
  }
  pushClassAccessorProperty(classBody, prop, isPrivate) {
    if (!isPrivate && !prop.computed && this.nameIsConstructor(prop.key)) {
      this.raise(Errors.ConstructorClassField, prop.key);
    }
    const node = this.parseClassAccessorProperty(prop);
    classBody.body.push(node);
    if (isPrivate) {
      this.classScope.declarePrivateName(
        this.getPrivateNameSV(node.key),
        ClassElementType.OTHER,
        node.key.loc.start
      );
    }
  }
  pushClassMethod(classBody, method, isGenerator, isAsync, isConstructor, allowsDirectSuper) {
    classBody.body.push(
      this.parseMethod(
        method,
        isGenerator,
        isAsync,
        isConstructor,
        allowsDirectSuper,
        "ClassMethod",
        true
      )
    );
  }
  pushClassPrivateMethod(classBody, method, isGenerator, isAsync) {
    const node = this.parseMethod(
      method,
      isGenerator,
      isAsync,
      /* isConstructor */
      false,
      false,
      "ClassPrivateMethod",
      true
    );
    classBody.body.push(node);
    const kind = node.kind === "get" ? node.static ? ClassElementType.STATIC_GETTER : ClassElementType.INSTANCE_GETTER : node.kind === "set" ? node.static ? ClassElementType.STATIC_SETTER : ClassElementType.INSTANCE_SETTER : ClassElementType.OTHER;
    this.declareClassPrivateMethodInScope(node, kind);
  }
  declareClassPrivateMethodInScope(node, kind) {
    this.classScope.declarePrivateName(
      this.getPrivateNameSV(node.key),
      kind,
      node.key.loc.start
    );
  }
  // Overridden in typescript.js
  parsePostMemberNameModifiers(methodOrProp) {
  }
  // https://tc39.es/ecma262/#prod-FieldDefinition
  parseClassPrivateProperty(node) {
    this.parseInitializer(node);
    this.semicolon();
    return this.finishNode(node, "ClassPrivateProperty");
  }
  // https://tc39.es/ecma262/#prod-FieldDefinition
  parseClassProperty(node) {
    this.parseInitializer(node);
    this.semicolon();
    return this.finishNode(node, "ClassProperty");
  }
  parseClassAccessorProperty(node) {
    this.parseInitializer(node);
    this.semicolon();
    return this.finishNode(node, "ClassAccessorProperty");
  }
  // https://tc39.es/ecma262/#prod-Initializer
  parseInitializer(node) {
    this.scope.enter(ScopeFlag.CLASS | ScopeFlag.SUPER);
    this.expressionScope.enter(newExpressionScope());
    this.prodParam.enter(ParamKind.PARAM);
    node.value = this.eat(tt.eq) ? this.parseMaybeAssignAllowIn() : null;
    this.expressionScope.exit();
    this.prodParam.exit();
    this.scope.exit();
  }
  parseClassId(node, isStatement, optionalId, bindingType = BindingFlag.TYPE_CLASS) {
    if (tokenIsIdentifier(this.state.type)) {
      node.id = this.parseIdentifier();
      if (isStatement) {
        this.declareNameFromIdentifier(node.id, bindingType);
      }
    } else {
      if (optionalId || !isStatement) {
        node.id = null;
      } else {
        throw this.raise(Errors.MissingClassName, this.state.startLoc);
      }
    }
  }
  // https://tc39.es/ecma262/#prod-ClassHeritage
  parseClassSuper(node) {
    node.superClass = this.eat(tt._extends) ? this.parseExprSubscripts() : null;
  }
  // Parses module export declaration.
  // https://tc39.es/ecma262/#prod-ExportDeclaration
  parseExport(node, decorators) {
    const maybeDefaultIdentifier = this.parseMaybeImportPhase(
      node,
      /* isExport */
      true
    );
    const hasDefault = this.maybeParseExportDefaultSpecifier(
      node,
      maybeDefaultIdentifier
    );
    const parseAfterDefault = !hasDefault || this.eat(tt.comma);
    const hasStar = parseAfterDefault && this.eatExportStar(node);
    const hasNamespace = hasStar && this.maybeParseExportNamespaceSpecifier(node);
    const parseAfterNamespace = parseAfterDefault && (!hasNamespace || this.eat(tt.comma));
    const isFromRequired = hasDefault || hasStar;
    if (hasStar && !hasNamespace) {
      if (hasDefault) this.unexpected();
      if (decorators) {
        throw this.raise(Errors.UnsupportedDecoratorExport, node);
      }
      this.parseExportFrom(node, true);
      this.sawUnambiguousESM = true;
      return this.finishNode(node, "ExportAllDeclaration");
    }
    const hasSpecifiers = this.maybeParseExportNamedSpecifiers(node);
    if (hasDefault && parseAfterDefault && !hasStar && !hasSpecifiers) {
      this.unexpected(null, tt.braceL);
    }
    if (hasNamespace && parseAfterNamespace) {
      this.unexpected(null, tt._from);
    }
    let hasDeclaration;
    if (isFromRequired || hasSpecifiers) {
      hasDeclaration = false;
      if (decorators) {
        throw this.raise(Errors.UnsupportedDecoratorExport, node);
      }
      this.parseExportFrom(
        node,
        isFromRequired
      );
    } else {
      hasDeclaration = this.maybeParseExportDeclaration(
        node
      );
    }
    if (isFromRequired || hasSpecifiers || hasDeclaration) {
      const node2 = node;
      this.checkExport(node2, true, false, !!node2.source);
      if (node2.declaration?.type === "ClassDeclaration") {
        this.maybeTakeDecorators(decorators, node2.declaration, node2);
      } else if (decorators) {
        throw this.raise(Errors.UnsupportedDecoratorExport, node);
      }
      this.sawUnambiguousESM = true;
      return this.finishNode(node2, "ExportNamedDeclaration");
    }
    if (this.eat(tt._default)) {
      const node2 = node;
      const decl = this.parseExportDefaultExpression();
      node2.declaration = decl;
      if (decl.type === "ClassDeclaration") {
        this.maybeTakeDecorators(decorators, decl, node2);
      } else if (decorators) {
        throw this.raise(Errors.UnsupportedDecoratorExport, node);
      }
      this.checkExport(node2, true, true);
      this.sawUnambiguousESM = true;
      return this.finishNode(node2, "ExportDefaultDeclaration");
    }
    throw this.unexpected(null, tt.braceL);
  }
  eatExportStar(node) {
    return this.eat(tt.star);
  }
  maybeParseExportDefaultSpecifier(node, maybeDefaultIdentifier) {
    if (maybeDefaultIdentifier || this.isExportDefaultSpecifier()) {
      this.expectPlugin("exportDefaultFrom", maybeDefaultIdentifier?.loc.start);
      const id = maybeDefaultIdentifier || this.parseIdentifier(true);
      const specifier = this.startNodeAtNode(id);
      specifier.exported = id;
      node.specifiers = [
        this.finishNode(specifier, "ExportDefaultSpecifier")
      ];
      return true;
    }
    return false;
  }
  maybeParseExportNamespaceSpecifier(node) {
    if (this.isContextual(tt._as)) {
      node.specifiers ??= [];
      const specifier = this.startNodeAt(
        this.state.lastTokStartLoc
      );
      this.next();
      specifier.exported = this.parseModuleExportName();
      node.specifiers.push(
        this.finishNode(specifier, "ExportNamespaceSpecifier")
      );
      return true;
    }
    return false;
  }
  maybeParseExportNamedSpecifiers(node) {
    if (this.match(tt.braceL)) {
      const node2 = node;
      if (!node2.specifiers) node2.specifiers = [];
      const isTypeExport = node2.exportKind === "type";
      node2.specifiers.push(...this.parseExportSpecifiers(isTypeExport));
      node2.source = null;
      if (this.hasPlugin("importAssertions")) {
        node2.assertions = [];
      } else {
        node2.attributes = [];
      }
      node2.declaration = null;
      return true;
    }
    return false;
  }
  maybeParseExportDeclaration(node) {
    if (this.shouldParseExportDeclaration()) {
      node.specifiers = [];
      node.source = null;
      if (this.hasPlugin("importAssertions")) {
        node.assertions = [];
      } else {
        node.attributes = [];
      }
      node.declaration = this.parseExportDeclaration(node);
      return true;
    }
    return false;
  }
  isAsyncFunction() {
    if (!this.isContextual(tt._async)) return false;
    const next = this.nextTokenInLineStart();
    return this.isUnparsedContextual(next, "function");
  }
  parseExportDefaultExpression() {
    const expr = this.startNode();
    if (this.match(tt._function)) {
      this.next();
      return this.parseFunction(
        expr,
        1 | 4
        /* NullableId */
      );
    } else if (this.isAsyncFunction()) {
      this.next();
      this.next();
      return this.parseFunction(
        expr,
        1 | 4 | 8
        /* Async */
      );
    }
    if (this.match(tt._class)) {
      return this.parseClass(expr, true, true);
    }
    if (this.match(tt.at)) {
      if (this.hasPlugin("decorators") && this.getPluginOption("decorators", "decoratorsBeforeExport") === true) {
        this.raise(Errors.DecoratorBeforeExport, this.state.startLoc);
      }
      return this.parseClass(
        this.maybeTakeDecorators(
          this.parseDecorators(false),
          this.startNode()
        ),
        true,
        true
      );
    }
    if (this.match(tt._const) || this.match(tt._var) || this.isLet() || this.isUsing() || this.isAwaitUsing()) {
      throw this.raise(Errors.UnsupportedDefaultExport, this.state.startLoc);
    }
    const res = this.parseMaybeAssignAllowIn();
    this.semicolon();
    return res;
  }
  // https://tc39.es/ecma262/#prod-ExportDeclaration
  parseExportDeclaration(node) {
    if (this.match(tt._class)) {
      const node2 = this.parseClass(
        this.startNode(),
        true,
        false
      );
      return node2;
    }
    return this.parseStatementListItem();
  }
  isExportDefaultSpecifier() {
    const { type } = this.state;
    if (tokenIsIdentifier(type)) {
      if (type === tt._async && !this.state.containsEsc || type === tt._let) {
        return false;
      }
      if ((type === tt._type || type === tt._interface) && !this.state.containsEsc) {
        const next2 = this.nextTokenStart();
        const nextChar = this.input.charCodeAt(next2);
        if (nextChar === leftCurlyBrace || this.chStartsBindingIdentifier(nextChar, next2) && !this.input.startsWith("from", next2)) {
          this.expectOnePlugin(["flow", "typescript"]);
          return false;
        }
      }
    } else if (!this.match(tt._default)) {
      return false;
    }
    const next = this.nextTokenStart();
    const hasFrom = this.isUnparsedContextual(next, "from");
    if (this.input.charCodeAt(next) === comma || tokenIsIdentifier(this.state.type) && hasFrom) {
      return true;
    }
    if (this.match(tt._default) && hasFrom) {
      const nextAfterFrom = this.input.charCodeAt(
        this.nextTokenStartSince(next + 4)
      );
      return nextAfterFrom === quotationMark || nextAfterFrom === apostrophe;
    }
    return false;
  }
  parseExportFrom(node, expect) {
    if (this.eatContextual(tt._from)) {
      node.source = this.parseImportSource();
      this.checkExport(node);
      this.maybeParseImportAttributes(node);
      this.checkJSONModuleImport(node);
    } else if (expect) {
      this.unexpected();
    }
    this.semicolon();
  }
  shouldParseExportDeclaration() {
    const { type } = this.state;
    if (type === tt.at) {
      this.expectOnePlugin(["decorators", "decorators-legacy"]);
      if (this.hasPlugin("decorators")) {
        if (this.getPluginOption("decorators", "decoratorsBeforeExport") === true) {
          this.raise(Errors.DecoratorBeforeExport, this.state.startLoc);
        }
        return true;
      }
    }
    if (this.isUsing()) {
      this.raise(Errors.UsingDeclarationExport, this.state.startLoc);
      return true;
    }
    if (this.isAwaitUsing()) {
      this.raise(Errors.UsingDeclarationExport, this.state.startLoc);
      return true;
    }
    return type === tt._var || type === tt._const || type === tt._function || type === tt._class || this.isLet() || this.isAsyncFunction();
  }
  checkExport(node, checkNames, isDefault, isFrom) {
    if (checkNames) {
      if (isDefault) {
        this.checkDuplicateExports(node, "default");
        if (this.hasPlugin("exportDefaultFrom")) {
          const declaration = node.declaration;
          if (declaration.type === "Identifier" && declaration.name === "from" && declaration.end - declaration.start === 4 && // does not contain escape
          !declaration.extra?.parenthesized) {
            this.raise(Errors.ExportDefaultFromAsIdentifier, declaration);
          }
        }
      } else if (node.specifiers?.length) {
        for (const specifier of node.specifiers) {
          const { exported } = specifier;
          const exportName = exported.type === "Identifier" ? exported.name : exported.value;
          this.checkDuplicateExports(specifier, exportName);
          if (!isFrom && specifier.local) {
            const { local } = specifier;
            if (local.type !== "Identifier") {
              this.raise(Errors.ExportBindingIsString, specifier, {
                localName: local.value,
                exportName
              });
            } else {
              this.checkReservedWord(local.name, local.loc.start, true, false);
              this.scope.checkLocalExport(local);
            }
          }
        }
      } else if (node.declaration) {
        const decl = node.declaration;
        if (decl.type === "FunctionDeclaration" || decl.type === "ClassDeclaration") {
          const { id } = decl;
          if (!id) throw new Error("Assertion failure");
          this.checkDuplicateExports(node, id.name);
        } else if (decl.type === "VariableDeclaration") {
          for (const declaration of decl.declarations) {
            this.checkDeclaration(declaration.id);
          }
        }
      }
    }
  }
  checkDeclaration(node) {
    if (node.type === "Identifier") {
      this.checkDuplicateExports(node, node.name);
    } else if (node.type === "ObjectPattern") {
      for (const prop of node.properties) {
        this.checkDeclaration(prop);
      }
    } else if (node.type === "ArrayPattern") {
      for (const elem of node.elements) {
        if (elem) {
          this.checkDeclaration(elem);
        }
      }
    } else if (node.type === "ObjectProperty") {
      this.checkDeclaration(node.value);
    } else if (node.type === "RestElement") {
      this.checkDeclaration(node.argument);
    } else if (node.type === "AssignmentPattern") {
      this.checkDeclaration(node.left);
    }
  }
  checkDuplicateExports(node, exportName) {
    if (this.exportedIdentifiers.has(exportName)) {
      if (exportName === "default") {
        this.raise(Errors.DuplicateDefaultExport, node);
      } else {
        this.raise(Errors.DuplicateExport, node, { exportName });
      }
    }
    this.exportedIdentifiers.add(exportName);
  }
  // Parses a comma-separated list of module exports.
  parseExportSpecifiers(isInTypeExport) {
    const nodes = [];
    let first = true;
    this.expect(tt.braceL);
    while (!this.eat(tt.braceR)) {
      if (first) {
        first = false;
      } else {
        this.expect(tt.comma);
        if (this.eat(tt.braceR)) break;
      }
      const isMaybeTypeOnly = this.isContextual(tt._type);
      const isString = this.match(tt.string);
      const node = this.startNode();
      node.local = this.parseModuleExportName();
      nodes.push(
        this.parseExportSpecifier(
          node,
          isString,
          isInTypeExport,
          isMaybeTypeOnly
        )
      );
    }
    return nodes;
  }
  parseExportSpecifier(node, isString, isInTypeExport, isMaybeTypeOnly) {
    if (this.eatContextual(tt._as)) {
      node.exported = this.parseModuleExportName();
    } else if (isString) {
      node.exported = this.cloneStringLiteral(node.local);
    } else if (!node.exported) {
      node.exported = this.cloneIdentifier(node.local);
    }
    return this.finishNode(node, "ExportSpecifier");
  }
  // https://tc39.es/ecma262/#prod-ModuleExportName
  parseModuleExportName() {
    if (this.match(tt.string)) {
      const result = this.parseStringLiteral(this.state.value);
      const surrogate = loneSurrogate.exec(result.value);
      if (surrogate) {
        this.raise(Errors.ModuleExportNameHasLoneSurrogate, result, {
          surrogateCharCode: surrogate[0].charCodeAt(0)
        });
      }
      return result;
    }
    return this.parseIdentifier(true);
  }
  isJSONModuleImport(node) {
    if (node.assertions != null) {
      return node.assertions.some(({ key, value }) => {
        return value.value === "json" && (key.type === "Identifier" ? key.name === "type" : key.value === "type");
      });
    }
    return false;
  }
  checkImportReflection(node) {
    const { specifiers } = node;
    const singleBindingType = specifiers.length === 1 ? specifiers[0].type : null;
    if (node.phase === "source") {
      if (singleBindingType !== "ImportDefaultSpecifier") {
        this.raise(
          Errors.SourcePhaseImportRequiresDefault,
          specifiers[0].loc.start
        );
      }
    } else if (node.phase === "defer") {
      if (singleBindingType !== "ImportNamespaceSpecifier") {
        this.raise(
          Errors.DeferImportRequiresNamespace,
          specifiers[0].loc.start
        );
      }
    } else if (node.module) {
      if (singleBindingType !== "ImportDefaultSpecifier") {
        this.raise(Errors.ImportReflectionNotBinding, specifiers[0].loc.start);
      }
      if (node.assertions?.length > 0) {
        this.raise(
          Errors.ImportReflectionHasAssertion,
          specifiers[0].loc.start
        );
      }
    }
  }
  checkJSONModuleImport(node) {
    if (this.isJSONModuleImport(node) && node.type !== "ExportAllDeclaration") {
      const { specifiers } = node;
      if (specifiers != null) {
        const nonDefaultNamedSpecifier = specifiers.find((specifier) => {
          let imported;
          if (specifier.type === "ExportSpecifier") {
            imported = specifier.local;
          } else if (specifier.type === "ImportSpecifier") {
            imported = specifier.imported;
          }
          if (imported !== void 0) {
            return imported.type === "Identifier" ? imported.name !== "default" : imported.value !== "default";
          }
        });
        if (nonDefaultNamedSpecifier !== void 0) {
          this.raise(
            Errors.ImportJSONBindingNotDefault,
            nonDefaultNamedSpecifier.loc.start
          );
        }
      }
    }
  }
  isPotentialImportPhase(isExport) {
    if (isExport) return false;
    return this.isContextual(tt._source) || this.isContextual(tt._defer) || this.isContextual(tt._module);
  }
  applyImportPhase(node, isExport, phase, loc) {
    if (isExport) {
      return;
    }
    if (phase === "module") {
      this.expectPlugin("importReflection", loc);
      node.module = true;
    } else if (this.hasPlugin("importReflection")) {
      node.module = false;
    }
    if (phase === "source") {
      this.expectPlugin("sourcePhaseImports", loc);
      node.phase = "source";
    } else if (phase === "defer") {
      this.expectPlugin("deferredImportEvaluation", loc);
      node.phase = "defer";
    } else if (this.hasPlugin("sourcePhaseImports")) {
      node.phase = null;
    }
  }
  /*
   * Parse `source` in `import source x from "x"`, disambiguating
   * `import source from "x"` and `import source from from "x"`.
   *
   * This function might return an identifier representing the `source`
   * if it eats `source` and then discovers that it was the default import
   * binding and not the import reflection.
   *
   * This function is also used to parse `import type` and `import typeof`
   * in the TS and Flow plugins, and for parsing `import defer`.
   */
  parseMaybeImportPhase(node, isExport) {
    if (!this.isPotentialImportPhase(isExport)) {
      this.applyImportPhase(
        node,
        isExport,
        null
      );
      return null;
    }
    const phaseIdentifier = this.startNode();
    const phaseIdentifierName = this.parseIdentifierName(true);
    const { type } = this.state;
    const isImportPhase = tokenIsKeywordOrIdentifier(type) ? (
      // OK: import <phase> x from "foo";
      // OK: import <phase> from from "foo";
      // NO: import <phase> from "foo";
      // NO: import <phase> from 'foo';
      // With the module declarations proposals, we will need further disambiguation
      // for `import module from from;`.
      type !== tt._from || this.lookaheadCharCode() === lowercaseF
    ) : (
      // OK: import <phase> { x } from "foo";
      // OK: import <phase> x from "foo";
      // OK: import <phase> * as T from "foo";
      // NO: import <phase> from "foo";
      // OK: import <phase> "foo";
      // The last one is invalid, we will continue parsing and throw
      // an error later
      type !== tt.comma
    );
    if (isImportPhase) {
      this.applyImportPhase(
        node,
        isExport,
        phaseIdentifierName,
        phaseIdentifier.loc.start
      );
      return null;
    } else {
      this.applyImportPhase(
        node,
        isExport,
        null
      );
      return this.createIdentifier(phaseIdentifier, phaseIdentifierName);
    }
  }
  isPrecedingIdImportPhase(phase) {
    const { type } = this.state;
    return tokenIsIdentifier(type) ? (
      // OK: import <phase> x from "foo";
      // OK: import <phase> from from "foo";
      // NO: import <phase> from "foo";
      // NO: import <phase> from 'foo';
      // With the module declarations proposals, we will need further disambiguation
      // for `import module from from;`.
      type !== tt._from || this.lookaheadCharCode() === lowercaseF
    ) : (
      // OK: import <phase> { x } from "foo";
      // OK: import <phase> x from "foo";
      // OK: import <phase> * as T from "foo";
      // NO: import <phase> from "foo";
      // OK: import <phase> "foo";
      // The last one is invalid, we will continue parsing and throw
      // an error later
      type !== tt.comma
    );
  }
  // Parses import declaration.
  // https://tc39.es/ecma262/#prod-ImportDeclaration
  parseImport(node) {
    if (this.match(tt.string)) {
      return this.parseImportSourceAndAttributes(node);
    }
    return this.parseImportSpecifiersAndAfter(
      node,
      this.parseMaybeImportPhase(
        node,
        /* isExport */
        false
      )
    );
  }
  parseImportSpecifiersAndAfter(node, maybeDefaultIdentifier) {
    node.specifiers = [];
    const hasDefault = this.maybeParseDefaultImportSpecifier(
      node,
      maybeDefaultIdentifier
    );
    const parseNext = !hasDefault || this.eat(tt.comma);
    const hasStar = parseNext && this.maybeParseStarImportSpecifier(node);
    if (parseNext && !hasStar) this.parseNamedImportSpecifiers(node);
    this.expectContextual(tt._from);
    return this.parseImportSourceAndAttributes(node);
  }
  parseImportSourceAndAttributes(node) {
    node.specifiers ??= [];
    node.source = this.parseImportSource();
    this.maybeParseImportAttributes(node);
    this.checkImportReflection(node);
    this.checkJSONModuleImport(node);
    this.semicolon();
    this.sawUnambiguousESM = true;
    return this.finishNode(node, "ImportDeclaration");
  }
  parseImportSource() {
    if (!this.match(tt.string)) this.unexpected();
    return this.parseExprAtom();
  }
  parseImportSpecifierLocal(node, specifier, type) {
    specifier.local = this.parseIdentifier();
    node.specifiers.push(this.finishImportSpecifier(specifier, type));
  }
  finishImportSpecifier(specifier, type, bindingType = BindingFlag.TYPE_LEXICAL) {
    this.checkLVal(specifier.local, { type }, bindingType);
    return this.finishNode(specifier, type);
  }
  /**
   * parse assert entries
   *
   * @see {@link https://tc39.es/proposal-import-attributes/#prod-WithEntries WithEntries}
   */
  parseImportAttributes() {
    this.expect(tt.braceL);
    const attrs = [];
    const attrNames = /* @__PURE__ */ new Set();
    do {
      if (this.match(tt.braceR)) {
        break;
      }
      const node = this.startNode();
      const keyName = this.state.value;
      if (attrNames.has(keyName)) {
        this.raise(
          Errors.ModuleAttributesWithDuplicateKeys,
          this.state.startLoc,
          {
            key: keyName
          }
        );
      }
      attrNames.add(keyName);
      if (this.match(tt.string)) {
        node.key = this.parseStringLiteral(keyName);
      } else {
        node.key = this.parseIdentifier(true);
      }
      this.expect(tt.colon);
      if (!this.match(tt.string)) {
        throw this.raise(
          Errors.ModuleAttributeInvalidValue,
          this.state.startLoc
        );
      }
      node.value = this.parseStringLiteral(this.state.value);
      attrs.push(this.finishNode(node, "ImportAttribute"));
    } while (this.eat(tt.comma));
    this.expect(tt.braceR);
    return attrs;
  }
  /**
   * parse module attributes
   * @deprecated It will be removed in Babel 8
   */
  parseModuleAttributes() {
    const attrs = [];
    const attributes = /* @__PURE__ */ new Set();
    do {
      const node = this.startNode();
      node.key = this.parseIdentifier(true);
      if (node.key.name !== "type") {
        this.raise(Errors.ModuleAttributeDifferentFromType, node.key);
      }
      if (attributes.has(node.key.name)) {
        this.raise(Errors.ModuleAttributesWithDuplicateKeys, node.key, {
          key: node.key.name
        });
      }
      attributes.add(node.key.name);
      this.expect(tt.colon);
      if (!this.match(tt.string)) {
        throw this.raise(
          Errors.ModuleAttributeInvalidValue,
          this.state.startLoc
        );
      }
      node.value = this.parseStringLiteral(this.state.value);
      attrs.push(this.finishNode(node, "ImportAttribute"));
    } while (this.eat(tt.comma));
    return attrs;
  }
  maybeParseImportAttributes(node) {
    let attributes;
    {
      var useWith = false;
    }
    if (this.match(tt._with)) {
      if (this.hasPrecedingLineBreak() && this.lookaheadCharCode() === leftParenthesis) {
        return;
      }
      this.next();
      if (this.hasPlugin("moduleAttributes")) {
        attributes = this.parseModuleAttributes();
        this.addExtra(node, "deprecatedWithLegacySyntax", true);
      } else {
        attributes = this.parseImportAttributes();
      }
      {
        useWith = true;
      }
    } else if (this.isContextual(tt._assert) && !this.hasPrecedingLineBreak()) {
      if (!this.hasPlugin("deprecatedImportAssert") && !this.hasPlugin("importAssertions")) {
        this.raise(Errors.ImportAttributesUseAssert, this.state.startLoc);
      }
      if (!this.hasPlugin("importAssertions")) {
        this.addExtra(node, "deprecatedAssertSyntax", true);
      }
      this.next();
      attributes = this.parseImportAttributes();
    } else {
      attributes = [];
    }
    if (!useWith && this.hasPlugin("importAssertions")) {
      node.assertions = attributes;
    } else {
      node.attributes = attributes;
    }
  }
  maybeParseDefaultImportSpecifier(node, maybeDefaultIdentifier) {
    if (maybeDefaultIdentifier) {
      const specifier = this.startNodeAtNode(
        maybeDefaultIdentifier
      );
      specifier.local = maybeDefaultIdentifier;
      node.specifiers.push(
        this.finishImportSpecifier(specifier, "ImportDefaultSpecifier")
      );
      return true;
    } else if (
      // We allow keywords, and parseImportSpecifierLocal will report a recoverable error
      tokenIsKeywordOrIdentifier(this.state.type)
    ) {
      this.parseImportSpecifierLocal(
        node,
        this.startNode(),
        "ImportDefaultSpecifier"
      );
      return true;
    }
    return false;
  }
  maybeParseStarImportSpecifier(node) {
    if (this.match(tt.star)) {
      const specifier = this.startNode();
      this.next();
      this.expectContextual(tt._as);
      this.parseImportSpecifierLocal(
        node,
        specifier,
        "ImportNamespaceSpecifier"
      );
      return true;
    }
    return false;
  }
  parseNamedImportSpecifiers(node) {
    let first = true;
    this.expect(tt.braceL);
    while (!this.eat(tt.braceR)) {
      if (first) {
        first = false;
      } else {
        if (this.eat(tt.colon)) {
          throw this.raise(Errors.DestructureNamedImport, this.state.startLoc);
        }
        this.expect(tt.comma);
        if (this.eat(tt.braceR)) break;
      }
      const specifier = this.startNode();
      const importedIsString = this.match(tt.string);
      const isMaybeTypeOnly = this.isContextual(tt._type);
      specifier.imported = this.parseModuleExportName();
      const importSpecifier = this.parseImportSpecifier(
        specifier,
        importedIsString,
        node.importKind === "type" || node.importKind === "typeof",
        isMaybeTypeOnly,
        void 0
      );
      node.specifiers.push(importSpecifier);
    }
  }
  // https://tc39.es/ecma262/#prod-ImportSpecifier
  parseImportSpecifier(specifier, importedIsString, isInTypeOnlyImport, isMaybeTypeOnly, bindingType) {
    if (this.eatContextual(tt._as)) {
      specifier.local = this.parseIdentifier();
    } else {
      const { imported } = specifier;
      if (importedIsString) {
        throw this.raise(Errors.ImportBindingIsString, specifier, {
          importName: imported.value
        });
      }
      this.checkReservedWord(
        imported.name,
        specifier.loc.start,
        true,
        true
      );
      if (!specifier.local) {
        specifier.local = this.cloneIdentifier(imported);
      }
    }
    return this.finishImportSpecifier(
      specifier,
      "ImportSpecifier",
      bindingType
    );
  }
  // This is used in flow and typescript plugin
  // Determine whether a parameter is a this param
  isThisParam(param) {
    return param.type === "Identifier" && param.name === "this";
  }
};
export {
  StatementParser as S
};
