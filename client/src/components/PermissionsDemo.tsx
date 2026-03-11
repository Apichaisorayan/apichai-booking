import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ConfirmDialog } from "./ConfirmDialog";
import { NotificationDialog } from "./NotificationDialog";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
} from "lucide-react";
import { motion } from "motion/react";
import { UserRole, User as UserType } from '../types/booking';
import { usersApi } from '../lib/api';

interface PermissionsDemoProps {
  currentUserRole: UserRole;
}

interface UserWithStatus extends UserType {
  avatar?: string;
  password?: string;
  status: "active" | "inactive";
}

export function PermissionsDemo({ currentUserRole }: PermissionsDemoProps) {
  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create user form state
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.SALES,
  });

  // Edit user form state
  const [editUser, setEditUser] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.SALES,
    status: 'active' as 'active' | 'inactive',
  });

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await usersApi.getAll() as any[];

      // Transform API data to component format
      const transformedData = data.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role as UserRole,
        isActive: !!user.is_available,
        status: (!!user.is_available ? 'active' : 'inactive') as 'active' | 'inactive',
      }));

      setUsers(transformedData);
    } catch (error: any) {
      setNotificationTitle('เกิดข้อผิดพลาด');
      setNotificationDescription('ไม่สามารถโหลดผู้ใช้ได้: ' + error.message);
      setNotificationType('error');
      setNotificationOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDescription, setConfirmDescription] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  // Notification Dialog State
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationDescription, setNotificationDescription] = useState("");
  const [notificationType, setNotificationType] = useState<"success" | "error" | "loading">("success");

  // Current user (for demo purposes)
  const currentUserId = "3"; // Assume current user is ID 3 (Sales)

  const checkEditPermission = (targetUser: UserWithStatus): boolean => {
    // Doctor role is view-only
    if (currentUserRole === UserRole.DOCTOR) {
      setNotificationTitle("ไม่มีสิทธิ์แก้ไข");
      setNotificationDescription("บัญชี Doctor สามารถดูข้อมูลเท่านั้น");
      setNotificationType("error");
      setNotificationOpen(true);
      return false;
    }

    // Sales role permissions
    if (currentUserRole === UserRole.SALES) {
      // Can only edit Doctor
      if (targetUser.role === UserRole.DOCTOR) {
        return true;
      }
      // Cannot edit other Sales users
      if (targetUser.role === UserRole.SALES && targetUser.id !== currentUserId) {
        setNotificationTitle("ไม่สามารถแก้ไขได้");
        setNotificationDescription("Sales ไม่สามารถแก้ไข Sales คนอื่นได้");
        setNotificationType("error");
        setNotificationOpen(true);
        return false;
      }
      // Cannot edit CRM users
      if (targetUser.role === UserRole.CRM) {
        setNotificationTitle("ไม่สามารถแก้ไขได้");
        setNotificationDescription("Sales ไม่สามารถแก้ไข CRM ได้");
        setNotificationType("error");
        setNotificationOpen(true);
        return false;
      }
    }

    // CRM role permissions
    if (currentUserRole === UserRole.CRM) {
      // Cannot edit other CRM accounts
      if (targetUser.role === UserRole.CRM && targetUser.id !== currentUserId) {
        setNotificationTitle("ไม่สามารถแก้ไขได้");
        setNotificationDescription("CRM ไม่สามารถแก้ไข CRM คนอื่นได้");
        setNotificationType("error");
        setNotificationOpen(true);
        return false;
      }
      // Can edit all other roles
      return true;
    }

    return true;
  };

  const handleCreateUser = async () => {
    // Validate form
    if (!newUser.name || !newUser.email || !newUser.password) {
      setNotificationTitle('ข้อมูลไม่ครบถ้วน');
      setNotificationDescription('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      setNotificationType('error');
      setNotificationOpen(true);
      return;
    }

    try {
      // Show loading
      setNotificationTitle('กำลังสร้างผู้ใช้');
      setNotificationDescription('กรุณารอสักครู่...');
      setNotificationType('loading');
      setNotificationOpen(true);

      // Call API
      const result = await usersApi.create(newUser) as any;

      if (result.success) {
        // Close dialog
        setIsCreateDialogOpen(false);

        // Reset form
        setNewUser({
          name: '',
          email: '',
          password: '',
          role: UserRole.SALES,
        });

        // Refresh users list
        await fetchUsers();

        // Show success
        setNotificationTitle('สร้างสำเร็จ');
        setNotificationDescription(`สร้างผู้ใช้ ${newUser.name} เรียบร้อยแล้ว`);
        setNotificationType('success');
      } else {
        throw new Error(result.error || 'ไม่สามารถสร้างผู้ใช้ได้');
      }
    } catch (error: any) {
      setNotificationTitle('เกิดข้อผิดพลาด');
      setNotificationDescription(error.message || 'ไม่สามารถสร้างผู้ใช้ได้');
      setNotificationType('error');
      setNotificationOpen(true);
    }
  };

  const handleEditClick = (user: UserWithStatus) => {
    // เปิด Dialog แก้ไขได้เลย ไม่ต้องเช็คสิทธิ์ก่อน
    setSelectedUser(user);
    setEditUser({
      name: user.name,
      email: user.email,
      password: '', // Clear password field for security or reset
      role: user.role,
      status: user.status,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (user: UserWithStatus) => {
    // ตรวจสอบสิทธิ์ก่อน
    if (!checkEditPermission(user)) {
      return; // ถ้าไม่มีสิทธิ์ จะแสดง Alert และหยุด
    }

    // ถ้ามีสิทธิ์ ให้ยืนยันการลบด้วย ConfirmDialog
    setConfirmTitle("ยืนยันการลบ");
    setConfirmDescription(`คุณต้องการลบ ${user.name} ออกจากระบบใช่หรือไม่?`);
    setConfirmAction(() => async () => {
      try {
        // แสดง loading ก่อน
        setNotificationTitle("กำลังลบ");
        setNotificationDescription("กรุณารอสักครู่...");
        setNotificationType("loading");
        setNotificationOpen(true);

        // เรียก API ลบจริง
        await usersApi.delete(user.id);

        // Refresh ข้อมูล
        await fetchUsers();

        // แสดง success
        setNotificationTitle("ลบสำเร็จ");
        setNotificationDescription(`ลบ ${user.name} เรียบร้อยแล้ว`);
        setNotificationType("success");
      } catch (error: any) {
        setNotificationTitle("เกิดข้อผิดพลาด");
        setNotificationDescription(error.message || 'ไม่สามารถลบผู้ใช้ได้');
        setNotificationType("error");
      }
    });
    setConfirmOpen(true);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Role styling removed - using simple badges now

  return (
    <div className="space-y-6">
      {/* Notification Dialog */}
      <NotificationDialog
        open={notificationOpen}
        onOpenChange={setNotificationOpen}
        title={notificationTitle}
        description={notificationDescription}
        type={notificationType}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        description={confirmDescription}
        onConfirm={() => {
          if (confirmAction) {
            confirmAction();
          }
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-end">
        <Button
          className="bg-[#c5a059] hover:bg-[#008a8f]"
          onClick={() => {
            if (currentUserRole === UserRole.DOCTOR) {
              setNotificationTitle("ไม่มีสิทธิ์สร้าง");
              setNotificationDescription("บัญชี Doctor สามารถดูข้อมูลเท่านั้น");
              setNotificationType("error");
              setNotificationOpen(true);
            } else {
              setIsCreateDialogOpen(true);
            }
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มผู้ใช้ใหม่
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อ, อีเมล..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-[200px]">
            <Select
              value={filterRole}
              onValueChange={(value) => setFilterRole(value as UserRole | "all")}
            >
              <SelectTrigger>
                <SelectValue placeholder="กรองตามบทบาท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">บทบาททั้งหมด</SelectItem>
                <SelectItem value={UserRole.DOCTOR}>Doctor</SelectItem>
                <SelectItem value={UserRole.SALES}>Sales</SelectItem>
                <SelectItem value={UserRole.CRM}>CRM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ผู้ใช้</TableHead>
                <TableHead>รหัสผ่าน</TableHead>
                <TableHead>อีเมล</TableHead>
                <TableHead>บทบาท</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group hover:bg-muted/50"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-[#c5a059] text-white">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p>{user.name}</p>
                                              </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      {user.password || '********'}
                    </code>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      <span>{user.role}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.status === "active" ? (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        ใช้งาน
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-gray-50 text-gray-700 border-gray-200"
                      >
                        ไม่ใช้งาน
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleEditClick(user)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-[#800200] hover:text-[#800200] hover:bg-[#800200]/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteClick(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle>
            <DialogDescription>
              สร้างบัญชีผู้ใช้งานใหม่ในระบบ
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4 py-4" onSubmit={(e) => {
            e.preventDefault();
            handleCreateUser();
          }}>
            <div className="space-y-2">
              <Label htmlFor="create-name">ชื่อ-นามสกุล *</Label>
              <Input
                id="create-name"
                placeholder="กรอกชื่อ-นามสกุล"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">อีเมล *</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="example@clinic.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">รหัสผ่าน *</Label>
              <Input
                id="create-password"
                type="password"
                placeholder="กรอกรหัสผ่าน"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">บทบาท *</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.DOCTOR}>Doctor</SelectItem>
                  <SelectItem value={UserRole.SALES}>Sales</SelectItem>
                  <SelectItem value={UserRole.CRM}>CRM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setNewUser({
                    name: '',
                    email: '',
                    password: '',
                    role: UserRole.SALES,
                  });
                }}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-[#c5a059] hover:bg-[#008a8f]"
              >
                สร้างผู้ใช้
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลผู้ใช้</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูล {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form className="space-y-4 py-4" onSubmit={async (e) => {
              e.preventDefault();

              // ตรวจสอบสิทธิ์ก่อนบันทึก
              if (!checkEditPermission(selectedUser)) {
                return; // ถ้าไม่มีสิทธิ์ จะแสดง Alert และหยุด
              }

              // ถ้ามีสิทธิ์ ให้ปิด Edit Dialog ก่อน แล้วเปิด ConfirmDialog
              setIsDialogOpen(false); // ปิด Edit Dialog

              // เปิด ConfirmDialog
              setConfirmTitle("บันทึกการแก้ไข");
              setConfirmDescription(`คุณต้องการบันทึกการแก้ไขข้อมูล ${selectedUser.name} ใช่หรือไม่?`);
              setConfirmAction(() => async () => {
                try {
                  // แสดง loading ก่อน
                  setNotificationTitle("กำลังบันทึก");
                  setNotificationDescription("กรุณารอสักครู่...");
                  setNotificationType("loading");
                  setNotificationOpen(true);

                  const updates: any = {
                    name: editUser.name,
                    email: editUser.email,
                    role: editUser.role,
                    is_available: editUser.status === 'active' ? 1 : 0,
                  };

                  if (editUser.password) {
                    updates.password = editUser.password;
                  }

                  // เรียก API แก้ไขจริง
                  await usersApi.update(selectedUser.id, updates);

                  // Refresh ข้อมูล
                  await fetchUsers();

                  // แสดง success
                  setNotificationTitle("บันทึกสำเร็จ");
                  setNotificationDescription(`แก้ไขข้อมูล ${editUser.name} เรียบร้อยแล้ว`);
                  setNotificationType("success");
                } catch (error: any) {
                  setNotificationTitle("เกิดข้อผิดพลาด");
                  setNotificationDescription(error.message || 'ไม่สามารถบันทึกข้อมูลได้');
                  setNotificationType("error");
                }
              });
              setConfirmOpen(true);
            }}>
              <div className="space-y-2">
                <Label htmlFor="edit-name">ชื่อ-นามสกุล</Label>
                <Input
                  id="edit-name"
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">อีเมล</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">รหัสผ่าน (ปล่อยว่างถ้าไม่ต้องการเปลี่ยน)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="กรอกรหัสผ่านใหม่"
                  value={editUser.password}
                  onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">บทบาท</Label>
                <Select
                  value={editUser.role}
                  onValueChange={(value) => setEditUser({ ...editUser, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.DOCTOR}>Doctor</SelectItem>
                    <SelectItem value={UserRole.SALES}>Sales</SelectItem>
                    <SelectItem value={UserRole.CRM}>CRM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">สถานะ</Label>
                <Select
                  value={editUser.status}
                  onValueChange={(value) => setEditUser({ ...editUser, status: value as 'active' | 'inactive' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">ใช้งาน</SelectItem>
                    <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  className="bg-[#c5a059] hover:bg-[#008a8f]"
                >
                  บันทึกการเปลี่ยนแปลง
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
