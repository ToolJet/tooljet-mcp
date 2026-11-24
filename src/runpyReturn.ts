import { parser } from '@lezer/python';

/** Both the browser and workflow executors evaluate Python at module scope. */
export function runpyReturnError(code: unknown): string | undefined {
  if (typeof code !== 'string' || !/\breturn\b/.test(code)) return;
  // Python resets indentation at a leading form feed. Normalize only the parser's input.
  const source = code.replace(/\r\n?/g, '\n').replace(/^[ \t\f]*\f/gm, '');
  const cursor = parser.parse(source).cursor();
  do {
    if (cursor.name !== 'ReturnStatement') continue;
    let scope = cursor.node.parent;
    while (scope && scope.name !== 'FunctionDefinition' && scope.name !== 'ClassDefinition') scope = scope.parent;
    if (scope?.name !== 'FunctionDefinition') {
      const line = source.slice(0, cursor.from).split('\n').length;
      return `line ${line}: 'return' outside function. Run Python uses the final expression as the query result. ` +
        'Use an expression at module level, or put the return inside a function and call it.';
    }
  } while (cursor.next());
}
