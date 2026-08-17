/**
 * Minimal component catalog for slice 1 — the component types the MCP can place and
 * their key properties. Surfaced to Codex via the `get_component_catalog` tool so it
 * knows the shape of what it can build without guessing. Slice 1 only needs Table + Text.
 */

export interface CatalogProperty {
  name: string;
  /** True if this property is meant to hold a ToolJet binding expression. */
  binds?: boolean;
  example?: string;
  description?: string;
}

export interface CatalogEntry {
  type: string;
  description: string;
  properties: CatalogProperty[];
}

export function getCatalog(): CatalogEntry[] {
  return [
    {
      type: 'Table',
      description:
        'Displays an array of row objects. Bind `data` to a query result to render rows; columns auto-generate from the row keys when `columns` is omitted.',
      properties: [
        {
          name: 'data',
          binds: true,
          example: '{{queries.<queryName>.data}}',
          description: 'The row array. Bind to a query so the table renders its results.',
        },
        {
          name: 'columns',
          description: 'Optional array of { name, key, columnType }. Omit for auto-generation from the data.',
        },
        { name: 'rowsPerPage', example: '{{20}}', description: 'Rows per page.' },
      ],
    },
    {
      type: 'Text',
      description: 'Displays static or bound text/HTML.',
      properties: [
        {
          name: 'text',
          binds: true,
          example: 'Hello {{queries.<queryName>.data[0].name}}',
          description: 'Text or HTML content; may contain bindings.',
        },
        { name: 'textFormat', example: 'html', description: "'html' or 'plainText'." },
      ],
    },
  ];
}
