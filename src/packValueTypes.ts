/* What a pack component does with a boolean or number property's value, mirroring ToolJet's conversion
   (frontend/src/AppBuilder/Widgets/LibraryComponent/packPropertyTypes.ts): 'true'/'false' and numbers become a boolean,
   numeric text a number; anything else becomes the type's empty value (false, or no number), with only a debugger
   note. A value the pack cannot use is refused before it is written, as a wrong enum value is. */

// ToolJet's numeric text: "64", "-1.5", "1e3", "12%" (commas removed first: "1,200").
const NUMERIC = /^[-+]?\d*\.?\d+(e[-+]?\d+)?%?$/i;

// Properties a pack deliberately takes as another type too (packPropertyTypes.ts ACCEPTS), of those declared boolean or
// number: a Slider's value is a number, or [start, end] for a range.
const ALSO_ARRAY = new Set(['shadcn.Slider.defaultValue', 'shadcn.Slider.value', 'antd.Slider.value', 'mui.Slider.value']);

const usableBoolean = (value: unknown): boolean =>
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && ['true', 'false'].includes(value.trim().toLowerCase()));

const usableNumber = (value: unknown): boolean =>
  (typeof value === 'number' && Number.isFinite(value)) ||
  // Empty text is an unset number (a default the pack does not set), as the pack reads it.
  (typeof value === 'string' && (value.trim() === '' || NUMERIC.test(value.trim().replace(/,/g, ''))));

/** Why a pack boolean or number property cannot take this literal value, or null when the pack can use it. */
export function packValueTypeError(type: string | undefined, key: string, valueType: string | undefined, value: unknown): string | null {
  const pack = /^Lib_([a-z0-9]+)_(.+)$/.exec(type ?? '');
  if (!pack || (valueType !== 'boolean' && valueType !== 'number')) return null;
  if (Array.isArray(value) && ALSO_ARRAY.has(`${pack[1]}.${pack[2]}.${key}`)) return null;
  if (valueType === 'boolean' ? usableBoolean(value) : usableNumber(value)) return null;
  return valueType === 'boolean'
    ? `"${key}" takes a boolean, and ${JSON.stringify(value)} is not one, so the component reads it as false. Use true, false or a {{binding}}.`
    : `"${key}" takes a number, and ${JSON.stringify(value)} is not one, so the component draws it as unset. Use a number or a {{binding}}.`;
}
