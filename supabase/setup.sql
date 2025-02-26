-- Main setup file that runs all migrations in order
-- Create extension first
\ir migrations/00003_create_triggers.sql

-- Then create tables and policies
\ir migrations/00001_create_profiles.sql
\ir migrations/00002_create_code_segments.sql
\ir migrations/00004_create_functions.sql
\ir migrations/00005_storage_policies.sql
\ir migrations/00006_fix_policies.sql
