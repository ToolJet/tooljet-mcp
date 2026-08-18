import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { generateFormSchema } from '../formSchema.js';
import { ok, fail, type ToolDef } from './types.js';

export function generateFormSchemaTool(client: ToolJetClient): ToolDef {
  return {
    name: 'generate_form_schema',
    description:
      'Generate a ready-to-place ToolJet Form property block from an existing ToolJet DB table. This uses one schema-generated Form instead of many nested field components. Create mode omits generated serial columns; edit mode can prefill fields with initial_values_binding (a ToolJet expression without {{ }}) and locks primary keys. Review field_metadata for required/unique/foreign-key behavior before wiring the mutation.',
    inputSchema: {
      table_name: z.string(),
      mode: z.enum(['create', 'edit']).default('create'),
      title: z.string().optional(),
      submit_label: z.string().optional(),
      include: z.array(z.string()).optional(),
      exclude: z.array(z.string()).optional(),
      initial_values_binding: z.string().optional(),
    },
    async handler(args: {
      table_name: string;
      mode?: 'create' | 'edit';
      title?: string;
      submit_label?: string;
      include?: string[];
      exclude?: string[];
      initial_values_binding?: string;
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
          })
        );
      } catch (err) {
        return fail(err);
      }
    },
  };
}
