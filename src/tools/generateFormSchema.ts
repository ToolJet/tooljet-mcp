import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { generateFormSchema } from '../formSchema.js';
import { ok, fail, type ToolDef } from './types.js';

export function generateFormSchemaTool(client: ToolJetClient): ToolDef {
  return {
    name: 'generate_form_schema',
    description:
      'Generate a ready-to-place ToolJet Form property block from an existing ToolJet DB table, with ordered includes, field_overrides, field metadata, and recommended Form/modal heights. Boolean-string defaults are normalized, empty dates stay blank, long-text/email fields get safer inferred types, and unsafe Form filepicker overrides are rejected.',
    inputSchema: {
      table_name: z.string(),
      mode: z.enum(['create', 'edit']).default('create'),
      title: z.string().optional(),
      submit_label: z.string().optional(),
      include: z.array(z.string()).optional(),
      exclude: z.array(z.string()).optional(),
      initial_values_binding: z.string().optional(),
      field_overrides: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    },
    async handler(args: {
      table_name: string;
      mode?: 'create' | 'edit';
      title?: string;
      submit_label?: string;
      include?: string[];
      exclude?: string[];
      initial_values_binding?: string;
      field_overrides?: Record<string, Record<string, unknown>>;
    }) {
      try {
        const columns = await client.getTableSchema(args.table_name);
        return ok(
          generateFormSchema(columns, {
            tableName: args.table_name,
            mode: args.mode ?? 'create',
            title: args.title,
            submitLabel: args.submit_label,
            include: args.include,
            exclude: args.exclude,
            initialValuesBinding: args.initial_values_binding,
            fieldOverrides: args.field_overrides,
          })
        );
      } catch (err) {
        return fail(err);
      }
    },
  };
}
