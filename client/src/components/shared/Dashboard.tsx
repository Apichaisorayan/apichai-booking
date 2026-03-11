import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { DashboardSidebar } from "./DashboardSidebarAnimated";
import { DashboardOverview } from "./DashboardOverview";
import { AppointmentsCalendar } from "./AppointmentsCalendar";
import { BookingSystem } from "../procedure/BookingSystem";
import { MeetingBookingSystem } from "../meeting/MeetingBookingSystem";
import { RoomManagement } from "../procedure/RoomManagement";
import { MachineManagement } from "../procedure/MachineManagement";
import { ProcedureManagement } from "../procedure/ProcedureManagement";
import { PermissionsDemo } from "../PermissionsDemo";
import { PageTransition } from "../PageTransition";
import { LoadingScreen } from "../LoadingScreen";
import { DashboardSkeleton, CalendarSkeleton, TableSkeleton } from "../SkeletonLoader";
import { NotificationBell } from "../NotificationBell";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { UserRole } from "../../types/booking";
import { useAuth } from "../../contexts/AuthContext";
import { getUserInitials } from "../../utils/formatters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [bookingMode, setBookingMode] = useState<"procedure" | "meeting">("procedure");
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);

  // Sidebar collapse — persisted like client project
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  };

  // Get user role from auth context, fallback to SALES if not available
  const userRole = (user?.role?.toUpperCase() as UserRole) || UserRole.SALES;

  const userInitials = user?.name ? getUserInitials(user.name) : 'U';

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Apply theme colors based on booking mode
  useEffect(() => {
    const root = document.documentElement;
    const meetingThemeVars: Record<string, string> = {
      '--background': '#fffdf9',
      '--foreground': '#12343b',
      '--card': '#ffffff',
      '--card-foreground': '#12343b',
      '--popover': '#ffffff',
      '--popover-foreground': '#12343b',
      '--primary': '#c89666',
      '--primary-foreground': '#ffffff',
      '--secondary': '#e1b382',
      '--secondary-foreground': '#12343b',
      '--muted': '#fbf4ec',
      '--muted-foreground': '#2d545e',
      '--accent': '#2d545e',
      '--accent-foreground': '#ffffff',
      '--border': '#c896661a',
      '--ring': '#c89666',
    };

    if (bookingMode === "meeting") {
      // Meeting room theme - Luxurious Gold/Brown
      root.style.setProperty('--theme-primary', '#c89666');
      root.style.setProperty('--theme-secondary', '#2d545e');
      root.style.setProperty('--theme-accent', '#e1b382');
      root.style.setProperty('--theme-bg-light', '#fbf6ef');
      root.style.setProperty('--theme-bg-dark', '#12343b');
      root.style.setProperty('--theme-surface-light', '#FFFFFF');
      root.style.setProperty('--theme-surface-dark', '#2d545e');
      root.style.setProperty('--theme-text-light', '#12343b');
      root.style.setProperty('--theme-text-dark', '#fbf6ef');

      Object.entries(meetingThemeVars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    } else {
      // Procedure room theme — Apichai Gold
      root.style.setProperty('--theme-primary', '#c5a059');
      root.style.setProperty('--theme-secondary', '#002b38');
      root.style.setProperty('--theme-accent', '#e8d8a1');
      root.style.setProperty('--theme-bg-light', '#FAFAFA');
      root.style.setProperty('--theme-bg-dark', '#002b38');
      root.style.setProperty('--theme-surface-light', '#FFFFFF');
      root.style.setProperty('--theme-surface-dark', '#002b38');
      root.style.setProperty('--theme-text-light', '#002b38');
      root.style.setProperty('--theme-text-dark', '#FFFFFF');

      Object.keys(meetingThemeVars).forEach((key) => {
        root.style.removeProperty(key);
      });
    }
  }, [bookingMode]);

  // Handle tab change with loading
  const handleTabChange = (tab: string) => {
    if (tab === activeTab) return;

    setIsLoading(true);

    // Simulate loading time for smoother transition
    setTimeout(() => {
      setActiveTab(tab);
      setIsLoading(false);
    }, 500);
  };

  // Show initial loading screen
  if (isInitialLoad) {
    return <LoadingScreen message="กำลังเตรียมระบบ..." />;
  }

  // Show loading screen when switching modes
  if (isSwitchingMode) {
    return (
      <LoadingScreen
        message={bookingMode === "procedure" ? "กำลังสลับไปยังโหมดห้องหัตถการ..." : "กำลังสลับไปยังโหมดห้องประชุม..."}
      />
    );
  }

  // Get theme colors
  const getThemeColors = () => {
    if (bookingMode === "meeting") {
      return {
        primary: "#c89666",
        secondary: "#2d545e",
        accent: "#e1b382",
        bgDark: "#12343b",
        textLight: "#12343b",
      };
    }
    return {
      primary: "#c5a059",
      secondary: "#002b38",
      accent: "#e8d8a1",
      bgDark: "#002b38",
      textLight: "#002b38",
    };
  };

  const themeColors = getThemeColors();

  return (
    <div className="flex h-screen overflow-hidden bg-background transition-colors duration-500">
      {/* Sidebar */}
      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={onLogout}
        bookingMode={bookingMode}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-card border-b border-border px-8 py-4 sticky top-0 z-10 transition-colors duration-500">
          <div className="flex items-center justify-between">
            {<div className="flex-1 max-w-xl">

            </div>}

            <div className="flex items-center gap-4 ml-6">

              {/* <NotificationBell /> */}

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 pl-2 hover:bg-transparent hover:text-inherit dark:hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-inherit"
                  >
                    <Avatar className="h-8 w-8 ring-2 transition-all duration-500" style={{ borderColor: themeColors.primary }}>
                      <AvatarImage src="" />
                      <AvatarFallback
                        className="text-white text-xs font-semibold transition-colors duration-500"
                        style={{ backgroundColor: themeColors.primary }}
                      >
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left hidden lg:block">
                      <p className="text-sm font-medium">{user?.name || 'ผู้ใช้งาน'}</p>
                      <p className="text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {userRole}
                        </Badge>
                      </p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.name || 'ผู้ใช้งาน'}</p>
                      <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>โปรไฟล์</DropdownMenuItem>
                  <DropdownMenuItem>ตั้งค่า</DropdownMenuItem>
                  <DropdownMenuItem>ความช่วยเหลือ</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="text-[#800200]">
                    ออกจากระบบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-8">
            {/* Page Title */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1
                    className="text-3xl mb-2 transition-colors duration-500"
                    style={{ color: themeColors.textLight }}
                  >
                    {activeTab === "overview" && (bookingMode === "procedure" ? "ภาพรวมระบบ" : "ภาพรวมระบบ - ห้องประชุม")}
                    {activeTab === "appointments" && (bookingMode === "procedure" ? "การนัดหมาย" : "การจองห้องประชุม")}
                    {activeTab === "patients" && (bookingMode === "procedure" ? "ระบบจองห้องหัตถการ" : "ระบบจองห้องประชุม")}
                    {activeTab === "treatments" && "จัดการผู้ใช้งาน"}
                    {activeTab === "rooms" && (bookingMode === "procedure" ? "จัดการห้องหัตถการ" : "จัดการห้องประชุม")}
                    {activeTab === "machines" && (bookingMode === "procedure" ? "หัตถกรรม" : "จัดการอุปกรณ์ห้องประชุม")}
                  </h1>
                  <p className="text-muted-foreground">
                    {activeTab === "overview" && (bookingMode === "procedure" ? "ข้อมูลกิจกรรมล่าสุดของคลินิก" : "ข้อมูลสถิติและการใช้งานห้องประชุม")}
                    {activeTab === "appointments" && "จัดการนัดหมายและตารางเวลา"}
                    {activeTab === "patients" && (bookingMode === "procedure" ? "จองห้อง หมอ และหัตถกรรม" : "จองห้องประชุมสำหรับการประชุมและกิจกรรม")}
                    {activeTab === "treatments" && "จัดการข้อมูลผู้ใช้และสิทธิ์การเข้าถึง"}
                    {activeTab === "rooms" && (bookingMode === "procedure" ? "จัดการห้องต่างๆ ในคลินิก" : "จัดการห้องประชุมทั้งหมด")}
                    {activeTab === "machines" && (bookingMode === "procedure" ? "จัดการเครื่องมือและอุปกรณ์ทางการแพทย์" : "จัดการอุปกรณ์และเทคโนโลยีห้องประชุม")}
                  </p>
                </div>

                {/* Booking Mode Switch - Show on overview tab */}
                {/* {activeTab === "overview" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="flex items-center gap-3 bg-card px-4 py-3 rounded-lg border border-border shadow-sm"
                  >
                    <span className="text-sm font-medium text-muted-foreground">โหมดระบบ:</span>
                    <div className="flex items-center gap-2 relative">
                      <style>{`
                        .btn-procedure:not(.active):hover {
                          background-color: #c5a059 !important;
                          color: white !important;
                          opacity: 0.8;
                        }
                        .btn-meeting:not(.active):hover {
                          background-color: #c89666 !important;
                          color: white !important;
                          opacity: 0.8;
                        }
                      `}</style>
                      <Button
                        variant={bookingMode === "procedure" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => {
                          if (bookingMode !== "procedure") {
                            setIsSwitchingMode(true);
                            setTimeout(() => {
                              setBookingMode("procedure");
                              setIsSwitchingMode(false);
                            }, 1200);
                          }
                        }}
                        disabled={isSwitchingMode}
                        className={`btn-procedure relative z-10 transition-all duration-500 ${bookingMode === "procedure"
                            ? "scale-105 text-white active"
                            : "hover:scale-105 text-gray-700"
                          }`}
                        style={bookingMode === "procedure" ? {
                          backgroundColor: "#c5a059",
                          color: "white"
                        } : {}}
                      >
                        ห้องหัตถการ
                      </Button>
                      <Button
                        variant={bookingMode === "meeting" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => {
                          if (bookingMode !== "meeting") {
                            setIsSwitchingMode(true);
                            setTimeout(() => {
                              setBookingMode("meeting");
                              setIsSwitchingMode(false);
                            }, 1200);
                          }
                        }}
                        disabled={isSwitchingMode}
                        className={`btn-meeting relative z-10 transition-all duration-500 ${bookingMode === "meeting"
                            ? "scale-105 text-white active"
                            : "hover:scale-105 text-gray-700"
                          }`}
                        style={bookingMode === "meeting" ? {
                          backgroundColor: themeColors.primary,
                          color: "white"
                        } : {}}
                      >
                        ห้องประชุม
                      </Button>
                    </div>
                  </motion.div>
                )} */}
              </div>
            </div>

            {/* Content based on active tab */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${bookingMode}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <PageTransition pageKey={activeTab}>
                  {isLoading ? (
                    <>
                      {activeTab === "overview" && <DashboardSkeleton />}
                      {activeTab === "appointments" && <CalendarSkeleton />}
                      {(activeTab === "patients" || activeTab === "treatments" || activeTab === "rooms" || activeTab === "machines") && <TableSkeleton />}
                    </>
                  ) : (
                    <div
                      style={{
                        '--theme-primary': themeColors.primary,
                        '--theme-secondary': themeColors.secondary,
                        '--theme-accent': themeColors.accent,
                      } as React.CSSProperties}
                    >
                      {activeTab === "overview" && (
                        <DashboardOverview
                          bookingMode={bookingMode}
                          onNavigateToCalendar={() => handleTabChange("appointments")}
                        />
                      )}
                      {activeTab === "appointments" && (
                        <AppointmentsCalendar
                          bookingMode={bookingMode}
                          onNavigateToBooking={() => handleTabChange("patients")}
                        />
                      )}
                      {activeTab === "patients" && (
                        bookingMode === "procedure"
                          ? <BookingSystem
                            userRole={userRole}
                            onNavigateToCalendar={() => handleTabChange("appointments")}
                          />
                          : <MeetingBookingSystem userRole={userRole} />
                      )}
                      {activeTab === "treatments" && <PermissionsDemo currentUserRole={userRole} />}
                      {activeTab === "rooms" && <RoomManagement mode={bookingMode} />}
                      {activeTab === "machines" && bookingMode === "procedure" && <MachineManagement mode={bookingMode} />}
                      {activeTab === "procedures" && bookingMode === "procedure" && <ProcedureManagement />}
                    </div>
                  )}
                </PageTransition>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}