-- CreateEnum
CREATE TYPE "TrainDirection" AS ENUM ('UP', 'DOWN');

-- CreateEnum
CREATE TYPE "TrainEventType" AS ENUM ('CREATED', 'UPDATED', 'REMOVED');

-- CreateTable
CREATE TABLE "stations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "train_events" (
    "id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "event_type" "TrainEventType" NOT NULL,
    "train_id" TEXT NOT NULL,
    "type" TEXT,
    "direction" "TrainDirection",
    "delay_minutes" INTEGER,
    "previous_latitude" DOUBLE PRECISION,
    "previous_longitude" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "current_station_name" TEXT,
    "next_station_name" TEXT,

    CONSTRAINT "train_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stations_name_key" ON "stations"("name");

-- CreateIndex
CREATE INDEX "train_events_occurred_at_idx" ON "train_events"("occurred_at");

-- CreateIndex
CREATE INDEX "train_events_train_id_occurred_at_idx" ON "train_events"("train_id", "occurred_at" DESC);
