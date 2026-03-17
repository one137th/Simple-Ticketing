/**
 * Home — Main application shell
 * Design: Blueprint — sidebar + main content + optional slide-over
 */

import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import WelcomeScreen from "@/components/WelcomeScreen";
import Sidebar from "@/components/Sidebar";
import TicketList from "@/components/TicketList";
import KanbanBoard from "@/components/KanbanBoard";
import TicketDetail from "@/components/TicketDetail";
import SettingsPanel from "@/components/SettingsPanel";
import type { TicketStatus } from "@/lib/types";

export default function Home() {
  const { isLoaded } = useApp();
  const [view, setView] = useState<"list" | "board">("list");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<"file" | "sync" | "cloud" | "projects" | "agent">("file");

  const openSettings = (tab: "file" | "sync" | "cloud" | "projects" | "agent" = "file") => {
    setSettingsInitialTab(tab);
    setShowSettings(true);
  };

  if (!isLoaded) {
    return <WelcomeScreen />;
  }

  const handleSelectTicket = (id: string) => {
    setSelectedTicketId((prev) => (prev === id ? null : id));
  };

  const handleStatusFilter = (s: TicketStatus | null) => {
    setStatusFilter(s);
    setSelectedTicketId(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        view={view}
        onViewChange={(v) => { setView(v); setSelectedTicketId(null); }}
        statusFilter={statusFilter}
        onStatusFilter={handleStatusFilter}
        onOpenSettings={() => openSettings("file")}
        onOpenAgentSetup={() => openSettings("agent")}
      />

      <div className="flex flex-1 overflow-hidden">
        {view === "list" ? (
          <TicketList
            statusFilter={statusFilter}
            onSelectTicket={handleSelectTicket}
            selectedTicketId={selectedTicketId}
          />
        ) : (
          <KanbanBoard
            onSelectTicket={handleSelectTicket}
            selectedTicketId={selectedTicketId}
          />
        )}

        {selectedTicketId && (
          <TicketDetail
            ticketId={selectedTicketId}
            onClose={() => setSelectedTicketId(null)}
          />
        )}
      </div>

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} initialTab={settingsInitialTab} />
      )}
    </div>
  );
}
