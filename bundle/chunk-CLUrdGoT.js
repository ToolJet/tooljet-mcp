import { createRequire } from "node:module";
import { ax as external_exports, ay as nodeCatalog, az as validateGraph, aA as specSchema, aB as compileGraph, aC as assertWorkflowJavaScript, aD as controlFlowEdges } from "./chunk-Dakrk_ob.js";
import { p as parseExpression, a as parse, r as readCatalog } from "./chunk-ePnPD46e.js";
import { h as hubspotQueryIssues, s as singleSpecRef, a as apiEndpointQueryIssues, g as getDatasourceQuerySchema, C as COMMON_QUERY_OPTION_FIELDS, S as SPEC_DISCOVERY_NOTE } from "./chunk-BozBrMhE.js";
import { r as require_moment } from "./chunk-00I8NlQo.js";
import { e7 as __toESM, e5 as __commonJS } from "./chunk-BJ6ur0AF.js";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";
createRequire(import.meta.url);
var require_unicode = __commonJS({
  "node_modules/json5/lib/unicode.js"(exports, module) {
    module.exports.Space_Separator = /[\u1680\u2000-\u200A\u202F\u205F\u3000]/;
    module.exports.ID_Start = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE83\uDE86-\uDE89\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]/;
    module.exports.ID_Continue = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u08D4-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u09FC\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9-\u0AFF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D00-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1CD0-\u1CD2\u1CD4-\u1CF9\u1D00-\u1DF9\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC00-\uDC4A\uDC50-\uDC59\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDE00-\uDE3E\uDE47\uDE50-\uDE83\uDE86-\uDE99\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC40\uDC50-\uDC59\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD47\uDD50-\uDD59]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6\uDD00-\uDD4A\uDD50-\uDD59]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/;
  }
});
var require_util = __commonJS({
  "node_modules/json5/lib/util.js"(exports, module) {
    var unicode = require_unicode();
    module.exports = {
      isSpaceSeparator(c) {
        return typeof c === "string" && unicode.Space_Separator.test(c);
      },
      isIdStartChar(c) {
        return typeof c === "string" && (c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c === "$" || c === "_" || unicode.ID_Start.test(c));
      },
      isIdContinueChar(c) {
        return typeof c === "string" && (c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c >= "0" && c <= "9" || c === "$" || c === "_" || c === "\u200C" || c === "\u200D" || unicode.ID_Continue.test(c));
      },
      isDigit(c) {
        return typeof c === "string" && /[0-9]/.test(c);
      },
      isHexDigit(c) {
        return typeof c === "string" && /[0-9A-Fa-f]/.test(c);
      }
    };
  }
});
var require_parse = __commonJS({
  "node_modules/json5/lib/parse.js"(exports, module) {
    var util = require_util();
    var source;
    var parseState;
    var stack;
    var pos;
    var line;
    var column;
    var token;
    var key3;
    var root;
    module.exports = function parse2(text2, reviver) {
      source = String(text2);
      parseState = "start";
      stack = [];
      pos = 0;
      line = 1;
      column = 0;
      token = void 0;
      key3 = void 0;
      root = void 0;
      do {
        token = lex();
        parseStates[parseState]();
      } while (token.type !== "eof");
      if (typeof reviver === "function") {
        return internalize({ "": root }, "", reviver);
      }
      return root;
    };
    function internalize(holder, name2, reviver) {
      const value = holder[name2];
      if (value != null && typeof value === "object") {
        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            const key22 = String(i);
            const replacement = internalize(value, key22, reviver);
            if (replacement === void 0) {
              delete value[key22];
            } else {
              Object.defineProperty(value, key22, {
                value: replacement,
                writable: true,
                enumerable: true,
                configurable: true
              });
            }
          }
        } else {
          for (const key22 in value) {
            const replacement = internalize(value, key22, reviver);
            if (replacement === void 0) {
              delete value[key22];
            } else {
              Object.defineProperty(value, key22, {
                value: replacement,
                writable: true,
                enumerable: true,
                configurable: true
              });
            }
          }
        }
      }
      return reviver.call(holder, name2, value);
    }
    var lexState;
    var buffer;
    var doubleQuote;
    var sign;
    var c;
    function lex() {
      lexState = "default";
      buffer = "";
      doubleQuote = false;
      sign = 1;
      for (; ; ) {
        c = peek();
        const token2 = lexStates[lexState]();
        if (token2) {
          return token2;
        }
      }
    }
    function peek() {
      if (source[pos]) {
        return String.fromCodePoint(source.codePointAt(pos));
      }
    }
    function read() {
      const c2 = peek();
      if (c2 === "\n") {
        line++;
        column = 0;
      } else if (c2) {
        column += c2.length;
      } else {
        column++;
      }
      if (c2) {
        pos += c2.length;
      }
      return c2;
    }
    var lexStates = {
      default() {
        switch (c) {
          case "	":
          case "\v":
          case "\f":
          case " ":
          case "\xA0":
          case "\uFEFF":
          case "\n":
          case "\r":
          case "\u2028":
          case "\u2029":
            read();
            return;
          case "/":
            read();
            lexState = "comment";
            return;
          case void 0:
            read();
            return newToken("eof");
        }
        if (util.isSpaceSeparator(c)) {
          read();
          return;
        }
        return lexStates[parseState]();
      },
      comment() {
        switch (c) {
          case "*":
            read();
            lexState = "multiLineComment";
            return;
          case "/":
            read();
            lexState = "singleLineComment";
            return;
        }
        throw invalidChar(read());
      },
      multiLineComment() {
        switch (c) {
          case "*":
            read();
            lexState = "multiLineCommentAsterisk";
            return;
          case void 0:
            throw invalidChar(read());
        }
        read();
      },
      multiLineCommentAsterisk() {
        switch (c) {
          case "*":
            read();
            return;
          case "/":
            read();
            lexState = "default";
            return;
          case void 0:
            throw invalidChar(read());
        }
        read();
        lexState = "multiLineComment";
      },
      singleLineComment() {
        switch (c) {
          case "\n":
          case "\r":
          case "\u2028":
          case "\u2029":
            read();
            lexState = "default";
            return;
          case void 0:
            read();
            return newToken("eof");
        }
        read();
      },
      value() {
        switch (c) {
          case "{":
          case "[":
            return newToken("punctuator", read());
          case "n":
            read();
            literal("ull");
            return newToken("null", null);
          case "t":
            read();
            literal("rue");
            return newToken("boolean", true);
          case "f":
            read();
            literal("alse");
            return newToken("boolean", false);
          case "-":
          case "+":
            if (read() === "-") {
              sign = -1;
            }
            lexState = "sign";
            return;
          case ".":
            buffer = read();
            lexState = "decimalPointLeading";
            return;
          case "0":
            buffer = read();
            lexState = "zero";
            return;
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
          case "8":
          case "9":
            buffer = read();
            lexState = "decimalInteger";
            return;
          case "I":
            read();
            literal("nfinity");
            return newToken("numeric", Infinity);
          case "N":
            read();
            literal("aN");
            return newToken("numeric", NaN);
          case '"':
          case "'":
            doubleQuote = read() === '"';
            buffer = "";
            lexState = "string";
            return;
        }
        throw invalidChar(read());
      },
      identifierNameStartEscape() {
        if (c !== "u") {
          throw invalidChar(read());
        }
        read();
        const u = unicodeEscape();
        switch (u) {
          case "$":
          case "_":
            break;
          default:
            if (!util.isIdStartChar(u)) {
              throw invalidIdentifier();
            }
            break;
        }
        buffer += u;
        lexState = "identifierName";
      },
      identifierName() {
        switch (c) {
          case "$":
          case "_":
          case "\u200C":
          case "\u200D":
            buffer += read();
            return;
          case "\\":
            read();
            lexState = "identifierNameEscape";
            return;
        }
        if (util.isIdContinueChar(c)) {
          buffer += read();
          return;
        }
        return newToken("identifier", buffer);
      },
      identifierNameEscape() {
        if (c !== "u") {
          throw invalidChar(read());
        }
        read();
        const u = unicodeEscape();
        switch (u) {
          case "$":
          case "_":
          case "\u200C":
          case "\u200D":
            break;
          default:
            if (!util.isIdContinueChar(u)) {
              throw invalidIdentifier();
            }
            break;
        }
        buffer += u;
        lexState = "identifierName";
      },
      sign() {
        switch (c) {
          case ".":
            buffer = read();
            lexState = "decimalPointLeading";
            return;
          case "0":
            buffer = read();
            lexState = "zero";
            return;
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
          case "8":
          case "9":
            buffer = read();
            lexState = "decimalInteger";
            return;
          case "I":
            read();
            literal("nfinity");
            return newToken("numeric", sign * Infinity);
          case "N":
            read();
            literal("aN");
            return newToken("numeric", NaN);
        }
        throw invalidChar(read());
      },
      zero() {
        switch (c) {
          case ".":
            buffer += read();
            lexState = "decimalPoint";
            return;
          case "e":
          case "E":
            buffer += read();
            lexState = "decimalExponent";
            return;
          case "x":
          case "X":
            buffer += read();
            lexState = "hexadecimal";
            return;
        }
        return newToken("numeric", sign * 0);
      },
      decimalInteger() {
        switch (c) {
          case ".":
            buffer += read();
            lexState = "decimalPoint";
            return;
          case "e":
          case "E":
            buffer += read();
            lexState = "decimalExponent";
            return;
        }
        if (util.isDigit(c)) {
          buffer += read();
          return;
        }
        return newToken("numeric", sign * Number(buffer));
      },
      decimalPointLeading() {
        if (util.isDigit(c)) {
          buffer += read();
          lexState = "decimalFraction";
          return;
        }
        throw invalidChar(read());
      },
      decimalPoint() {
        switch (c) {
          case "e":
          case "E":
            buffer += read();
            lexState = "decimalExponent";
            return;
        }
        if (util.isDigit(c)) {
          buffer += read();
          lexState = "decimalFraction";
          return;
        }
        return newToken("numeric", sign * Number(buffer));
      },
      decimalFraction() {
        switch (c) {
          case "e":
          case "E":
            buffer += read();
            lexState = "decimalExponent";
            return;
        }
        if (util.isDigit(c)) {
          buffer += read();
          return;
        }
        return newToken("numeric", sign * Number(buffer));
      },
      decimalExponent() {
        switch (c) {
          case "+":
          case "-":
            buffer += read();
            lexState = "decimalExponentSign";
            return;
        }
        if (util.isDigit(c)) {
          buffer += read();
          lexState = "decimalExponentInteger";
          return;
        }
        throw invalidChar(read());
      },
      decimalExponentSign() {
        if (util.isDigit(c)) {
          buffer += read();
          lexState = "decimalExponentInteger";
          return;
        }
        throw invalidChar(read());
      },
      decimalExponentInteger() {
        if (util.isDigit(c)) {
          buffer += read();
          return;
        }
        return newToken("numeric", sign * Number(buffer));
      },
      hexadecimal() {
        if (util.isHexDigit(c)) {
          buffer += read();
          lexState = "hexadecimalInteger";
          return;
        }
        throw invalidChar(read());
      },
      hexadecimalInteger() {
        if (util.isHexDigit(c)) {
          buffer += read();
          return;
        }
        return newToken("numeric", sign * Number(buffer));
      },
      string() {
        switch (c) {
          case "\\":
            read();
            buffer += escape();
            return;
          case '"':
            if (doubleQuote) {
              read();
              return newToken("string", buffer);
            }
            buffer += read();
            return;
          case "'":
            if (!doubleQuote) {
              read();
              return newToken("string", buffer);
            }
            buffer += read();
            return;
          case "\n":
          case "\r":
            throw invalidChar(read());
          case "\u2028":
          case "\u2029":
            separatorChar(c);
            break;
          case void 0:
            throw invalidChar(read());
        }
        buffer += read();
      },
      start() {
        switch (c) {
          case "{":
          case "[":
            return newToken("punctuator", read());
        }
        lexState = "value";
      },
      beforePropertyName() {
        switch (c) {
          case "$":
          case "_":
            buffer = read();
            lexState = "identifierName";
            return;
          case "\\":
            read();
            lexState = "identifierNameStartEscape";
            return;
          case "}":
            return newToken("punctuator", read());
          case '"':
          case "'":
            doubleQuote = read() === '"';
            lexState = "string";
            return;
        }
        if (util.isIdStartChar(c)) {
          buffer += read();
          lexState = "identifierName";
          return;
        }
        throw invalidChar(read());
      },
      afterPropertyName() {
        if (c === ":") {
          return newToken("punctuator", read());
        }
        throw invalidChar(read());
      },
      beforePropertyValue() {
        lexState = "value";
      },
      afterPropertyValue() {
        switch (c) {
          case ",":
          case "}":
            return newToken("punctuator", read());
        }
        throw invalidChar(read());
      },
      beforeArrayValue() {
        if (c === "]") {
          return newToken("punctuator", read());
        }
        lexState = "value";
      },
      afterArrayValue() {
        switch (c) {
          case ",":
          case "]":
            return newToken("punctuator", read());
        }
        throw invalidChar(read());
      },
      end() {
        throw invalidChar(read());
      }
    };
    function newToken(type, value) {
      return {
        type,
        value,
        line,
        column
      };
    }
    function literal(s) {
      for (const c2 of s) {
        const p = peek();
        if (p !== c2) {
          throw invalidChar(read());
        }
        read();
      }
    }
    function escape() {
      const c2 = peek();
      switch (c2) {
        case "b":
          read();
          return "\b";
        case "f":
          read();
          return "\f";
        case "n":
          read();
          return "\n";
        case "r":
          read();
          return "\r";
        case "t":
          read();
          return "	";
        case "v":
          read();
          return "\v";
        case "0":
          read();
          if (util.isDigit(peek())) {
            throw invalidChar(read());
          }
          return "\0";
        case "x":
          read();
          return hexEscape();
        case "u":
          read();
          return unicodeEscape();
        case "\n":
        case "\u2028":
        case "\u2029":
          read();
          return "";
        case "\r":
          read();
          if (peek() === "\n") {
            read();
          }
          return "";
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          throw invalidChar(read());
        case void 0:
          throw invalidChar(read());
      }
      return read();
    }
    function hexEscape() {
      let buffer2 = "";
      let c2 = peek();
      if (!util.isHexDigit(c2)) {
        throw invalidChar(read());
      }
      buffer2 += read();
      c2 = peek();
      if (!util.isHexDigit(c2)) {
        throw invalidChar(read());
      }
      buffer2 += read();
      return String.fromCodePoint(parseInt(buffer2, 16));
    }
    function unicodeEscape() {
      let buffer2 = "";
      let count = 4;
      while (count-- > 0) {
        const c2 = peek();
        if (!util.isHexDigit(c2)) {
          throw invalidChar(read());
        }
        buffer2 += read();
      }
      return String.fromCodePoint(parseInt(buffer2, 16));
    }
    var parseStates = {
      start() {
        if (token.type === "eof") {
          throw invalidEOF();
        }
        push();
      },
      beforePropertyName() {
        switch (token.type) {
          case "identifier":
          case "string":
            key3 = token.value;
            parseState = "afterPropertyName";
            return;
          case "punctuator":
            pop();
            return;
          case "eof":
            throw invalidEOF();
        }
      },
      afterPropertyName() {
        if (token.type === "eof") {
          throw invalidEOF();
        }
        parseState = "beforePropertyValue";
      },
      beforePropertyValue() {
        if (token.type === "eof") {
          throw invalidEOF();
        }
        push();
      },
      beforeArrayValue() {
        if (token.type === "eof") {
          throw invalidEOF();
        }
        if (token.type === "punctuator" && token.value === "]") {
          pop();
          return;
        }
        push();
      },
      afterPropertyValue() {
        if (token.type === "eof") {
          throw invalidEOF();
        }
        switch (token.value) {
          case ",":
            parseState = "beforePropertyName";
            return;
          case "}":
            pop();
        }
      },
      afterArrayValue() {
        if (token.type === "eof") {
          throw invalidEOF();
        }
        switch (token.value) {
          case ",":
            parseState = "beforeArrayValue";
            return;
          case "]":
            pop();
        }
      },
      end() {
      }
    };
    function push() {
      let value;
      switch (token.type) {
        case "punctuator":
          switch (token.value) {
            case "{":
              value = {};
              break;
            case "[":
              value = [];
              break;
          }
          break;
        case "null":
        case "boolean":
        case "numeric":
        case "string":
          value = token.value;
          break;
      }
      if (root === void 0) {
        root = value;
      } else {
        const parent = stack[stack.length - 1];
        if (Array.isArray(parent)) {
          parent.push(value);
        } else {
          Object.defineProperty(parent, key3, {
            value,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      if (value !== null && typeof value === "object") {
        stack.push(value);
        if (Array.isArray(value)) {
          parseState = "beforeArrayValue";
        } else {
          parseState = "beforePropertyName";
        }
      } else {
        const current = stack[stack.length - 1];
        if (current == null) {
          parseState = "end";
        } else if (Array.isArray(current)) {
          parseState = "afterArrayValue";
        } else {
          parseState = "afterPropertyValue";
        }
      }
    }
    function pop() {
      stack.pop();
      const current = stack[stack.length - 1];
      if (current == null) {
        parseState = "end";
      } else if (Array.isArray(current)) {
        parseState = "afterArrayValue";
      } else {
        parseState = "afterPropertyValue";
      }
    }
    function invalidChar(c2) {
      if (c2 === void 0) {
        return syntaxError(`JSON5: invalid end of input at ${line}:${column}`);
      }
      return syntaxError(`JSON5: invalid character '${formatChar(c2)}' at ${line}:${column}`);
    }
    function invalidEOF() {
      return syntaxError(`JSON5: invalid end of input at ${line}:${column}`);
    }
    function invalidIdentifier() {
      column -= 5;
      return syntaxError(`JSON5: invalid identifier character at ${line}:${column}`);
    }
    function separatorChar(c2) {
      console.warn(`JSON5: '${formatChar(c2)}' in strings is not valid ECMAScript; consider escaping`);
    }
    function formatChar(c2) {
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
      if (replacements[c2]) {
        return replacements[c2];
      }
      if (c2 < " ") {
        const hexString = c2.charCodeAt(0).toString(16);
        return "\\x" + ("00" + hexString).substring(hexString.length);
      }
      return c2;
    }
    function syntaxError(message) {
      const err = new SyntaxError(message);
      err.lineNumber = line;
      err.columnNumber = column;
      return err;
    }
  }
});
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
      function serializeProperty(key3, holder) {
        let value2 = holder[key3];
        if (value2 != null) {
          if (typeof value2.toJSON5 === "function") {
            value2 = value2.toJSON5(key3);
          } else if (typeof value2.toJSON === "function") {
            value2 = value2.toJSON(key3);
          }
        }
        if (replacerFunc) {
          value2 = replacerFunc.call(holder, key3, value2);
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
        for (const key3 of keys) {
          const propertyString = serializeProperty(key3, value2);
          if (propertyString !== void 0) {
            let member3 = serializeKey(key3) + ":";
            if (gap !== "") {
              member3 += " ";
            }
            member3 += propertyString;
            partial.push(member3);
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
      function serializeKey(key3) {
        if (key3.length === 0) {
          return quoteString(key3);
        }
        const firstChar = String.fromCodePoint(key3.codePointAt(0));
        if (!util.isIdStartChar(firstChar)) {
          return quoteString(key3);
        }
        for (let i = firstChar.length; i < key3.length; i++) {
          if (!util.isIdContinueChar(String.fromCodePoint(key3.codePointAt(i)))) {
            return quoteString(key3);
          }
        }
        return key3;
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
var Unsupported = class extends Error {
};
var MAX_EXPRESSION_CHARS = 600;
var currentParameters;
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
function interpret(node2) {
  switch (node2?.type) {
    case "StringLiteral":
    case "NumericLiteral":
    case "BooleanLiteral":
      return node2.value;
    case "NullLiteral":
      return null;
    case "Identifier":
      if (node2.name === "undefined")
        return void 0;
      if (node2.name === "NaN")
        return NaN;
      if (node2.name === "Infinity")
        return Infinity;
      return unsupported();
    case "TemplateLiteral": {
      let out = "";
      node2.quasis.forEach((q, i) => {
        out += q.value.cooked ?? "";
        if (i < node2.expressions.length)
          out += String(primitive(interpret(node2.expressions[i])));
      });
      return out;
    }
    case "UnaryExpression": {
      const v = primitive(interpret(node2.argument));
      if (node2.operator === "!")
        return !v;
      if (node2.operator === "-")
        return -num(v);
      if (node2.operator === "+")
        return typeof v === "string" ? Number(v) : num(v);
      if (node2.operator === "typeof")
        return typeof v;
      return unsupported();
    }
    case "BinaryExpression": {
      const a = primitive(interpret(node2.left));
      const b = primitive(interpret(node2.right));
      switch (node2.operator) {
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
      const l = interpret(node2.left);
      if (node2.operator === "&&")
        return l ? interpret(node2.right) : l;
      if (node2.operator === "||")
        return l ? l : interpret(node2.right);
      if (node2.operator === "??")
        return l ?? interpret(node2.right);
      return unsupported();
    }
    case "ConditionalExpression":
      return interpret(node2.test) ? interpret(node2.consequent) : interpret(node2.alternate);
    case "MemberExpression": {
      if (node2.computed)
        return unsupported();
      const name2 = node2.property?.name;
      if (node2.object?.type === "Identifier" && node2.object.name === "Math") {
        const constant = own(MATH_CONSTANTS, name2);
        return constant ?? unsupported();
      }
      if (node2.object?.type === "Identifier" && node2.object.name === "parameters") {
        if (!currentParameters || typeof name2 !== "string" || !Object.prototype.hasOwnProperty.call(currentParameters, name2)) {
          return unsupported();
        }
        return currentParameters[name2];
      }
      const target = interpret(node2.object);
      if (typeof target === "string" && name2 === "length")
        return target.length;
      return unsupported();
    }
    case "CallExpression": {
      const args = node2.arguments.map((a) => a.type === "SpreadElement" ? unsupported() : interpret(a));
      const callee = node2.callee;
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
function declaredParameterDefaults(options) {
  const declared = options && typeof options === "object" ? options.parameters : void 0;
  const values = /* @__PURE__ */ Object.create(null);
  if (!Array.isArray(declared))
    return values;
  for (const parameter of declared) {
    if (!parameter || typeof parameter !== "object")
      continue;
    const { name: name2, defaultValue } = parameter;
    if (typeof name2 !== "string" || !name2 || defaultValue === void 0 || defaultValue === null)
      continue;
    if (typeof defaultValue === "number" || typeof defaultValue === "boolean") {
      values[name2] = defaultValue;
    } else if (typeof defaultValue === "string") {
      if (!defaultValue.includes("{{")) {
        values[name2] = defaultValue;
        continue;
      }
      const outcome = resolveString(defaultValue);
      const value = outcome.ok ? outcome.value : void 0;
      if (outcome.ok && (value === null || ["string", "number", "boolean"].includes(typeof value)))
        values[name2] = value;
    }
  }
  return values;
}
function resolveStaticBindings(options) {
  const previous = currentParameters;
  currentParameters = declaredParameterDefaults(options);
  try {
    return resolveWithParameters(options);
  } finally {
    currentParameters = previous;
  }
}
function resolveWithParameters(options) {
  const resolved = {};
  const unresolved = [];
  const visit = (value) => {
    if (typeof value === "string") {
      if (!value.includes("{{") || !value.includes("}}"))
        return;
      const key3 = value.replace(/\n/g, " ");
      if (key3 in resolved || unresolved.includes(key3))
        return;
      const outcome = resolveString(value);
      if (!outcome.ok) {
        unresolved.push(key3);
        return;
      }
      resolved[key3] = outcome.value;
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
function resolveString(text2) {
  const matches = [...text2.matchAll(SERVER_BINDING)];
  if (!matches.length)
    return { ok: false };
  const parts = [];
  for (const m of matches) {
    const result = evaluate(m[1]);
    if (!result.ok)
      return { ok: false };
    parts.push([m[0], result.value]);
  }
  if (matches.length === 1 && matches[0][0] === text2.trim())
    return { ok: true, value: parts[0][1], parts: [] };
  let i = 0;
  return { ok: true, value: text2.replace(SERVER_BINDING, () => String(parts[i++][1])), parts };
}
function evaluate(expression2) {
  if (expression2.length > MAX_EXPRESSION_CHARS)
    return { ok: false };
  try {
    const value = interpret(parseExpression(expression2));
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
    const key3 = options.replace(/\n/g, " ");
    return Object.prototype.hasOwnProperty.call(resolved, key3) ? resolved[key3] : options;
  }
  if (Array.isArray(options))
    return options.map((value) => applyResolvedBindings(value, resolved));
  if (options && typeof options === "object") {
    return Object.fromEntries(Object.entries(options).map(([k, v]) => [k, applyResolvedBindings(v, resolved)]));
  }
  return options;
}
function resolvedBindingValues(resolved) {
  return Object.entries(resolved).filter(([key3]) => /^\{\{(?:(?!\}\})[\s\S])*\}\}$/.test(key3)).map(([, value]) => value);
}
function emptyViewerOnlyParams(options, resolution) {
  const params = options && typeof options === "object" ? options.query_params : void 0;
  if (!Array.isArray(params))
    return [];
  const filled = [];
  for (const pair of params) {
    if (!Array.isArray(pair) || typeof pair[1] !== "string")
      continue;
    const key3 = pair[1].replace(/\n/g, " ");
    if (!resolution.unresolved.includes(key3))
      continue;
    resolution.resolved[key3] = null;
    resolution.unresolved = resolution.unresolved.filter((b) => b !== key3);
    filled.push(String(pair[0]));
  }
  return filled;
}
function emptyParamsNote(names) {
  return `Ran with ${names.map((n) => `:${n}`).join(", ")} = null: ${names.length > 1 ? "they come" : "it comes"} from the app (a component or a picked row), which is empty outside the viewer. The query works for the empty case; check a value in the viewer.`;
}
var LABELS = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  mssql: "SQL Server",
  mariadb: "MariaDB",
  oracledb: "Oracle",
  snowflake: "Snowflake",
  databricks: "Databricks",
  bigquery: "BigQuery",
  clickhouse: "ClickHouse",
  cosmosdb: "Cosmos DB",
  couchbase: "Couchbase",
  salesforce: "Salesforce",
  harperdb: "HarperDB"
};
var MODE_SWITCH = /* @__PURE__ */ new Set(["postgresql", "mysql", "mssql"]);
var GUI_ELSE_SQL = /* @__PURE__ */ new Set(["mariadb", "oracledb", "snowflake", "databricks"]);
var GUI_SQL_KINDS = /* @__PURE__ */ new Set([...MODE_SWITCH, ...GUI_ELSE_SQL]);
var SQL_DIALECT = {
  postgresql: "postgresql",
  tooljetdb: "postgresql",
  mysql: "mysql",
  mariadb: "mysql",
  mssql: "mssql",
  oracledb: "oracle"
};
var SQL_OPERATION = {
  clickhouse: { operation: "sql", field: "query" },
  cosmosdb: { operation: "query_database", field: "query" },
  couchbase: { operation: "query", field: "query" },
  salesforce: { operation: "soql", field: "soql_query" }
};
var GUI_LIST_ROWS_KEYS = /* @__PURE__ */ new Set(["where_filters", "order_filters", "aggregates", "group_by"]);
var text = (options, field) => {
  const value = options[field];
  return typeof value === "string" && value.trim() ? value : void 0;
};
var connectorLabel = (kind) => LABELS[kind] ?? kind;
function sqlConnectorPath(kind, options) {
  const label = connectorLabel(kind);
  const mode = options.mode;
  const operation = options.operation;
  if (GUI_SQL_KINDS.has(kind)) {
    if (mode === "gui") {
      if (operation === "list_rows")
        return { path: "gui_list_rows" };
      return {
        path: "not_read",
        reason: typeof operation === "string" && operation ? `${label} GUI operation "${operation}" is not a read (only list_rows reads).` : `${label} GUI query names no operation; only list_rows reads.`
      };
    }
    const field = kind === "databricks" && !text(options, "query") ? "sql_query" : "query";
    return { path: "sql", field, sql: text(options, field) };
  }
  if (kind === "bigquery") {
    if (mode === "sql" || operation === "query")
      return { path: "sql", field: "query", sql: text(options, "query") };
    return {
      path: "not_read",
      reason: `BigQuery runs SQL text only in mode "sql" or operation "query"; this query runs operation "${String(operation ?? "<missing>")}".`
    };
  }
  if (kind === "harperdb") {
    if (mode !== void 0 && mode !== "sql") {
      return { path: "not_read", reason: `HarperDB runs SQL text only in mode "sql"; this query is in mode "${String(mode)}".` };
    }
    return { path: "sql", field: "sql_query", sql: text(options, "sql_query") };
  }
  const sqlOperation = SQL_OPERATION[kind];
  if (sqlOperation) {
    if (typeof operation === "string" && operation && operation !== sqlOperation.operation) {
      return {
        path: "not_read",
        reason: `${label} runs SQL text only for operation "${sqlOperation.operation}"; this query runs operation "${operation}".`
      };
    }
    return { path: "sql", field: sqlOperation.field, sql: text(options, sqlOperation.field) };
  }
  return void 0;
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
  const requestFields = ["url_params", "headers", "cookies"].map((key3) => options[key3]);
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
  return !!obj && Object.entries(obj).some(([key3, value]) => MONGO_WRITE_STAGES.includes(key3) || mongoPipelineWrites(value));
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
  let text2 = "";
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'" || char === '"' || char === "`") {
      const quote = char;
      text2 += quote + quote;
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
      text2 += " ";
    } else if (char === "/" && sql[i + 1] === "*") {
      if (sql[i + 2] === "!")
        return void 0;
      const end = sql.indexOf("*/", i + 2);
      if (end < 0)
        return void 0;
      i = end + 1;
      text2 += " ";
    } else
      text2 += char;
  }
  return text2.trim().replace(/;\s*$/, "").trim();
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
  return Object.entries(listRows).every(([key3, value]) => {
    if (ignoredForScope.has(key3))
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
  const maxRows = staticPositiveInteger(kind === "tooljetdb" ? listRows?.limit : options.limit);
  const misplaced = kind === "tooljetdb" ? options.limit !== void 0 && listRows?.limit === void 0 : listRows?.limit !== void 0 && options.limit === void 0;
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
    reason: maxRows === void 0 ? misplaced ? kind === "tooljetdb" ? "list_rows has no statically provable row limit: ToolJet Database reads it from list_rows.limit and ignores a top-level limit." : `list_rows has no statically provable row limit: ${connectorLabel(kind)} reads it from the top-level limit and ignores list_rows.limit.` : "list_rows has no statically provable row limit." : `list_rows can return up to ${maxRows} rows, above the ${LARGE_READ_ROW_THRESHOLD}-row safety threshold.`
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
    const path = sqlConnectorPath(kind, options);
    if (path?.path === "not_read") {
      return {
        provenRead: false,
        directSafe: false,
        countOnly: false,
        selectStar: false,
        requiresCountPreflight: false,
        reason: path.reason,
        datasourceKind: kind,
        ...datasourceId ? { datasourceId } : {}
      };
    }
    if (path?.path === "gui_list_rows")
      return assessListRows(kind, options, datasourceId);
    if (!path && operation === "list_rows") {
      return {
        provenRead: false,
        directSafe: false,
        countOnly: false,
        selectStar: false,
        requiresCountPreflight: false,
        reason: `Datasource kind ${kind} has no GUI list_rows; its operation and options do not name a proven read.`,
        datasourceKind: kind,
        ...datasourceId ? { datasourceId } : {}
      };
    }
    const sql = path ? path.sql : ["query", "sql_query", "sql", "presto_sql_query", "soql_query"].map((field) => options[field]).find((value) => typeof value === "string" && !!value.trim());
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
  for (const key3 of QUERY_TOGGLES) {
    const value = staticToggle(options[key3]);
    if (value === void 0)
      continue;
    if (out === options)
      out = { ...options };
    out[key3] = value;
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
  for (const key3 of QUERY_TOGGLES) {
    if (!(key3 in options))
      continue;
    const value = options[key3];
    if (value === void 0 || typeof value === "boolean" || staticToggle(value) !== void 0)
      continue;
    const dynamic = typeof value === "string" ? " ToolJet does not evaluate it and treats any text as on. Run the query from an event instead when it depends on state." : "";
    issues.push({
      code: "query_toggle_not_boolean",
      path: key3,
      message: `${key3} must be true or false (or left out), not ${describe(value)}.${dynamic}`
    });
  }
  return issues;
}
function toggleRewriteWarning(before, after) {
  const changed = QUERY_TOGGLES.filter((key3) => before?.[key3] !== after?.[key3]);
  if (!changed.length)
    return void 0;
  return `${changed.map((key3) => `${key3} ${JSON.stringify(before[key3])} saved as ${String(after[key3])}`).join(", ")}; ToolJet reads these as true/false and runs any text on load.`;
}
function assertPersistableQueryToggles(options, subject) {
  const issues = queryToggleIssues(options);
  const strings = isPlainObject(options) ? QUERY_TOGGLES.filter((key3) => typeof options[key3] === "string") : [];
  const messages = [
    ...issues.map((issue2) => issue2.message),
    ...strings.filter((key3) => !issues.some((issue2) => issue2.path === key3)).map((key3) => `${key3} must be sent as a boolean, not ${JSON.stringify(options[key3])}.`)
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
    const node2 = parseExpression(spans[0].body);
    if (node2.type !== "ObjectExpression")
      return [];
    return node2.properties.flatMap((p) => {
      if (p.type !== "ObjectProperty" || p.computed)
        return [];
      const key3 = p.key.type === "Identifier" ? p.key.name : p.key.type === "StringLiteral" || p.key.type === "NumericLiteral" ? String(p.key.value) : void 0;
      if (!key3)
        return [];
      return ["StringLiteral", "NumericLiteral", "BooleanLiteral", "NullLiteral", "TemplateLiteral", "UnaryExpression"].includes(p.value.type) ? [key3] : [];
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
function walk$1(v, visit) {
  if (Array.isArray(v)) {
    for (const x of v)
      walk$1(x, visit);
    return;
  }
  const n = object(v);
  if (!n)
    return;
  visit(n);
  for (const [key3, child] of Object.entries(n))
    if (!["loc", "extra", "comments"].includes(key3))
      walk$1(child, visit);
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
    walk$1(ast, (n) => {
      if (Array.isArray(n.params) && /"components"/.test(JSON.stringify(n.params)))
        shadowed = true;
      if (n.type === "VariableDeclarator" && /"components"/.test(JSON.stringify(n.id)))
        shadowed = true;
    });
    if (shadowed)
      continue;
    walk$1(ast, (n) => {
      if (n.type !== "BinaryExpression" || !["+", "-"].includes(String(n.operator)))
        return;
      walk$1(n, (member3) => {
        if (!["MemberExpression", "OptionalMemberExpression"].includes(String(member3.type)))
          return;
        const selected = object(member3.object), table = object(selected?.object), namespace = object(table?.object);
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
var property2 = (n, key3) => n?.type === "ObjectExpression" ? n.properties.find((p) => p.type === "ObjectProperty" && keyName(p) === key3)?.value : void 0;
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
  const node2 = n;
  if (isMember(node2) && node2.object?.type === "Identifier" && node2.object.name === "components")
    return true;
  return Object.entries(node2).some(([key3, child]) => !["loc", "extra", "comments"].includes(key3) && referencesComponents(child));
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
    const key3 = keyName(p);
    if (!key3)
      return [];
    const path = prefix ? `${prefix}.${key3}` : key3;
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
function suffixSuggestion(key3, fields) {
  const matches = Object.keys(fields).filter((path) => path.endsWith(`.${key3}`));
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
  return Object.entries(value).flatMap(([key3, item]) => bindingStrings(item, path ? `${path}.${key3}` : key3));
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
function patternNames(node2, out) {
  if (!isNode(node2))
    return;
  if (node2.type === "Identifier")
    out.add(String(node2.name));
  else if (node2.type === "ObjectPattern")
    for (const p of node2.properties)
      patternNames(p.type === "RestElement" ? p.argument : p.value, out);
  else if (node2.type === "ArrayPattern")
    for (const e of node2.elements)
      patternNames(e, out);
  else if (node2.type === "RestElement")
    patternNames(node2.argument, out);
  else if (node2.type === "AssignmentPattern")
    patternNames(node2.left, out);
}
function runjsUndeclaredNames(code) {
  return undeclaredNames(`async function __runjs__(){
${code}
}`, RUNJS_KNOWN_NAMES);
}
function bindingUndeclaredNames(expression2) {
  if (/\b(components|queries)\.[0-9a-f]{8}-[0-9a-f]{4}-/i.test(expression2))
    return [];
  return undeclaredNames(`(function __binding__(){ return (
${expression2}
); })`, BINDING_KNOWN_NAMES);
}
function lintBindingNames(value, label, path = "") {
  if (Array.isArray(value))
    return value.flatMap((child, i) => lintBindingNames(child, label, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key3, child]) => lintBindingNames(child, label, path ? `${path}.${key3}` : key3));
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
    const visit = (node2) => {
      if (Array.isArray(node2)) {
        node2.forEach(visit);
        return;
      }
      if (!isNode(node2))
        return;
      if (node2.type === "VariableDeclarator")
        patternNames(node2.id, into);
      if ((node2.type === "FunctionDeclaration" || node2.type === "ClassDeclaration") && isNode(node2.id))
        into.add(String(node2.id.name));
      if (node2.type === "CatchClause")
        patternNames(node2.param, into);
      if (FUNCTION_TYPES.has(node2.type))
        return;
      for (const [k, v] of Object.entries(node2))
        if (k !== "loc" && k !== "extra" && !k.endsWith("Comments"))
          visit(v);
    };
    visit(body);
  };
  const used = [];
  const scopes = [];
  const isDeclared = (name2) => scopes.some((scope) => scope.has(name2));
  const walk22 = (node2, parent, key3) => {
    if (Array.isArray(node2)) {
      for (const child of node2)
        walk22(child, parent, key3);
      return;
    }
    if (!isNode(node2))
      return;
    if (node2.type === "Identifier") {
      const p = parent?.type;
      const notARead = (p === "MemberExpression" || p === "OptionalMemberExpression") && key3 === "property" && !parent.computed || (p === "ObjectProperty" || p === "ObjectMethod" || p === "ClassMethod" || p === "ClassProperty" || p === "ClassPrivateProperty") && key3 === "key" && !parent.computed || (p === "LabeledStatement" || p === "BreakStatement" || p === "ContinueStatement") && key3 === "label" || p === "UnaryExpression" && parent.operator === "typeof" || p === "MetaProperty" || // a declaration's own name, a parameter or a pattern binding is not a read
      p === "VariableDeclarator" && key3 === "id" || p !== void 0 && FUNCTION_TYPES.has(p) && (key3 === "id" || key3 === "params") || (p === "ClassDeclaration" || p === "ClassExpression") && key3 === "id" || p === "CatchClause" && key3 === "param";
      const name2 = String(node2.name);
      if (!notARead && !isDeclared(name2))
        used.push(name2);
      return;
    }
    if (node2.type === "Program" || FUNCTION_TYPES.has(node2.type)) {
      const scope = /* @__PURE__ */ new Set();
      if (FUNCTION_TYPES.has(node2.type)) {
        if (node2.type === "FunctionExpression" && isNode(node2.id))
          scope.add(String(node2.id.name));
        for (const param of node2.params ?? [])
          patternNames(param, scope);
        declaredIn(node2.body, scope);
      } else {
        declaredIn(node2.body, scope);
      }
      scopes.push(scope);
      for (const [k, v] of Object.entries(node2)) {
        if (k === "loc" || k === "extra" || k.endsWith("Comments"))
          continue;
        if (k === "params") {
          for (const param of v)
            walkPatternDefaults(param);
          continue;
        }
        walk22(v, node2, k);
      }
      scopes.pop();
      return;
    }
    if (node2.type === "VariableDeclarator") {
      walkPatternDefaults(node2.id);
      walk22(node2.init, node2, "init");
      return;
    }
    if (node2.type === "CatchClause") {
      walk22(node2.body, node2, "body");
      return;
    }
    for (const [k, v] of Object.entries(node2)) {
      if (k === "loc" || k === "start" || k === "end" || k === "extra" || k.endsWith("Comments"))
        continue;
      walk22(v, node2, k);
    }
  };
  const walkPatternDefaults = (pattern) => {
    if (!isNode(pattern))
      return;
    if (pattern.type === "AssignmentPattern") {
      walkPatternDefaults(pattern.left);
      walk22(pattern.right, pattern, "right");
    } else if (pattern.type === "ObjectPattern")
      for (const p of pattern.properties) {
        if (p.type === "RestElement")
          walkPatternDefaults(p.argument);
        else {
          if (p.computed)
            walk22(p.key, p, "computedKey");
          walkPatternDefaults(p.value);
        }
      }
    else if (pattern.type === "ArrayPattern")
      for (const e of pattern.elements)
        walkPatternDefaults(e);
    else if (pattern.type === "RestElement")
      walkPatternDefaults(pattern.argument);
  };
  walk22(ast);
  return [...new Set(used.filter((name2) => !known.has(name2) && name2 !== "__runjs__" && name2 !== "__binding__"))];
}
function transformationWarnings(options) {
  const warnings = [];
  const bag = isObject(options.transformations) ? options.transformations : void 0;
  const languages = bag ? Object.keys(bag).filter((key3) => key3 === "javascript" || key3 === "python") : [];
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
    for (const key3 of ["operation", "path", "params", "selectedOperation"])
      allowedTopLevel.add(key3);
  const own2 = [...allowedTopLevel].filter((k) => !(k in COMMON_QUERY_OPTION_FIELDS));
  for (const key3 of Object.keys(options)) {
    if (allowedTopLevel.has(key3))
      continue;
    const exactReplacement = KNOWN_IGNORED_KEYS[key3];
    const nestedReplacement = suffixSuggestion(key3, fields);
    const replacement = exactReplacement ?? nestedReplacement;
    const meant = key3.length >= 4 ? own2.filter((f) => f !== key3 && options[f] === void 0 && (f.toLowerCase().includes(key3.toLowerCase()) || key3.toLowerCase().includes(f.toLowerCase()))) : [];
    if (!replacement && meant.length === 1) {
      errors.push({
        code: "unknown_option_key",
        path: key3,
        message: `Option key "${key3}" does not exist for ${kind}/${operation}; the field is "${meant[0]}". ToolJet drops "${key3}" and the query runs without it.`
      });
      continue;
    }
    warnings.push({
      code: replacement ? "ignored_or_misplaced_option_key" : "unknown_option_key",
      path: key3,
      message: replacement ? `Option key "${key3}" is not read at this location for ${kind}/${operation}; use "${replacement}".` : `Unknown option key "${key3}" for ${kind}/${operation}; ToolJet plugins may silently drop it.`
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
  if (kind === "tooljetdb" && operation === "delete_rows") {
    const deleteRows = valueAtPath(options, "delete_rows");
    const limit = isObject(deleteRows) ? deleteRows.limit : void 0;
    const ordered = isObject(deleteRows) && Boolean(deleteRows.order_column || deleteRows.order_column_id);
    if (limit !== "" && !ordered) {
      errors.push({
        code: "unordered_delete_limit",
        path: "delete_rows.limit",
        message: 'ToolJet DB delete_rows needs "limit": "" (delete every row the where_filters match, as the App Builder does) or a limit with "order_column" (for example "id"). Without either, ToolJet applies limit 1 with no order and the production database refuses the delete, so it fails every time in the released app.'
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
  entries.forEach(([key3, clause], index) => {
    if (isObject(clause) && typeof clause.column === "string" && clause.column !== "") {
      normalized[String(index)] = clause;
      return;
    }
    normalized[String(index)] = { column: key3, value: clause };
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
    authorable_node_types: nodeCatalog.nodes.map((node2) => node2.type),
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
  const adjacency = new Map(graph.nodes.map((node2) => [node2.id, []]));
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
  for (const start of graph.nodes.filter((node2) => node2.type === "input" && node2.data.nodeType === "start"))
    visit(start.id);
  const blockers = [];
  for (const agent of graph.nodes.filter((node2) => node2.type === "agent" && reachable.has(node2.id))) {
    const attachment = graph.edges.find((edge) => edge.target === agent.id && edge.targetHandle === "ai-model");
    const child = attachment && graph.nodes.find((node2) => node2.id === attachment.source);
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
  for (const [key3, plan] of plans)
    if (plan.expires <= Date.now())
      plans.delete(key3);
}
async function prepare(client, workflowId, versionId, spec, ids) {
  const snapshot = await client.get(workflowId, versionId);
  if (!snapshot.editable)
    throw new Error("Only editable draft workflow versions can be changed.");
  const [queries, datasources] = await Promise.all([client.getQueries(versionId), client.listDatasources(versionId)]);
  const compiled = compileGraph(snapshot.definition, spec, ids, new Map(datasources.map((datasource) => [datasource.id, datasource.kind])));
  const warnings = [];
  const writes = [];
  const finalDefinitionIds = new Set(compiled.graph.nodes.map((node2) => node2.data.idOnDefinition).filter((value) => typeof value === "string"));
  const removedDefinitionIds = new Set(snapshot.definition.nodes.map((node2) => node2.data.idOnDefinition).filter((value) => typeof value === "string" && !finalDefinitionIds.has(value)));
  const deletions = [];
  for (const mapping of snapshot.definition.queries) {
    if (!removedDefinitionIds.has(mapping.idOnDefinition))
      continue;
    if (compiled.graph.queries.some((retained) => retained.id === mapping.id))
      continue;
    if (deletions.some((deletion) => deletion.query_id === mapping.id))
      continue;
    const node2 = snapshot.definition.nodes.find((candidate) => candidate.data.idOnDefinition === mapping.idOnDefinition);
    if (!node2)
      continue;
    if (!queries.some((query) => query.id === mapping.id))
      throw new Error(`Query ${mapping.id} is missing from the target version.`);
    deletions.push({ node_id: node2.id, definition_id: mapping.idOnDefinition, query_id: mapping.id });
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
  if (!snapshot.definition.nodes.some((node2) => node2.id === nodeId))
    throw new Error(`Unknown workflow node: ${nodeId}`);
  const spec = specSchema.parse({ remove_node_ids: [nodeId], remove_edge_ids: snapshot.definition.edges.filter((edge) => edge.source === nodeId || edge.target === nodeId).map((edge) => edge.id) });
  const result = await lint(client, workflowId, versionId, spec, true);
  if (!("plan_token" in result))
    throw new Error(JSON.stringify({ errors: result.errors, blockers: result.blockers }));
  return apply(client, result.plan_token);
}
createRequire(import.meta.url);
var newPackSet = () => ({ schemas: null, definitions: {}, packs: null, derived: /* @__PURE__ */ new Map() });
var processSet = newPackSet();
var store = new AsyncLocalStorage();
var activePackSet = () => store.getStore() ?? processSet;
var inPackSet = (set, work) => store.run(set, work);
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
var PACK_TYPE = /^Lib_[a-z0-9]+_/;
function merged() {
  const set = activePackSet();
  if (!set.schemas)
    return load();
  let all = set.derived.get("catalog");
  if (!all) {
    const extra = set.schemas;
    all = Object.fromEntries(Object.entries(load()).filter(([key3]) => !PACK_TYPE.test(key3) || key3 in extra));
    Object.assign(all, extra);
    set.derived.set("catalog", all);
  }
  return all;
}
function allComponentSchemas() {
  return merged();
}
function registerComponentSchemas(extra) {
  const set = activePackSet();
  set.schemas = { ...extra };
  set.derived.clear();
}
function getCatalog() {
  const legacy = loadLegacyReplacements();
  return Object.values(merged()).filter((c) => !legacy[c.type]).map((c) => ({ type: c.type, description: c.description })).sort((a, b) => a.type.localeCompare(b.type));
}
function getComponentSchema(type) {
  return merged()[type] ?? null;
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
  for (const key3 of ["field", "component"]) {
    if (new Set(spec.fields.map((f) => f[key3])).size !== spec.fields.length)
      throw new Error(`Duplicate ${key3} in edit contract`);
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
  const text2 = quota ? JSON.stringify({ error: {
    code: quota.code,
    status: quota.status,
    retryable: quota.retryable,
    message: quota.message,
    details: message
  } }) : `Error: ${message}`;
  return { content: [{ type: "text", text: text2 }], isError: true };
}
createRequire(import.meta.url);
var member = (n) => n?.type === "MemberExpression" || n?.type === "OptionalMemberExpression";
var key = (n) => n.computed ? n.property?.type === "StringLiteral" ? n.property.value : void 0 : n.property?.name;
var rootRef = (n) => {
  if (!member(n) || !["components", "queries"].includes(n.object?.name) || n.object?.type !== "Identifier")
    return;
  const k = key(n);
  return k ? `${n.object.name}.${k}` : void 0;
};
function walk(n, visit) {
  if (!n || typeof n !== "object")
    return;
  if (Array.isArray(n)) {
    for (const child of n)
      walk(child, visit);
    return;
  }
  visit(n);
  for (const [key3, value] of Object.entries(n))
    if (!["loc", "extra", "comments"].includes(key3))
      walk(value, visit);
}
function lintUntrackedReactiveBindings(value, label) {
  if (Array.isArray(value))
    return value.flatMap((v) => lintUntrackedReactiveBindings(v, label));
  if (value && typeof value === "object")
    return Object.values(value).flatMap((v) => lintUntrackedReactiveBindings(v, label));
  if (typeof value !== "string")
    return [];
  const match = value.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!match)
    return [];
  let ast;
  try {
    ast = parseExpression(match[1]);
  } catch {
    return [];
  }
  const tracked = /* @__PURE__ */ new Set(), suspects = /* @__PURE__ */ new Set();
  let shadowed = false;
  walk(ast, (n) => {
    if (n.params && /"(?:components|queries)"/.test(JSON.stringify(n.params)) || n.type === "VariableDeclarator" && /"(?:components|queries)"/.test(JSON.stringify(n.id)))
      shadowed = true;
    if (!member(n))
      return;
    const direct = rootRef(n.object);
    if (direct && key(n))
      tracked.add(direct);
    if (n.object?.type === "LogicalExpression" && ["||", "??"].includes(n.object.operator)) {
      const wrapped = rootRef(n.object.left);
      if (wrapped && key(n))
        suspects.add(wrapped);
    }
  });
  if (shadowed)
    return [];
  return [...suspects].filter((ref) => !tracked.has(ref)).map((ref) => `${label}: a logical fallback wraps ${ref} before its exposed value is read. ToolJet cannot track this dependency, so filters/prefill may stay stale. Keep a complete optional chain, e.g. ${ref}?.value (use the actual exposed property). Valid JavaScript alone does not guarantee reactive updates. No expression was rewritten.`);
}
function lintQueryArrayMutations(value, label) {
  if (Array.isArray(value))
    return value.flatMap((v) => lintQueryArrayMutations(v, label));
  if (value && typeof value === "object")
    return Object.values(value).flatMap((v) => lintQueryArrayMutations(v, label));
  if (typeof value !== "string")
    return [];
  const match = value.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!match)
    return [];
  let ast;
  try {
    ast = parseExpression(match[1]);
  } catch {
    return [];
  }
  let shadowed = false;
  const mutations = /* @__PURE__ */ new Set();
  const queryData = (n) => {
    if (n?.type === "LogicalExpression" && ["||", "??"].includes(n.operator) && n.right?.type === "ArrayExpression" && n.right.elements.length === 0)
      return queryData(n.left);
    const ref = member(n) && key(n) === "data" ? rootRef(n.object) : void 0;
    return ref?.startsWith("queries.") ? ref : void 0;
  };
  walk(ast, (n) => {
    if (n.params && /"queries"/.test(JSON.stringify(n.params)) || n.type === "VariableDeclarator" && /"queries"/.test(JSON.stringify(n.id)))
      shadowed = true;
    if (!["CallExpression", "OptionalCallExpression"].includes(n.type) || !member(n.callee) || !["sort", "reverse"].includes(key(n.callee)))
      return;
    const ref = queryData(n.callee.object);
    if (ref)
      mutations.add(`${ref}.data.${key(n.callee)}`);
  });
  if (shadowed)
    return [];
  return [...mutations].map((ref) => `${label}: ${ref}() mutates the shared query array inside a display binding. ToolJet state can be frozen, so this may throw and render an empty table even when the query has rows. Copy first with slice() or a spread, then sort/reverse the copy; a prior map/filter already creates a new array. No expression was rewritten.`);
}
var node = (v) => v !== null && typeof v === "object" && !Array.isArray(v) ? v : void 0;
var member2 = (n) => n?.type === "MemberExpression" || n?.type === "OptionalMemberExpression";
function key2(n) {
  if (!n)
    return;
  const p = node(n.property ?? n.key);
  if (!n.computed && p?.type === "Identifier")
    return String(p.name);
  if (p?.type === "StringLiteral")
    return String(p.value);
}
function expression(value) {
  if (typeof value !== "string")
    return;
  const m = value.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!m)
    return;
  try {
    return parseExpression(m[1]);
  } catch {
    return;
  }
}
function walk2(value, visit) {
  if (Array.isArray(value)) {
    for (const child of value)
      walk2(child, visit);
    return;
  }
  const n = node(value);
  if (!n)
    return;
  visit(n);
  for (const [k, child] of Object.entries(n)) {
    if (k !== "loc" && k !== "extra" && k !== "comments")
      walk2(child, visit);
  }
}
function projectedFields(c) {
  if (c.type !== "Table")
    return;
  const raw = c.properties?.data;
  const root = expression(node(raw) && "value" in node(raw) ? node(raw).value : raw);
  if (root?.type !== "CallExpression")
    return;
  const callee = node(root.callee);
  if (!member2(callee) || key2(callee) !== "map")
    return;
  const args = root.arguments;
  if (!Array.isArray(args) || args.length !== 1)
    return;
  const callback = node(args[0]);
  if (callback?.type !== "ArrowFunctionExpression")
    return;
  const body = node(callback.body);
  if (body?.type !== "ObjectExpression" || !Array.isArray(body.properties))
    return;
  const keys = /* @__PURE__ */ new Map();
  for (const prop of body.properties) {
    const p = node(prop);
    if (p?.type !== "ObjectProperty" || p.computed)
      return;
    const name2 = key2(p);
    if (name2 === void 0 || name2 === "__proto__")
      return;
    keys.set(name2, node(p.value));
  }
  return keys;
}
function lintSelectedRowProjections(components, extraSources = []) {
  const tables = /* @__PURE__ */ new Map();
  for (const c of components) {
    if (!c.name)
      continue;
    tables.set(c.name, tables.has(c.name) ? void 0 : projectedFields(c));
  }
  const aliases = /* @__PURE__ */ new Map();
  const singleAlias = (alias) => {
    const names = aliases.get(alias);
    return names?.size === 1 ? [...names][0] : void 0;
  };
  for (const source of extraSources) {
    const action = node(source.value);
    if (action?.actionId !== "set-custom-variable" || typeof action.key !== "string")
      continue;
    const selected = expression(action.value);
    if (action.value === null || selected?.type === "NullLiteral")
      continue;
    const table = node(selected?.object), namespace = node(table?.object);
    const name2 = member2(selected) && key2(selected) === "selectedRow" && member2(table) && namespace?.type === "Identifier" && namespace.name === "components" ? key2(table) : void 0;
    if (!name2)
      aliases.set(action.key, void 0);
    else if (!aliases.has(action.key))
      aliases.set(action.key, /* @__PURE__ */ new Set([name2]));
    else
      aliases.get(action.key)?.add(name2);
  }
  if (extraSources.some((s) => /actions\s*(?:\.\s*(?:setVariable|unsetVariable)|\[\s*["'](?:setVariable|unsetVariable)["']\s*\])/.test(JSON.stringify(s.value))))
    aliases.clear();
  const warnings = /* @__PURE__ */ new Set();
  const aliasOmissions = /* @__PURE__ */ new Map();
  function inspect(value, label) {
    if (Array.isArray(value)) {
      for (const v of value)
        inspect(v, label);
      return;
    }
    if (node(value)) {
      for (const v of Object.values(node(value)))
        inspect(v, label);
      return;
    }
    const root = expression(value);
    if (!root)
      return;
    let shadowed = false;
    walk2(root, (n) => {
      if (Array.isArray(n.params) && /"(?:components|variables)"/.test(JSON.stringify(n.params)))
        shadowed = true;
      if (n.type === "VariableDeclarator" && /"(?:components|variables)"/.test(JSON.stringify(n.id)))
        shadowed = true;
    });
    if (shadowed)
      return;
    walk2(root, (n) => {
      if (!member2(n))
        return;
      const field = key2(n), selection = node(n.object), table = node(selection?.object), namespace = node(table?.object);
      if (field && member2(selection) && table?.type === "Identifier" && table.name === "variables") {
        const alias = key2(selection), names = alias ? aliases.get(alias) : void 0;
        for (const name22 of names ?? []) {
          const fields = tables.get(name22);
          if (fields && !fields.has(field) && !["toString", "valueOf", "constructor", "hasOwnProperty", "__proto__", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString"].includes(field)) {
            const id = JSON.stringify([alias, name22]);
            if (!aliasOmissions.has(id))
              aliasOmissions.set(id, { alias, table: name22, fields: /* @__PURE__ */ new Set() });
            aliasOmissions.get(id).fields.add(field);
          }
        }
      }
      if (!field || !member2(selection) || key2(selection) !== "selectedRow" || !member2(table) || namespace?.type !== "Identifier" || namespace.name !== "components")
        return;
      const name2 = key2(table), keys = name2 ? tables.get(name2) : void 0;
      if (!name2 || !keys || keys.has(field) || ["toString", "valueOf", "constructor", "hasOwnProperty", "__proto__", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString"].includes(field))
        return;
      warnings.add(`${label}: reads components.${name2}.selectedRow.${field}, but Table "${name2}" has a closed map projection that omits "${field}". Preserve the raw field in the row (hide its column if needed), or look up the source record by its stable id. Check edit/review prefill and avoid overwriting omitted values with blanks. If the missing-field fallback is intentional, no change is required.`);
    });
  }
  for (const c of components) {
    const value = { p: c.properties, s: c.styles }, label = `Component "${c.name ?? c.id ?? "?"}"`;
    inspect(value, label);
    for (const warning of lintUntrackedReactiveBindings(value, label))
      warnings.add(warning);
    for (const warning of lintQueryArrayMutations(value, label))
      warnings.add(warning);
  }
  for (const source of extraSources)
    inspect(source.value, source.label);
  for (const { alias, table, fields } of aliasOmissions.values()) {
    warnings.add(`Bindings read ${[...fields].map((field) => `variables.${alias}.${field}`).join(", ")}; an event assigns that variable from Table "${table}" selectedRow, whose closed map projection omits ${[...fields].map((field) => `"${field}"`).join(", ")}. This edit can overwrite missing values with a blank/false default. Preserve raw fields or resolve the raw record by stable id before opening the editor; generate_edit_contract can provide that snapshot. Unknown runtime writes are not certified by this advisory.`);
  }
  const unwrap2 = (value) => node(value) && "value" in node(value) ? node(value).value : value;
  for (const c of components) {
    if (!["TextInput", "TextArea", "EmailInput", "PhoneInput"].includes(c.type ?? ""))
      continue;
    let selected = expression(unwrap2(c.properties?.value));
    if (selected?.type === "LogicalExpression" && ["||", "??"].includes(String(selected.operator)))
      selected = node(selected.left);
    if (!member2(selected))
      continue;
    const field = key2(selected), selection = node(selected?.object), owner = node(selection?.object), namespace = node(owner?.object);
    if (!field || !member2(selection))
      continue;
    const tableName = owner?.type === "Identifier" && owner.name === "variables" ? singleAlias(key2(selection) ?? "") : key2(selection) === "selectedRow" && member2(owner) && namespace?.type === "Identifier" && namespace.name === "components" ? key2(owner) : void 0;
    const projected = tableName ? tables.get(tableName)?.get(field) : void 0;
    if (projected?.type !== "LogicalExpression" || !["||", "??"].includes(String(projected.operator)))
      continue;
    const fallback = node(projected.right);
    if (fallback?.type !== "StringLiteral" || !String(fallback.value).trim())
      continue;
    warnings.add(`Component "${c.name ?? c.id ?? "?"}": editable value reads "${field}" from Table "${tableName}", whose projection replaces missing raw text with a non-empty display fallback. Saving another field can persist that label as real data. Keep raw text separate from display labels, or resolve the raw record by stable id; preserve untouched null/empty values. This is advisory, not a claim that every fallback is unintended.`);
  }
  for (const c of components) {
    const property3 = c.type === "DatePickerV2" ? "defaultValue" : ["NumberInput", "CurrencyInput"].includes(c.type ?? "") ? "value" : void 0;
    if (!property3)
      continue;
    let selected = expression(unwrap2(c.properties?.[property3]));
    if (selected?.type === "LogicalExpression" && ["||", "??"].includes(String(selected.operator)))
      selected = node(selected.left);
    if (!member2(selected))
      continue;
    const field = key2(selected), selection = node(selected?.object), table = node(selection?.object), namespace = node(table?.object);
    if (!field || !member2(selection))
      continue;
    const tableName = table?.type === "Identifier" && table.name === "variables" ? singleAlias(key2(selection) ?? "") : key2(selection) === "selectedRow" && member2(table) && namespace?.type === "Identifier" && namespace.name === "components" ? key2(table) : void 0;
    const value = tableName ? tables.get(tableName)?.get(field) : void 0;
    if (!value)
      continue;
    const formats = [];
    let localizedNumber = false;
    walk2(value, (n) => {
      if (n.type !== "CallExpression")
        return;
      const callee = node(n.callee);
      if (!member2(callee))
        return;
      if (key2(callee) === "toLocaleString" || key2(callee) === "toFixed")
        localizedNumber = true;
      const args = n.arguments;
      if (key2(callee) === "format" && Array.isArray(args) && node(args[0])?.type === "StringLiteral")
        formats.push(String(node(args[0]).value));
    });
    const expected = unwrap2(c.properties?.dateFormat) ?? "DD/MM/YYYY";
    if (c.type === "DatePickerV2" && member2(value) && typeof expected === "string" && !expected.includes("{{")) {
      const source = components.find((t) => t.type === "Table" && t.name === tableName);
      const columns = unwrap2(source?.properties?.columns);
      const matches = Array.isArray(columns) ? columns.filter((col) => {
        const entry = node(col);
        return entry?.key === field && entry.columnType === "datepicker";
      }) : [];
      const parseFormat = matches.length === 1 ? node(matches[0])?.parseDateFormat : void 0;
      const yearLast = /^(?:D{1,2}[^A-Za-z]+M{1,4}|M{1,4}[^A-Za-z]+D{1,2})[^A-Za-z]+Y{2,4}$/.test(expected);
      if (typeof parseFormat === "string" && parseFormat.startsWith("YYYY-MM-DD") && !parseFormat.includes("{{") && yearLast) {
        warnings.add(`Component "${c.name ?? c.id ?? "?"}": defaultValue reads raw ${tableName}.selectedRow.${field}; that Table column declares parseDateFormat "${parseFormat}", but the DatePickerV2 parses its default with dateFormat "${expected}". A name-only edit can silently change the date. Match the editor's input format or explicitly format the raw default before opening it; table display formatting does not convert selectedRow. Advisory only: verify the actual source value before changing it.`);
      }
    }
    if (c.type === "DatePickerV2" && formats.some((f) => typeof expected === "string" && !expected.includes("{{") && f !== expected) || c.type !== "DatePickerV2" && localizedNumber) {
      warnings.add(`Component "${c.name ?? c.id ?? "?"}": ${property3} reads display-formatted ${tableName}.selectedRow.${field} into a typed ${c.type} editor${c.type === "DatePickerV2" ? ` (dateFormat ${String(expected)})` : ""}. Look up the raw record by stable id, or explicitly convert to the editor's input format. Preserve untouched fields on save; generate_edit_contract can provide raw-record defaults and changed-field-only payloads.`);
    }
  }
  return [...warnings];
}
export {
  applyResolvedBindings as A,
  connectorLabel as B,
  sameReadSource as C,
  extractRowCount as D,
  emptyViewerOnlyParams as E,
  emptyParamsNote as F,
  GUI_LIST_ROWS_KEYS as G,
  unresolvedNote as H,
  declaredParameterDefaults as I,
  inPackSet as J,
  registerComponentSchemas as K,
  LARGE_READ_ROW_THRESHOLD as L,
  newPackSet as M,
  capabilityRequestSchema as N,
  getWorkflowCapabilities as O,
  lint as P,
  apply as Q,
  deleteNode as R,
  SQL_DIALECT as S,
  TableQuotaError as T,
  editContractSchema as U,
  generateEditContract as V,
  allComponentSchemas as W,
  activePackSet as a,
  getCatalog as b,
  getLegacyComponentReplacement as c,
  lintBindingNames as d,
  bindingSpans as e,
  assertPersistableQueryToggles as f,
  getComponentSchema as g,
  assertWorkflowQueryOptions as h,
  fail as i,
  normalizeQueryToggles as j,
  toggleRewriteWarning as k,
  lintSelectedRowProjections as l,
  issueMessages as m,
  normalizeWorkflowQueryOptions as n,
  ok as o,
  normalizeQueryOptions as p,
  queryToggleIssues as q,
  require_lib as r,
  arithmeticWriteWarning as s,
  tableQuotaError as t,
  assessQueryRead as u,
  validateQueryOptions as v,
  workflowMappingMatches as w,
  resolvedReadRefusal as x,
  resolveStaticBindings as y,
  sqlConnectorPath as z
};
