-- CreateEnum
CREATE TYPE "InterviewDifficulty" AS ENUM ('EASY', 'NORMAL', 'HARD');

-- AlterTable
ALTER TABLE "interview_sessions" ADD COLUMN     "difficulty" "InterviewDifficulty" NOT NULL DEFAULT 'NORMAL';
