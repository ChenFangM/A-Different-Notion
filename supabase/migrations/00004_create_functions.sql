-- Profile management functions
CREATE OR REPLACE FUNCTION create_new_profile(p_user_id UUID, p_username TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (id, username)
    VALUES (p_user_id, p_username);
END;
$$;

CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT email INTO v_email
    FROM auth.users u
    JOIN profiles p ON u.id = p.id
    WHERE p.username = p_username;
    
    RETURN v_email;
END;
$$;

CREATE OR REPLACE FUNCTION check_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE username = p_username
    ) INTO v_exists;
    
    RETURN NOT v_exists;
END;
$$;

-- Code segment management functions
CREATE OR REPLACE FUNCTION save_code_segment(
    p_segment_type TEXT,
    p_title TEXT,
    p_content TEXT,
    p_language TEXT DEFAULT 'jsx',
    p_is_public BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_segment_id UUID;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    -- Check if user exists
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Insert new code segment
    INSERT INTO code_segments (
        user_id,
        segment_type,
        title,
        content,
        language,
        is_public
    )
    VALUES (
        v_user_id,
        p_segment_type,
        p_title,
        p_content,
        p_language,
        p_is_public
    )
    RETURNING id INTO v_segment_id;

    RETURN v_segment_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_code_segment(
    p_segment_id UUID,
    p_title TEXT DEFAULT NULL,
    p_content TEXT DEFAULT NULL,
    p_is_public BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    -- Check if user exists
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Update the code segment
    UPDATE code_segments
    SET
        title = COALESCE(p_title, title),
        content = COALESCE(p_content, content),
        is_public = COALESCE(p_is_public, is_public),
        version = version + 1
    WHERE id = p_segment_id AND user_id = v_user_id;

    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION get_code_segments_by_type(p_segment_type TEXT)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    language TEXT,
    version INTEGER,
    is_public BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cs.id,
        cs.title,
        cs.content,
        cs.language,
        cs.version,
        cs.is_public,
        cs.created_at,
        cs.updated_at
    FROM code_segments cs
    WHERE cs.user_id = auth.uid()
    AND cs.segment_type = p_segment_type
    ORDER BY cs.updated_at DESC;
END;
$$;
