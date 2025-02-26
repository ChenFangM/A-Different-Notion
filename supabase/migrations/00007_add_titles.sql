-- Create titles table
CREATE TABLE public.titles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS titles_user_id_idx ON public.titles(user_id);

-- Enable RLS
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'titles' AND policyname = 'Users can create their own title'
    ) THEN
        CREATE POLICY "Users can create their own title"
        ON public.titles FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'titles' AND policyname = 'Users can view their own title'
    ) THEN
        CREATE POLICY "Users can view their own title"
        ON public.titles FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'titles' AND policyname = 'Users can update their own title'
    ) THEN
        CREATE POLICY "Users can update their own title"
        ON public.titles FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'titles' AND policyname = 'Users can delete their own title'
    ) THEN
        CREATE POLICY "Users can delete their own title"
        ON public.titles FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END
$$;
