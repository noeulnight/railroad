import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "./hooks/useDashboardData";
import { LiveMapPage } from "./pages/LiveMapPage";
import { StatsPage } from "./pages/StatsPage";

function App() {
  const data = useDashboardData();

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-1000 flex px-4 pt-4">
        <div className="flex flex-col gap-2">
          <div className="pointer-events-auto flex gap-5 rounded-4xl bg-white px-5 py-2 items-center shadow-lg">
            <img src="/korail.png" className="h-6" />
            <div className="flex gap-3">
              <Button asChild size="default" variant="ghost">
                <NavLink to="/map">실시간 지도</NavLink>
              </Button>
              <Button asChild size="default" variant="ghost">
                <NavLink to="/stats">운행 통계</NavLink>
              </Button>
            </div>
          </div>
          <div className="pointer-events-auto self-start rounded-4xl bg-white px-4 py-2 shadow-lg">
            <div className="text-[14px] font-medium tracking-[0.18em] text-slate-500">
              {data.trains.length}대 운행중
            </div>
          </div>
        </div>
      </div>
      <Routes>
        <Route path="/" element={<Navigate to="/map" replace />} />
        <Route path="/map" element={<LiveMapPage data={data} />} />
        <Route path="/stats" element={<StatsPage data={data} />} />
      </Routes>
    </>
  );
}

export default App;
