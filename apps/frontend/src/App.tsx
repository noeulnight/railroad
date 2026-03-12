import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function App() {
  const data = useDashboardData();
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = location.pathname.startsWith("/stats") ? "stats" : "map";

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-1000 flex justify-center px-4 pt-4 md:justify-start">
        <div className="flex flex-col gap-2 rounded-full bg-white px-4 py-2 shadow-md md:pl-5 md:pr-2">
          <div className="pointer-events-auto flex items-center gap-3 flex-row md:gap-4">
            <h1 className="text-xl font-bold text-[#0054A6] font-space-grotesk">
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
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 fixed bottom-1 w-screen text-center wrap-break-word left-1/2 -translate-x-1/2 pointer-events-none z-1000">
        이 서비스는 코레일의 써드파티 사이트로, 코레일에서 운영하는 사이트가
        아닙니다 "코레일"은 KOREA RAILROAD.의 등록 상표입니다
      </p>
      <Routes>
        <Route path="/" element={<Navigate to="/map" replace />} />
        <Route path="/map" element={<LiveMapPage data={data} />} />
        <Route path="/stats" element={<StatsPage data={data} />} />
      </Routes>
    </>
  );
}

export default App;
