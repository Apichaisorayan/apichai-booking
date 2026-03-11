import { useState, useEffect } from "react";
import { Bell, Check, Trash2, Calendar, User, AlertCircle, Clock, Settings } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { NotificationSettings } from "./NotificationSettings";
import { notificationsApi } from "../lib/api";
import { Notification, NotificationType } from "../types/notification";
import { toast } from "sonner";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const fetchNotifications = async () => {
    try {
      const response: any = await notificationsApi.getAll(false, 10);
      if (response.success) {
        setNotifications(response.data || []);
        setUnreadCount(response.unread_count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('ไม่สามารถทำเครื่องหมายว่าอ่านแล้ว');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setIsLoading(true);
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      toast.success('ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.delete(id);
      const notification = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast.success('ลบการแจ้งเตือนแล้ว');
    } catch (error) {
      toast.error('ไม่สามารถลบการแจ้งเตือน');
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.BOOKING_CREATED:
      case NotificationType.BOOKING_UPDATED:
      case NotificationType.BOOKING_REMINDER:
        return <Calendar className="h-4 w-4" />;
      case NotificationType.BOOKING_CANCELLED:
        return <AlertCircle className="h-4 w-4" />;
      case NotificationType.USER_CREATED:
        return <User className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.BOOKING_CREATED:
        return 'text-blue-600 bg-blue-50';
      case NotificationType.BOOKING_CANCELLED:
        return 'text-red-600 bg-red-50';
      case NotificationType.BOOKING_UPDATED:
        return 'text-yellow-600 bg-yellow-50';
      case NotificationType.USER_CREATED:
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'เมื่อสักครู่';
      if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} ชั่วโมงที่แล้ว`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} วันที่แล้ว`;
    } catch {
      return dateString;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    if (!notification.is_read) {
      handleMarkAsRead(notification.id, {} as any);
    }
  };

  const formatFullDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative"
        onClick={() => setIsOpen(true)}
      >
        <motion.div
          animate={unreadCount > 0 ? {
            rotate: [0, -10, 10, -10, 10, 0],
            transition: {
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 2
            }
          } : {}}
        >
          <Bell className="h-5 w-5" />
        </motion.div>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-[#800200]"
          />
        )}
      </Button>

      {/* Main Notifications Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col">
          <DialogHeader className="flex-shrink-0 space-y-3 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl mb-2">การแจ้งเตือน</DialogTitle>
                <DialogDescription>
                  {unreadCount > 0 
                    ? `คุณมีการแจ้งเตือนใหม่ ${unreadCount} รายการ`
                    : 'ไม่มีการแจ้งเตือนใหม่'}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs bg-[#c5a059] text-white hover:bg-[#008a8f] transition-colors flex-shrink-0"
                    onClick={handleMarkAllAsRead}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว
                  </Button>
                )}
                <NotificationSettings 
                  trigger={
                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                      <Settings className="h-5 w-5" />
                    </Button>
                  }
                />
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Bell className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <p className="text-lg font-medium mb-1">ไม่มีการแจ้งเตือน</p>
                <p className="text-sm text-muted-foreground">
                  เมื่อมีการแจ้งเตือนใหม่ จะแสดงที่นี่
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-2">
                  <AnimatePresence>
                    {notifications.map((notification, index) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: index * 0.05 }}
                        className={`group relative rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md ${
                          !notification.is_read 
                            ? 'bg-[#c5a059]/5 border-[#c5a059]/20' 
                            : 'bg-background hover:bg-muted/50'
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`rounded-full p-2 flex-shrink-0 ${getColor(notification.type)}`}>
                            {getIcon(notification.type)}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm">
                                  {notification.title}
                                </h4>
                                {!notification.is_read && (
                                  <Badge className="h-2 w-2 rounded-full p-0 bg-[#800200]" />
                                )}
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(notification.created_at)}
                            </div>
                          </div>

                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => handleDelete(notification.id, e)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Detail Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="max-w-lg">
          {selectedNotification && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <div className={`rounded-full p-3 ${getColor(selectedNotification.type)}`}>
                    {getIcon(selectedNotification.type)}
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl mb-2">
                      {selectedNotification.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatFullDate(selectedNotification.created_at)}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedNotification.message}
                  </p>
                </div>

                {selectedNotification.related_type && (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">
                      {selectedNotification.related_type === 'booking' && 'การจอง'}
                      {selectedNotification.related_type === 'user' && 'ผู้ใช้'}
                      {selectedNotification.related_type === 'room' && 'ห้อง'}
                      {selectedNotification.related_type === 'machine' && 'เครื่องมือ'}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedNotification(null)}
                >
                  ปิด
                </Button>
                {selectedNotification.related_type === 'booking' && (
                  <Button
                    className="bg-[#c5a059] hover:bg-[#008a8f]"
                    onClick={() => {
                      console.log('Navigate to booking:', selectedNotification.related_id);
                      setSelectedNotification(null);
                    }}
                  >
                    ดูรายละเอียด
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
