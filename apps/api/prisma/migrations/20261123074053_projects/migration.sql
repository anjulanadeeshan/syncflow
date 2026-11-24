-- CreateEnum
CREATE TYPE "project_role" AS ENUM ('PROJECT_MANAGER', 'MEMBER');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "key" VARCHAR(10) NOT NULL,
    "description" TEXT,
    "created_by_id" UUID NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "project_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "project_role" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateTable
CREATE TABLE "workflow_columns" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "rank" INTEGER NOT NULL,
    "color" VARCHAR(20),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workflow_columns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_organization_id_archived_at_updated_at_idx" ON "projects"("organization_id", "archived_at", "updated_at");

-- CreateIndex
CREATE INDEX "projects_created_by_id_idx" ON "projects"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_organization_id_key_key" ON "projects"("organization_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "projects_id_organization_id_key" ON "projects"("id", "organization_id");

-- CreateIndex
CREATE INDEX "project_members_organization_id_user_id_idx" ON "project_members"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "project_members_project_id_role_idx" ON "project_members"("project_id", "role");

-- CreateIndex
CREATE INDEX "workflow_columns_organization_id_project_id_archived_at_idx" ON "workflow_columns"("organization_id", "project_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_columns_project_id_rank_key" ON "workflow_columns"("project_id", "rank");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_organization_id_fkey" FOREIGN KEY ("project_id", "organization_id") REFERENCES "projects"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_organization_id_user_id_fkey" FOREIGN KEY ("organization_id", "user_id") REFERENCES "organization_members"("organization_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_columns" ADD CONSTRAINT "workflow_columns_project_id_organization_id_fkey" FOREIGN KEY ("project_id", "organization_id") REFERENCES "projects"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
