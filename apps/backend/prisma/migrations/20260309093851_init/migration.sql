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
CREATE TABLE "train_snapshot_samples" (
    "id" TEXT NOT NULL,
    "sampled_at" TIMESTAMP(3) NOT NULL,
    "train_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "direction" "TrainDirection" NOT NULL,
    "delay_minutes" INTEGER NOT NULL,
    "current_station_name" TEXT,
    "next_station_name" TEXT,
    "departure_station_name" TEXT,
    "arrival_station_name" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "train_snapshot_samples_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "train_stats_hourly" (
    "id" TEXT NOT NULL,
    "bucket_start" TIMESTAMP(3) NOT NULL,
    "active_train_count" INTEGER NOT NULL DEFAULT 0,
    "delayed_train_count" INTEGER NOT NULL DEFAULT 0,
    "avg_delay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_delay" INTEGER NOT NULL DEFAULT 0,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "removed_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "train_stats_hourly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stations_name_key" ON "stations"("name");

-- CreateIndex
CREATE INDEX "train_snapshot_samples_sampled_at_idx" ON "train_snapshot_samples"("sampled_at");

-- CreateIndex
CREATE INDEX "train_snapshot_samples_train_id_sampled_at_idx" ON "train_snapshot_samples"("train_id", "sampled_at" DESC);

-- CreateIndex
CREATE INDEX "train_events_occurred_at_idx" ON "train_events"("occurred_at");

-- CreateIndex
CREATE INDEX "train_events_train_id_occurred_at_idx" ON "train_events"("train_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "train_stats_hourly_bucket_start_key" ON "train_stats_hourly"("bucket_start");
