import "../components/stats/chartSetup";
import { Bar, Line } from "react-chartjs-2";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStatsDashboardData } from "../hooks/useStatsDashboardData";
import { formatChartLabel } from "../lib/format";
import type { DashboardData } from "../types/dashboard";
import { buildChartOptions } from "../components/stats/chartSetup";

export function StatsPage(props: { data: DashboardData }) {
  const { data } = props;
  const statsData = useStatsDashboardData(data.lastPolledAt);
  const liveStats = statsData.liveStats;

  const trendChartData = {
    labels: statsData.trendPoints.map((point) =>
      formatChartLabel(point.bucketStart),
    ),
    datasets: [
      {
        label: "운행 열차",
        data: statsData.trendPoints.map((point) => point.activeTrainCount),
        borderColor: "#0f172a",
        backgroundColor: "rgba(15,23,42,0.12)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "지연률",
        data: statsData.trendPoints.map((point) => point.delayRate),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239,68,68,0.12)",
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const typeChartData = {
    labels: liveStats?.byType.map((item) => item.type) ?? [],
    datasets: [
      {
        label: "운행 편성",
        data: liveStats?.byType.map((item) => item.count) ?? [],
        backgroundColor: [
          "#0f172a",
          "#2563eb",
          "#06b6d4",
          "#14b8a6",
          "#f97316",
        ],
        borderRadius: 12,
      },
      {
        label: "지연률",
        data: liveStats?.byType.map((item) => item.delayRate) ?? [],
        backgroundColor: "#ef4444",
        borderRadius: 12,
      },
    ],
  };

  const stationDelayChartData = {
    labels: statsData.stationStats.slice(0, 8).map((item) => item.stationName),
    datasets: [
      {
        label: "활성 열차 수",
        data: statsData.stationStats
          .slice(0, 8)
          .map((item) => item.activeTrainCount),
        backgroundColor: "#2563eb",
        borderRadius: 10,
      },
      {
        label: "지연 열차 수",
        data: statsData.stationStats
          .slice(0, 8)
          .map((item) => item.delayedTrainCount),
        backgroundColor: "#f97316",
        borderRadius: 10,
      },
    ],
  };

  return (
    <div className="min-h-screen px-3 pb-10 pt-24 text-slate-950 sm:px-4">
      <div className="mx-auto max-w-6xl">
        <h1 className="my-8 text-2xl font-bold sm:text-3xl">운행 통계</h1>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <StatItem
            label="운행 중 열차"
            value={`${liveStats?.totals.totalTrains ?? 0}대`}
          />
          <StatItem
            label="지연 열차"
            value={`${liveStats?.totals.delayedTrains ?? 0}대`}
          />
          <StatItem
            label="지연률"
            value={`${liveStats?.totals.delayRate ?? 0}%`}
          />
          <StatItem
            label="최대 지연"
            value={`${liveStats?.totals.maxDelay ?? 0}분`}
          />
        </div>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>최근 24시간 운행 추이</CardTitle>
              <CardDescription>운행 수와 지연률 추이</CardDescription>
            </CardHeader>
            <CardContent className="h-80 min-w-0">
              <Line
                data={trendChartData}
                options={buildChartOptions({
                  yTitle: "수치",
                  legend: true,
                })}
              />
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>지연 상위 열차</CardTitle>
              <CardDescription>
                {liveStats?.topDelayed.length ?? 0}건
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0 space-y-3">
              {liveStats?.topDelayed.length ? (
                <Table className="min-w-[280px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>열차</TableHead>
                      <TableHead>지연</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liveStats.topDelayed.map((train) => (
                      <TableRow key={train.trainId}>
                        <TableCell>
                          {train.type}#{train.trainId}
                        </TableCell>
                        <TableCell>{train.delay}분</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-sm">
                  현재 지연 중인 열차가 없습니다.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>열차 유형별 운행 수 / 지연률</CardTitle>
            </CardHeader>
            <CardContent className="h-80 min-w-0">
              <Bar
                data={typeChartData}
                options={buildChartOptions({
                  yTitle: "수치",
                  legend: true,
                })}
              />
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>역별 활성도 / 지연 열차</CardTitle>
              <CardDescription>상위 8개 역</CardDescription>
            </CardHeader>
            <CardContent className="h-80 min-w-0">
              <Bar
                data={stationDelayChartData}
                options={buildChartOptions({
                  yTitle: "수치",
                  legend: true,
                })}
              />
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>역별 활성 열차</CardTitle>
              <CardDescription>현재역 기준 상위 집계</CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>역</TableHead>
                    <TableHead>등급</TableHead>
                    <TableHead>활성</TableHead>
                    <TableHead>지연 열차</TableHead>
                    <TableHead>평균 지연</TableHead>
                    <TableHead>최대 지연</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statsData.stationStats.slice(0, 10).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        표시할 역 통계가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    statsData.stationStats.slice(0, 10).map((row) => (
                      <TableRow key={row.stationName}>
                        <TableCell>{row.stationName}</TableCell>
                        <TableCell>{row.grade ?? "-"}</TableCell>
                        <TableCell>{row.activeTrainCount}</TableCell>
                        <TableCell>{row.delayedTrainCount}</TableCell>
                        <TableCell>{row.avgDelay}분</TableCell>
                        <TableCell>{row.maxDelay}분</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>활성 구간 상위</CardTitle>
              <CardDescription>현재역 → 다음역 기준</CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>현재역</TableHead>
                    <TableHead>다음역</TableHead>
                    <TableHead>열차 수</TableHead>
                    <TableHead>지연 열차</TableHead>
                    <TableHead>평균 지연</TableHead>
                    <TableHead>최대 지연</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statsData.segmentStats.slice(0, 10).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        표시할 구간 통계가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    statsData.segmentStats.slice(0, 10).map((row) => (
                      <TableRow
                        key={`${row.currentStationName}-${row.nextStationName}`}
                      >
                        <TableCell>{row.currentStationName}</TableCell>
                        <TableCell>{row.nextStationName}</TableCell>
                        <TableCell>{row.trainCount}</TableCell>
                        <TableCell>{row.delayedTrainCount}</TableCell>
                        <TableCell>{row.avgDelay}분</TableCell>
                        <TableCell>{row.maxDelay}분</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {statsData.errorMessage || data.errorMessage || data.stationError ? (
          <Card className="mt-6">
            <CardContent className="space-y-1 p-5 text-sm">
              {statsData.errorMessage ? <p>{statsData.errorMessage}</p> : null}
              {data.errorMessage ? <p>{data.errorMessage}</p> : null}
              {data.stationError ? <p>{data.stationError}</p> : null}
            </CardContent>
          </Card>
        ) : null}

        {statsData.isLoading ? (
          <Card className="mt-6">
            <CardContent className="p-5 text-sm">
              통계 데이터를 불러오는 중입니다.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function StatItem(props: { label: string; value: string }) {
  return (
    <div className="bg-card text-card-foreground flex flex-col rounded-xl p-4 shadow-sm sm:p-6">
      <p className="text-sm text-slate-600">{props.label}</p>
      <p className="text-2xl font-semibold sm:text-3xl">{props.value}</p>
    </div>
  );
}
