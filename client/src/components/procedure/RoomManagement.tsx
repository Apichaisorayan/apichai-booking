import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, DoorOpen, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { roomsApi } from '../../lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { motion } from 'motion/react';
import { ConfirmDialog } from '../ConfirmDialog';
import { NotificationDialog } from '../NotificationDialog';

type RoomType = 'PREP' | 'TREATMENT' | 'CONSULTATION' | 'PROCEDURE' | 'MEETING' | 'BOTH';

interface Room {
  id: string;
  name: string;
  is_available: number;
  room_type?: RoomType;
  created_at: string;
  updated_at: string;
}

interface RoomManagementProps {
  mode?: 'procedure' | 'meeting';
}

export function RoomManagement({ mode = 'procedure' }: RoomManagementProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    is_available: true,
    room_types: ['TREATMENT'] as RoomType[],
  });

  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDescription, setConfirmDescription] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  // Notification Dialog State
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationDescription, setNotificationDescription] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'loading'>('success');

  useEffect(() => {
    loadRooms();
  }, [mode]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const type = mode === 'procedure' ? 'PROCEDURE' : 'MEETING';
      const data = await roomsApi.getAll({ type });
      setRooms(data as Room[]);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      setNotificationTitle('เกิดข้อผิดพลาด');
      setNotificationDescription('ไม่สามารถโหลดข้อมูลห้องได้');
      setNotificationType('error');
      setNotificationOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRoom(null);
    setFormData({
      name: '',
      is_available: true,
      room_types: mode === 'procedure' ? ['TREATMENT'] : ['MEETING'],
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    
    // Handle different room types
    let roomTypes: RoomType[] = ['TREATMENT'];
    if (room.room_type === 'BOTH') {
      roomTypes = ['PREP', 'TREATMENT']; // For TR1, TR4 that are both PREP and TREATMENT
    } else if (room.room_type) {
      roomTypes = [room.room_type];
    }
    
    setFormData({
      name: room.name,
      is_available: room.is_available === 1,
      room_types: roomTypes,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (room: Room) => {
    setConfirmTitle('ยืนยันการลบ');
    setConfirmDescription(`คุณต้องการลบห้อง "${room.name}" ใช่หรือไม่?`);
    setConfirmAction(() => async () => {
      try {
        setNotificationTitle('กำลังลบ');
        setNotificationDescription('กรุณารอสักครู่...');
        setNotificationType('loading');
        setNotificationOpen(true);

        await roomsApi.delete(room.id);
        await loadRooms();

        setNotificationTitle('ลบสำเร็จ');
        setNotificationDescription(`ลบห้อง "${room.name}" เรียบร้อยแล้ว`);
        setNotificationType('success');
      } catch (error) {
        setNotificationTitle('เกิดข้อผิดพลาด');
        setNotificationDescription('ไม่สามารถลบห้องได้');
        setNotificationType('error');
      }
    });
    setConfirmOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setNotificationTitle('ข้อมูลไม่ครบถ้วน');
      setNotificationDescription('กรุณากรอกชื่อห้อง');
      setNotificationType('error');
      setNotificationOpen(true);
      return;
    }

    try {
      setNotificationTitle(editingRoom ? 'กำลังบันทึก' : 'กำลังสร้าง');
      setNotificationDescription('กรุณารอสักครู่...');
      setNotificationType('loading');
      setNotificationOpen(true);

      // Convert room_types array to appropriate room_type for backend
      let roomType: RoomType = 'TREATMENT';
      if (formData.room_types.includes('PREP') && formData.room_types.includes('TREATMENT')) {
        roomType = 'BOTH'; // For rooms that are both PREP and TREATMENT
      } else if (formData.room_types.includes('PREP')) {
        roomType = 'PREP';
      } else if (formData.room_types.includes('CONSULTATION')) {
        roomType = 'CONSULTATION';
      } else {
        roomType = 'TREATMENT';
      }

      const backendData = {
        ...formData,
        room_type: roomType,
      };

      if (editingRoom) {
        await roomsApi.update(editingRoom.id, backendData);
        setNotificationTitle('บันทึกสำเร็จ');
        setNotificationDescription(`แก้ไขห้อง "${formData.name}" เรียบร้อยแล้ว`);
      } else {
        await roomsApi.create(backendData);
        setNotificationTitle('สร้างสำเร็จ');
        setNotificationDescription(`สร้างห้อง "${formData.name}" เรียบร้อยแล้ว`);
      }

      setNotificationType('success');
      setIsDialogOpen(false);
      await loadRooms();
    } catch (error) {
      setNotificationTitle('เกิดข้อผิดพลาด');
      setNotificationDescription('ไม่สามารถบันทึกข้อมูลได้');
      setNotificationType('error');
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          onClick={handleCreate}
          className="bg-[#c5a059] hover:bg-[#008a8f] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มห้องใหม่
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="ค้นหาห้อง..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Rooms Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c5a059]"></div>
          <p className="mt-2 text-gray-600">กำลังโหลด...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <DoorOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">ไม่พบห้อง</p>
            <p className="text-gray-400 text-sm mt-1">ลองค้นหาด้วยคำอื่น หรือเพิ่มห้องใหม่</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group hover:shadow-lg transition-all duration-300 hover:border-[#c5a059]/50 relative overflow-hidden">
                {/* Status indicator bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${room.is_available ? 'bg-green-500' : 'bg-gray-400'
                  }`} />

                <div className="p-6">
                  {/* Icon and Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${room.is_available
                      ? 'bg-gradient-to-br from-green-100 to-green-50'
                      : 'bg-gray-100'
                      }`}>
                      <DoorOpen className={`h-7 w-7 ${room.is_available ? 'text-green-600' : 'text-gray-400'
                        }`} />
                    </div>
                    <Badge className={
                      room.is_available
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }>
                      {room.is_available ? 'ว่าง' : 'ไม่ว่าง'}
                    </Badge>
                  </div>

                  {/* Room Name */}
                  <h3 className="text-xl font-semibold text-[#002b38] mb-2 group-hover:text-[#c5a059] transition-colors">
                    {room.name}
                  </h3>

                  {/* Room Type Badge */}
                  {room.room_type && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {room.room_type === 'PREP' && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          ห้องแปะยาชา
                        </Badge>
                      )}
                      {room.room_type === 'CONSULTATION' && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          ห้องปรึกษา
                        </Badge>
                      )}
                      {room.room_type === 'TREATMENT' && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          ห้องทำหัตถการ
                        </Badge>
                      )}
                      {room.room_type === 'PROCEDURE' && (
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                          ห้องหัตถการ (ทั่วไป)
                        </Badge>
                      )}
                      {room.room_type === 'MEETING' && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          ห้องประชุม
                        </Badge>
                      )}
                      {room.room_type === 'BOTH' && (
                        <>
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            ห้องแปะยาชา
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            ห้องทำหัตถการ
                          </Badge>
                        </>
                      )}
                    </div>
                  )}

                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={() => handleEdit(room)}
                      variant="outline"
                      size="sm"
                      className="flex-1 hover:scale-105 hover:shadow-md transition-all duration-200"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                      แก้ไข
                    </Button>
                    <Button
                      onClick={() => handleDelete(room)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? 'แก้ไขห้อง' : 'เพิ่มห้องใหม่'}
            </DialogTitle>
            <DialogDescription>
              {editingRoom ? `แก้ไขข้อมูลห้อง ${editingRoom.name}` : 'สร้างห้องใหม่ในระบบ'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อห้อง *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น ห้อง 101, L1, TR1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>ประเภทห้อง *</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="prep"
                      checked={formData.room_types.includes('PREP')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, room_types: [...formData.room_types, 'PREP'] });
                        } else {
                          setFormData({ ...formData, room_types: formData.room_types.filter(t => t !== 'PREP') });
                        }
                      }}
                    />
                    <Label htmlFor="prep" className="text-sm font-medium">
                      PREP - ห้องแปะยาชา 
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="consultation"
                      checked={formData.room_types.includes('CONSULTATION')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, room_types: [...formData.room_types, 'CONSULTATION'] });
                        } else {
                          setFormData({ ...formData, room_types: formData.room_types.filter(t => t !== 'CONSULTATION') });
                        }
                      }}
                    />
                    <Label htmlFor="consultation" className="text-sm font-medium">
                      CONSULTATION - ห้องปรึกษา 
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="treatment"
                      checked={formData.room_types.includes('TREATMENT')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, room_types: [...formData.room_types, 'TREATMENT'] });
                        } else {
                          setFormData({ ...formData, room_types: formData.room_types.filter(t => t !== 'TREATMENT') });
                        }
                      }}
                    />
                    <Label htmlFor="treatment" className="text-sm font-medium">
                      TREATMENT - ห้องทำหัตถการ 
                    </Label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  เลือกประเภทห้องที่สามารถใช้งานได้ (สามารถเลือกได้มากกว่า 1 ประเภท)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_available">สถานะความพร้อม</Label>
                <Select
                  value={formData.is_available ? 'true' : 'false'}
                  onValueChange={(value) => setFormData({ ...formData, is_available: value === 'true' })}
                >
                  <SelectTrigger id="is_available">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">
                      <div className="flex items-center gap-2 text-green-600">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span>พร้อมใช้งาน</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="false">
                      <div className="flex items-center gap-2 text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        <span>ไม่พร้อมใช้งาน</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-[#c5a059] hover:bg-[#008a8f] text-white"
              >
                {editingRoom ? 'บันทึก' : 'เพิ่ม'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
