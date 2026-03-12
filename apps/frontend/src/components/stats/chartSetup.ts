import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

function getThemeColor(name: string, fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  return value || fallback;
}

export function buildChartOptions(props: { yTitle: string; legend: boolean }) {
  const foreground = getThemeColor("--foreground", "#0f172a");
  const mutedForeground = getThemeColor("--muted-foreground", "#64748b");
  const border = getThemeColor("--border", "#e2e8f0");

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: props.legend,
        position: "top" as const,
        labels: {
          color: foreground,
        },
      },
      tooltip: {
        backgroundColor: getThemeColor("--card", "#ffffff"),
        titleColor: foreground,
        bodyColor: foreground,
        borderColor: border,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: border,
        },
        ticks: {
          color: mutedForeground,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: border,
        },
        ticks: {
          color: mutedForeground,
        },
        title: {
          display: true,
          text: props.yTitle,
          color: mutedForeground,
        },
      },
    },
  };
}
