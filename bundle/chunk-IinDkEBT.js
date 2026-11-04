import { createRequire } from "node:module";
import { x as xor, c as xid, _ as _void2, u as uuidv7, d as uuidv6, e as uuidv4, f as uuid, g as url, i as unknown, j as union, k as _undefined2, l as ulid, m as uint64, n as uint32, o as tuple, p as transform, q as templateLiteral, s as symbol, v as superRefine, w as success, y as stringbool, z as stringFormat, A as string, B as strictObject, C as set, D as safeParseAsync, E as safeParse, F as safeEncodeAsync, G as safeEncode, H as safeDecodeAsync, I as safeDecode, J as refine, K as record, L as readonly, M as promise, N as preprocess, O as prefault, P as pipe, Q as partialRecord, R as parseAsync, S as parse, T as optional, U as object, V as number, W as nullish, X as nullable, Y as _null2, Z as nonoptional, $ as never, a0 as nativeEnum, a1 as nanoid, a2 as nan, a3 as meta2, a4 as map, a5 as mac, a6 as looseRecord, a7 as looseObject, a8 as literal, a9 as lazy, aa as ksuid, ab as keyof, ac as jwt, ad as json, ae as iso_exports, af as ipv6, ag as ipv4, ah as invertCodec, ai as intersection, aj as int64, ak as int32, al as int, am as _instanceof, an as httpUrl, ao as hostname, ap as hex, aq as hash, ar as guid, as as _function, at as float64, au as float32, av as file, aw as exactOptional, ax as _enum, ay as encodeAsync, az as encode, aA as emoji, aB as email, aC as e164, aD as discriminatedUnion, aE as describe2, aF as decodeAsync, aG as decode, aH as date2$1, aI as custom, aJ as cuid2, aK as cuid, aL as codec, aM as cidrv6, aN as cidrv4, aO as check, aP as _catch, aQ as boolean, aR as bigint, aS as base64url, aT as base64, aU as array, aV as any, aW as _default, aX as _ZodString, aY as ZodXor, aZ as ZodXID, a_ as ZodVoid, a$ as ZodUnknown, b0 as ZodUnion, b1 as ZodUndefined, b2 as ZodUUID, b3 as ZodURL, b4 as ZodULID, b5 as ZodType, b6 as ZodTuple, b7 as ZodTransform, b8 as ZodTemplateLiteral, b9 as ZodSymbol, ba as ZodSuccess, bb as ZodStringFormat, bc as ZodString, bd as ZodSet, be as ZodRecord, bf as ZodRealError, bg as ZodReadonly, bh as ZodPromise, bi as ZodPreprocess, bj as ZodPrefault, bk as ZodPipe, bl as ZodOptional, bm as ZodObject, bn as ZodNumberFormat, bo as ZodNumber, bp as ZodNullable, bq as ZodNull, br as ZodNonOptional, bs as ZodNever, bt as ZodNanoID, bu as ZodNaN, bv as ZodMap, bw as ZodMAC, bx as ZodLiteral, by as ZodLazy, bz as ZodKSUID, bA as ZodJWT, bB as ZodIntersection, bC as ZodISOTime, bD as ZodISODuration, bE as ZodISODateTime, bF as ZodISODate, bG as ZodIPv6, bH as ZodIPv4, bI as ZodGUID, bJ as ZodFunction, bK as ZodFile, bL as ZodExactOptional, bM as ZodError, bN as ZodEnum, bO as ZodEmoji, bP as ZodEmail, bQ as ZodE164, bR as ZodDiscriminatedUnion, bS as ZodDefault, bT as ZodDate, bU as ZodCustomStringFormat, bV as ZodCustom, bW as ZodCodec, bX as ZodCatch, bY as ZodCUID2, bZ as ZodCUID, b_ as ZodCIDRv6, b$ as ZodCIDRv4, c0 as ZodBoolean, c1 as ZodBigIntFormat, c2 as ZodBigInt, c3 as ZodBase64URL, c4 as ZodBase64, c5 as ZodArray, c6 as ZodAny, c7 as checks_exports, c8 as schemas_exports } from "./chunk-DKJgfGaK.js";
import { l as locales_exports, c as core_exports, e as en_default } from "./chunk-Elhqd07Y.js";
import { _ as __export, R as util_exports, a as _uppercase, b as _trim, cJ as treeifyError, c as _toUpperCase, e as _toLowerCase, cK as toJSONSchema, f as _startsWith, g as _slugify, h as _size, cS as registry, S as regexes_exports, i as _regex, j as _property, cU as prettifyError, k as _positive, l as _overwrite, n as _normalize, o as _nonpositive, p as _nonnegative, q as _negative, r as _multipleOf, s as _minSize, t as _minLength, u as _mime, v as _maxSize, w as _maxLength, x as _lte, y as _lt, z as _lowercase, A as _length, B as _includes, C as _gte, D as _gt, aY as globalRegistry, aR as formatError, aQ as flattenError, E as _endsWith, d6 as config, at as clone, dB as TimePrecision, dC as NEVER, dE as $output, dF as $input, dG as $brand, du as _coercedString, dv as _coercedNumber, dx as _coercedBoolean, dy as _coercedBigint, dw as _coercedDate } from "./chunk-CYLdCKx-.js";
import { Script } from "node:vm";
import { randomUUID } from "node:crypto";
createRequire(import.meta.url);
var external_exports = {};
__export(external_exports, {
  $brand: () => $brand,
  $input: () => $input,
  $output: () => $output,
  NEVER: () => NEVER,
  TimePrecision: () => TimePrecision,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBase64: () => ZodBase64,
  ZodBase64URL: () => ZodBase64URL,
  ZodBigInt: () => ZodBigInt,
  ZodBigIntFormat: () => ZodBigIntFormat,
  ZodBoolean: () => ZodBoolean,
  ZodCIDRv4: () => ZodCIDRv4,
  ZodCIDRv6: () => ZodCIDRv6,
  ZodCUID: () => ZodCUID,
  ZodCUID2: () => ZodCUID2,
  ZodCatch: () => ZodCatch,
  ZodCodec: () => ZodCodec,
  ZodCustom: () => ZodCustom,
  ZodCustomStringFormat: () => ZodCustomStringFormat,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodE164: () => ZodE164,
  ZodEmail: () => ZodEmail,
  ZodEmoji: () => ZodEmoji,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodExactOptional: () => ZodExactOptional,
  ZodFile: () => ZodFile,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodGUID: () => ZodGUID,
  ZodIPv4: () => ZodIPv4,
  ZodIPv6: () => ZodIPv6,
  ZodISODate: () => ZodISODate,
  ZodISODateTime: () => ZodISODateTime,
  ZodISODuration: () => ZodISODuration,
  ZodISOTime: () => ZodISOTime,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodJWT: () => ZodJWT,
  ZodKSUID: () => ZodKSUID,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMAC: () => ZodMAC,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNanoID: () => ZodNanoID,
  ZodNever: () => ZodNever,
  ZodNonOptional: () => ZodNonOptional,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodNumberFormat: () => ZodNumberFormat,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodPipe: () => ZodPipe,
  ZodPrefault: () => ZodPrefault,
  ZodPreprocess: () => ZodPreprocess,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRealError: () => ZodRealError,
  ZodRecord: () => ZodRecord,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodStringFormat: () => ZodStringFormat,
  ZodSuccess: () => ZodSuccess,
  ZodSymbol: () => ZodSymbol,
  ZodTemplateLiteral: () => ZodTemplateLiteral,
  ZodTransform: () => ZodTransform,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodULID: () => ZodULID,
  ZodURL: () => ZodURL,
  ZodUUID: () => ZodUUID,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  ZodXID: () => ZodXID,
  ZodXor: () => ZodXor,
  _ZodString: () => _ZodString,
  _default: () => _default,
  _function: () => _function,
  any: () => any,
  array: () => array,
  base64: () => base64,
  base64url: () => base64url,
  bigint: () => bigint,
  boolean: () => boolean,
  catch: () => _catch,
  check: () => check,
  cidrv4: () => cidrv4,
  cidrv6: () => cidrv6,
  clone: () => clone,
  codec: () => codec,
  coerce: () => coerce_exports,
  config: () => config,
  core: () => core_exports,
  cuid: () => cuid,
  cuid2: () => cuid2,
  custom: () => custom,
  date: () => date2$1,
  decode: () => decode,
  decodeAsync: () => decodeAsync,
  describe: () => describe2,
  discriminatedUnion: () => discriminatedUnion,
  e164: () => e164,
  email: () => email,
  emoji: () => emoji,
  encode: () => encode,
  encodeAsync: () => encodeAsync,
  endsWith: () => _endsWith,
  enum: () => _enum,
  exactOptional: () => exactOptional,
  file: () => file,
  flattenError: () => flattenError,
  float32: () => float32,
  float64: () => float64,
  formatError: () => formatError,
  fromJSONSchema: () => fromJSONSchema,
  function: () => _function,
  getErrorMap: () => getErrorMap,
  globalRegistry: () => globalRegistry,
  gt: () => _gt,
  gte: () => _gte,
  guid: () => guid,
  hash: () => hash,
  hex: () => hex,
  hostname: () => hostname,
  httpUrl: () => httpUrl,
  includes: () => _includes,
  instanceof: () => _instanceof,
  int: () => int,
  int32: () => int32,
  int64: () => int64,
  intersection: () => intersection,
  invertCodec: () => invertCodec,
  ipv4: () => ipv4,
  ipv6: () => ipv6,
  iso: () => iso_exports,
  json: () => json,
  jwt: () => jwt,
  keyof: () => keyof,
  ksuid: () => ksuid,
  lazy: () => lazy,
  length: () => _length,
  literal: () => literal,
  locales: () => locales_exports,
  looseObject: () => looseObject,
  looseRecord: () => looseRecord,
  lowercase: () => _lowercase,
  lt: () => _lt,
  lte: () => _lte,
  mac: () => mac,
  map: () => map,
  maxLength: () => _maxLength,
  maxSize: () => _maxSize,
  meta: () => meta2,
  mime: () => _mime,
  minLength: () => _minLength,
  minSize: () => _minSize,
  multipleOf: () => _multipleOf,
  nan: () => nan,
  nanoid: () => nanoid,
  nativeEnum: () => nativeEnum,
  negative: () => _negative,
  never: () => never,
  nonnegative: () => _nonnegative,
  nonoptional: () => nonoptional,
  nonpositive: () => _nonpositive,
  normalize: () => _normalize,
  null: () => _null2,
  nullable: () => nullable,
  nullish: () => nullish,
  number: () => number,
  object: () => object,
  optional: () => optional,
  overwrite: () => _overwrite,
  parse: () => parse,
  parseAsync: () => parseAsync,
  partialRecord: () => partialRecord,
  pipe: () => pipe,
  positive: () => _positive,
  prefault: () => prefault,
  preprocess: () => preprocess,
  prettifyError: () => prettifyError,
  promise: () => promise,
  property: () => _property,
  readonly: () => readonly,
  record: () => record,
  refine: () => refine,
  regex: () => _regex,
  regexes: () => regexes_exports,
  registry: () => registry,
  safeDecode: () => safeDecode,
  safeDecodeAsync: () => safeDecodeAsync,
  safeEncode: () => safeEncode,
  safeEncodeAsync: () => safeEncodeAsync,
  safeParse: () => safeParse,
  safeParseAsync: () => safeParseAsync,
  set: () => set,
  setErrorMap: () => setErrorMap,
  size: () => _size,
  slugify: () => _slugify,
  startsWith: () => _startsWith,
  strictObject: () => strictObject,
  string: () => string,
  stringFormat: () => stringFormat,
  stringbool: () => stringbool,
  success: () => success,
  superRefine: () => superRefine,
  symbol: () => symbol,
  templateLiteral: () => templateLiteral,
  toJSONSchema: () => toJSONSchema,
  toLowerCase: () => _toLowerCase,
  toUpperCase: () => _toUpperCase,
  transform: () => transform,
  treeifyError: () => treeifyError,
  trim: () => _trim,
  tuple: () => tuple,
  uint32: () => uint32,
  uint64: () => uint64,
  ulid: () => ulid,
  undefined: () => _undefined2,
  union: () => union,
  unknown: () => unknown,
  uppercase: () => _uppercase,
  url: () => url,
  util: () => util_exports,
  uuid: () => uuid,
  uuidv4: () => uuidv4,
  uuidv6: () => uuidv6,
  uuidv7: () => uuidv7,
  void: () => _void2,
  xid: () => xid,
  xor: () => xor
});
var ZodIssueCode = {
  invalid_type: "invalid_type",
  too_big: "too_big",
  too_small: "too_small",
  invalid_format: "invalid_format",
  not_multiple_of: "not_multiple_of",
  unrecognized_keys: "unrecognized_keys",
  invalid_union: "invalid_union",
  invalid_key: "invalid_key",
  invalid_element: "invalid_element",
  invalid_value: "invalid_value",
  custom: "custom"
};
function setErrorMap(map2) {
  config({
    customError: map2
  });
}
function getErrorMap() {
  return config().customError;
}
var ZodFirstPartyTypeKind;
/* @__PURE__ */ (function(ZodFirstPartyTypeKind2) {
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var z = {
  ...schemas_exports,
  ...checks_exports,
  iso: iso_exports
};
var RECOGNIZED_KEYS = /* @__PURE__ */ new Set([
  // Schema identification
  "$schema",
  "$ref",
  "$defs",
  "definitions",
  // Core schema keywords
  "$id",
  "id",
  "$comment",
  "$anchor",
  "$vocabulary",
  "$dynamicRef",
  "$dynamicAnchor",
  // Type
  "type",
  "enum",
  "const",
  // Composition
  "anyOf",
  "oneOf",
  "allOf",
  "not",
  // Object
  "properties",
  "required",
  "additionalProperties",
  "patternProperties",
  "propertyNames",
  "minProperties",
  "maxProperties",
  // Array
  "items",
  "prefixItems",
  "additionalItems",
  "minItems",
  "maxItems",
  "uniqueItems",
  "contains",
  "minContains",
  "maxContains",
  // String
  "minLength",
  "maxLength",
  "pattern",
  "format",
  // Number
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  // Already handled metadata
  "description",
  "default",
  // Content
  "contentEncoding",
  "contentMediaType",
  "contentSchema",
  // Unsupported (error-throwing)
  "unevaluatedItems",
  "unevaluatedProperties",
  "if",
  "then",
  "else",
  "dependentSchemas",
  "dependentRequired",
  // OpenAPI
  "nullable",
  "readOnly"
]);
function detectVersion(schema, defaultTarget) {
  const $schema = schema.$schema;
  if ($schema === "https://json-schema.org/draft/2020-12/schema") {
    return "draft-2020-12";
  }
  if ($schema === "http://json-schema.org/draft-07/schema#") {
    return "draft-7";
  }
  if ($schema === "http://json-schema.org/draft-04/schema#") {
    return "draft-4";
  }
  return defaultTarget ?? "draft-2020-12";
}
function resolveRef(ref2, ctx) {
  if (!ref2.startsWith("#")) {
    throw new Error("External $ref is not supported, only local refs (#/...) are allowed");
  }
  const path = ref2.slice(1).split("/").filter(Boolean);
  if (path.length === 0) {
    return ctx.rootSchema;
  }
  const defsKey = ctx.version === "draft-2020-12" ? "$defs" : "definitions";
  if (path[0] === defsKey) {
    const key = path[1];
    if (!key || !ctx.defs[key]) {
      throw new Error(`Reference not found: ${ref2}`);
    }
    return ctx.defs[key];
  }
  throw new Error(`Reference not found: ${ref2}`);
}
function convertBaseSchema(schema, ctx) {
  if (schema.not !== void 0) {
    if (typeof schema.not === "object" && Object.keys(schema.not).length === 0) {
      return z.never();
    }
    throw new Error("not is not supported in Zod (except { not: {} } for never)");
  }
  if (schema.unevaluatedItems !== void 0) {
    throw new Error("unevaluatedItems is not supported");
  }
  if (schema.unevaluatedProperties !== void 0) {
    throw new Error("unevaluatedProperties is not supported");
  }
  if (schema.if !== void 0 || schema.then !== void 0 || schema.else !== void 0) {
    throw new Error("Conditional schemas (if/then/else) are not supported");
  }
  if (schema.dependentSchemas !== void 0 || schema.dependentRequired !== void 0) {
    throw new Error("dependentSchemas and dependentRequired are not supported");
  }
  if (schema.$ref) {
    const refPath = schema.$ref;
    if (ctx.refs.has(refPath)) {
      return ctx.refs.get(refPath);
    }
    if (ctx.processing.has(refPath)) {
      return z.lazy(() => {
        if (!ctx.refs.has(refPath)) {
          throw new Error(`Circular reference not resolved: ${refPath}`);
        }
        return ctx.refs.get(refPath);
      });
    }
    ctx.processing.add(refPath);
    const resolved = resolveRef(refPath, ctx);
    const zodSchema2 = convertSchema(resolved, ctx);
    ctx.refs.set(refPath, zodSchema2);
    ctx.processing.delete(refPath);
    return zodSchema2;
  }
  if (schema.enum !== void 0) {
    const enumValues = schema.enum;
    if (ctx.version === "openapi-3.0" && schema.nullable === true && enumValues.length === 1 && enumValues[0] === null) {
      return z.null();
    }
    if (enumValues.length === 0) {
      return z.never();
    }
    if (enumValues.length === 1) {
      return z.literal(enumValues[0]);
    }
    if (enumValues.every((v) => typeof v === "string")) {
      return z.enum(enumValues);
    }
    const literalSchemas = enumValues.map((v) => z.literal(v));
    if (literalSchemas.length < 2) {
      return literalSchemas[0];
    }
    return z.union([literalSchemas[0], literalSchemas[1], ...literalSchemas.slice(2)]);
  }
  if (schema.const !== void 0) {
    return z.literal(schema.const);
  }
  const type = schema.type;
  if (Array.isArray(type)) {
    const typeSchemas = type.map((t) => {
      const typeSchema = { ...schema, type: t };
      return convertBaseSchema(typeSchema, ctx);
    });
    if (typeSchemas.length === 0) {
      return z.never();
    }
    if (typeSchemas.length === 1) {
      return typeSchemas[0];
    }
    return z.union(typeSchemas);
  }
  if (!type) {
    return z.any();
  }
  let zodSchema;
  switch (type) {
    case "string": {
      let stringSchema = z.string();
      if (schema.format) {
        const format = schema.format;
        if (format === "email") {
          stringSchema = stringSchema.check(z.email());
        } else if (format === "uri" || format === "uri-reference") {
          stringSchema = stringSchema.check(z.url());
        } else if (format === "uuid" || format === "guid") {
          stringSchema = stringSchema.check(z.uuid());
        } else if (format === "date-time") {
          stringSchema = stringSchema.check(z.iso.datetime());
        } else if (format === "date") {
          stringSchema = stringSchema.check(z.iso.date());
        } else if (format === "time") {
          stringSchema = stringSchema.check(z.iso.time());
        } else if (format === "duration") {
          stringSchema = stringSchema.check(z.iso.duration());
        } else if (format === "ipv4") {
          stringSchema = stringSchema.check(z.ipv4());
        } else if (format === "ipv6") {
          stringSchema = stringSchema.check(z.ipv6());
        } else if (format === "mac") {
          stringSchema = stringSchema.check(z.mac());
        } else if (format === "cidr") {
          stringSchema = stringSchema.check(z.cidrv4());
        } else if (format === "cidr-v6") {
          stringSchema = stringSchema.check(z.cidrv6());
        } else if (format === "base64") {
          stringSchema = stringSchema.check(z.base64());
        } else if (format === "base64url") {
          stringSchema = stringSchema.check(z.base64url());
        } else if (format === "e164") {
          stringSchema = stringSchema.check(z.e164());
        } else if (format === "jwt") {
          stringSchema = stringSchema.check(z.jwt());
        } else if (format === "emoji") {
          stringSchema = stringSchema.check(z.emoji());
        } else if (format === "nanoid") {
          stringSchema = stringSchema.check(z.nanoid());
        } else if (format === "cuid") {
          stringSchema = stringSchema.check(z.cuid());
        } else if (format === "cuid2") {
          stringSchema = stringSchema.check(z.cuid2());
        } else if (format === "ulid") {
          stringSchema = stringSchema.check(z.ulid());
        } else if (format === "xid") {
          stringSchema = stringSchema.check(z.xid());
        } else if (format === "ksuid") {
          stringSchema = stringSchema.check(z.ksuid());
        }
      }
      if (typeof schema.minLength === "number") {
        stringSchema = stringSchema.min(schema.minLength);
      }
      if (typeof schema.maxLength === "number") {
        stringSchema = stringSchema.max(schema.maxLength);
      }
      if (schema.pattern) {
        stringSchema = stringSchema.regex(new RegExp(schema.pattern));
      }
      zodSchema = stringSchema;
      break;
    }
    case "number":
    case "integer": {
      let numberSchema = type === "integer" ? z.number().int() : z.number();
      if (typeof schema.minimum === "number") {
        numberSchema = numberSchema.min(schema.minimum);
      }
      if (typeof schema.maximum === "number") {
        numberSchema = numberSchema.max(schema.maximum);
      }
      if (typeof schema.exclusiveMinimum === "number") {
        numberSchema = numberSchema.gt(schema.exclusiveMinimum);
      } else if (schema.exclusiveMinimum === true && typeof schema.minimum === "number") {
        numberSchema = numberSchema.gt(schema.minimum);
      }
      if (typeof schema.exclusiveMaximum === "number") {
        numberSchema = numberSchema.lt(schema.exclusiveMaximum);
      } else if (schema.exclusiveMaximum === true && typeof schema.maximum === "number") {
        numberSchema = numberSchema.lt(schema.maximum);
      }
      if (typeof schema.multipleOf === "number") {
        numberSchema = numberSchema.multipleOf(schema.multipleOf);
      }
      zodSchema = numberSchema;
      break;
    }
    case "boolean": {
      zodSchema = z.boolean();
      break;
    }
    case "null": {
      zodSchema = z.null();
      break;
    }
    case "object": {
      const shape = {};
      const properties = schema.properties || {};
      const requiredSet = new Set(schema.required || []);
      for (const [key, propSchema] of Object.entries(properties)) {
        const propZodSchema = convertSchema(propSchema, ctx);
        shape[key] = requiredSet.has(key) ? propZodSchema : propZodSchema.optional();
      }
      if (schema.propertyNames) {
        const keySchema = convertSchema(schema.propertyNames, ctx);
        const valueSchema = schema.additionalProperties && typeof schema.additionalProperties === "object" ? convertSchema(schema.additionalProperties, ctx) : z.any();
        if (Object.keys(shape).length === 0) {
          zodSchema = z.record(keySchema, valueSchema);
          break;
        }
        const objectSchema2 = z.object(shape).passthrough();
        const recordSchema = z.looseRecord(keySchema, valueSchema);
        zodSchema = z.intersection(objectSchema2, recordSchema);
        break;
      }
      if (schema.patternProperties) {
        const patternProps = schema.patternProperties;
        const patternKeys = Object.keys(patternProps);
        const looseRecords = [];
        for (const pattern of patternKeys) {
          const patternValue = convertSchema(patternProps[pattern], ctx);
          const keySchema = z.string().regex(new RegExp(pattern));
          looseRecords.push(z.looseRecord(keySchema, patternValue));
        }
        const schemasToIntersect = [];
        if (Object.keys(shape).length > 0) {
          schemasToIntersect.push(z.object(shape).passthrough());
        }
        schemasToIntersect.push(...looseRecords);
        if (schemasToIntersect.length === 0) {
          zodSchema = z.object({}).passthrough();
        } else if (schemasToIntersect.length === 1) {
          zodSchema = schemasToIntersect[0];
        } else {
          let result = z.intersection(schemasToIntersect[0], schemasToIntersect[1]);
          for (let i = 2; i < schemasToIntersect.length; i++) {
            result = z.intersection(result, schemasToIntersect[i]);
          }
          zodSchema = result;
        }
        break;
      }
      const objectSchema = z.object(shape);
      if (schema.additionalProperties === false) {
        zodSchema = objectSchema.strict();
      } else if (typeof schema.additionalProperties === "object") {
        zodSchema = objectSchema.catchall(convertSchema(schema.additionalProperties, ctx));
      } else {
        zodSchema = objectSchema.passthrough();
      }
      break;
    }
    case "array": {
      const prefixItems = schema.prefixItems;
      const items = schema.items;
      if (prefixItems && Array.isArray(prefixItems)) {
        const tupleItems = prefixItems.map((item) => convertSchema(item, ctx));
        const rest = items && typeof items === "object" && !Array.isArray(items) ? convertSchema(items, ctx) : void 0;
        if (rest) {
          zodSchema = z.tuple(tupleItems).rest(rest);
        } else {
          zodSchema = z.tuple(tupleItems);
        }
        if (typeof schema.minItems === "number") {
          zodSchema = zodSchema.check(z.minLength(schema.minItems));
        }
        if (typeof schema.maxItems === "number") {
          zodSchema = zodSchema.check(z.maxLength(schema.maxItems));
        }
      } else if (Array.isArray(items)) {
        const tupleItems = items.map((item) => convertSchema(item, ctx));
        const rest = schema.additionalItems && typeof schema.additionalItems === "object" ? convertSchema(schema.additionalItems, ctx) : void 0;
        if (rest) {
          zodSchema = z.tuple(tupleItems).rest(rest);
        } else {
          zodSchema = z.tuple(tupleItems);
        }
        if (typeof schema.minItems === "number") {
          zodSchema = zodSchema.check(z.minLength(schema.minItems));
        }
        if (typeof schema.maxItems === "number") {
          zodSchema = zodSchema.check(z.maxLength(schema.maxItems));
        }
      } else if (items !== void 0) {
        const element = convertSchema(items, ctx);
        let arraySchema = z.array(element);
        if (typeof schema.minItems === "number") {
          arraySchema = arraySchema.min(schema.minItems);
        }
        if (typeof schema.maxItems === "number") {
          arraySchema = arraySchema.max(schema.maxItems);
        }
        zodSchema = arraySchema;
      } else {
        zodSchema = z.array(z.any());
      }
      break;
    }
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
  return zodSchema;
}
function convertSchema(schema, ctx) {
  if (typeof schema === "boolean") {
    return schema ? z.any() : z.never();
  }
  let baseSchema = convertBaseSchema(schema, ctx);
  const hasExplicitType = schema.type || schema.enum !== void 0 || schema.const !== void 0;
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    const options = schema.anyOf.map((s) => convertSchema(s, ctx));
    const anyOfUnion = z.union(options);
    baseSchema = hasExplicitType ? z.intersection(baseSchema, anyOfUnion) : anyOfUnion;
  }
  if (schema.oneOf && Array.isArray(schema.oneOf)) {
    const options = schema.oneOf.map((s) => convertSchema(s, ctx));
    const oneOfUnion = z.xor(options);
    baseSchema = hasExplicitType ? z.intersection(baseSchema, oneOfUnion) : oneOfUnion;
  }
  if (schema.allOf && Array.isArray(schema.allOf)) {
    if (schema.allOf.length === 0) {
      baseSchema = hasExplicitType ? baseSchema : z.any();
    } else {
      let result = hasExplicitType ? baseSchema : convertSchema(schema.allOf[0], ctx);
      const startIdx = hasExplicitType ? 0 : 1;
      for (let i = startIdx; i < schema.allOf.length; i++) {
        result = z.intersection(result, convertSchema(schema.allOf[i], ctx));
      }
      baseSchema = result;
    }
  }
  if (schema.nullable === true && ctx.version === "openapi-3.0") {
    baseSchema = z.nullable(baseSchema);
  }
  if (schema.readOnly === true) {
    baseSchema = z.readonly(baseSchema);
  }
  if (schema.default !== void 0) {
    baseSchema = baseSchema.default(schema.default);
  }
  const extraMeta = {};
  const coreMetadataKeys = ["$id", "id", "$comment", "$anchor", "$vocabulary", "$dynamicRef", "$dynamicAnchor"];
  for (const key of coreMetadataKeys) {
    if (key in schema) {
      extraMeta[key] = schema[key];
    }
  }
  const contentMetadataKeys = ["contentEncoding", "contentMediaType", "contentSchema"];
  for (const key of contentMetadataKeys) {
    if (key in schema) {
      extraMeta[key] = schema[key];
    }
  }
  for (const key of Object.keys(schema)) {
    if (!RECOGNIZED_KEYS.has(key)) {
      extraMeta[key] = schema[key];
    }
  }
  if (Object.keys(extraMeta).length > 0) {
    ctx.registry.add(baseSchema, extraMeta);
  }
  if (schema.description) {
    baseSchema = baseSchema.describe(schema.description);
  }
  return baseSchema;
}
function fromJSONSchema(schema, params) {
  if (typeof schema === "boolean") {
    return schema ? z.any() : z.never();
  }
  let normalized;
  try {
    normalized = JSON.parse(JSON.stringify(schema));
  } catch {
    throw new Error("fromJSONSchema input is not valid JSON (possibly cyclic); use $defs/$ref for recursive schemas");
  }
  const version = detectVersion(normalized, params?.defaultTarget);
  const defs = normalized.$defs || normalized.definitions || {};
  const ctx = {
    version,
    defs,
    refs: /* @__PURE__ */ new Map(),
    processing: /* @__PURE__ */ new Set(),
    rootSchema: normalized,
    registry: params?.registry ?? globalRegistry
  };
  return convertSchema(normalized, ctx);
}
var coerce_exports = {};
__export(coerce_exports, {
  bigint: () => bigint2,
  boolean: () => boolean2,
  date: () => date2,
  number: () => number2,
  string: () => string2
});
function string2(params) {
  return _coercedString(ZodString, params);
}
function number2(params) {
  return _coercedNumber(ZodNumber, params);
}
function boolean2(params) {
  return _coercedBoolean(ZodBoolean, params);
}
function bigint2(params) {
  return _coercedBigint(ZodBigInt, params);
}
function date2(params) {
  return _coercedDate(ZodDate, params);
}
config(en_default());
createRequire(import.meta.url);
var ref = external_exports.string().min(1).max(100);
var base = { ref, existing_id: external_exports.string().uuid().optional(), label: external_exports.string().max(100).optional(), position: external_exports.object({ x: external_exports.number().finite(), y: external_exports.number().finite() }).optional() };
var query = { name: external_exports.string().regex(/^[A-Za-z_$][\w$]*$/), datasource_id: external_exports.string().min(1), options: external_exports.record(external_exports.string(), external_exports.unknown()) };
var agentModel = external_exports.object(query).strict();
var nodeSchema = external_exports.discriminatedUnion("type", [
  external_exports.object({ ...base, type: external_exports.literal("start") }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("javascript"), name: query.name, code: external_exports.string().min(1) }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("query"), ...query }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("loop"), name: query.name, iteration_values_code: external_exports.string().min(1), code: external_exports.string().min(1) }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("condition"), code: external_exports.string().min(1) }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("response"), code: external_exports.string().min(1), status_code: external_exports.number().int().min(100).max(599).optional() }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("agent"), system_prompt: external_exports.string().optional(), user_prompt: external_exports.string().optional(), output_format: external_exports.record(external_exports.string(), external_exports.unknown()).nullable().optional(), model: agentModel.nullable().optional() }).strict()
]);
var specSchema = external_exports.object({
  schema_version: external_exports.literal(1).default(1),
  nodes: external_exports.array(nodeSchema).max(200).default([]),
  edges: external_exports.array(external_exports.object({ ref, existing_id: external_exports.string().optional(), from: ref, to: ref, port: external_exports.enum(["default", "success", "failure", "true", "false"]) }).strict()).max(500).default([]),
  remove_node_ids: external_exports.array(external_exports.string()).default([]),
  remove_edge_ids: external_exports.array(external_exports.string()).default([]),
  test_parameters: external_exports.record(external_exports.string(), external_exports.unknown()).optional()
}).strict();
function assertWorkflowJavaScript(code2, label2) {
  if (typeof code2 !== "string" || !code2.trim())
    throw new Error(`Missing JavaScript code in ${label2}.`);
  try {
    new Script(`(async function() {${code2}
})`);
  } catch {
    throw new Error(`Invalid JavaScript syntax in ${label2}.`);
  }
}
function isAttachmentEdge(edge) {
  return edge.targetHandle === "ai-model" || edge.targetHandle === "tool";
}
function controlFlowEdges(graph) {
  return graph.edges.filter((edge) => !isAttachmentEdge(edge));
}
function definition(value) {
  if (value == null)
    return { nodes: [], edges: [], queries: [] };
  const parsed = external_exports.object({
    nodes: external_exports.array(external_exports.object({ id: external_exports.string(), type: external_exports.string(), data: external_exports.record(external_exports.string(), external_exports.unknown()) }).passthrough()).default([]),
    edges: external_exports.array(external_exports.object({ id: external_exports.string(), source: external_exports.string(), target: external_exports.string(), sourceHandle: external_exports.string().nullable().optional(), targetHandle: external_exports.string().nullable().optional(), data: external_exports.record(external_exports.string(), external_exports.unknown()).optional() }).passthrough()).default([]),
    queries: external_exports.array(external_exports.object({ id: external_exports.string(), idOnDefinition: external_exports.string() }).passthrough()).default([])
  }).passthrough().parse(value);
  return structuredClone(parsed);
}
function validateGraph(graph, queryIds) {
  const errors = [], warnings = [];
  const error = (code2, path, message) => errors.push({ code: code2, path, message });
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  if (nodes.size !== graph.nodes.length)
    error("duplicate_node", "nodes", "Node IDs must be unique.");
  if (new Set(graph.edges.map((e) => e.id)).size !== graph.edges.length)
    error("duplicate_edge", "edges", "Edge IDs must be unique.");
  const starts = graph.nodes.filter((n) => n.type === "input" && n.data.nodeType === "start");
  if (starts.length !== 1)
    error("start_count", "nodes", "Exactly one start node is required.");
  const mappings = new Map(graph.queries.map((q) => [q.idOnDefinition, q.id]));
  if (mappings.size !== graph.queries.length)
    error("duplicate_mapping", "queries", "Query definition IDs must be unique.");
  for (const mapping of graph.queries)
    if (queryIds && !queryIds.has(mapping.id))
      error("missing_query", "queries", `Query ${mapping.id} does not belong to this version.`);
  for (const n of graph.nodes) {
    if (n.type === "query" && !mappings.has(String(n.data.idOnDefinition)))
      error("missing_mapping", `nodes.${n.id}`, "Query node has no query mapping.");
    if (!["input", "query", "if-condition", "output", "agent"].includes(n.type))
      warnings.push({ code: "unsupported_node", path: `nodes.${n.id}`, message: `Retained ${n.type} node; configuration not validated.` });
  }
  const flowEdges = controlFlowEdges(graph);
  for (const edge of graph.edges) {
    const source = nodes.get(edge.source), target = nodes.get(edge.target), path = `edges.${edge.id}`;
    if (!source || !target) {
      error("missing_endpoint", path, "Edge endpoint does not exist.");
      continue;
    }
    if (isAttachmentEdge(edge)) {
      if (edge.targetHandle === "ai-model" && !(source.type === "query" && source.data.isChildOfAgent === true && source.data.agentConnectionType === "ai-model" && target.type === "agent")) {
        error("invalid_attachment", path, "AI model attachment must connect an Agent model query child to an Agent.");
      }
      continue;
    }
    if (target.type === "input")
      error("start_inbound", path, "Start cannot have inbound edges.");
    const ports = { input: [null, void 0], query: ["success", "failure"], "if-condition": ["true", "false"], output: [], agent: ["output"] };
    if (ports[source.type] && !ports[source.type].includes(edge.sourceHandle))
      error("invalid_port", path, `Invalid source port for ${source.type}.`);
    if (source.type === "query" && edge.sourceHandle === "failure" && !source.data.errorHandler)
      error("error_handler_disabled", path, "Failure edge requires query error handling.");
  }
  for (const agent of graph.nodes.filter((node) => node.type === "agent")) {
    if (graph.edges.filter((edge) => edge.target === agent.id && edge.targetHandle === "ai-model").length > 1) {
      error("duplicate_agent_model", `nodes.${agent.id}.model`, "Agent can have only one AI model attachment.");
    }
  }
  const adjacency = new Map(graph.nodes.map((n) => [n.id, flowEdges.filter((e) => e.source === n.id).map((e) => e.target)]));
  const visited = /* @__PURE__ */ new Set(), active = /* @__PURE__ */ new Set();
  const visit = (id) => {
    if (active.has(id))
      return true;
    if (visited.has(id))
      return false;
    visited.add(id);
    active.add(id);
    const cyclic = (adjacency.get(id) ?? []).some(visit);
    active.delete(id);
    return cyclic;
  };
  if (graph.nodes.some((n) => visit(n.id)))
    error("cycle", "edges", "Cycles are unsupported in the basic node set.");
  const reachable = /* @__PURE__ */ new Set();
  const reach = (id) => {
    if (reachable.has(id))
      return;
    reachable.add(id);
    (adjacency.get(id) ?? []).forEach(reach);
  };
  starts.forEach((n) => reach(n.id));
  for (const n of graph.nodes)
    if (!reachable.has(n.id) && n.data.isChildOfAgent !== true)
      warnings.push({ code: "unreachable", path: `nodes.${n.id}`, message: "Node is unreachable from start." });
  return { errors, warnings, runtime_verified: false };
}
function compileGraph(current, spec, ids, datasourceKinds = /* @__PURE__ */ new Map()) {
  const graph = structuredClone(current);
  const node_ids = /* @__PURE__ */ Object.create(null), edge_ids = /* @__PURE__ */ Object.create(null);
  const model_ids = /* @__PURE__ */ Object.create(null);
  const query_nodes = [];
  const checkUnique = (refs) => {
    if (new Set(refs).size !== refs.length)
      throw new Error("Duplicate logical refs.");
  };
  checkUnique(spec.nodes.map((n) => n.ref));
  checkUnique(spec.edges.map((e) => e.ref));
  for (const id of spec.remove_node_ids)
    if (!graph.nodes.some((n) => n.id === id))
      throw new Error(`Unknown node to remove: ${id}`);
  for (const id of spec.remove_edge_ids)
    if (!graph.edges.some((e) => e.id === id))
      throw new Error(`Unknown edge to remove: ${id}`);
  const removedNodeIds = new Set(spec.remove_node_ids);
  const cascadedChildIds = /* @__PURE__ */ new Set();
  for (const agentId of spec.remove_node_ids) {
    for (const edge of graph.edges.filter((candidate) => candidate.target === agentId && candidate.targetHandle === "ai-model")) {
      removedNodeIds.add(edge.source);
      cascadedChildIds.add(edge.source);
    }
  }
  const removedDefinitionIds = graph.nodes.filter((n) => removedNodeIds.has(n.id)).map((n) => n.data.idOnDefinition);
  graph.nodes = graph.nodes.filter((n) => !removedNodeIds.has(n.id));
  graph.edges = graph.edges.filter((e) => !spec.remove_edge_ids.includes(e.id) && !cascadedChildIds.has(e.source) && !cascadedChildIds.has(e.target));
  const editedIds = /* @__PURE__ */ new Set();
  for (const input of spec.nodes) {
    if ("code" in input) {
      try {
        new Script(input.type === "condition" ? `(${input.code})` : `(async function() {${input.code}
})`);
      } catch {
        throw new Error(`Invalid JavaScript syntax in node ${input.ref}.`);
      }
    }
    if (input.type === "loop") {
      try {
        new Script(`(async function() {${input.iteration_values_code}
})`);
      } catch {
        throw new Error(`Invalid iteration JavaScript syntax in node ${input.ref}.`);
      }
    }
    const id = input.existing_id ?? ids?.node_ids[input.ref] ?? randomUUID();
    if (editedIds.has(id))
      throw new Error("Multiple node edits target the same ID.");
    editedIds.add(id);
    const old = graph.nodes.find((n) => n.id === id);
    if (input.existing_id && !old)
      throw new Error(`Unknown existing node: ${id}`);
    const type = { start: "input", javascript: "query", query: "query", loop: "query", condition: "if-condition", response: "output", agent: "agent" }[input.type];
    if (old && old.type !== type)
      throw new Error("Changing node type is unsupported; remove and add explicitly.");
    const data = { ...old?.data, label: input.label ?? old?.data.label ?? input.ref };
    if (input.type !== "condition")
      data.nodeType = input.type === "javascript" || input.type === "loop" ? "query" : input.type;
    if (input.type === "condition" || input.type === "response")
      data.code = input.code;
    if (input.type === "response" && (input.status_code !== void 0 || data.statusCode === void 0)) {
      data.statusCode = { fxActive: false, value: String(input.status_code ?? 200) };
    }
    if (input.type === "loop") {
      data.looped = true;
      data.iterationValuesCode = input.iteration_values_code;
    }
    if (input.type === "agent") {
      const oldOptions = old?.data.options && typeof old.data.options === "object" && !Array.isArray(old.data.options) ? old.data.options : {};
      data.nodeName = old?.data.nodeName ?? input.ref;
      data.options = {
        ...oldOptions,
        systemPrompt: input.system_prompt ?? oldOptions.systemPrompt ?? "",
        userPrompt: input.user_prompt ?? oldOptions.userPrompt ?? "",
        outputFormat: input.output_format === void 0 ? oldOptions.outputFormat ?? null : input.output_format === null ? null : { example: input.output_format }
      };
      const attachments = graph.edges.filter((edge) => edge.target === id && edge.targetHandle === "ai-model");
      if (attachments.length > 1)
        throw new Error(`Agent ${input.ref} has multiple AI model attachments.`);
      const attachment = attachments[0];
      const child = attachment && graph.nodes.find((node2) => node2.id === attachment.source);
      if (input.model === null && attachment) {
        if (typeof child?.data.idOnDefinition === "string")
          removedDefinitionIds.push(child.data.idOnDefinition);
        graph.edges = graph.edges.filter((edge) => edge.id !== attachment.id);
        graph.nodes = graph.nodes.filter((node2) => node2.id !== attachment.source);
      } else if (input.model) {
        const modelNodeId = child?.id ?? ids?.model_ids[input.ref]?.node_id ?? randomUUID();
        const definitionId = typeof child?.data.idOnDefinition === "string" ? child.data.idOnDefinition : randomUUID();
        const kind = datasourceKinds.get(input.model.datasource_id);
        const modelNode = {
          ...child,
          id: modelNodeId,
          type: "query",
          sourcePosition: "right",
          targetPosition: "left",
          deletable: false,
          data: { ...child?.data, idOnDefinition: definitionId, nodeType: "query", kind, isChildOfAgent: true, agentConnectionType: "ai-model" },
          position: child?.position ?? { x: 100, y: 70 }
        };
        if (child)
          graph.nodes[graph.nodes.indexOf(child)] = modelNode;
        else
          graph.nodes.push(modelNode);
        const edgeId = attachment?.id ?? ids?.model_ids[input.ref]?.edge_id ?? randomUUID();
        const modelEdge = { ...attachment, id: edgeId, source: modelNodeId, target: id, sourceHandle: "output", targetHandle: "ai-model", type: "custom", data: { direction: "vertical" } };
        if (attachment)
          graph.edges[graph.edges.indexOf(attachment)] = modelEdge;
        else
          graph.edges.push(modelEdge);
        model_ids[input.ref] = { node_id: modelNodeId, edge_id: edgeId };
        query_nodes.push({ role: "agent-model", parent_agent_id: id, node_id: modelNodeId, definition_id: definitionId, datasource_id: input.model.datasource_id, name: input.model.name, options: input.model.options });
      }
    }
    if (input.type === "query" || input.type === "javascript" || input.type === "loop") {
      const definitionId = typeof data.idOnDefinition === "string" ? data.idOnDefinition : randomUUID();
      data.idOnDefinition = definitionId;
      query_nodes.push({ role: "workflow-node", spec: input, node_id: id, definition_id: definitionId });
    }
    const node = { ...old, id, type, sourcePosition: "right", targetPosition: "left", deletable: false, data, position: input.position ?? old?.position ?? { x: 100 + graph.nodes.length * 320, y: 250 } };
    if (old)
      graph.nodes[graph.nodes.indexOf(old)] = node;
    else
      graph.nodes.push(node);
    node_ids[input.ref] = id;
  }
  const resolve = (ref2) => node_ids[ref2] ?? (graph.nodes.some((n) => n.id === ref2) ? ref2 : void 0);
  const editedEdges = /* @__PURE__ */ new Set();
  for (const input of spec.edges) {
    const id = input.existing_id ?? ids?.edge_ids[input.ref] ?? randomUUID();
    if (editedEdges.has(id))
      throw new Error("Multiple edge edits target the same ID.");
    editedEdges.add(id);
    const old = graph.edges.find((e) => e.id === id);
    if (input.existing_id && !old)
      throw new Error(`Unknown existing edge: ${id}`);
    const source = resolve(input.from), target = resolve(input.to);
    if (!source || !target)
      throw new Error(`Unknown endpoint in edge ${input.ref}. Use a supplied ref or existing node ID.`);
    const sourceNode = graph.nodes.find((node) => node.id === source);
    const sourceHandle = input.port === "default" ? sourceNode?.type === "agent" ? "output" : null : input.port;
    const edge = { ...old, id, source, target, sourceHandle, type: "custom" };
    if (old)
      graph.edges[graph.edges.indexOf(old)] = edge;
    else
      graph.edges.push(edge);
    edge_ids[input.ref] = id;
    if (input.port === "failure") {
      const n = graph.nodes.find((n2) => n2.id === source);
      if (n.type === "query")
        n.data.errorHandler = true;
    }
  }
  graph.queries = graph.queries.filter((q) => !removedDefinitionIds.includes(q.idOnDefinition) || graph.nodes.some((n) => n.data.idOnDefinition === q.idOnDefinition));
  const depths = new Map(graph.nodes.map((n) => [n.id, 0]));
  for (let pass = 0; pass < graph.nodes.length; pass++) {
    let changed = false;
    for (const edge of controlFlowEdges(graph)) {
      const next = (depths.get(edge.source) ?? 0) + 1;
      if (next > (depths.get(edge.target) ?? 0)) {
        depths.set(edge.target, next);
        changed = true;
      }
    }
    if (!changed)
      break;
  }
  const placed = graph.nodes.filter((n) => current.nodes.some((old) => old.id === n.id) || spec.nodes.some((input) => node_ids[input.ref] === n.id && input.position));
  for (const n of graph.nodes.filter((n2) => !placed.includes(n2))) {
    const x = 100 + (depths.get(n.id) ?? 0) * 320;
    let y = 250;
    while (placed.some((other) => other.position && Math.abs(other.position.x - x) < 300 && Math.abs(other.position.y - y) < 160))
      y += 180;
    n.position = { x, y };
    placed.push(n);
  }
  if (spec.test_parameters !== void 0)
    graph.defaultParams = JSON.stringify(spec.test_parameters);
  return { graph, node_ids, edge_ids, model_ids, query_nodes };
}
var nodeCatalog = {
  schema_version: 1,
  runtime_context: {
    inputs: "Read workflow inputs from startTrigger.params, for example startTrigger.params.left. A logical start-node ref does not create a JavaScript global.",
    query_results: "Read a preceding query result as <persisted_query_name>.data, for example computeSum.data. There is no app-style queries namespace in workflow code.",
    code: "JavaScript, condition and response code runs in a server-side function body. Return the result explicitly. Read only preceding nodes on the current execution path.",
    example: {
      query_name: "computeSum",
      javascript: "return { sum: Number(startTrigger.params.left) + Number(startTrigger.params.right) };",
      response: "return computeSum.data;"
    }
  },
  nodes: [
    { type: "start", renderer: "input", ports: ["default"] },
    { type: "javascript", renderer: "query", ports: ["success", "failure"], fields: ["name", "code"] },
    { type: "query", renderer: "query", ports: ["success", "failure"], fields: ["name", "datasource_id", "options"] },
    { type: "loop", renderer: "query", ports: ["success", "failure"], fields: ["name", "iteration_values_code", "code"] },
    { type: "condition", renderer: "if-condition", ports: ["true", "false"], fields: ["code"] },
    { type: "response", renderer: "output", ports: [], fields: ["code", "status_code"] },
    { type: "agent", renderer: "agent", ports: ["default"], fields: ["system_prompt", "user_prompt", "output_format", "model"] }
  ],
  edit_semantics: "Patch. Use existing_id to edit nodes/edges; edge endpoints may use existing node IDs. Omitted objects are preserved. Removal requires explicit IDs and incident edge removal.",
  limitations: ["Agent tool connections are not authored", "No publishing or trigger setup", "No concurrent-edit protection", "No automatic execution during authoring", "Advanced nodes are preserved but not authored"]
};
createRequire(import.meta.url);
var VOID_TAGS = /* @__PURE__ */ new Set(["br", "img", "hr", "input", "meta", "link", "source", "wbr", "col"]);
var INLINE_TAGS = /* @__PURE__ */ new Set([
  "span",
  "b",
  "strong",
  "i",
  "em",
  "a",
  "small",
  "code",
  "u",
  "s",
  "sup",
  "sub",
  "abbr",
  "time",
  "mark",
  "label",
  "kbd",
  "q",
  "cite",
  "var",
  "bdi",
  "font"
]);
var DEFAULT_FONT_SIZE = 14;
var LINE_HEIGHT_FACTOR = 1.5;
var GLYPH_WIDTH_FACTOR = 0.52;
var TAG_DEFAULTS = {
  h1: { fontSize: 32, marginBottom: 8 },
  h2: { fontSize: 24, marginBottom: 8 },
  h3: { fontSize: 20, marginBottom: 8 },
  h4: { fontSize: 18, marginBottom: 8 },
  h5: { fontSize: 16, marginBottom: 8 },
  h6: { fontSize: 14, marginBottom: 8 },
  p: { marginBottom: 16 },
  ul: { marginBottom: 16 },
  ol: { marginBottom: 16 },
  hr: { marginTop: 16, marginBottom: 16 }
};
function stripHtmlBindings(raw) {
  let repeats = false;
  const trimmed = raw.trim();
  const template = /^\{\{\s*`([\s\S]*)`\s*\}\}$/.exec(trimmed);
  if (template) {
    const body = template[1];
    const html2 = replaceBalanced(body, "${", "}", (inner) => {
      if (/\.map\s*\(/.test(inner)) {
        repeats = true;
        return "";
      }
      return "00";
    });
    return { html: html2, repeats };
  }
  const html = replaceBalanced(raw, "{{", "}}", (inner) => {
    if (/\.map\s*\(/.test(inner)) {
      repeats = true;
      return "";
    }
    return "00";
  });
  return { html, repeats };
}
function replaceBalanced(src, open, close, fn) {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const start = src.indexOf(open, i);
    if (start < 0) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, start);
    let depth = 0;
    let j = start;
    let end = -1;
    while (j < src.length) {
      if (src.startsWith(open, j)) {
        depth += 1;
        j += open.length;
        continue;
      }
      if (src.startsWith(close, j)) {
        depth -= 1;
        if (depth === 0) {
          end = j;
          break;
        }
        j += close.length;
        continue;
      }
      if (open === "${" && src[j] === "{")
        depth += 1;
      j += 1;
    }
    if (end < 0) {
      out += src.slice(start);
      break;
    }
    out += fn(src.slice(start + open.length, end));
    i = end + close.length;
  }
  return out;
}
function parseStyle(text) {
  const style = {};
  if (!text)
    return style;
  for (const decl of text.split(";")) {
    const idx = decl.indexOf(":");
    if (idx < 0)
      continue;
    const key = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim().replace(/\s*!important$/i, "");
    if (key)
      style[key] = value;
  }
  return style;
}
function parseAttrs(text) {
  const attrs = {};
  const re = /([a-zA-Z_:][-\w:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while (m = re.exec(text)) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}
function parseHtml(html) {
  const root = { tag: "#root", style: {}, attrs: {}, children: [], text: "" };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\/\s*([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^>]*?)?)\s*(\/?)>|([^<]+)|</g;
  let m;
  while (m = re.exec(html)) {
    if (m[0].startsWith("<!--"))
      continue;
    if (m[1]) {
      const tag = m[1].toLowerCase();
      for (let k = stack.length - 1; k > 0; k -= 1) {
        if (stack[k].tag === tag) {
          stack.length = k;
          break;
        }
      }
      continue;
    }
    if (m[2]) {
      const tag = m[2].toLowerCase();
      if (tag === "style" || tag === "script") {
        const close = html.indexOf(`</${tag}`, re.lastIndex);
        if (close >= 0)
          re.lastIndex = close;
        continue;
      }
      const attrs = parseAttrs(m[3] ?? "");
      const node = { tag, style: parseStyle(attrs.style), attrs, children: [], text: "" };
      stack[stack.length - 1].children.push(node);
      if (!VOID_TAGS.has(tag) && !m[4])
        stack.push(node);
      continue;
    }
    if (m[5] !== void 0) {
      const text = decodeEntities(m[5]);
      if (text.trim() || /\s/.test(text)) {
        stack[stack.length - 1].children.push({ tag: "#text", style: {}, attrs: {}, children: [], text });
      }
    }
  }
  return root;
}
function decodeEntities(text) {
  return text.replace(/&nbsp;/g, "\xA0").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&[a-z]+;|&#\d+;/gi, "x");
}
function px(value, fontSize, base2 = 0) {
  if (value === void 0)
    return void 0;
  const v = value.trim();
  const m = /^(-?\d*\.?\d+)(px|em|rem|%|pt)?$/.exec(v);
  if (!m)
    return v === "0" ? 0 : void 0;
  const n = parseFloat(m[1]);
  switch (m[2]) {
    case void 0:
    case "px":
      return n;
    case "em":
      return n * fontSize;
    case "rem":
      return n * 16;
    case "pt":
      return n * (4 / 3);
    case "%":
      return base2 ? n / 100 * base2 : void 0;
    default:
      return void 0;
  }
}
function vertical(style, prop, fontSize) {
  let top = 0;
  let bottom = 0;
  const shorthand = style[prop];
  if (shorthand) {
    const parts = shorthand.split(/\s+/).map((p) => px(p, fontSize) ?? 0);
    if (parts.length === 1)
      top = bottom = parts[0];
    else if (parts.length === 2 || parts.length === 3) {
      top = parts[0];
      bottom = parts[2] ?? parts[0];
    } else if (parts.length >= 4) {
      top = parts[0];
      bottom = parts[2];
    }
  }
  const t = px(style[`${prop}-top`], fontSize);
  const b = px(style[`${prop}-bottom`], fontSize);
  if (t !== void 0)
    top = t;
  if (b !== void 0)
    bottom = b;
  return [top, bottom];
}
function horizontal(style, prop, fontSize) {
  let left = 0;
  let right = 0;
  const shorthand = style[prop];
  if (shorthand) {
    const parts = shorthand.split(/\s+/).map((p) => px(p, fontSize) ?? 0);
    if (parts.length === 1)
      left = right = parts[0];
    else if (parts.length === 2 || parts.length === 3)
      left = right = parts[1];
    else if (parts.length >= 4) {
      right = parts[1];
      left = parts[3];
    }
  }
  const l = px(style[`${prop}-left`], fontSize);
  const r = px(style[`${prop}-right`], fontSize);
  if (l !== void 0)
    left = l;
  if (r !== void 0)
    right = r;
  return left + right;
}
function borderWidth(value) {
  if (!value)
    return 0;
  if (/^(none|0)$/i.test(value.trim()))
    return 0;
  const m = /(\d*\.?\d+)px/.exec(value);
  if (m)
    return parseFloat(m[1]);
  if (/\b(thin)\b/.test(value))
    return 1;
  if (/\b(medium)\b/.test(value))
    return 3;
  if (/\b(thick)\b/.test(value))
    return 5;
  return /\b(solid|dashed|dotted|double)\b/.test(value) ? 1 : 0;
}
function borders(style) {
  const all = borderWidth(style.border);
  const top = style["border-top"] !== void 0 ? borderWidth(style["border-top"]) : all;
  const bottom = style["border-bottom"] !== void 0 ? borderWidth(style["border-bottom"]) : all;
  const t = px(style["border-top-width"], 0);
  const b = px(style["border-bottom-width"], 0);
  return [t ?? top, b ?? bottom];
}
function gridColumns(value) {
  if (!value)
    return 1;
  let count = 0;
  const re = /repeat\(\s*(\d+|auto-fit|auto-fill)\s*,([^)]*)\)|[^\s,]+/g;
  let m;
  while (m = re.exec(value)) {
    if (m[1]) {
      const n = parseInt(m[1], 10);
      const inner = (m[2] ?? "").trim().split(/\s+/).filter(Boolean).length || 1;
      count += (Number.isFinite(n) ? n : 1) * inner;
    } else
      count += 1;
  }
  return Math.max(1, count);
}
function gapOf(style, axis, fontSize) {
  const specific = px(style[`${axis}-gap`], fontSize);
  if (specific !== void 0)
    return specific;
  const gap = style.gap ?? style["grid-gap"];
  if (!gap)
    return 0;
  const parts = gap.split(/\s+/).map((p) => px(p, fontSize) ?? 0);
  if (axis === "row")
    return parts[0] ?? 0;
  return parts[1] ?? parts[0] ?? 0;
}
function isInline(node) {
  if (node.tag === "#text")
    return true;
  const display = node.style.display;
  if (display) {
    if (/^inline(?!-block|-flex|-grid)/.test(display))
      return true;
    return false;
  }
  return INLINE_TAGS.has(node.tag);
}
function isHidden(node) {
  return node.style.display === "none" || node.style.visibility === "hidden";
}
function contextFor(node, parent) {
  const defaults = TAG_DEFAULTS[node.tag];
  let fontSize = px(node.style["font-size"], parent.fontSize) ?? defaults?.fontSize ?? parent.fontSize;
  if (!fontSize || fontSize <= 0)
    fontSize = parent.fontSize;
  let lineHeight = parent.lineHeight;
  const lh = node.style["line-height"];
  if (lh !== void 0) {
    const unitless = /^\d*\.?\d+$/.test(lh.trim());
    const value = unitless ? parseFloat(lh) * fontSize : px(lh, fontSize);
    if (value !== void 0)
      lineHeight = value;
    else if (lh.trim() === "normal")
      lineHeight = fontSize * LINE_HEIGHT_FACTOR;
  } else if (node.style["font-size"] || defaults?.fontSize || parent.lineHeight === 0) {
    lineHeight = fontSize * LINE_HEIGHT_FACTOR;
  }
  return { fontSize, lineHeight, width: parent.width };
}
function inlineRunHeight(run, ctx) {
  let maxLine = ctx.lineHeight;
  const segments = [""];
  const walk = (nodes, c) => {
    for (const n of nodes) {
      if (n.tag === "#text") {
        segments[segments.length - 1] += n.text;
      } else if (n.tag === "br") {
        segments.push("");
      } else if (n.tag === "img") {
        const h = px(n.style.height, c.fontSize) ?? (n.attrs.height ? parseFloat(n.attrs.height) : void 0);
        if (h)
          maxLine = Math.max(maxLine, h);
      } else {
        const inner = contextFor(n, c);
        const [pt, pb] = vertical(n.style, "padding", inner.fontSize);
        maxLine = Math.max(maxLine, inner.lineHeight + pt + pb);
        walk(n.children, inner);
      }
    }
  };
  walk(run, ctx);
  let lines = 0;
  for (const segment of segments) {
    const text = segment.replace(/\s+/g, " ").trim();
    if (!text) {
      if (segments.length > 1)
        lines += 1;
      continue;
    }
    const textWidth = text.length * ctx.fontSize * GLYPH_WIDTH_FACTOR;
    lines += Math.max(1, Math.ceil(textWidth / Math.max(ctx.width, 40)));
  }
  if (lines === 0)
    return 0;
  return lines * maxLine;
}
function blockHeight(node, parent) {
  if (isHidden(node))
    return 0;
  const ctx = contextFor(node, parent);
  const defaults = TAG_DEFAULTS[node.tag];
  const [pt, pb] = vertical(node.style, "padding", ctx.fontSize);
  const [bt, bb] = borders(node.style);
  let [mt, mb] = vertical(node.style, "margin", ctx.fontSize);
  if (node.style.margin === void 0 && node.style["margin-top"] === void 0 && defaults?.marginTop)
    mt = defaults.marginTop;
  if (node.style.margin === void 0 && node.style["margin-bottom"] === void 0 && defaults?.marginBottom)
    mb = defaults.marginBottom;
  const explicitWidth = px(node.style.width, ctx.fontSize, parent.width);
  const innerWidth = Math.max(40, (explicitWidth ?? parent.width) - horizontal(node.style, "padding", ctx.fontSize));
  const inner = { ...ctx, width: innerWidth };
  let content;
  if (node.tag === "hr")
    content = 1;
  else if (node.tag === "img")
    content = px(node.style.height, ctx.fontSize) ?? 0;
  else
    content = childrenHeight(node, inner, px(node.style.height, ctx.fontSize) !== void 0);
  const explicit = px(node.style.height, ctx.fontSize);
  if (explicit !== void 0 && !/%|auto/.test(node.style.height ?? "")) {
    const borderBox = node.style["box-sizing"] === "border-box";
    const boxHeight = borderBox ? explicit : explicit + pt + pb + bt + bb;
    const overflowHidden = /^(hidden|auto|scroll|clip)$/.test(node.style.overflow ?? node.style["overflow-y"] ?? "");
    const full = content + pt + pb + bt + bb;
    return (overflowHidden ? boxHeight : Math.max(boxHeight, full)) + mt + mb;
  }
  const minHeight = px(node.style["min-height"], ctx.fontSize);
  let total = content + pt + pb + bt + bb;
  if (minHeight !== void 0)
    total = Math.max(total, node.style["box-sizing"] === "border-box" ? minHeight : minHeight + pt + pb);
  return total + mt + mb;
}
function childrenHeight(node, ctx, pinned = false) {
  const display = node.style.display ?? "";
  const children = node.children.filter((c) => !isHidden(c));
  if (/grid/.test(display))
    return gridHeight(node, children, ctx);
  if (/flex/.test(display))
    return flexHeight(node, children, ctx, pinned);
  if (node.tag === "tr")
    return rowHeight(children, ctx);
  let total = 0;
  let run = [];
  const flush = () => {
    if (run.length)
      total += inlineRunHeight(run, ctx);
    run = [];
  };
  for (const child of children) {
    if (isInline(child))
      run.push(child);
    else {
      flush();
      total += blockHeight(child, ctx);
    }
  }
  flush();
  return total;
}
function rowHeight(children, ctx) {
  const cells = children.filter((c) => !isInline(c));
  if (!cells.length)
    return inlineRunHeight(children, ctx);
  const width = Math.max(40, ctx.width / cells.length);
  return Math.max(...cells.map((c) => blockHeight(c, { ...ctx, width })));
}
function gridHeight(node, children, ctx) {
  const columns = gridColumns(node.style["grid-template-columns"]);
  const rowGap = gapOf(node.style, "row", ctx.fontSize);
  const colGap = gapOf(node.style, "column", ctx.fontSize);
  const width = Math.max(40, (ctx.width - colGap * (columns - 1)) / columns);
  const items = children.filter((c) => c.tag !== "#text" || c.text.trim());
  if (!items.length)
    return 0;
  let total = 0;
  for (let i = 0; i < items.length; i += columns) {
    const row = items.slice(i, i + columns);
    total += Math.max(...row.map((c) => isInline(c) ? inlineRunHeight([c], { ...ctx, width }) : blockHeight(c, { ...ctx, width })));
    if (i + columns < items.length)
      total += rowGap;
  }
  return total;
}
function flexHeight(node, children, ctx, pinned = false) {
  const direction = node.style["flex-direction"] ?? "row";
  const items = children.filter((c) => c.tag !== "#text" || c.text.trim());
  if (!items.length)
    return 0;
  if (/column/.test(direction)) {
    const gap2 = gapOf(node.style, "row", ctx.fontSize);
    return items.reduce((sum, c, i) => sum + (isInline(c) ? inlineRunHeight([c], ctx) : blockHeight(c, ctx)) + (i ? gap2 : 0), 0);
  }
  const gap = gapOf(node.style, "column", ctx.fontSize);
  const weights = items.map((c) => {
    const flex = c.style.flex ?? c.style["flex-grow"];
    const n = flex ? parseFloat(flex) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const free = ctx.width - gap * (items.length - 1);
  const stretched = pinned && !/^(flex-start|center|flex-end|baseline|start|end)$/.test(node.style["align-items"] ?? "");
  return Math.max(...items.map((c, i) => {
    const explicit = px(c.style.width, ctx.fontSize, ctx.width);
    const width = Math.max(40, explicit ?? free * weights[i] / totalWeight);
    if (isInline(c))
      return inlineRunHeight([c], { ...ctx, width });
    if (!stretched)
      return blockHeight(c, { ...ctx, width });
    const inner = contextFor(c, { ...ctx, width });
    const [pt] = vertical(c.style, "padding", inner.fontSize);
    const [bt] = borders(c.style);
    const [mt] = vertical(c.style, "margin", inner.fontSize);
    const innerWidth = Math.max(40, width - horizontal(c.style, "padding", inner.fontSize));
    return mt + pt + bt + childrenHeight(c, { ...inner, width: innerWidth });
  }));
}
function rootHeight(root, ctx) {
  let total = 0;
  let run = [];
  const flush = () => {
    if (run.length)
      total += inlineRunHeight(run, ctx);
    run = [];
  };
  for (const child of root.children.filter((c) => !isHidden(c))) {
    if (isInline(child)) {
      run.push(child);
      continue;
    }
    flush();
    const percentHeight = /%$/.test((child.style.height ?? "").trim());
    if (!percentHeight) {
      total += blockHeight(child, ctx);
      continue;
    }
    const inner = contextFor(child, ctx);
    const [pt] = vertical(child.style, "padding", inner.fontSize);
    const [bt] = borders(child.style);
    const [mt] = vertical(child.style, "margin", inner.fontSize);
    const innerWidth = Math.max(40, ctx.width - horizontal(child.style, "padding", inner.fontSize));
    const content = childrenHeight(child, { ...inner, width: innerWidth }, true);
    const display = child.style.display ?? "";
    const column = /column/.test(child.style["flex-direction"] ?? "");
    const centred = /flex|grid/.test(display) && !column && /center/.test(child.style["align-items"] ?? child.style["align-content"] ?? "") || /flex/.test(display) && column && /center/.test(child.style["justify-content"] ?? "");
    total += mt + (centred ? content : pt + bt + content);
  }
  flush();
  return total;
}
function estimateHtmlHeight(rawHtml, widthPx) {
  const { html, repeats } = stripHtmlBindings(rawHtml);
  if (!html.trim())
    return null;
  const root = parseHtml(html);
  const ctx = { fontSize: DEFAULT_FONT_SIZE, lineHeight: DEFAULT_FONT_SIZE * LINE_HEIGHT_FACTOR, width: Math.max(40, widthPx) };
  const height = rootHeight(root, ctx);
  if (!Number.isFinite(height) || height <= 0)
    return null;
  return { height: Math.round(height), lowerBound: repeats };
}
var GRID_COLUMNS = 43;
function propVal(props, key) {
  const p = props?.[key];
  return p && typeof p === "object" && "value" in p ? p.value : p;
}
function truthy(v) {
  if (typeof v === "boolean")
    return v;
  if (typeof v !== "string")
    return false;
  const s = v.trim().replace(/^\{\{\s*/, "").replace(/\s*\}\}$/, "").toLowerCase();
  return s === "true";
}
function label(c) {
  return c.name ?? c.id ?? "?";
}
function lintTableColumnsShape(c) {
  if (c.type !== "Table")
    return [];
  const columns = propVal(c.properties, "columns");
  if (columns === void 0 || columns === null || Array.isArray(columns))
    return [];
  if (typeof columns === "string") {
    let parsesToArray = false;
    try {
      parsesToArray = Array.isArray(JSON.parse(columns));
    } catch {
      parsesToArray = false;
    }
    return [
      `Table "${label(c)}": properties.columns.value is a JSON string${parsesToArray ? " that happens to parse as an array" : ""}. ToolJet stores it as text and the Table crashes on render ("Something went wrong"). Pass the column objects as a real array value: columns: { value: [ { key, name, columnType, ... } ] }.`
    ];
  }
  return [
    `Table "${label(c)}": properties.columns.value must be an array of column objects, not ${typeof columns}.`
  ];
}
var MARKDOWN_SIGNS = /(^|\n)\s*#{1,6}\s+\S|\*\*[^*\n]+\*\*|(^|\n)\s*[-*]\s+\S|\[[^\]\n]+\]\([^)\n]+\)|(^|\n)\s*\d+\.\s+\S/;
function lintTextFormat(c) {
  if (c.type !== "Text")
    return [];
  const text = propVal(c.properties, "text");
  if (typeof text !== "string")
    return [];
  const format = propVal(c.properties, "textFormat");
  const effective = typeof format === "string" && format ? format : "html";
  if (effective === "markdown")
    return [];
  const literal2 = text.replace(/\{\{[\s\S]*?\}\}/g, " ");
  if (!MARKDOWN_SIGNS.test(literal2))
    return [];
  return [
    `Text "${label(c)}": the text uses markdown (a "#" heading, **bold**, a list or a link) but textFormat is "${effective}", so it renders literally. Set properties.textFormat.value = "markdown", or write the heading as HTML / plain text.`
  ];
}
var WIDTH_EXEMPT = /* @__PURE__ */ new Set(["Modal", "ModalV2", "ShadDialog", "Drawer"]);
function lintOversizedWidths(components) {
  const errors = [];
  for (const c of components) {
    if (!c.type || WIDTH_EXEMPT.has(c.type))
      continue;
    const rect = c.layouts?.desktop ?? c.layout;
    if (!rect)
      continue;
    const width = typeof rect.width === "number" ? rect.width : void 0;
    const left = typeof rect.left === "number" ? rect.left : 0;
    if (width === void 0)
      continue;
    if (width > GRID_COLUMNS || left + width > GRID_COLUMNS) {
      errors.push(`${c.type} "${label(c)}": desktop left ${left} + width ${width} exceeds ToolJet's ${GRID_COLUMNS}-column grid. Widths and lefts are grid columns, not pixels: a full-width row is left 2, width 39; a half is width 19; a quarter is width 9.`);
    }
  }
  return errors;
}
function eventPayload(event) {
  return event && typeof event === "object" ? event : void 0;
}
function queryTriggers(summary) {
  const byId = new Map(summary.queries.map((q) => [q.id, q]));
  const byName = new Map(summary.queries.flatMap((q) => q.name ? [[q.name, q]] : []));
  const resolve = (ref2) => typeof ref2 === "string" ? byId.get(ref2) ?? byName.get(ref2) : void 0;
  const triggers = /* @__PURE__ */ new Map();
  for (const q of summary.queries) {
    const options = q.options && typeof q.options === "object" ? q.options : {};
    const automatic = truthy(propVal(options, "runOnPageLoad")) || truthy(propVal(options, "runOnDependencyChange"));
    triggers.set(q.id, { automatic, manual: [] });
  }
  const chains = [];
  for (const e of summary.events) {
    const payload = eventPayload(e.event);
    if (!payload || payload.actionId !== "run-query")
      continue;
    const target = resolve(payload.queryId ?? payload.queryName);
    if (!target)
      continue;
    const entry = triggers.get(target.id);
    if (!entry)
      continue;
    const trigger = String(payload.eventId ?? "");
    if (e.target === "page" && trigger === "onPageLoad") {
      entry.automatic = true;
    } else if (e.target === "data_query" && trigger === "onDataQuerySuccess" && e.sourceId) {
      chains.push([e.sourceId, target.id]);
    } else {
      entry.manual.push(`${e.target ?? "component"} ${trigger || "event"}`);
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const [sourceId, targetId] of chains) {
      const source = triggers.get(sourceId);
      const target = triggers.get(targetId);
      if (source?.automatic && target && !target.automatic) {
        target.automatic = true;
        changed = true;
      }
    }
  }
  return triggers;
}
var DATA_BOUND = /* @__PURE__ */ new Set(["Table", "ListView", "Chart", "Kanban"]);
function lintUntriggeredDataQueries(summary) {
  const errors = [];
  const warnings = [];
  if (!summary.queries.length)
    return { errors, warnings };
  const triggers = queryTriggers(summary);
  const byName = new Map(summary.queries.flatMap((q) => q.name ? [[q.name, q]] : []));
  for (const page of summary.pages) {
    for (const c of page.components) {
      if (!c.type || !DATA_BOUND.has(c.type))
        continue;
      const data = propVal(c.properties, "data");
      if (typeof data !== "string")
        continue;
      const names = [...new Set([...data.matchAll(/\bqueries\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))];
      for (const name of names) {
        const query2 = byName.get(name);
        if (!query2)
          continue;
        const t = triggers.get(query2.id);
        if (!t || t.automatic)
          continue;
        const who = `${c.type} "${c.name ?? c.id}"`;
        if (t.manual.length) {
          warnings.push(`${who} binds queries.${name}.data, but "${name}" only runs from ${[...new Set(t.manual)].join(", ")}, so the component is empty until then. If it should show data on open, set the query's runOnPageLoad: true or run it from the page's onPageLoad event.`);
          continue;
        }
        const message = `${who} binds queries.${name}.data, but nothing runs "${name}": it has no runOnPageLoad, no page onPageLoad event, no success chain from a query that does, and no user event. It will show No data forever. Set the query's runOnPageLoad: true (or add a page onPageLoad run-query event).`;
        if (c.type === "Table")
          errors.push(message);
        else
          warnings.push(message);
      }
    }
  }
  return { errors, warnings };
}
var TOOLJETDB_WRITES = /* @__PURE__ */ new Set(["create_row", "update_rows", "delete_rows", "bulk_update_with_primary_key", "bulk_upsert_with_primary_key", "bulk_insert"]);
function lintAutomaticWrites(summary) {
  const triggers = queryTriggers(summary);
  return summary.queries.flatMap((q) => {
    const options = q.options && typeof q.options === "object" ? q.options : {};
    const op = String(options.operation ?? "");
    if (q.kind !== "tooljetdb" || !TOOLJETDB_WRITES.has(op) || !triggers.get(q.id)?.automatic)
      return [];
    return [`Query "${q.name ?? q.id}" writes (${op}) and runs on its own when the page opens, so every visit changes the data. Run it from a user action instead.`];
  });
}
var HTML_PX_PER_COLUMN = 32;
var HTML_WIDGET_HEIGHT_LOSS = 4;
var HTML_HEIGHT_TOLERANCE = 8;
function suggestedHtmlHeight(c) {
  if (c.type !== "Html")
    return null;
  if (truthy(propVal(c.properties, "dynamicHeight")))
    return null;
  const raw = propVal(c.properties, "rawHtml");
  if (typeof raw !== "string" || !raw.trim())
    return null;
  const rect = c.layouts?.desktop ?? c.layout;
  const height = typeof rect?.height === "number" ? rect.height : void 0;
  const width = typeof rect?.width === "number" ? rect.width : 39;
  if (height === void 0)
    return null;
  const estimate = estimateHtmlHeight(raw, width * HTML_PX_PER_COLUMN);
  if (!estimate)
    return null;
  const overflow = estimate.height - (height - HTML_WIDGET_HEIGHT_LOSS);
  if (overflow <= HTML_HEIGHT_TOLERANCE)
    return null;
  return { from: height, to: Math.ceil((estimate.height + HTML_WIDGET_HEIGHT_LOSS + 8) / 10) * 10, needed: estimate.height };
}
var SELECTION_READ = /components(?:\.[A-Za-z_$][\w$]*|\[\s*['"][^'"]+['"]\s*\])\??\.(?:selectedRow|selectedRows\s*\[\s*0\s*\])\??\.[A-Za-z_$][\w$]*/;
function lintUnguardedSelectionText(c) {
  if (c.type !== "Html" && c.type !== "Text")
    return [];
  const key = c.type === "Html" ? "rawHtml" : "text";
  const value = propVal(c.properties, key);
  if (typeof value !== "string" || !value.includes("selectedRow"))
    return [];
  const bad = [];
  for (const m of value.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
    const expr = m[1];
    const read = expr.match(SELECTION_READ);
    if (!read)
      continue;
    const hasFallback = /\?\?|\|\||\?[^.?][\s\S]*:/.test(expr);
    if (!hasFallback)
      bad.push(read[0]);
  }
  if (!bad.length)
    return [];
  return [
    `${c.type} "${label(c)}": ${key} reads ${[...new Set(bad)].join(", ")} without a fallback. Until a row is selected that value is undefined and the page prints the word. Write (components.table?.selectedRow?.field ?? 'Select a row') or wrap the panel in a ternary on a stable selected-row key such as components.table?.selectedRow?.id. The row object itself may be empty but truthy.`
  ];
}
function lintHtmlContentHeight(c) {
  if (c.type !== "Html")
    return [];
  if (truthy(propVal(c.properties, "dynamicHeight")))
    return [];
  const raw = propVal(c.properties, "rawHtml");
  if (typeof raw !== "string" || !raw.trim())
    return [];
  const rect = c.layouts?.desktop ?? c.layout;
  const height = typeof rect?.height === "number" ? rect.height : void 0;
  const width = typeof rect?.width === "number" ? rect.width : 39;
  if (height === void 0)
    return [];
  const estimate = estimateHtmlHeight(raw, width * HTML_PX_PER_COLUMN);
  if (!estimate)
    return [];
  const usable = height - HTML_WIDGET_HEIGHT_LOSS;
  const overflow = estimate.height - usable;
  if (overflow <= HTML_HEIGHT_TOLERANCE)
    return [];
  const suggested = Math.ceil((estimate.height + HTML_WIDGET_HEIGHT_LOSS + 8) / 10) * 10;
  return [
    `Html "${label(c)}": its markup needs about ${estimate.height}px${estimate.lowerBound ? " at least (a .map() repeats rows)" : ""} (paddings, margins, font sizes \xD7 1.5 line height and wrapped lines, summed from its inline CSS) but desktop height is ${height}px and the widget renders ${HTML_WIDGET_HEIGHT_LOSS}px shorter than authored. The bottom ${overflow}px is cut off behind a hidden scrollbar. Set height to ${suggested}px, or trim the padding and font sizes to fit the height you have. An Html block never grows to its content.`
  ];
}
var SURFACE_TOKENS = /var\(--cc-(appBackground|surface1|surface2)-surface\)/;
var LITERAL_SURFACE = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i;
var CLEAR_SURFACE = /^(transparent|#[0-9a-f]{3}0|#[0-9a-f]{6}00)$|^rgba\([^)]*,\s*0(\.0+)?\s*\)$/i;
var sameColour = (a, b) => a.replace(/\s+/g, "").toLowerCase() === b.replace(/\s+/g, "").toLowerCase();
function surfaceAroundResolver(components, canvasColor) {
  const find = (key) => components.find((o) => o.clientRef === key || o.id === key) ?? components.find((o) => typeof o.id === "string" && key.startsWith(`${o.id}-`)) ?? components.find((o) => o.name === key);
  const canvas = typeof canvasColor === "string" && LITERAL_SURFACE.test(canvasColor.trim()) ? canvasColor.trim() : void 0;
  return (c) => {
    let current = c;
    for (let depth = 0; depth < 12; depth++) {
      const key = current.parentRef ?? current.parent;
      if (!key)
        return canvas;
      const parent = find(key);
      if (!parent)
        return void 0;
      const slot = current.slotName ?? current.slot_name ?? (typeof parent.id === "string" && key.startsWith(`${parent.id}-`) ? key.slice(parent.id.length + 1) : void 0);
      const own = slot === "header" ? propVal(parent.styles, "headerBackgroundColor") : slot === "footer" ? propVal(parent.styles, "footerBackgroundColor") : void 0;
      const raw = own ?? propVal(parent.styles, "backgroundColor");
      const colour = typeof raw === "string" ? raw.trim() : "";
      if (CLEAR_SURFACE.test(colour)) {
        current = parent;
        continue;
      }
      return LITERAL_SURFACE.test(colour) ? colour : void 0;
    }
    return void 0;
  };
}
function lintHtmlRootSurface(c, surfaceAround) {
  if (c.type !== "Html")
    return [];
  const raw = propVal(c.properties, "rawHtml");
  if (typeof raw !== "string" || !raw.trim())
    return [];
  const { html } = stripHtmlBindings(raw);
  const tree = parseHtml(html);
  const roots = tree.children.filter((n) => n.tag !== "#text" || n.text.trim());
  const who = `Html "${label(c)}"`;
  const parented = Boolean(c.parent || c.parentRef);
  const surface = surfaceAround ?? (parented ? "var(--cc-surface1-surface)" : "var(--cc-appBackground-surface)");
  const template = `<div style="height:100%;box-sizing:border-box;margin:0;background:${surface}"> ...your markup... </div>`;
  const why = "ToolJet's Html widget paints its box white underneath the markup, so on a tinted canvas anything the root does not cover shows as a white edge.";
  if (roots.length !== 1 || roots[0].tag === "#text") {
    return [
      `${who}: rawHtml has ${roots.length} top-level nodes. ${why} Wrap everything in one root element: ${template}`
    ];
  }
  const root = roots[0];
  const style = root.style;
  const problems = [];
  const dynamic = truthy(propVal(c.properties, "dynamicHeight"));
  const heightValue = (style.height ?? style["min-height"] ?? "").trim();
  if (!dynamic && heightValue !== "100%") {
    problems.push(heightValue ? `its height is "${heightValue}" instead of 100%, so the rest of the box stays white` : "it has no height:100%, so the box below the content stays white");
  }
  const background = (style.background ?? style["background-color"] ?? "").trim();
  if (!background || /^(transparent|none|inherit|initial|unset)$/i.test(background)) {
    problems.push(`it paints no background of its own, so the widget's white shows through; use ${surface}` + (parented ? " (or the surface2 token for a tinted rail)" : ""));
  } else if (surfaceAround && sameColour(background, surfaceAround)) ;
  else if (parented ? !SURFACE_TOKENS.test(background) : !/var\(--cc-appBackground-surface\)/.test(background)) {
    problems.push(`its background is "${background.slice(0, 60)}" rather than the surface it sits on (${surface}); a tint, gradient or literal colour belongs on a child card so the root still matches the canvas around it`);
  }
  const radius = (style["border-radius"] ?? "").trim();
  if (radius && !/^0(px)?$/.test(radius)) {
    problems.push(`it has border-radius ${radius}, and the corners outside the curve show the widget's white`);
  }
  const margin = (style.margin ?? "").trim();
  if (margin && !/^0(px)?(\s+0(px)?){0,3}$/.test(margin)) {
    problems.push(`it has margin ${margin}, which leaves a white gap around it`);
  }
  const width = (style.width ?? "").trim();
  if (width && !/^(100%|auto)$/.test(width)) {
    problems.push(`its width is "${width}", which leaves white at the sides`);
  }
  if (!problems.length)
    return [];
  return [
    `${who}: the root element ${problems.join("; ")}. ${why} Make the root a plain full-bleed box and move the card (tint, gradient, radius, padding, shadow) into a child element: ${template}`
  ];
}
var DATA_BOUND_FOR_REFS = /* @__PURE__ */ new Set(["Table", "ListView", "Chart", "Kanban", "Statistics", "Text", "Html"]);
var COMPONENT_REF = /components(?:\.([A-Za-z_$][\w$]*)|\[\s*(['"])((?:(?!\2).)+)\2\s*\])(\??\.)(value|selectedRow|selectedRowId|selectedRows|isValid|searchText|selectedOptionLabel|checked|filteredData|text)\b/g;
function chartExpressionSurface(source) {
  const stack = [];
  let quote = "";
  let text = "";
  let lastGroupStart = -1;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\")
        i++;
      else if (ch === quote)
        quote = "";
      continue;
    }
    if (ch === "/" || ch === "`")
      return void 0;
    if (ch === "'" || ch === '"') {
      quote = ch;
      if (!stack.length)
        text += "?";
      continue;
    }
    if ("([{".includes(ch)) {
      if (!stack.length) {
        text += ch;
        lastGroupStart = i;
      }
      stack.push(ch);
    } else if (")]}".includes(ch)) {
      if (stack.pop() !== { ")": "(", "]": "[", "}": "{" }[ch])
        return void 0;
      if (!stack.length)
        text += ch;
    } else if (!stack.length)
      text += ch;
  }
  return quote || stack.length ? void 0 : { text, lastGroupStart };
}
function finalChartPointKeys(value) {
  const binding = /^\s*\{\{([\s\S]*)\}\}\s*$/.exec(value);
  if (!binding)
    return void 0;
  const expression = binding[1].trim();
  const surface = chartExpressionSurface(expression);
  if (!surface || !/^[A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*|\s*\(\s*\)|\s*\[\s*\])*\s*\.\s*map\s*\(\s*\)$/.test(surface.text.trim()))
    return void 0;
  const callback = expression.slice(surface.lastGroupStart + 1, -1).trim();
  const callbackSurface = chartExpressionSurface(callback);
  if (!callbackSurface || !/^(?:[A-Za-z_$][\w$]*|\(\s*\))\s*=>\s*\(\s*\)$/.test(callbackSurface.text.trim()))
    return void 0;
  const object2 = callback.slice(callbackSurface.lastGroupStart + 1, -1).trim();
  if (!object2.startsWith("{") || !object2.endsWith("}"))
    return void 0;
  const properties = chartExpressionSurface(object2.slice(1, -1));
  if (!properties)
    return void 0;
  const keys = [];
  for (const property of properties.text.split(",")) {
    if (!property.trim())
      continue;
    const key = /^\s*([A-Za-z_$][\w$]*)\s*(?::|$)/.exec(property);
    if (!key)
      return void 0;
    keys.push(key[1]);
  }
  return keys;
}
var BARE_QUERY_DATA_BINDING = /^\{\{\s*queries\.([A-Za-z_$][\w$]*)\??\.data(?:\??\.results)?\s*(?:\|\|\s*\[\]\s*)?\}\}$/;
function lintChartDataShape(c) {
  if (c.type !== "Chart")
    return [];
  const props = c.properties ?? {};
  if (truthy(propVal(props, "plotFromJson")))
    return [];
  const value = propVal(props, "data");
  if (typeof value !== "string" || !value.includes("{{"))
    return [];
  const keys = finalChartPointKeys(value);
  if (!keys || keys.includes("x") && keys.includes("y"))
    return [];
  return [
    `Chart "${label(c)}": data maps rows to {${keys.join(", ")}} but the Chart plots [{x, y}] only; any other key names draw an empty plot with no error. Name the category x and the number y.`
  ];
}
var EMBEDDED_BINDING = /\{\{([\s\S]*?)\}\}/g;
var BACKSLASH_QUOTE = /\\["']/;
function lintEmbeddedBindingSyntax(c) {
  if (c.type !== "Html" && c.type !== "Text")
    return [];
  const key = c.type === "Html" ? "rawHtml" : "text";
  const value = propVal(c.properties, key);
  if (typeof value !== "string" || !value.includes("{{"))
    return [];
  const errors = [];
  for (const m of value.matchAll(EMBEDDED_BINDING)) {
    const expr = m[1];
    if (expr.includes("{{"))
      continue;
    let message = "";
    try {
      new Function(`return (
${expr}
);`);
      continue;
    } catch (error) {
      if (!(error instanceof SyntaxError))
        continue;
      message = error.message;
    }
    const balanced = (expr.match(/\{/g) ?? []).length === (expr.match(/\}/g) ?? []).length;
    const escaped = BACKSLASH_QUOTE.test(expr);
    if (!balanced && !escaped)
      continue;
    const snippet = expr.length > 90 ? `${expr.slice(0, 90)}\u2026` : expr;
    errors.push(`${c.type} "${label(c)}": ${key} contains a binding that is not valid JavaScript (${message}): {{${snippet}}}. ` + (escaped ? `Quotes inside {{ }} must not be backslash-escaped: the markup is a plain string, so write "Cancelled" or 'Cancelled', not \\"Cancelled\\". ` : "") + "A failed binding renders as nothing, which leaves the card or line blank.");
  }
  return errors;
}
function lintUnguardedComponentRefs(c) {
  if (!c.type || !DATA_BOUND_FOR_REFS.has(c.type))
    return [];
  const props = c.properties ?? {};
  const keys = c.type === "Html" ? ["rawHtml"] : c.type === "Text" ? ["text"] : ["data"];
  const errors = [];
  for (const key of keys) {
    const value = propVal(props, key);
    if (typeof value !== "string" || !value.includes("components"))
      continue;
    const bad = /* @__PURE__ */ new Set();
    for (const m of value.matchAll(COMPONENT_REF)) {
      if (m[4] === "?.")
        continue;
      const name = m[1] ?? m[3];
      bad.add(m[1] ? `components.${name}.${m[5]}` : `components['${name}'].${m[5]}`);
    }
    if (!bad.size)
      continue;
    const fixes = [...bad].map((ref2) => `${ref2.replace(/\.([A-Za-z]+)$/, "?.$1")}`);
    errors.push(`${c.type} "${label(c)}": ${key} reads ${[...bad].join(", ")} without optional chaining. The component evaluates when it mounts, before the inputs it references exist (queries already hold data after in-app navigation), so the reference throws and the ` + (c.type === "Table" ? "Table shows No data" : "binding fails") + " until a filter changes. Write " + fixes.join(", ") + " instead.");
  }
  return errors;
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
    defineHidden(error, "clone", function clone2(overrides = {}) {
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
  constructor(label2, conf = {}) {
    this.label = label2;
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
function createKeyword(name, options = {}) {
  options.keyword = name;
  const token = createToken(name, options);
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
function createToken(name, options = {}) {
  ++tokenTypeCounter;
  tokenLabels.push(name);
  tokenBinops.push(options.binop ?? -1);
  tokenBeforeExprs.push(options.beforeExpr ?? false);
  tokenStartsExprs.push(options.startsExpr ?? false);
  tokenPrefixes.push(options.prefix ?? false);
  tokenTypes.push(new ExportedTokenType(name, options));
  return tokenTypeCounter;
}
function createKeywordLike(name, options = {}) {
  ++tokenTypeCounter;
  keywords.set(name, tokenTypeCounter);
  tokenLabels.push(name);
  tokenBinops.push(options.binop ?? -1);
  tokenBeforeExprs.push(options.beforeExpr ?? false);
  tokenStartsExprs.push(options.startsExpr ?? false);
  tokenPrefixes.push(options.prefix ?? false);
  tokenTypes.push(new ExportedTokenType("name", options));
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
function isInAstralSet(code2, set2) {
  let pos = 65536;
  for (let i = 0, length = set2.length; i < length; i += 2) {
    pos += set2[i];
    if (pos > code2) return false;
    pos += set2[i + 1];
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
export {
  lowercaseO as $,
  backslash as A,
  BindingFlag as B,
  dot as C,
  equalsTo as D,
  Errors as E,
  verticalBar as F,
  caret as G,
  atSign as H,
  questionMark as I,
  numberSign as J,
  tilde as K,
  plusSign as L,
  ampersand as M,
  percentSign as N,
  apostrophe as O,
  quotationMark as P,
  digit8 as Q,
  digit7 as R,
  SourceLocation as S,
  digit6 as T,
  digit5 as U,
  digit4 as V,
  digit3 as W,
  digit2 as X,
  digit1 as Y,
  lowercaseX as Z,
  uppercaseX as _,
  rightCurlyBrace as a,
  tokenComesBeforeExpression as a$,
  uppercaseO as a0,
  lowercaseB as a1,
  uppercaseB as a2,
  graveAccent as a3,
  colon as a4,
  comma as a5,
  semicolon as a6,
  rightParenthesis as a7,
  leftParenthesis as a8,
  createPositionWithColumnOffset as a9,
  isDigit as aA,
  ParseErrorEnum as aB,
  tokenIsIdentifier as aC,
  tokenIsKeywordOrIdentifier as aD,
  tokenIsTSTypeOperator as aE,
  tokenIsTSDeclarationStart as aF,
  tokenIsTemplate as aG,
  tokenCanStartExpression as aH,
  tokenOperatorPrecedence as aI,
  ScopeHandler as aJ,
  NameType as aK,
  Scope as aL,
  tokenIsFlowInterfaceOrTypeOrOpaque as aM,
  isIteratorStart as aN,
  tokenIsLoop as aO,
  tokenIsAssignment as aP,
  tokenIsOperator as aQ,
  tokenIsRightAssociative as aR,
  UnparenthesizedPipeBodyDescriptions as aS,
  tokenIsPrefix as aT,
  tokenIsPostfix as aU,
  canBeReservedWord as aV,
  isKeyword as aW,
  isReservedWord as aX,
  isStrictReservedWord as aY,
  getExportedToken as aZ,
  tokenKeywordOrIdentifierIsKeyword as a_,
  lowercaseV as aa,
  lowercaseU as ab,
  lowercaseN as ac,
  lowercaseM as ad,
  uppercaseE as ae,
  lowercaseE as af,
  Position as ag,
  keywords as ah,
  tokenLabelName as ai,
  tokenIsKeyword as aj,
  ClassElementType as ak,
  types as al,
  oghamSpaceMark as am,
  lowercaseG as an,
  lowercaseS as ao,
  lowercaseI as ap,
  lowercaseY as aq,
  lowercaseD as ar,
  underscore as as,
  dollarSign as at,
  lowercaseF as au,
  lowercaseT as av,
  lowercaseR as aw,
  uppercaseA as ax,
  uppercaseF as ay,
  lowercaseA as az,
  isStrictBindOnlyReservedWord as b,
  external_exports as b0,
  surfaceAroundResolver as b1,
  lintOversizedWidths as b2,
  lintHtmlContentHeight as b3,
  lintHtmlRootSurface as b4,
  lintUnguardedComponentRefs as b5,
  lintEmbeddedBindingSyntax as b6,
  lintChartDataShape as b7,
  lintUnguardedSelectionText as b8,
  lintTextFormat as b9,
  lintTableColumnsShape as ba,
  BARE_QUERY_DATA_BINDING as bb,
  lintUntriggeredDataQueries as bc,
  lintAutomaticWrites as bd,
  parseHtml as be,
  stripHtmlBindings as bf,
  definition as bg,
  nodeCatalog as bh,
  validateGraph as bi,
  specSchema as bj,
  compileGraph as bk,
  assertWorkflowJavaScript as bl,
  controlFlowEdges as bm,
  suggestedHtmlHeight as bn,
  isIdentifierChar as c,
  tokenIsLiteralPropertyName as d,
  ScopeFlag as e,
  dash as f,
  greaterThan as g,
  exclamationMark as h,
  isStrictBindReservedWord as i,
  asterisk as j,
  lineSeparator as k,
  lessThan as l,
  lineFeed as m,
  carriageReturn as n,
  tab as o,
  paragraphSeparator as p,
  nonBreakingSpace as q,
  rightSquareBracket as r,
  slash as s,
  tt as t,
  space as u,
  digit0 as v,
  digit9 as w,
  leftCurlyBrace as x,
  leftSquareBracket as y,
  isIdentifierStart as z
};
