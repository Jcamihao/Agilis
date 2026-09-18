-- Remove real-time Chat, Announcements, Feed (Mural) and HR modules
-- Product scope reduction: Agilis stays focused on project/task management,
-- not intranet/social/HR features orthogonal to the core

-- Chat
DROP TABLE IF EXISTS "chat_messages";
DROP TABLE IF EXISTS "chat_room_members";
DROP TABLE IF EXISTS "chat_rooms";
DROP TYPE IF EXISTS "ChatRoomType";

-- Announcements
DROP TABLE IF EXISTS "announcement_reads";
DROP TABLE IF EXISTS "announcements";

-- Feed (Mural)
DROP TABLE IF EXISTS "feed_comments";
DROP TABLE IF EXISTS "feed_reactions";
DROP TABLE IF EXISTS "feed_posts";

-- HR
DROP TABLE IF EXISTS "time_records";
DROP TABLE IF EXISTS "leave_requests";
DROP TABLE IF EXISTS "hr_profiles";
DROP TYPE IF EXISTS "TimeRecordType";
DROP TYPE IF EXISTS "LeaveStatus";
DROP TYPE IF EXISTS "LeaveType";
DROP TYPE IF EXISTS "HrStatus";
