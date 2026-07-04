-- CreateTable wiki_pages
CREATE TABLE "wiki_pages" (
    "id"          TEXT NOT NULL,
    "projectId"   TEXT NOT NULL,
    "parentId"    TEXT,
    "title"       TEXT NOT NULL,
    "content"     TEXT NOT NULL DEFAULT '',
    "icon"        TEXT NOT NULL DEFAULT 'article',
    "position"    INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "wiki_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable wiki_page_revisions
CREATE TABLE "wiki_page_revisions" (
    "id"        TEXT NOT NULL,
    "pageId"    TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "authorId"  TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wiki_page_revisions_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "wiki_pages_projectId_position_idx" ON "wiki_pages"("projectId", "position");
CREATE INDEX "wiki_page_revisions_pageId_idx"    ON "wiki_page_revisions"("pageId");

-- Foreign Keys
ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "wiki_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON UPDATE CASCADE;

ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON UPDATE CASCADE;

ALTER TABLE "wiki_page_revisions" ADD CONSTRAINT "wiki_page_revisions_pageId_fkey"
    FOREIGN KEY ("pageId") REFERENCES "wiki_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wiki_page_revisions" ADD CONSTRAINT "wiki_page_revisions_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON UPDATE CASCADE;
