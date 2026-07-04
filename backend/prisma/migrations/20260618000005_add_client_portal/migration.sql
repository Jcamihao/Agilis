CREATE TABLE "client_portals" (
    "id"          TEXT NOT NULL,
    "projectId"   TEXT NOT NULL,
    "token"       TEXT NOT NULL,
    "isEnabled"   BOOLEAN NOT NULL DEFAULT false,
    "title"       TEXT,
    "logoUrl"     TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#6366f1',
    "showKanban"  BOOLEAN NOT NULL DEFAULT true,
    "showTimeline" BOOLEAN NOT NULL DEFAULT true,
    "showHealth"  BOOLEAN NOT NULL DEFAULT false,
    "showTeam"    BOOLEAN NOT NULL DEFAULT true,
    "password"    TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "client_portals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_portals_projectId_key" ON "client_portals"("projectId");
CREATE UNIQUE INDEX "client_portals_token_key"     ON "client_portals"("token");

ALTER TABLE "client_portals" ADD CONSTRAINT "client_portals_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
