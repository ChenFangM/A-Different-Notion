-- Create moddatetime extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- Create triggers if they don't exist
DO $$ 
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
    DROP TRIGGER IF EXISTS update_code_segments_updated_at ON public.code_segments;

    -- Create new triggers
    CREATE TRIGGER update_profiles_updated_at 
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW
        EXECUTE PROCEDURE moddatetime(updated_at);

    CREATE TRIGGER update_code_segments_updated_at 
        BEFORE UPDATE ON public.code_segments
        FOR EACH ROW
        EXECUTE PROCEDURE moddatetime(updated_at);
END $$;
