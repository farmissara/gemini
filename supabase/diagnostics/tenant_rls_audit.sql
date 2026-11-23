-- Read-only audit of public-schema RLS coverage and broad anonymous policies.
-- Run in Supabase SQL Editor; review flagged rows before multi-school onboarding.

with public_tables as (
  select
    cls.oid as table_oid,
    cls.relname as table_name,
    cls.relrowsecurity as rls_enabled,
    cls.relforcerowsecurity as rls_forced
  from pg_class cls
  join pg_namespace ns on ns.oid = cls.relnamespace
  where ns.nspname = 'public'
    and cls.relkind in ('r', 'p')
    and cls.relname not like 'pg_%'
), policy_summary as (
  select
    table_oid,
    count(*) as policy_count,
    bool_or(0 = any(polroles)) as has_public_policy,
    bool_or(
      ('anon'::regrole::oid = any(polroles))
      and (
        coalesce(pg_get_expr(polqual, polrelid), 'true') in ('true', '(true)')
        or coalesce(pg_get_expr(polwithcheck, polrelid), 'true') in ('true', '(true)')
      )
    ) as has_broad_anon_policy,
    string_agg(
      polname || ' [' || polcmd || '] roles=' || array_to_string(
        array(select case when role_oid = 0 then 'PUBLIC' else role_oid::regrole::text end
              from unnest(polroles) role_oid), ','
      ), '; ' order by polname
    ) as policies
  from pg_policy
  group by table_oid
)
select
  tables.table_name,
  tables.rls_enabled,
  tables.rls_forced,
  coalesce(summary.policy_count, 0) as policy_count,
  coalesce(summary.has_public_policy, false) as has_public_policy,
  coalesce(summary.has_broad_anon_policy, false) as has_broad_anon_policy,
  summary.policies,
  case
    when not tables.rls_enabled then 'REVIEW: RLS disabled'
    when coalesce(summary.policy_count, 0) = 0 then 'REVIEW: no policies'
    when coalesce(summary.has_broad_anon_policy, false) then 'BLOCK: broad anon policy'
    when coalesce(summary.has_public_policy, false) then 'REVIEW: PUBLIC policy'
    else 'RLS enabled; inspect scope and write rules'
  end as audit_result
from public_tables tables
left join policy_summary summary on summary.table_oid = tables.table_oid
order by
  case
    when not tables.rls_enabled or coalesce(summary.has_broad_anon_policy, false) then 0
    when coalesce(summary.policy_count, 0) = 0 or coalesce(summary.has_public_policy, false) then 1
    else 2
  end,
  tables.table_name;
