import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useDashboardData } from "./hooks/useDashboardData";
import { LiveMapPage } from "./pages/LiveMapPage";
import { StatsPage } from "./pages/StatsPage";

const THEME_STORAGE_KEY = "korail-theme";

type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function App() {
  const data = useDashboardData();
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>(getPreferredTheme);
  const currentTab = location.pathname.startsWith("/stats") ? "stats" : "map";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-1000 flex justify-center px-4 pt-4 md:justify-start">
        <div className="flex flex-col gap-2 rounded-full border border-border/70 px-4 py-2 shadow-md backdrop-blur-md md:pl-5 md:pr-2">
          <div
            className="absolute inset-0 -z-10 rounded-full"
            style={{ backgroundColor: "var(--surface-elevated)" }}
          />
          <div className="pointer-events-auto flex items-center gap-3 flex-row md:gap-4">
            <h1
              className="font-space-grotesk text-xl font-bold"
              style={{ color: "var(--brand)" }}
            >
              RAILROAD
            </h1>
            <Tabs
              className="w-[220px]"
              onValueChange={(value) => {
                navigate(value === "stats" ? "/stats" : "/map");
              }}
              value={currentTab}
            >
              <TabsList>
                <TabsTrigger value="map">실시간 지도</TabsTrigger>
                <TabsTrigger value="stats">운행 통계</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              aria-label={theme === "dark" ? "라이트 테마로 전환" : "다크 테마로 전환"}
              className="h-9 w-9 rounded-full"
              onClick={() => {
                setTheme((currentTheme) =>
                  currentTheme === "dark" ? "light" : "dark",
                );
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground fixed bottom-1 left-1/2 z-1000 w-screen -translate-x-1/2 text-center text-xs wrap-break-word pointer-events-none">
        이 서비스는 코레일의 써드파티 사이트로, 코레일에서 운영하는 사이트가
        아닙니다 "코레일"은 KOREA RAILROAD.의 등록 상표입니다
      </p>
      <Routes>
        <Route path="/" element={<Navigate to="/map" replace />} />
        <Route path="/map" element={<LiveMapPage data={data} theme={theme} />} />
        <Route path="/stats" element={<StatsPage data={data} />} />
      </Routes>
    </>
  );
}

export default App;
