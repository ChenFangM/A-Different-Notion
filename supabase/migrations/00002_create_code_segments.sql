-- Drop existing table if it exists
DROP TABLE IF EXISTS public.code_segments CASCADE;

-- Create code_segments table
CREATE TABLE public.code_segments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    segment_type TEXT NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    language TEXT NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, segment_type, title)
);

-- Create indexes
CREATE INDEX code_segments_user_id_idx ON public.code_segments(user_id);
CREATE INDEX code_segments_segment_type_idx ON public.code_segments(segment_type);

-- Enable RLS
ALTER TABLE public.code_segments ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
    -- Policy for creating code segments
    CREATE POLICY "Enable insert for authenticated users only"
        ON public.code_segments FOR INSERT
        TO authenticated
        WITH CHECK (
            auth.uid() = user_id AND
            (
                SELECT COUNT(*)
                FROM storage.objects
                WHERE bucket_id = 'code-segments'
                AND name = file_path
                AND (storage.foldername(name))[1] = auth.uid()::text
            ) = 1
        );

    -- Policy for reading code segments
    CREATE POLICY "Enable read access for authenticated users"
        ON public.code_segments FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id OR is_public = true);

    -- Policy for updating code segments
    CREATE POLICY "Enable update for users based on user_id"
        ON public.code_segments FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);

    -- Policy for deleting code segments
    CREATE POLICY "Enable delete for users based on user_id"
        ON public.code_segments FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
END $$;

-- Create updated_at trigger
CREATE TRIGGER handle_updated_at BEFORE UPDATE
  ON public.code_segments
  FOR EACH ROW
  EXECUTE PROCEDURE moddatetime (updated_at);

-- Grant access to authenticated users
GRANT ALL ON public.code_segments TO authenticated;
