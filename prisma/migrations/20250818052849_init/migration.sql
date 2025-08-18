-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."Topic" AS ENUM ('ECONOMICS', 'TECHNOLOGY', 'POLITICS');

-- CreateEnum
CREATE TYPE "public"."Length" AS ENUM ('SHORT', 'STANDARD', 'DEEP');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topics" "public"."Topic"[],
    "region" TEXT,
    "preferredPublishers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blockedPublishers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "digestLength" "public"."Length" NOT NULL DEFAULT 'STANDARD',

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Source" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "country" TEXT,
    "reputation" INTEGER NOT NULL DEFAULT 50,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Article" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "canonicalUrl" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "outlet" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "lang" TEXT,
    "paywalled" BOOLEAN NOT NULL DEFAULT false,
    "cleanedText" TEXT NOT NULL,
    "rawSnapshotUrl" TEXT,
    "hash" TEXT NOT NULL,
    "embedding" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Cluster" (
    "id" TEXT NOT NULL,
    "representativeId" TEXT NOT NULL,
    "centroidEmbedding" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClusterMember" (
    "clusterId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ClusterMember_pkey" PRIMARY KEY ("clusterId","articleId")
);

-- CreateTable
CREATE TABLE "public"."Entity" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "meta" JSONB,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ArticleEntity" (
    "articleId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,

    CONSTRAINT "ArticleEntity_pkey" PRIMARY KEY ("articleId","entityId")
);

-- CreateTable
CREATE TABLE "public"."Digest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "params" JSONB NOT NULL,

    CONSTRAINT "Digest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DigestItem" (
    "id" TEXT NOT NULL,
    "digestId" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "sources" JSONB NOT NULL,

    CONSTRAINT "DigestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 30,
    "lastSentAt" TIMESTAMP(3),
    "channels" TEXT[] DEFAULT ARRAY['email']::TEXT[],

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "vote" INTEGER NOT NULL,
    "reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Preference_userId_key" ON "public"."Preference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Source_url_key" ON "public"."Source"("url");

-- CreateIndex
CREATE INDEX "Source_enabled_idx" ON "public"."Source"("enabled");

-- CreateIndex
CREATE INDEX "Source_reputation_idx" ON "public"."Source"("reputation");

-- CreateIndex
CREATE UNIQUE INDEX "Article_url_key" ON "public"."Article"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Article_hash_key" ON "public"."Article"("hash");

-- CreateIndex
CREATE INDEX "Article_publishedAt_idx" ON "public"."Article"("publishedAt");

-- CreateIndex
CREATE INDEX "Article_outlet_idx" ON "public"."Article"("outlet");

-- CreateIndex
CREATE INDEX "Article_lang_idx" ON "public"."Article"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "Cluster_representativeId_key" ON "public"."Cluster"("representativeId");

-- CreateIndex
CREATE INDEX "Cluster_createdAt_idx" ON "public"."Cluster"("createdAt");

-- CreateIndex
CREATE INDEX "ClusterMember_similarity_idx" ON "public"."ClusterMember"("similarity");

-- CreateIndex
CREATE INDEX "Entity_type_idx" ON "public"."Entity"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_type_value_key" ON "public"."Entity"("type", "value");

-- CreateIndex
CREATE INDEX "Digest_userId_generatedAt_idx" ON "public"."Digest"("userId", "generatedAt");

-- CreateIndex
CREATE INDEX "DigestItem_digestId_rank_idx" ON "public"."DigestItem"("digestId", "rank");

-- CreateIndex
CREATE INDEX "Bookmark_createdAt_idx" ON "public"."Bookmark"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_clusterId_key" ON "public"."Bookmark"("userId", "clusterId");

-- CreateIndex
CREATE INDEX "Alert_userId_idx" ON "public"."Alert"("userId");

-- CreateIndex
CREATE INDEX "Feedback_clusterId_idx" ON "public"."Feedback"("clusterId");

-- AddForeignKey
ALTER TABLE "public"."Preference" ADD CONSTRAINT "Preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Article" ADD CONSTRAINT "Article_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cluster" ADD CONSTRAINT "Cluster_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "public"."Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClusterMember" ADD CONSTRAINT "ClusterMember_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "public"."Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClusterMember" ADD CONSTRAINT "ClusterMember_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticleEntity" ADD CONSTRAINT "ArticleEntity_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticleEntity" ADD CONSTRAINT "ArticleEntity_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Digest" ADD CONSTRAINT "Digest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DigestItem" ADD CONSTRAINT "DigestItem_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "public"."Digest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DigestItem" ADD CONSTRAINT "DigestItem_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "public"."Cluster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bookmark" ADD CONSTRAINT "Bookmark_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "public"."Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "public"."Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
