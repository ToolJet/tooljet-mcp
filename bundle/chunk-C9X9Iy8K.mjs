import { createRequire } from "node:module";
import { p as parseExpression } from "./chunk-DdyAhmbE.mjs";
import { h as hubspotQueryIssues, s as singleSpecRef, a as apiEndpointQueryIssues } from "./chunk-vVHapysk.mjs";
import { r as require_moment } from "./chunk-CWdd2Ug0.mjs";
import { e8 as __toESM, e6 as __commonJS } from "./chunk-BPm0h8HP.mjs";
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
    var key;
    var root;
    module.exports = function parse(text2, reviver) {
      source = String(text2);
      parseState = "start";
      stack = [];
      pos = 0;
      line = 1;
      column = 0;
      token = void 0;
      key = void 0;
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
    function internalize(holder, name, reviver) {
      const value = holder[name];
      if (value != null && typeof value === "object") {
        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            const key2 = String(i);
            const replacement = internalize(value, key2, reviver);
            if (replacement === void 0) {
              delete value[key2];
            } else {
              Object.defineProperty(value, key2, {
                value: replacement,
                writable: true,
                enumerable: true,
                configurable: true
              });
            }
          }
        } else {
          for (const key2 in value) {
            const replacement = internalize(value, key2, reviver);
            if (replacement === void 0) {
              delete value[key2];
            } else {
              Object.defineProperty(value, key2, {
                value: replacement,
                writable: true,
                enumerable: true,
                configurable: true
              });
            }
          }
        }
      }
      return reviver.call(holder, name, value);
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
            key = token.value;
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
          Object.defineProperty(parent, key, {
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
    var parse = require_parse();
    var stringify = require_stringify();
    var JSON52 = {
      parse,
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
function own(table, name) {
  return typeof name === "string" && Object.prototype.hasOwnProperty.call(table, name) ? table[name] : void 0;
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
      const name = node.property?.name;
      if (node.object?.type === "Identifier" && node.object.name === "Math") {
        const constant = own(MATH_CONSTANTS, name);
        return constant ?? unsupported();
      }
      if (node.object?.type === "Identifier" && node.object.name === "parameters") {
        if (!currentParameters || typeof name !== "string" || !Object.prototype.hasOwnProperty.call(currentParameters, name)) {
          return unsupported();
        }
        return currentParameters[name];
      }
      const target = interpret(node.object);
      if (typeof target === "string" && name === "length")
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
      const name = callee.property?.name;
      const object = callee.object;
      if (object.type === "Identifier" && object.name === "moment") {
        if (name === "utc")
          return box(import_moment.default.utc(...momentArgs(args)));
        if (name === "unix" && args.length === 1)
          return box(import_moment.default.unix(num(args[0])));
        return unsupported();
      }
      if (object.type === "Identifier" && object.name === "Math") {
        const fn = own(MATH_FNS, name);
        return fn ? fn(...args.map((a) => num(a))) : unsupported();
      }
      if (object.type === "Identifier" && object.name === "Date" && name === "now" && args.length === 0)
        return Date.now();
      if (object.type === "Identifier" && object.name === "JSON" && name === "stringify" && args.length === 1) {
        return JSON.stringify(primitive(args[0]));
      }
      const target = interpret(object);
      if (isMoment(target)) {
        const check = own(MOMENT_METHODS, name);
        if (!check || !check(args))
          return unsupported();
        const unwrapped = args.map((a) => isMoment(a) ? a.m : a);
        const result = target.m[name](...unwrapped);
        if (import_moment.default.isMoment(result))
          return box(result);
        if (typeof result === "string" || typeof result === "number" || typeof result === "boolean")
          return result;
        return unsupported();
      }
      if (typeof target === "string") {
        const fn = own(STRING_METHODS, name);
        return fn ? fn(target, args) : unsupported();
      }
      if (typeof target === "number") {
        if (name === "toFixed" && args.length <= 1)
          return target.toFixed(args[0] === void 0 ? 0 : capped(args[0], 100));
        if (name === "toString" && args.length === 0)
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
    const { name, defaultValue } = parameter;
    if (typeof name !== "string" || !name || defaultValue === void 0 || defaultValue === null)
      continue;
    if (typeof defaultValue === "number" || typeof defaultValue === "boolean") {
      values[name] = defaultValue;
    } else if (typeof defaultValue === "string") {
      if (!defaultValue.includes("{{")) {
        values[name] = defaultValue;
        continue;
      }
      const outcome = resolveString(defaultValue);
      const value = outcome.ok ? outcome.value : void 0;
      if (outcome.ok && (value === null || ["string", "number", "boolean"].includes(typeof value)))
        values[name] = value;
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
var FLUX_EGRESS_IMPORT = new RegExp(String.raw`(^|\n)\s*import\s+(?:[A-Za-z_][A-Za-z0-9_]*\s+)?"(?:` + FLUX_EGRESS_PACKAGES.map((name) => name.replace(/\//g, String.raw`\/`)).join("|") + String.raw`)"`);
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
    const name = /^\s*[`"\[]?[A-Za-z_$][\w$]*[`"\]]?\s*(?:\([^()]*\)\s*)?as\s+(?:not\s+)?(?:materialized\s+)?\(/i.exec(blank.slice(i));
    if (!name)
      return void 0;
    i += name[0].length;
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
    const issue = hubspotQueryIssues(options)[0];
    const assessment = assessOpenapi({ ...options, host: "https://api.hubapi.com" }, datasourceId);
    return {
      ...assessment,
      datasourceKind: "hubspot",
      ...issue ? { provenRead: false, directSafe: false, requiresRemoteReadConfirmation: false, reason: issue.message } : { reason: assessment.reason?.replaceAll("OpenAPI", "HubSpot") }
    };
  }
  if (singleSpecRef(kind)) {
    const issue = apiEndpointQueryIssues(kind, options)[0];
    const assessment = assessOpenapi({ ...options, host: kind }, datasourceId);
    return {
      ...assessment,
      datasourceKind: kind,
      ...issue ? { provenRead: false, directSafe: false, requiresRemoteReadConfirmation: false, reason: issue.message } : { reason: assessment.reason?.replaceAll("OpenAPI", kind) }
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
export {
  GUI_LIST_ROWS_KEYS as G,
  LARGE_READ_ROW_THRESHOLD as L,
  SQL_DIALECT as S,
  assessQueryRead as a,
  resolvedReadRefusal as b,
  resolveStaticBindings as c,
  applyResolvedBindings as d,
  connectorLabel as e,
  sameReadSource as f,
  extractRowCount as g,
  emptyViewerOnlyParams as h,
  emptyParamsNote as i,
  declaredParameterDefaults as j,
  require_lib as r,
  sqlConnectorPath as s,
  unresolvedNote as u
};
