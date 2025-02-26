-- Create moddatetime extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- Create triggers if they don't exist
DO $$ 
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
    
    -- Create new trigger for profiles
    CREATE TRIGGER update_profiles_updated_at 
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW
        EXECUTE PROCEDURE moddatetime(updated_at);

EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;

-- Create code_segments trigger in a separate block to handle errors
DO $$
BEGIN
    DROP TRIGGER IF EXISTS update_code_segments_updated_at ON public.code_segments;
    
    CREATE TRIGGER update_code_segments_updated_at 
        BEFORE UPDATE ON public.code_segments
        FOR EACH ROW
        EXECUTE PROCEDURE moddatetime(updated_at);
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;
