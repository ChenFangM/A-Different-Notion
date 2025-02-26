-- Drop existing table and recreate with new schema
DROP TABLE IF EXISTS public.code_segments CASCADE;

CREATE TABLE public.code_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    segment_type TEXT NOT NULL CHECK (segment_type IN ('component', 'layout', 'style', 'script')),
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'jsx',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, title)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS code_segments_user_id_idx ON public.code_segments(user_id);
CREATE INDEX IF NOT EXISTS code_segments_segment_type_idx ON public.code_segments(segment_type);

-- Enable RLS
ALTER TABLE public.code_segments ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'code_segments' AND policyname = 'Users can create their own code segments'
    ) THEN
        CREATE POLICY "Users can create their own code segments"
        ON public.code_segments FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'code_segments' AND policyname = 'Users can view their own code segments'
    ) THEN
        CREATE POLICY "Users can view their own code segments"
        ON public.code_segments FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'code_segments' AND policyname = 'Users can update their own code segments'
    ) THEN
        CREATE POLICY "Users can update their own code segments"
        ON public.code_segments FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'code_segments' AND policyname = 'Users can delete their own code segments'
    ) THEN
        CREATE POLICY "Users can delete their own code segments"
        ON public.code_segments FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create updated_at trigger
CREATE TRIGGER handle_updated_at BEFORE UPDATE
  ON public.code_segments
  FOR EACH ROW
  EXECUTE PROCEDURE moddatetime (updated_at);

-- Grant access to authenticated users
GRANT ALL ON public.code_segments TO authenticated;
