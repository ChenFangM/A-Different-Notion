-- Delete all profiles except the first one
DELETE FROM public.profiles 
WHERE id NOT IN (
    SELECT id 
    FROM public.profiles 
    ORDER BY created_at ASC 
    LIMIT 1
);

-- Drop code_segments table and its dependencies
DROP TABLE IF EXISTS public.code_segments CASCADE;

-- Remove storage objects
DO $$
BEGIN
    -- Delete all objects in code-segments bucket
    DELETE FROM storage.objects WHERE bucket_id = 'code-segments';
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;

-- Drop storage policies
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Drop triggers
DO $$
BEGIN
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
    DROP TRIGGER IF EXISTS update_code_segments_updated_at ON public.code_segments;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

-- Drop extensions last (this will also drop dependent functions)
DROP EXTENSION IF EXISTS moddatetime CASCADE;