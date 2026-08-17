# Seed: `tickets` ToolJet-DB table (one-time setup for the demo)

Creates a ToolJet-DB `tickets` table (catalog-registered, so `add_query` can list it) and 10 sample rows. Done via the ToolJet-DB API so the table is registered in the tjdb catalog (NOT raw SQL for the table itself; rows are inserted directly for speed).

**Status:** ✅ Already run against the local instance on 2026-06-26 (table id `a51bdebd-…`, 10 rows). Re-run only if the DB is reset.

## Prerequisites
- ToolJet running (backend :3000, Postgres, PostgREST).
- Org id + admin creds. For this instance: org `6bb2a05c-132c-41d3-b87f-74d49abd1ed8`, user `navaneeth@tooljet.com`.

## 1. Create the table (tjdb API)
Auth = `tj_auth_token` cookie + `tj-workspace-id: <org>` header (see `docs/contracts.md` §0). **Every column needs a `constraints_type`** (the service reads `is_primary_key` on each — omitting it 500s).

```bash
ORG=6bb2a05c-132c-41d3-b87f-74d49abd1ed8
# login → save cookie jar $CJ, then:
curl -s -b "$CJ" -H "tj-workspace-id: $ORG" -H 'Content-Type: application/json' \
  -X POST "http://localhost:3000/api/tooljet-db/organizations/$ORG/table" -d '{
  "table_name":"tickets",
  "columns":[
    {"column_name":"id","data_type":"serial","constraints_type":{"is_not_null":true,"is_primary_key":true,"is_unique":true}},
    {"column_name":"subject","data_type":"character varying","constraints_type":{"is_not_null":false,"is_primary_key":false,"is_unique":false}},
    {"column_name":"priority","data_type":"character varying","constraints_type":{"is_not_null":false,"is_primary_key":false,"is_unique":false}},
    {"column_name":"status","data_type":"character varying","constraints_type":{"is_not_null":false,"is_primary_key":false,"is_unique":false}},
    {"column_name":"assignee","data_type":"character varying","constraints_type":{"is_not_null":false,"is_primary_key":false,"is_unique":false}}
  ]}'
# → 201 { "result": { "id": "<tableId>", "table_name": "tickets" } }
```

## 2. Insert 10 rows
The physical table lives in the `tooljet_db` database, schema `workspace_<org>`, named by the table id:
```
workspace_6bb2a05c-132c-41d3-b87f-74d49abd1ed8."<tableId>"
```
```sql
-- psql -h localhost -U postgres -d tooljet_db   (password: postgres)
INSERT INTO "workspace_<org>"."<tableId>" (subject, priority, status, assignee) VALUES
 ('Laptop won''t boot','High','Open','Alice Chen'),
 ('VPN keeps disconnecting','Medium','In Progress','Bob Martin'),
 ('Password reset request','Low','Resolved','Alice Chen'),
 ('Email quota exceeded','Medium','Open','Carol Diaz'),
 ('New monitor request','Low','Open','Bob Martin'),
 ('Printer offline (3rd floor)','Medium','In Progress','Dan Evans'),
 ('Software license renewal','High','Open','Carol Diaz'),
 ('Slow network in Bldg B','High','In Progress','Dan Evans'),
 ('Onboard new hire - IT setup','Medium','Open','Alice Chen'),
 ('Two-factor auth not working','High','Resolved','Bob Martin');
```

## 3. Verify
`GET /api/tooljet-db/organizations/$ORG/tables` → `{ result: [ { table_name: "tickets", ... } ] }`.
