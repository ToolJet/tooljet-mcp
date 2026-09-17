import { z } from 'zod';
import { normalizeType, TOOLJET_DB_DATA_TYPES } from './tooljetClient.js';

// Keep all existing case-insensitive aliases; validation must not change storage precision.
export const dbColumnTypeSchema = z.string().describe(
  'ToolJet DB types: string, integer, bigint, serial, number (double precision), boolean, timestamp, jsonb. ' +
  'Existing aliases text/varchar/int/float/decimal/double/bool/datetime/date/json and canonical API type names are accepted. ' +
  'numeric is unsupported; number/decimal are floating-point, not exact decimal. For money consider integer minor units.'
).refine(value => TOOLJET_DB_DATA_TYPES.has(normalizeType(value)), {
  message: 'Unsupported ToolJet DB type. Use string, integer, bigint, serial, number (double precision), boolean, timestamp or jsonb. numeric is not supported; do not silently replace exact decimals with floating-point.',
});
