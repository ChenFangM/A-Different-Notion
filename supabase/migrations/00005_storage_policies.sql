-- Create bucket if it doesn't exist
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name)
    VALUES ('code-segments', 'code-segments')
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Grant access to bucket
GRANT ALL ON storage.objects TO authenticated;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Create storage policies
CREATE POLICY "Authenticated users can upload files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'code-segments' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can read their own files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'code-segments' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update their own files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'code-segments' AND
        (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'code-segments' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'code-segments' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );
