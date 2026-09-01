-- Pin the function's search_path so it cannot be hijacked by a mutable role setting.
alter function set_updated_at() set search_path = '';
