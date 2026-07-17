-- PostgreSQL Database Script for YouTube Clone MVP

-- 1. USERS TABLE
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Hashed string
    username VARCHAR(100) UNIQUE NOT NULL
);

-- 2. CHANNELS TABLE (1:1 with users)
CREATE TABLE channels (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    handle VARCHAR(100) UNIQUE NOT NULL,
    image_path VARCHAR(512),
    banner_image_path VARCHAR(512),
    description TEXT,
    contact_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. SUBSCRIPTIONS TABLE
CREATE TABLE subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE
);

-- 4. VIDEOS TABLE
CREATE TABLE videos (
    id BIGSERIAL PRIMARY KEY,
    channel_id BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    video_path VARCHAR(512) NOT NULL,
    url_id VARCHAR(50) UNIQUE NOT NULL, -- Unique token for routing urls
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_path VARCHAR(512),
    status VARCHAR(255) NOT NULL, -- Managed entirely via backend code ('draft', 'published')
    view_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. VIDEO LIKES TABLE
CREATE TABLE video_likes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. COMMENTS TABLE (Threaded conversation support)
CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE, -- Nullable for root comments
    text TEXT NOT NULL,
    like_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. PLAYLISTS TABLE (Custom lists)
CREATE TABLE playlists (
    id BIGSERIAL PRIMARY KEY,
    channel_id BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    view_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. SYSTEM PLAYLISTS TABLE (Account-level feeds)
CREATE TABLE system_playlists (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    playlist_type VARCHAR(255) NOT NULL, -- Managed via backend code ('liked_videos', 'watch_later')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. PLAYLIST VIDEOS TABLE (Junction map)
CREATE TABLE playlist_videos (
    id BIGSERIAL PRIMARY KEY,
    video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    playlist_id BIGINT REFERENCES playlists(id) ON DELETE CASCADE,
    system_playlist_id BIGINT REFERENCES system_playlists(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. REFRESH TOKENS TABLE
CREATE TABLE refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 11. SEARCH VECTORS TABLE
CREATE TABLE search_vectors (
    id BIGSERIAL PRIMARY KEY,
    item_type VARCHAR(255) NOT NULL, -- Managed via backend code ('video', 'playlist', 'channel')
    item_id BIGINT NOT NULL,
    search_vector TSVECTOR NOT NULL
);

---
-- SEARCH VECTOR INDEX

-- Gin Index mapping for fast Full-Text Search processing
CREATE INDEX idx_search_vectors_gin ON search_vectors USING gin(search_vector);