import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Wrench, Search, DoorOpen, Stethoscope, Trash } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { machinesApi, roomsApi, proceduresApi } from '../../lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { motion } from 'motion/react';
import { ConfirmDialog } from '../ConfirmDialog';
import { NotificationDialog } from '../NotificationDialog';

interface Machine {
  id: string;
  name: string;
  type: 'MOVABLE' | 'FIXED';
  room_id: string | null;
  room_ids?: string; // Comma-separated string from backend GROUP_CONCAT
  is_available: number;
  created_at: string;
  updated_at: string;
  room_name?: string;
  procedures?: Procedure[];
}

interface Room {
  id: string;
  name: string;
}

interface Procedure {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  is_active: number;
}

interface MachineManagementProps {
  mode?: 'procedure' | 'meeting';
}

export function MachineManagement({ mode = 'procedure' }: MachineManagementProps) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'MOVABLE' | 'FIXED'>('ALL');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'MOVABLE' as 'MOVABLE' | 'FIXED',
    room_id: '',
    room_ids: [] as string[],
    procedure_ids: [] as string[],
    custom_procedure: '',
    is_available: true,
  });

  // Bulk delete state
  const [selectedMachines, setSelectedMachines] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

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
    loadData();
  }, [mode]);

  const loadData = async () => {
    try {
      setLoading(true);
      const category = mode === 'procedure' ? 'MEDICAL' : 'MEETING';
      const roomType = mode === 'procedure' ? 'PROCEDURE' : 'MEETING';

      const [machinesData, roomsData, proceduresData] = await Promise.all([
        machinesApi.getAll({ category, include_procedures: true }),
        roomsApi.getAll({ type: roomType }),
        mode === 'procedure' ? proceduresApi.getAll(true) : Promise.resolve([]),
      ]);
      setMachines(machinesData as Machine[]);
      setRooms(roomsData as Room[]);
      setProcedures(proceduresData as Procedure[]);
    } catch (error) {
      console.error('Failed to load data:', error);
      setNotificationTitle('เกิดข้อผิดพลาด');
      setNotificationDescription('ไม่สามารถโหลดข้อมูลได้');
      setNotificationType('error');
      setNotificationOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingMachine(null);
    setFormData({ name: '', type: 'MOVABLE', room_id: '', room_ids: [], procedure_ids: [], custom_procedure: '', is_available: true });
    setIsDialogOpen(true);
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);

    // Parse room_ids from comma-separated string if exists
    const roomIdsArray = machine.room_ids
      ? machine.room_ids.split(',').filter(id => id.trim() !== '')
      : machine.room_id ? [machine.room_id] : [];

    setFormData({
      name: machine.name,
      type: machine.type,
      room_id: machine.room_id || '',
      room_ids: roomIdsArray,
      procedure_ids: machine.procedures?.map(p => p.id) || [],
      custom_procedure: '',
      is_available: !!machine.is_available,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (machine: Machine) => {
    setConfirmTitle('ยืนยันการลบ');
    setConfirmDescription(`คุณต้องการลบเครื่องมือ "${machine.name}" ใช่หรือไม่?`);
    setConfirmAction(() => async () => {
      try {
        setNotificationTitle('กำลังลบ');
        setNotificationDescription('กรุณารอสักครู่...');
        setNotificationType('loading');
        setNotificationOpen(true);

        await machinesApi.delete(machine.id);
        await loadData();

        setNotificationTitle('ลบสำเร็จ');
        setNotificationDescription(`ลบเครื่องมือ "${machine.name}" เรียบร้อยแล้ว`);
        setNotificationType('success');
      } catch (error) {
        setNotificationTitle('เกิดข้อผิดพลาด');
        setNotificationDescription('ไม่สามารถลบเครื่องมือได้');
        setNotificationType('error');
      }
    });
    setConfirmOpen(true);
  };

  const handleToggleSelect = (machineId: string) => {
    const newSelected = new Set(selectedMachines);
    if (newSelected.has(machineId)) {
      newSelected.delete(machineId);
    } else {
      newSelected.add(machineId);
    }
    setSelectedMachines(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedMachines.size === filteredMachines.length) {
      setSelectedMachines(new Set());
    } else {
      setSelectedMachines(new Set(filteredMachines.map(m => m.id)));
    }
  };

  const handleBulkDelete = () => {
    const count = selectedMachines.size;
    setConfirmTitle('ยืนยันการลบหลายรายการ');
    setConfirmDescription(`คุณต้องการลบเครื่องมือที่เลือก ${count} รายการใช่หรือไม่?`);
    setConfirmAction(() => async () => {
      try {
        setNotificationTitle('กำลังลบ');
        setNotificationDescription(`กำลังลบ ${count} รายการ...`);
        setNotificationType('loading');
        setNotificationOpen(true);

        // Delete all selected machines
        await Promise.all(
          Array.from(selectedMachines).map(id => machinesApi.delete(id))
        );

        setSelectedMachines(new Set());
        setIsSelectMode(false);
        await loadData();

        setNotificationTitle('ลบสำเร็จ');
        setNotificationDescription(`ลบเครื่องมือ ${count} รายการเรียบร้อยแล้ว`);
        setNotificationType('success');
      } catch (error) {
        setNotificationTitle('เกิดข้อผิดพลาด');
        setNotificationDescription('ไม่สามารถลบเครื่องมือบางรายการได้');
        setNotificationType('error');
      }
    });
    setConfirmOpen(true);
  };

  const handleCancelSelect = () => {
    setIsSelectMode(false);
    setSelectedMachines(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setNotificationTitle('ข้อมูลไม่ครบถ้วน');
      setNotificationDescription('กรุณากรอกชื่อเครื่องมือ');
      setNotificationType('error');
      setNotificationOpen(true);
      return;
    }

    if (formData.type === 'FIXED' && formData.room_ids.length === 0) {
      setNotificationTitle('ข้อมูลไม่ครบถ้วน');
      setNotificationDescription('กรุณาเลือกอย่างน้อย 1 ห้องสำหรับเครื่องมือแบบติดตั้งถาวร');
      setNotificationType('error');
      setNotificationOpen(true);
      return;
    }

    const category = mode === 'procedure' ? 'MEDICAL' : 'MEETING';

    const submitData = {
      name: formData.name,
      type: formData.type,
      room_id: formData.room_ids.length > 0 ? formData.room_ids[0] : null,
      room_ids: formData.room_ids,
      is_available: formData.is_available,
      machine_type_category: category,
    };

    try {
      setNotificationTitle(editingMachine ? 'กำลังบันทึก' : 'กำลังสร้าง');
      setNotificationDescription('กรุณารอสักครู่...');
      setNotificationType('loading');
      setNotificationOpen(true);

      let machineId: string;

      if (editingMachine) {
        await machinesApi.update(editingMachine.id, submitData);
        machineId = editingMachine.id;
        setNotificationTitle('บันทึกสำเร็จ');
        setNotificationDescription(`แก้ไขเครื่องมือ "${formData.name}" เรียบร้อยแล้ว`);
      } else {
        const created = await machinesApi.create(submitData) as any;
        machineId = created.id;
        setNotificationTitle('สร้างสำเร็จ');
        setNotificationDescription(`สร้างเครื่องมือ "${formData.name}" เรียบร้อยแล้ว`);
      }

      // Link procedures to machine (only for procedure mode)
      if (mode === 'procedure') {
        await proceduresApi.bulkLinkToMachine(machineId, formData.procedure_ids);
      }

      // Create custom procedure if provided
      if (mode === 'procedure' && formData.custom_procedure.trim()) {
        try {
          const newProcedure = await proceduresApi.create({
            name: formData.custom_procedure.trim(),
            duration_minutes: 30,
            is_active: true,
          }) as any;

          // Link the new procedure to the machine
          await proceduresApi.linkToMachine(newProcedure.id, machineId);
        } catch (error) {
          console.error('Failed to create custom procedure:', error);
        }
      }

      setNotificationType('success');
      setIsDialogOpen(false);
      await loadData();
    } catch (error) {
      setNotificationTitle('เกิดข้อผิดพลาด');
      setNotificationDescription('ไม่สามารถบันทึกข้อมูลได้');
      setNotificationType('error');
    }
  };

  const filteredMachines = machines.filter(machine => {
    const matchesSearch = machine.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || machine.type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeBadgeColor = (type: 'MOVABLE' | 'FIXED') => {
    return type === 'MOVABLE'
      ? 'bg-purple-100 text-purple-700 border-purple-200'
      : 'bg-orange-100 text-orange-700 border-orange-200';
  };

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
      <div className="flex items-center justify-end gap-2">
        {isSelectMode ? (
          <>
            <Button
              variant="outline"
              onClick={handleCancelSelect}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleBulkDelete}
              disabled={selectedMachines.size === 0}
              className="bg-[#800200] hover:bg-[#600100] text-white"
            >
              <Trash className="h-4 w-4 mr-2" />
              ลบที่เลือก ({selectedMachines.size})
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => setIsSelectMode(true)}
              disabled={machines.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              เลือกลบ
            </Button>
            <Button
              onClick={handleCreate}
              className="bg-[#c5a059] hover:bg-[#008a8f] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มเครื่องมือใหม่
            </Button>
          </>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="ค้นหาเครื่องมือ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-[200px]">
            <Select value={filterType} onValueChange={(value: 'ALL' | 'MOVABLE' | 'FIXED') => setFilterType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="กรองตามประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทั้งหมด</SelectItem>
                <SelectItem value="MOVABLE">เคลื่อนย้ายได้</SelectItem>
                <SelectItem value="FIXED">ติดตั้งถาวร</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Machines Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c5a059]"></div>
          <p className="mt-2 text-gray-600">กำลังโหลด...</p>
        </div>
      ) : filteredMachines.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Wrench className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">ไม่พบเครื่องมือ</p>
            <p className="text-gray-400 text-sm mt-1">ลองค้นหาด้วยคำอื่น หรือเพิ่มเครื่องมือใหม่</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {isSelectMode && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedMachines.size === filteredMachines.length && filteredMachines.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>เครื่องมือ</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>ห้อง</TableHead>
                  <TableHead>หัตถการ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  {!isSelectMode && <TableHead className="text-right">การจัดการ</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMachines.map((machine, index) => (
                  <motion.tr
                    key={machine.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group hover:bg-muted/50"
                  >
                    {isSelectMode && (
                      <TableCell>
                        <Checkbox
                          checked={selectedMachines.has(machine.id)}
                          onCheckedChange={() => handleToggleSelect(machine.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${machine.is_available
                          ? 'bg-[#c5a059]/10'
                          : 'bg-gray-100'
                          }`}>
                          <Wrench className={`h-5 w-5 ${machine.is_available ? 'text-[#c5a059]' : 'text-gray-400'
                            }`} />
                        </div>
                        <div>
                          <p className="font-medium">{machine.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeBadgeColor(machine.type)}>
                        {machine.type === 'MOVABLE' ? 'เคลื่อนย้ายได้' : 'ติดตั้งถาวร'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {machine.room_name ? (
                        <div className="flex flex-wrap gap-1 items-center text-sm">
                          <DoorOpen className="h-4 w-4 text-muted-foreground mr-1" />
                          {machine.room_name.split(', ').map((name, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 font-normal bg-muted/30">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[400px]">
                      {machine.procedures && machine.procedures.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 py-1">
                          {machine.procedures.map((proc) => (
                            <Badge
                              key={proc.id}
                              variant="outline"
                              className="bg-[#c5a059]/5 text-[#c5a059] border-[#c5a059]/20 text-[11px] py-0.5 px-2 hover:bg-[#c5a059]/10 transition-colors cursor-default whitespace-nowrap"
                            >
                              {proc.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {machine.is_available ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          พร้อมใช้งาน
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-gray-50 text-gray-700 border-gray-200"
                        >
                          ไม่พร้อมใช้งาน
                        </Badge>
                      )}
                    </TableCell>
                    {!isSelectMode && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleEdit(machine)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-[#800200] hover:text-[#800200] hover:bg-[#800200]/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(machine)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMachine ? 'แก้ไขเครื่องมือ' : 'เพิ่มเครื่องมือใหม่'}
            </DialogTitle>
            <DialogDescription>
              {editingMachine ? `แก้ไขข้อมูลเครื่องมือ ${editingMachine.name}` : 'สร้างเครื่องมือใหม่ในระบบ'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อเครื่องมือ *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น Laser Machine A"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">ประเภท *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'MOVABLE' | 'FIXED') =>
                    setFormData({ ...formData, type: value, room_ids: value === 'MOVABLE' ? formData.room_ids : formData.room_ids })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MOVABLE">เคลื่อนย้ายได้</SelectItem>
                    <SelectItem value="FIXED">ติดตั้งถาวร</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>ห้องที่พร้อมใช้ / ติดตั้ง</Label>
                <div className="border rounded-md p-3 overflow-y-auto space-y-2" style={{ maxHeight: '150px' }}>
                  {rooms.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">ไม่พบข้อมูลห้อง</p>
                  ) : (
                    rooms.map((room) => (
                      <label
                        key={room.id}
                        className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors group"
                      >
                        <Checkbox
                          checked={formData.room_ids.includes(room.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, room_ids: [...formData.room_ids, room.id] });
                            } else {
                              setFormData({ ...formData, room_ids: formData.room_ids.filter(id => id !== room.id) });
                            }
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <DoorOpen className="h-4 w-4 text-muted-foreground group-hover:text-[#c5a059] transition-colors" />
                          <span className="text-sm">{room.name}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.type === 'FIXED'
                    ? 'กรุณาเลือกอย่างน้อย 1 ห้องสำหรับเครื่องมือติดตั้งถาวร'
                    : 'เลือกห้องที่เครื่องมือนี้สามารถประจำการอยู่ได้'}
                </p>
              </div>

              {mode === 'procedure' && procedures.length > 0 && (
                <div className="space-y-2">
                  <Label>หัตถการที่รองรับ</Label>
                  <div
                    className="border rounded-md p-3 overflow-y-auto space-y-2"
                    style={{ maxHeight: '220px' }}
                  >
                    {procedures.map((procedure) => (
                      <label
                        key={procedure.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={formData.procedure_ids.includes(procedure.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                procedure_ids: [...formData.procedure_ids, procedure.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                procedure_ids: formData.procedure_ids.filter(id => id !== procedure.id),
                              });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">{procedure.name}</span>
                          </div>
                          {procedure.description && (
                            <p className="text-xs text-muted-foreground ml-5">{procedure.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {procedure.duration_minutes} นาที
                        </Badge>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    เลือกหัตถการที่เครื่องมือนี้สามารถใช้งานได้
                  </p>
                  {formData.procedure_ids.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-700 dark:text-blue-400 font-medium">
                          เลือกแล้ว {formData.procedure_ids.length} หัตถการ
                        </span>
                        <span className="text-blue-600 dark:text-blue-500">
                          เวลาเฉลี่ย: {Math.round(
                            procedures
                              .filter(p => formData.procedure_ids.includes(p.id))
                              .reduce((sum, p) => sum + p.duration_minutes, 0) / formData.procedure_ids.length
                          )} นาที
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                {editingMachine ? 'บันทึก' : 'เพิ่ม'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
