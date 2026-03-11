import { useState, useEffect } from "react";
import { motion } from "motion/react";
import logo from "./assets/logo.png";
import { LoginForm } from "./components/LoginForm";
import { Dashboard } from "./components/shared/Dashboard";
import { LoadingScreen } from "./components/LoadingScreen";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { Toaster } from "./components/ui/sonner";
import { Shield, Award, Sparkles } from "lucide-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { GoogleCalendarCallback } from "./components/GoogleCalendarCallback";

function AppContent() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Check if this is OAuth callback
  if (window.location.pathname === '/auth/callback') {
    return <GoogleCalendarCallback />;
  }

  const handleLoginSuccess = () => {
    setIsLoggingIn(true);
    setTimeout(() => {
      setIsLoggingIn(false);
    }, 1000);
  };

  if (authLoading) {
    return <LoadingScreen message="กำลังโหลด..." />;
  }

  if (isLoggingIn) {
    return <LoadingScreen message="กำลังเข้าสู่ระบบ..." />;
  }

  if (user) {
    return (
      <>
        <Dashboard onLogout={logout} />
        <PWAInstallPrompt />
        <Toaster />
      </>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side — Apichai Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#002b38]">
        <div className="absolute inset-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1700142360825-d21edc53c8db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBjbGluaWMlMjBsdXh1cnklMjBzcGF8ZW58MXx8fHwxNzY0NzMxNTI2fDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Apichai Clinic"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#002b38]/95 via-[#002b38]/90 to-[#c5a059]/30" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Logo + Title */}
          <div>
            <div className="flex items-center gap-5 mb-4 group cursor-default">
              <div className="relative">
                {/* Gold glow */}
                <div className="absolute inset-0 bg-[#c5a059] opacity-25 blur-xl rounded-full group-hover:opacity-40 transition-opacity" />
                <div className="relative w-24 h-24 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(197,160,89,0.3)] bg-gradient-to-br from-white/10 to-transparent p-2 border border-white/20 flex items-center justify-center">
                  <motion.img
                    src={logo}
                    alt="Apichai Logo"
                    className="w-full h-full object-contain"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  />
                </div>
              </div>

              <div>
                <h1 className="text-4xl tracking-tighter font-bold text-white flex flex-col">
                  <span className="text-[#c5a059]">APICHAI</span>
                  <span className="text-sm font-light tracking-[0.4em] opacity-60 -mt-1 uppercase">
                    Booking System
                  </span>
                </h1>
                <div className="h-1 w-16 bg-gradient-to-r from-[#c5a059] to-transparent mt-2 rounded-full" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl mb-4 leading-tight">
                ยินดีต้อนรับสู่
                <br />
                <span className="text-[#c5a059]">ระบบจัดการจอง</span>
              </h2>
              <p className="text-white/80 text-lg">
                ปลอดภัย ทันสมัย และพร้อมดูแลคุณในทุกขั้นตอน
              </p>
            </div>

            <div className="grid gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-[#c5a059]" />
                </div>
                <div>
                  <h3 className="mb-1">ระบบรักษาความปลอดภัย</h3>
                  <p className="text-white/70 text-sm">
                    ข้อมูลของคุณได้รับการปกป้องด้วยมาตรฐานสูงสุด
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Award className="w-6 h-6 text-[#c5a059]" />
                </div>
                <div>
                  <h3 className="mb-1">บริการมืออาชีพ</h3>
                  <p className="text-white/70 text-sm">
                    ทีมงานผู้เชี่ยวชาญพร้อมให้คำปรึกษาและดูแลคุณ
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-[#c5a059]" />
                </div>
                <div>
                  <h3 className="mb-1">เทคโนโลยีล้ำสมัย</h3>
                  <p className="text-white/70 text-sm">
                    อุปกรณ์และเทคนิคการรักษาที่ทันสมัยที่สุด
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-white/50 text-sm">
            © 2025 Apichai Beauty & Aesthetic Clinic. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side — Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 bg-background">
        <div className="flex-1 flex flex-col justify-center items-center w-full">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-[#c5a059] opacity-20 blur-lg rounded-full" />
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[#002b38] border-2 border-[#c5a059]/40 flex items-center justify-center p-1">
                  <img src={logo} alt="Apichai Logo" className="w-full h-full object-contain" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl text-[#002b38] font-bold">
                  <span className="text-[#c5a059]">APICHAI</span>
                </h1>
                <p className="text-[#c5a059] text-xs tracking-widest uppercase opacity-70">
                  Booking System
                </p>
              </div>
            </div>

            <div className="mb-5">
              <h2 className="text-3xl text-[#002b38] mb-2">
                เข้าสู่ระบบ
              </h2>
              <p className="text-muted-foreground text-sm">
                ยินดีต้อนรับกลับมา! กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ
              </p>
            </div>

            {/* Login Form */}
            <div className="relative">
              <LoginForm
                onSwitchToRegister={() => { }}
                onLoginSuccess={handleLoginSuccess}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}