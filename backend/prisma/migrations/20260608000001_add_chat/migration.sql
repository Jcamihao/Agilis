-- CreateEnum
CREATE TYPE "ChatRoomType" AS ENUM ('GENERAL', 'PROJECT', 'DIRECT');

-- AlterTable: add chat relations to users (no column changes needed, FK side)

-- CreateTable chat_rooms
CREATE TABLE "chat_rooms" (
    "id"        TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT,
    "name"      TEXT NOT NULL,
    "type"      "ChatRoomType" NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable chat_room_members
CREATE TABLE "chat_room_members" (
    "id"         TEXT NOT NULL,
    "roomId"     TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "joinedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_room_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable chat_messages
CREATE TABLE "chat_messages" (
    "id"        TEXT NOT NULL,
    "roomId"    TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "editedAt"  TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- Unique constraint
CREATE UNIQUE INDEX "chat_room_members_roomId_userId_key" ON "chat_room_members"("roomId", "userId");

-- Indexes
CREATE INDEX "chat_rooms_companyId_idx" ON "chat_rooms"("companyId");
CREATE INDEX "chat_rooms_projectId_idx" ON "chat_rooms"("projectId");
CREATE INDEX "chat_messages_roomId_createdAt_idx" ON "chat_messages"("roomId", "createdAt" DESC);

-- Foreign Keys
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_room_members" ADD CONSTRAINT "chat_room_members_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_room_members" ADD CONSTRAINT "chat_room_members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
