-- First, create the moddatetime extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can create their own code segments" ON public.code_segments;
DROP POLICY IF EXISTS "Users can view their own code segments" ON public.code_segments;
DROP POLICY IF EXISTS "Users can update their own code segments" ON public.code_segments;
DROP POLICY IF EXISTS "Users can delete their own code segments" ON public.code_segments;

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_code_segments_updated_at ON public.code_segments;

-- Recreate policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = id);

-- Recreate policies for code_segments
CREATE POLICY "Users can create their own code segments"
    ON public.code_segments
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own code segments"
    ON public.code_segments
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own code segments"
    ON public.code_segments
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own code segments"
    ON public.code_segments
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Recreate triggers using the moddatetime extension
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER update_code_segments_updated_at 
    BEFORE UPDATE ON public.code_segments
    FOR EACH ROW
    EXECUTE PROCEDURE moddatetime(updated_at);
