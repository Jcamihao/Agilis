CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "density" TEXT NOT NULL DEFAULT 'Comfortable',
    "appearance" TEXT NOT NULL DEFAULT 'dark',
    "autosave" BOOLEAN NOT NULL DEFAULT false,
    "twoFactor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
CREATE INDEX "UserSettings_userId_idx" ON "UserSettings"("userId");

ALTER TABLE "UserSettings"
ADD CONSTRAINT "UserSettings_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
