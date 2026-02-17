-- CreateTable
CREATE TABLE "DocVisitor" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocPageAccess" (
    "id" TEXT NOT NULL,
    "docVisitorId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocPageAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocVisitor_email_idx" ON "DocVisitor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DocVisitor_provider_providerAccountId_key" ON "DocVisitor"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "DocPageAccess_projectId_createdAt_idx" ON "DocPageAccess"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "DocPageAccess_docVisitorId_idx" ON "DocPageAccess"("docVisitorId");

-- AddForeignKey
ALTER TABLE "DocPageAccess" ADD CONSTRAINT "DocPageAccess_docVisitorId_fkey" FOREIGN KEY ("docVisitorId") REFERENCES "DocVisitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
