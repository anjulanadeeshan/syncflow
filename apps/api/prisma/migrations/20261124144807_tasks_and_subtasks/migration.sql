-- CreateEnum
CREATE TYPE "task_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "next_task_number" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "workflow_column_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "priority" "task_priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "task_status" NOT NULL DEFAULT 'TODO',
    "created_by_id" UUID NOT NULL,
    "due_date" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignees" (
    "task_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("task_id", "user_id")
);

-- CreateTable
CREATE TABLE "subtasks" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subtasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_organization_id_project_id_archived_at_updated_at_idx" ON "tasks"("organization_id", "project_id", "archived_at", "updated_at");
CREATE INDEX "tasks_project_id_status_archived_at_idx" ON "tasks"("project_id", "status", "archived_at");
CREATE INDEX "tasks_project_id_priority_archived_at_idx" ON "tasks"("project_id", "priority", "archived_at");
CREATE INDEX "tasks_project_id_due_date_idx" ON "tasks"("project_id", "due_date");
CREATE INDEX "tasks_workflow_column_id_idx" ON "tasks"("workflow_column_id");
CREATE INDEX "tasks_created_by_id_idx" ON "tasks"("created_by_id");
CREATE UNIQUE INDEX "tasks_project_id_number_key" ON "tasks"("project_id", "number");
CREATE UNIQUE INDEX "tasks_id_project_id_organization_id_key" ON "tasks"("id", "project_id", "organization_id");
CREATE INDEX "task_assignees_project_id_user_id_idx" ON "task_assignees"("project_id", "user_id");
CREATE INDEX "task_assignees_organization_id_project_id_idx" ON "task_assignees"("organization_id", "project_id");
CREATE INDEX "task_assignees_user_id_idx" ON "task_assignees"("user_id");
CREATE INDEX "subtasks_organization_id_project_id_task_id_is_completed_idx" ON "subtasks"("organization_id", "project_id", "task_id", "is_completed");
CREATE UNIQUE INDEX "subtasks_task_id_position_key" ON "subtasks"("task_id", "position");
CREATE UNIQUE INDEX "workflow_columns_id_project_id_organization_id_key" ON "workflow_columns"("id", "project_id", "organization_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_organization_id_fkey" FOREIGN KEY ("project_id", "organization_id") REFERENCES "projects"("id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workflow_column_id_project_id_organization_id_fkey" FOREIGN KEY ("workflow_column_id", "project_id", "organization_id") REFERENCES "workflow_columns"("id", "project_id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_project_id_organization_id_fkey" FOREIGN KEY ("task_id", "project_id", "organization_id") REFERENCES "tasks"("id", "project_id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_project_id_user_id_fkey" FOREIGN KEY ("project_id", "user_id") REFERENCES "project_members"("project_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_task_id_project_id_organization_id_fkey" FOREIGN KEY ("task_id", "project_id", "organization_id") REFERENCES "tasks"("id", "project_id", "organization_id") ON DELETE CASCADE ON UPDATE CASCADE;
