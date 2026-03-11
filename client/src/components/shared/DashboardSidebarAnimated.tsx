import { motion } from "motion/react";
import {
  CalendarCheck,
  Shield,
  LogOut,
  User,
  LayoutDashboard,
  Calendar,
  DoorOpen,
  Wrench,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import logo from "../../assets/logo.png";
import { useAuth } from "../../contexts/AuthContext";

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  bookingMode: "procedure" | "meeting";
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const GOLD = "#c5a059";
const CREAM = "#e8d8a1";

export function DashboardSidebar({
  activeTab,
  onTabChange,
  onLogout,
  bookingMode,
  isCollapsed,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const { user } = useAuth();

  const procedureMenuItems = [
    { id: "overview", label: "ภาพรวมระบบ", icon: LayoutDashboard },
    { id: "appointments", label: "ตารางนัดหมาย", icon: Calendar },
    { id: "patients", label: "จองห้องหัตถการ", icon: CalendarCheck },
    { id: "treatments", label: "จัดการผู้ใช้งาน", icon: Shield },
    { id: "rooms", label: "จัดการห้องหัตถการ", icon: DoorOpen },
    { id: "machines", label: "จัดการเครื่องมือ", icon: Wrench },
    { id: "procedures", label: "จัดการหัตถการ", icon: Sparkles },
  ];

  const meetingMenuItems = [
    { id: "overview", label: "ภาพรวมระบบ", icon: LayoutDashboard },
    { id: "appointments", label: "ตารางจองประชุม", icon: Calendar },
    { id: "patients", label: "จองห้องประชุม", icon: CalendarCheck },
    { id: "treatments", label: "จัดการผู้ใช้งาน", icon: Shield },
    { id: "rooms", label: "จัดการห้องประชุม", icon: DoorOpen },
  ];

  const menuItems =
    bookingMode === "procedure" ? procedureMenuItems : meetingMenuItems;

  return (
    <motion.div
      initial={{ width: 288 }}
      animate={{ width: isCollapsed ? 72 : 288 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="bg-[#002b38] text-white flex flex-col h-screen sticky top-0 z-20 overflow-hidden shadow-2xl flex-shrink-0"
    >
      {/* ── LOGO + TOGGLE ── */}
      <div
        className="flex items-center border-b border-white/10"
        style={{
          padding: isCollapsed ? "20px 0" : "24px 20px 24px 24px",
          justifyContent: isCollapsed ? "center" : "space-between",
          position: "relative",
          minHeight: 88,
        }}
      >
        {/* Logo block */}
        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            animate={{ width: isCollapsed ? 48 : 64, height: isCollapsed ? 48 : 64 }}
            transition={{ duration: 0.35 }}
            className="relative flex-shrink-0 rounded-2xl overflow-hidden shadow-xl flex items-center justify-center border border-white/20"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            {/* Gold glow */}
            <div
              className="absolute inset-0 rounded-full blur-xl"
              style={{ backgroundColor: GOLD, opacity: 0.2 }}
            />
            <img
              src={logo}
              alt="Apichai"
              className="relative w-full h-full object-contain p-1.5"
            />
          </motion.div>

          {/* Brand name — only when expanded */}
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              <h1 className="text-2xl font-bold tracking-tight flex flex-col leading-none">
                <span style={{ color: GOLD }}>APICHAI</span>
                <span
                  className="text-xs font-medium -mt-0.5"
                  style={{ letterSpacing: "0.3em", color: "rgba(255,255,255,0.45)" }}
                >
                  CLINIC
                </span>
              </h1>
              <div
                className="mt-1.5 h-0.5 w-12 rounded-full"
                style={{ background: `linear-gradient(to right, ${GOLD}, transparent)` }}
              />
            </motion.div>
          )}
        </div>

        {/* Collapse toggle — right side (expanded) or below logo (collapsed) */}
        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Collapse toggle when collapsed — shows as centered row */}
      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="flex justify-center items-center py-3 hover:bg-white/5 transition-colors"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* ── USER PROFILE ── */}
      <div
        className="flex items-center gap-3 border-b border-white/10"
        style={{
          padding: isCollapsed ? "12px 0" : "14px 20px",
          justifyContent: isCollapsed ? "center" : "flex-start",
        }}
      >
        <Avatar
          className="flex-shrink-0 transition-all duration-300"
          style={{
            width: isCollapsed ? 40 : 44,
            height: isCollapsed ? 40 : 44,
            outline: `2px solid ${GOLD}`,
            outlineOffset: "2px",
          }}
        >
          <AvatarImage src="" />
          <AvatarFallback
            className="text-white font-semibold"
            style={{ backgroundColor: GOLD }}
          >
            {user?.name ? user.name.charAt(0) : <User className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>

        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 min-w-0"
          >
            <p className="text-sm font-medium truncate">{user?.name || "ผู้ใช้งาน"}</p>
            <p
              className="text-[10px] truncate uppercase"
              style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em" }}
            >
              {user?.role || "USER"}
            </p>
          </motion.div>
        )}
      </div>

      {/* ── NAVIGATION ── */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={isCollapsed ? item.label : ""}
              className="w-full flex items-center gap-3 transition-all relative group h-12"
              style={{
                justifyContent: isCollapsed ? "center" : "flex-start",
                paddingLeft: isCollapsed ? 0 : 24,
                paddingRight: isCollapsed ? 0 : 24,
                backgroundColor: isActive ? GOLD : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
              }}
            >
              {/* Left accent bar - ชิดซ้ายสุดของปุ่มเลบ */}
              {isActive && (
                <motion.div
                  layoutId="activeTabBar"
                  className="absolute"
                  style={{
                    backgroundColor: CREAM,
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    zIndex: 50
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <Icon
                className={`flex-shrink-0 transition-transform ${!isActive && "group-hover:scale-110"}`}
                style={{ width: 18, height: 18 }}
              />

              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── LOGOUT ── */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={onLogout}
          title={isCollapsed ? "ออกจากระบบ" : ""}
          className="w-full flex items-center gap-3 h-10 rounded-lg transition-all"
          style={{
            justifyContent: isCollapsed ? "center" : "flex-start",
            paddingLeft: isCollapsed ? 0 : 12,
            color: "rgba(255,255,255,0.5)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.05)";
            (e.currentTarget as HTMLButtonElement).style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)";
          }}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm whitespace-nowrap">ออกจากระบบ</span>}
        </button>
      </div>
    </motion.div>
  );
}
