import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Stethoscope, Search, Trash } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { proceduresApi } from '../../lib/api';
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
import { Checkbox } from '../ui/checkbox';
import { motion } from 'motion/react';
import { ConfirmDialog } from '../ConfirmDialog';
import { NotificationDialog } from '../NotificationDialog';

interface Procedure {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  prep_duration_minutes?: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export function ProcedureManagement() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    duration_minutes: 30,
    prep_duration_minutes: 0,
    is_active: true,
  });

  // Bulk delete state
  const [selectedProcedures, setSelectedProcedures] = useState<Set<string>>(new Set());
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
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await proceduresApi.getAll();
      setProcedures(data as Procedure[]);
    } catch (error) {
      console.error('Failed to load procedures:', error);
      setNotificationTitle('เกิดข้อผิดพลาด');
      setNotificationDescription('ไม่สามารถโหลดข้อมูลได้');
      setNotificationType('error');
      setNotificationOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProcedure(null);
    setFormData({ name: '', duration_minutes: 30, prep_duration_minutes: 0, is_active: true });
    setIsDialogOpen(true);
  };

  const handleEdit = (procedure: Procedure) => {
    setEditingProcedure(procedure);
    setFormData({
      name: procedure.name,
      duration_minutes: procedure.duration_minutes,
      prep_duration_minutes: procedure.prep_duration_minutes || 0,
      is_active: procedure.is_active === 1,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (procedure: Procedure) => {
    setConfirmTitle('ยืนยันการลบ');
    setConfirmDescription(`คุณต้องการลบหัตถการ "${procedure.name}" ใช่หรือไม่?`);
    setConfirmAction(() => async () => {
      try {
        setNotificationTitle('กำลังลบ');
        setNotificationDescription('กรุณารอสักครู่...');
        setNotificationType('loading');
        setNotificationOpen(true);

        await proceduresApi.delete(procedure.id);
        await loadData();

        setNotificationTitle('ลบสำเร็จ');
        setNotificationDescription(`ลบหัตถการ "${procedure.name}" เรียบร้อยแล้ว`);
        setNotificationType('success');
      } catch (error) {
        setNotificationTitle('เกิดข้อผิดพลาด');
        setNotificationDescription('ไม่สามารถลบหัตถการได้');
        setNotificationType('error');
      }
    });
    setConfirmOpen(true);
  };

  const handleToggleSelect = (procedureId: string) => {
    const newSelected = new Set(selectedProcedures);
    if (newSelected.has(procedureId)) {
      newSelected.delete(procedureId);
    } else {
      newSelected.add(procedureId);
    }
    setSelectedProcedures(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProcedures.size === filteredProcedures.length) {
      setSelectedProcedures(new Set());
    } else {
      setSelectedProcedures(new Set(filteredProcedures.map(p => p.id)));
    }
  };

  const handleBulkDelete = () => {
    const count = selectedProcedures.size;
    setConfirmTitle('ยืนยันการลบหลายรายการ');
    setConfirmDescription(`คุณต้องการลบหัตถการที่เลือก ${count} รายการใช่หรือไม่?`);
    setConfirmAction(() => async () => {
      try {
        setNotificationTitle('กำลังลบ');
        setNotificationDescription(`กำลังลบ ${count} รายการ...`);
        setNotificationType('loading');
        setNotificationOpen(true);

        // Delete all selected procedures
        await Promise.all(
          Array.from(selectedProcedures).map(id => proceduresApi.delete(id))
        );

        setSelectedProcedures(new Set());
        setIsSelectMode(false);
        await loadData();

        setNotificationTitle('ลบสำเร็จ');
        setNotificationDescription(`ลบหัตถการ ${count} รายการเรียบร้อยแล้ว`);
        setNotificationType('success');
      } catch (error) {
        setNotificationTitle('เกิดข้อผิดพลาด');
        setNotificationDescription('ไม่สามารถลบหัตถการบางรายการได้');
        setNotificationType('error');
      }
    });
    setConfirmOpen(true);
  };

  const handleCancelSelect = () => {
    setIsSelectMode(false);
    setSelectedProcedures(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setNotificationTitle('ข้อมูลไม่ครบถ้วน');
      setNotificationDescription('กรุณากรอกชื่อหัตถการ');
      setNotificationType('error');
      setNotificationOpen(true);
      return;
    }

    if (formData.duration_minutes < 1) {
      setNotificationTitle('ข้อมูลไม่ถูกต้อง');
      setNotificationDescription('ระยะเวลาต้องมากกว่า 0 นาที');
      setNotificationType('error');
      setNotificationOpen(true);
      return;
    }

    try {
      setNotificationTitle(editingProcedure ? 'กำลังบันทึก' : 'กำลังสร้าง');
      setNotificationDescription('กรุณารอสักครู่...');
      setNotificationType('loading');
      setNotificationOpen(true);

      if (editingProcedure) {
        await proceduresApi.update(editingProcedure.id, formData);
        setNotificationTitle('บันทึกสำเร็จ');
        setNotificationDescription(`แก้ไขหัตถการ "${formData.name}" เรียบร้อยแล้ว`);
      } else {
        await proceduresApi.create(formData);
        setNotificationTitle('สร้างสำเร็จ');
        setNotificationDescription(`สร้างหัตถการ "${formData.name}" เรียบร้อยแล้ว`);
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

  const filteredProcedures = procedures.filter(procedure =>
    procedure.name.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">จัดการหัตถการ</h2>
          <p className="text-muted-foreground">จัดการรายการหัตถการทางการแพทย์</p>
        </div>
        <div className="flex items-center gap-2">
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
                disabled={selectedProcedures.size === 0}
                className="bg-[#800200] hover:bg-[#600100] text-white"
              >
                <Trash className="h-4 w-4 mr-2" />
                ลบที่เลือก ({selectedProcedures.size})
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsSelectMode(true)}
                disabled={procedures.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                เลือกลบ
              </Button>
              <Button
                onClick={handleCreate}
                className="bg-[#c5a059] hover:bg-[#008a8f] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มหัตถการใหม่
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="ค้นหาหัตถการ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Procedures Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c5a059]"></div>
          <p className="mt-2 text-gray-600">กำลังโหลด...</p>
        </div>
      ) : filteredProcedures.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Stethoscope className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">ไม่พบหัตถการ</p>
            <p className="text-gray-400 text-sm mt-1">ลองค้นหาด้วยคำอื่น หรือเพิ่มหัตถการใหม่</p>
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
                        checked={selectedProcedures.size === filteredProcedures.length && filteredProcedures.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>หัตถการ</TableHead>
                  <TableHead>เวลาแปะยาชา</TableHead>
                  <TableHead>เวลาหมอทำหัตถการ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  {!isSelectMode && <TableHead className="text-right">การจัดการ</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcedures.map((procedure, index) => (
                  <motion.tr
                    key={procedure.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group hover:bg-muted/50"
                  >
                    {isSelectMode && (
                      <TableCell>
                        <Checkbox
                          checked={selectedProcedures.has(procedure.id)}
                          onCheckedChange={() => handleToggleSelect(procedure.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${procedure.is_active
                            ? 'bg-[#c5a059]/10'
                            : 'bg-gray-100'
                          }`}>
                          <Stethoscope className={`h-5 w-5 ${procedure.is_active ? 'text-[#c5a059]' : 'text-gray-400'
                            }`} />
                        </div>
                        <div>
                          <p className="font-medium">{procedure.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {procedure.prep_duration_minutes && procedure.prep_duration_minutes > 0 ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {procedure.prep_duration_minutes} นาที
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {procedure.duration_minutes} นาที
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {procedure.is_active ? (
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
                          ปิดใช้งาน
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
                            onClick={() => handleEdit(procedure)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-[#800200] hover:text-[#800200] hover:bg-[#800200]/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(procedure)}
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
              {editingProcedure ? 'แก้ไขหัตถการ' : 'เพิ่มหัตถการใหม่'}
            </DialogTitle>
            <DialogDescription>
              {editingProcedure ? `แก้ไขข้อมูลหัตถการ ${editingProcedure.name}` : 'สร้างหัตถการใหม่ในระบบ'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อหัตถการ *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น Laser Hair Removal"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">เวลาหมอทำหัตถการ (นาที) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="480"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
                  required
                />
                <p className="text-xs text-muted-foreground">ระยะเวลาที่หมอใช้ในการทำหัตถการ</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prep_duration">ระยะเวลาแป๊ะยาชา (นาที)</Label>
                <Input
                  id="prep_duration"
                  type="number"
                  min="0"
                  max="120"
                  value={formData.prep_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, prep_duration_minutes: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">ระยะเวลาที่ต้องรอให้ยาชาซึม (ถ้ามี)</p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">ใช้งาน</Label>
                <input
                  id="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300"
                />
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
                {editingProcedure ? 'บันทึก' : 'เพิ่ม'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
