import { Navigate, Route, Routes } from "react-router-dom";
import { TrainSidebar } from "@/app/components/TrainSidebar";
import { LiveMapPage } from "@/pages/live-map/ui/LiveMapPage";
import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
} from "@/shared/ui/sidebar";

function App() {
  return (
    <SidebarProvider className="**:data-[slot=sidebar-gap]:hidden">
      <Sidebar className="z-1001" collapsible="icon" variant="floating">
        <TrainSidebar />
      </Sidebar>

      <main className="relative min-h-svh flex-1 overflow-hidden">
        <div className="pointer-events-none fixed left-3 top-3 z-1002 md:hidden">
          <SidebarTrigger className="pointer-events-auto bg-card/90 shadow-md backdrop-blur" />
        </div>
        <Routes>
          <Route path="/" element={<Navigate to="/map" replace />} />
          <Route path="/map" element={<LiveMapPage />} />
          <Route path="*" element={<Navigate to="/map" replace />} />
        </Routes>
      </main>
    </SidebarProvider>
  );
}

export default App;
