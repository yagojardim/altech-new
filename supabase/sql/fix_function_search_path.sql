-- Security fix: set an immutable search_path on all public functions
-- Lint: 0011_function_search_path_mutable

CREATE OR REPLACE FUNCTION public.tg_touch_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
begin
  new.updated_at  := now();
  new.row_version := coalesce(old.row_version, 0) + 1;
  return new;
end;
$function$;
