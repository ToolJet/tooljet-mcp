// Development-instance smoke test. The PAT is intentionally environment-only:
// TOOLJET_PAT=... node scripts/test-workflow-integration.mjs
import { randomUUID } from 'node:crypto';
import { createAuth } from '../dist/auth.js';
import { createClient } from '../dist/tooljetClient.js';
import { lint, apply, deleteNode } from '../dist/workflows/planner.js';
import { specSchema } from '../dist/workflows/graph.js';
import { getWorkflowCapabilities } from '../dist/workflows/capabilities.js';
import { assertAgentModelCapability } from '../dist/workflows/integrationPreflight.js';

const apiUrl = process.env.TOOLJET_TEST_API_URL ?? 'http://localhost:3010';
const appUrl = process.env.TOOLJET_TEST_APP_URL ?? 'http://localhost:8090';
const pat = process.env.TOOLJET_PAT;
if (!pat) throw new Error('Set TOOLJET_PAT; do not commit it.');
const auth = createAuth({ apiUrl, appUrl, pat });
const client = createClient(auth, { apiUrl, appUrl, pat });
const existingWorkflowId = process.env.TOOLJET_TEST_WORKFLOW_ID;
const existingVersionId = process.env.TOOLJET_TEST_VERSION_ID;
if (process.env.TOOLJET_TEST_DISCOVER_DATASOURCES === '1') {
  if (!existingVersionId) throw new Error('Set TOOLJET_TEST_VERSION_ID to inspect datasources.');
  const [datasources, tables] = await Promise.all([
    client.listDatasources(existingVersionId),
    client.listTables(),
  ]);
  console.log(JSON.stringify({
    datasources: datasources.map(({ id, name, kind }) => ({ id, name, kind })),
    tables: tables.map(({ id, table_name }) => ({ id, table_name })),
  }));
  process.exit(0);
}
const summarizeExecution = async (workflowId, versionId, environmentId) => {
  const runtimeResult = await client.workflows.run(workflowId, versionId, environmentId, {});
  const execution = runtimeResult.workflowExecution ?? runtimeResult.workflow_execution;
  const executionId = execution?.id ?? runtimeResult.execution_id;
  const details = executionId ? await client.workflows.execution(executionId, 1, 50) : undefined;
  const nodes = details?.nodes ?? details?.workflowExecutionNodes ?? details?.workflow_execution_nodes ?? [];
  return {
    execution_id: executionId,
    status: details?.status ?? runtimeResult.result?.executionStatus ?? 'inline-completed',
    nodes: Array.isArray(nodes) ? nodes.map((node) => ({
      id: node.id,
      type: node.type ?? node.definition?.type,
      status: node.status,
      skipped: node.skipped,
      result: node.result,
    })) : [],
  };
};
if (existingWorkflowId || existingVersionId) {
  if (!existingWorkflowId || !existingVersionId) throw new Error('Set both TOOLJET_TEST_WORKFLOW_ID and TOOLJET_TEST_VERSION_ID for runtime-only mode.');
  let saved = await client.workflows.get(existingWorkflowId, existingVersionId);
  const agentModelDatasourceId = process.env.TOOLJET_TEST_AGENT_MODEL_DATASOURCE_ID;
  if (agentModelDatasourceId) {
    const capabilities = await getWorkflowCapabilities(client, { version_id: existingVersionId });
    const datasource = assertAgentModelCapability(capabilities, agentModelDatasourceId);
    const existingAgent = saved.definition.nodes.find((node) => node.type === 'agent');
    if (process.env.TOOLJET_TEST_RUN_AGENT === '1' && !existingAgent) {
      throw new Error('TOOLJET_TEST_RUN_AGENT requires an existing reachable Agent so this acceptance mode does not rewrite control flow implicitly.');
    }
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const agentRef = `agent_${suffix}`;
    const modelName = `agent_model_${suffix}`;
    const defaultModels = { openai: 'gpt-4o', anthropic: 'claude-sonnet-4-5', gemini: 'gemini-2.5-pro', mistral_ai: 'mistral-large-latest' };
    const spec = specSchema.parse({ nodes: [{
      ref: agentRef,
      ...(existingAgent ? { existing_id: existingAgent.id } : {}),
      type: 'agent',
      model: { datasource_id: agentModelDatasourceId, name: modelName, options: { model: defaultModels[datasource.kind] } },
    }] });
    const plan = await lint(client.workflows, existingWorkflowId, existingVersionId, spec, !existingAgent);
    if (!('plan_token' in plan)) throw new Error(`Agent model lint failed: ${JSON.stringify(plan)}`);
    const applied = await apply(client.workflows, plan.plan_token);
    if ('failed' in applied && applied.failed) throw new Error(`Agent model apply failed: ${JSON.stringify(applied)}`);
    saved = await client.workflows.get(existingWorkflowId, existingVersionId);
    const agentId = existingAgent?.id ?? applied.node_ids[agentRef];
    const edge = saved.definition.edges.find((candidate) => candidate.target === agentId && candidate.targetHandle === 'ai-model');
    const child = edge && saved.definition.nodes.find((candidate) => candidate.id === edge.source && candidate.data.agentConnectionType === 'ai-model');
    const mapping = child && saved.definition.queries.find((candidate) => candidate.idOnDefinition === child.data.idOnDefinition);
    const query = mapping && (await client.workflows.getQueries(existingVersionId)).find((candidate) => candidate.id === mapping.id);
    if (!edge || !child || !query || query.data_source_id !== agentModelDatasourceId || query.kind !== datasource.kind) {
      throw new Error('Saved Agent model attachment failed readback verification.');
    }
    const runtime = process.env.TOOLJET_TEST_RUN_AGENT === '1'
      ? await summarizeExecution(existingWorkflowId, existingVersionId, saved.environment_id)
      : { executed: false };
    console.log(JSON.stringify({ workflow_id: existingWorkflowId, version_id: existingVersionId, agent_id: agentId, model_query_id: query.id, datasource_kind: datasource.kind, runtime }));
    process.exit(0);
  }
  const deleteNodeId = process.env.TOOLJET_TEST_DELETE_NODE_ID;
  if (deleteNodeId) {
    const result = await deleteNode(client.workflows, existingWorkflowId, existingVersionId, deleteNodeId);
    if ('failed' in result && result.failed) throw new Error(`Workflow node deletion failed: ${JSON.stringify(result)}`);
    const refreshed = await client.workflows.get(existingWorkflowId, existingVersionId);
    if (refreshed.definition.nodes.some((node) => node.id === deleteNodeId)) throw new Error('Deleted workflow node remained in the saved graph.');
    console.log(JSON.stringify({ workflow_id: existingWorkflowId, version_id: existingVersionId, deleted_node_id: deleteNodeId, completed: result.completed }));
    process.exit(0);
  }
  if (process.env.TOOLJET_TEST_REPAIR_RESPONSE === '1') {
    const response = saved.definition.nodes.find((node) => node.type === 'output');
    const query = (await client.workflows.getQueries(existingVersionId)).find((item) => item.id === saved.definition.queries.find((mapping) => mapping.idOnDefinition === saved.definition.nodes.find((node) => node.type === 'query')?.data.idOnDefinition)?.id);
    if (!response || !query?.name || !/^[A-Za-z_$][\w$]*$/.test(query.name)) throw new Error('Could not resolve a safe response/query pair to repair.');
    const repair = specSchema.parse({ nodes: [{ ref: 'response', existing_id: response.id, type: 'response', code: `return { ok: true, total: ${query.name}.data.total };` }] });
    const plan = await lint(client.workflows, existingWorkflowId, existingVersionId, repair);
    if (!('plan_token' in plan)) throw new Error(`Response repair lint failed: ${JSON.stringify(plan)}`);
    const applied = await apply(client.workflows, plan.plan_token);
    if ('failed' in applied && applied.failed) throw new Error(`Response repair failed: ${JSON.stringify(applied)}`);
    saved = await client.workflows.get(existingWorkflowId, existingVersionId);
  }
  if (process.env.TOOLJET_TEST_CONDITION_BRANCHES === '1') {
    const queryNode = saved.definition.nodes.find((node) => node.type === 'query');
    const trueResponse = saved.definition.nodes.find((node) => node.type === 'output');
    const queryMapping = saved.definition.queries.find((mapping) => mapping.idOnDefinition === queryNode?.data.idOnDefinition);
    const query = queryMapping && (await client.workflows.getQueries(existingVersionId)).find((item) => item.id === queryMapping.id);
    if (!queryNode || !trueResponse || !query?.name || !/^[A-Za-z_$][\w$]*$/.test(query.name)) {
      throw new Error('Could not resolve the existing query and response nodes for condition testing.');
    }
    const originalEdge = saved.definition.edges.find((edge) => edge.source === queryNode.id && edge.target === trueResponse.id);
    if (!originalEdge) throw new Error('Could not find the query-to-response edge to replace.');
    const baseSpec = {
      nodes: [
        { ref: 'condition', type: 'condition', code: `${query.name}.data.total === 42` },
        { ref: 'true_response', existing_id: trueResponse.id, type: 'response', code: `return { branch: 'true', total: ${query.name}.data.total };` },
        { ref: 'false_response', type: 'response', code: `return { branch: 'false', total: ${query.name}.data.total };` },
      ],
      edges: [
        { ref: 'to_condition', from: queryNode.id, to: 'condition', port: 'success' },
        { ref: 'true_path', from: 'condition', to: 'true_response', port: 'true' },
        { ref: 'false_path', from: 'condition', to: 'false_response', port: 'false' },
      ],
      remove_edge_ids: [originalEdge.id],
    };
    let plan = await lint(client.workflows, existingWorkflowId, existingVersionId, specSchema.parse(baseSpec));
    if (!('plan_token' in plan)) throw new Error(`Condition true-branch lint failed: ${JSON.stringify(plan)}`);
    let applied = await apply(client.workflows, plan.plan_token);
    if ('failed' in applied && applied.failed) throw new Error(`Condition true-branch apply failed: ${JSON.stringify(applied)}`);
    saved = await client.workflows.get(existingWorkflowId, existingVersionId);
    const trueRun = await summarizeExecution(existingWorkflowId, existingVersionId, saved.environment_id);
    const condition = saved.definition.nodes.find((node) => node.type === 'if-condition');
    if (!condition) throw new Error('Condition node was not saved.');
    const falseSpec = specSchema.parse({
      nodes: [{ ref: 'condition', existing_id: condition.id, type: 'condition', code: 'false' }],
    });
    plan = await lint(client.workflows, existingWorkflowId, existingVersionId, falseSpec);
    if (!('plan_token' in plan)) throw new Error(`Condition false-branch lint failed: ${JSON.stringify(plan)}`);
    applied = await apply(client.workflows, plan.plan_token);
    if ('failed' in applied && applied.failed) throw new Error(`Condition false-branch apply failed: ${JSON.stringify(applied)}`);
    saved = await client.workflows.get(existingWorkflowId, existingVersionId);
    const falseRun = await summarizeExecution(existingWorkflowId, existingVersionId, saved.environment_id);
    console.log(JSON.stringify({ workflow_id: existingWorkflowId, version_id: existingVersionId, condition_branches: { true_run: trueRun, false_run: falseRun } }));
    process.exit(0);
  }
  if (process.env.TOOLJET_TEST_DATASOURCE_QUERY === '1') {
    const datasource = (await client.workflows.listDatasources(existingVersionId)).find((item) => item.kind === 'postgresql');
    const condition = saved.definition.nodes.find((node) => node.type === 'if-condition');
    const upstream = condition && saved.definition.edges.find((edge) => edge.target === condition.id);
    if (!datasource || !condition || !upstream) throw new Error('A PostgreSQL datasource and an existing condition path are required for this test.');
    const queryName = `database_smoke_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
    const spec = specSchema.parse({
      nodes: [
        {
          ref: 'database_smoke', type: 'query', name: queryName, datasource_id: datasource.id,
          options: { mode: 'sql', query: 'SELECT 1 AS mcp_value', query_params: [], runOnPageLoad: false },
        },
        { ref: 'condition', existing_id: condition.id, type: 'condition', code: `Number(${queryName}.data[0].mcp_value) === 1` },
      ],
      edges: [
        { ref: 'to_database_smoke', from: upstream.source, to: 'database_smoke', port: 'success' },
        { ref: 'database_to_condition', from: 'database_smoke', to: condition.id, port: 'success' },
      ],
      remove_edge_ids: [upstream.id],
    });
    const plan = await lint(client.workflows, existingWorkflowId, existingVersionId, spec);
    if (!('plan_token' in plan)) throw new Error(`Datasource-query lint failed: ${JSON.stringify(plan)}`);
    const applied = await apply(client.workflows, plan.plan_token);
    if ('failed' in applied && applied.failed) throw new Error(`Datasource-query apply failed: ${JSON.stringify(applied)}`);
    saved = await client.workflows.get(existingWorkflowId, existingVersionId);
    const runtime = await summarizeExecution(existingWorkflowId, existingVersionId, saved.environment_id);
    console.log(JSON.stringify({ workflow_id: existingWorkflowId, version_id: existingVersionId, datasource_query: { datasource_kind: datasource.kind, query: 'SELECT 1 AS mcp_value', runtime } }));
    process.exit(0);
  }
  if (process.env.TOOLJET_TEST_TJDB_PIPELINE === '1') {
    const tableName = 'mcp_workflow_records';
    let table = (await client.listTables()).find((item) => item.table_name === tableName);
    if (!table) {
      await client.createTable({
        tableName,
        columns: [
          { name: 'value', type: 'integer', notNull: true },
          { name: 'updated_value', type: 'integer', notNull: true },
        ],
      });
      table = (await client.listTables()).find((item) => item.table_name === tableName);
    }
    if (!table) throw new Error(`ToolJet DB table ${tableName} was not available after creation.`);
    const schema = await client.getTableSchema(tableName);
    const columnNames = new Set(schema.map((column) => column.name));
    if (!columnNames.has('id') || !columnNames.has('value') || !columnNames.has('updated_value')) {
      throw new Error(`Existing ${tableName} schema is incompatible with this test.`);
    }
    await client.insertRows({ tableName, rows: [{ value: 41, updated_value: 0 }] });
    const datasource = (await client.workflows.listDatasources(existingVersionId)).find((item) => item.kind === 'tooljetdb');
    const start = saved.definition.nodes.find((node) => node.type === 'input' && node.data.nodeType === 'start');
    const response = saved.definition.nodes.find((node) => node.type === 'output');
    if (!datasource || !start || !response) throw new Error('A ToolJet DB datasource, start node, and response node are required.');
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const readName = `fetch_record_${suffix}`;
    const transformName = `transform_record_${suffix}`;
    const updateName = `update_record_${suffix}`;
    const verifyName = `verify_record_${suffix}`;
    const spec = specSchema.parse({
      nodes: [
        { ref: 'read_record', type: 'query', name: readName, datasource_id: datasource.id, options: { operation: 'list_rows', table_id: table.id, list_rows: { limit: 1, offset: 0 }, runOnPageLoad: false } },
        { ref: 'transform_record', type: 'javascript', name: transformName, code: `const row = ${readName}.data[0];\nreturn { id: row.id, updated_value: Number(row.value) + 1 };` },
        { ref: 'write_record', type: 'query', name: updateName, datasource_id: datasource.id, options: { operation: 'update_rows', table_id: table.id, update_rows: { where_filters: { '0': { column: 'id', operator: 'eq', value: `{{${transformName}.data.id}}` } }, columns: { '0': { column: 'updated_value', value: `{{${transformName}.data.updated_value}}` } } }, runOnPageLoad: false } },
        { ref: 'verify_record', type: 'query', name: verifyName, datasource_id: datasource.id, options: { operation: 'list_rows', table_id: table.id, list_rows: { limit: 1, offset: 0, where_filters: { '0': { column: 'id', operator: 'eq', value: `{{${transformName}.data.id}}` } } }, runOnPageLoad: false } },
        { ref: 'response', existing_id: response.id, type: 'response', code: `const row = ${verifyName}.data[0];\nreturn { id: row.id, value: row.value, updated_value: row.updated_value };` },
      ],
      edges: [
        { ref: 'start_to_read', from: start.id, to: 'read_record', port: 'default' },
        { ref: 'read_to_transform', from: 'read_record', to: 'transform_record', port: 'success' },
        { ref: 'transform_to_write', from: 'transform_record', to: 'write_record', port: 'success' },
        { ref: 'write_to_verify', from: 'write_record', to: 'verify_record', port: 'success' },
        { ref: 'verify_to_response', from: 'verify_record', to: 'response', port: 'success' },
      ],
      remove_edge_ids: saved.definition.edges.map((edge) => edge.id),
    });
    const plan = await lint(client.workflows, existingWorkflowId, existingVersionId, spec);
    if (!('plan_token' in plan)) throw new Error(`ToolJet DB pipeline lint failed: ${JSON.stringify(plan)}`);
    const applied = await apply(client.workflows, plan.plan_token);
    if ('failed' in applied && applied.failed) throw new Error(`ToolJet DB pipeline apply failed: ${JSON.stringify(applied)}`);
    saved = await client.workflows.get(existingWorkflowId, existingVersionId);
    const runtime = await summarizeExecution(existingWorkflowId, existingVersionId, saved.environment_id);
    console.log(JSON.stringify({ workflow_id: existingWorkflowId, version_id: existingVersionId, table: tableName, pipeline: 'ToolJet DB read -> RunJS transform -> ToolJet DB update -> ToolJet DB verification', runtime }));
    process.exit(0);
  }
  const runtime = await summarizeExecution(existingWorkflowId, existingVersionId, saved.environment_id);
  console.log(JSON.stringify({ workflow_id: existingWorkflowId, version_id: existingVersionId, runtime: { executed: true, ...runtime } }));
  process.exit(0);
}
const label = `MCP workflow smoke ${new Date().toISOString().replace(/[:.]/g, '-')}`;
const created = await client.workflows.create(label);
const queryName = `calculate_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
const spec = specSchema.parse({
  nodes: [
    { ref: 'start', type: 'start' },
    { ref: 'calculate', type: 'javascript', name: queryName, code: 'return { total: 42 };' },
    { ref: 'response', type: 'response', code: `return { ok: true, total: ${queryName}.data.total };` },
  ],
  edges: [
    { ref: 'begin', from: 'start', to: 'calculate', port: 'default' },
    { ref: 'finish', from: 'calculate', to: 'response', port: 'success' },
  ],
  test_parameters: {},
});
const planned = await lint(client.workflows, created.workflow_id, created.version_id, spec);
if (!('plan_token' in planned)) throw new Error(`Workflow lint failed: ${JSON.stringify(planned)}`);
const applied = await apply(client.workflows, planned.plan_token);
if ('failed' in applied && applied.failed) throw new Error(`Workflow apply failed: ${JSON.stringify(applied)}`);
const saved = await client.workflows.get(created.workflow_id, created.version_id);
if (saved.definition.nodes.length !== 3 || saved.definition.edges.length !== 2 || saved.definition.queries.length !== 1) {
  throw new Error(`Saved graph has unexpected shape: ${JSON.stringify(saved.definition)}`);
}
const runtimeResult = await client.workflows.run(created.workflow_id, created.version_id, saved.environment_id, {});
const execution = runtimeResult.workflowExecution ?? runtimeResult.workflow_execution;
const executionId = execution?.id ?? runtimeResult.execution_id;
const executionDetails = executionId ? await client.workflows.execution(executionId, 1, 20) : undefined;
console.log(JSON.stringify({
  workflow_id: created.workflow_id,
  version_id: created.version_id,
  editor_url: saved.editor_url,
  graph: { nodes: saved.definition.nodes.length, edges: saved.definition.edges.length, queries: saved.definition.queries.length },
  runtime: { executed: true, execution_id: executionId, status: executionDetails?.status ?? runtimeResult.result?.executionStatus ?? 'inline-completed' },
}));
