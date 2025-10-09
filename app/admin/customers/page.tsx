"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getUsers, updateUserStatus, updateLegacyUsers } from "@/lib/firestore-actions"
import { Timestamp } from "firebase/firestore"
import { Search, UserCheck, UserX } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { User } from "@/lib/types"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string; isActive: boolean } | null>(null)

  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Cập nhật dữ liệu cũ trước
        await updateLegacyUsers()
        
        const usersData = await getUsers()
        setUsers(usersData)
        
        // Kiểm tra và khóa tài khoản không hoạt động quá 6 tháng
        await checkAndLockInactiveAccounts(usersData)
      } catch (error) {
        console.error("Lỗi tải danh sách khách hàng:", error)
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [])

  // Kiểm tra và khóa tài khoản không hoạt động quá 6 tháng
  const checkAndLockInactiveAccounts = async (users: User[]) => {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const inactiveUsers = users.filter(user => {
      if (!user.isActive) return false // Đã bị khóa rồi
      if (!user.lastLoginAt) return true // Chưa đăng nhập lần nào
      
      try {
        // Xử lý Firestore Timestamp hoặc Date
        const lastLoginDate = user.lastLoginAt instanceof Timestamp
          ? user.lastLoginAt.toDate()
          : new Date(user.lastLoginAt as any)
        return lastLoginDate < sixMonthsAgo
      } catch (error) {
        console.error(`Lỗi xử lý lastLoginAt cho user ${user.name}:`, error)
        return true // Nếu lỗi format thì coi như chưa đăng nhập
      }
    })

    for (const user of inactiveUsers) {
      try {
        await updateUserStatus(user.id, false)
        console.log(`🔒 Tự động khóa tài khoản không hoạt động: ${user.name} (${user.email})`)
      } catch (error) {
        console.error(`Lỗi khóa tài khoản ${user.name}:`, error)
      }
    }

    if (inactiveUsers.length > 0) {
      // Reload users để cập nhật UI
      const updatedUsers = await getUsers()
      setUsers(updatedUsers)
      
      toast({
        title: "Tự động khóa tài khoản",
        description: `Đã khóa ${inactiveUsers.length} tài khoản không hoạt động quá 6 tháng`,
      })
    }
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus
      await updateUserStatus(userId, newStatus)
      
      // Cập nhật UI
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isActive: newStatus } : user
      ))
      
      toast({
        title: "Thành công",
        description: `Đã ${newStatus ? 'mở khóa' : 'khóa'} tài khoản thành công`,
      })
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái người dùng:", error)
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái người dùng",
        variant: "destructive",
      })
    }
  }

  const customers = users.filter((u) => u.role === "customer")

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm),
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-[#2E3192]">Quản lý khách hàng</h2>
          <p className="text-muted-foreground mt-1">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#2E3192]">Quản lý khách hàng</h2>
        <p className="text-muted-foreground mt-1">Quản lý tài khoản và quyền truy cập của khách hàng</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên, email hoặc số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>STT</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Số điện thoại</TableHead>
                <TableHead>Loại tài khoản</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead>Lần truy cập gần nhất</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer, index) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <span className="font-medium text-gray-600">{index + 1}</span>
                  </TableCell>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{customer.customerType === "shipper" ? "Shipper" : "Người gửi"}</Badge>
                  </TableCell>
                  <TableCell>
                    {customer.isActive ? (
                      <Badge className="bg-green-500">Hoạt động</Badge>
                    ) : (
                      <Badge variant="destructive">Bị khóa</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.createdAt ? 
                      new Date(customer.createdAt).toLocaleDateString("vi-VN") : 
                      "Chưa có thông tin"
                    }
                  </TableCell>
                  <TableCell>
                    {customer.lastLoginAt ? (
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {(() => {
                            try {
                              // Xử lý Firestore Timestamp hoặc Date
                              const date = customer.lastLoginAt instanceof Timestamp
                                ? customer.lastLoginAt.toDate()
                                : new Date(customer.lastLoginAt as any)
                              return date.toLocaleDateString("vi-VN")
                            } catch (error) {
                              console.error("Lỗi format ngày:", error)
                              return "Lỗi format"
                            }
                          })()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {(() => {
                            try {
                              // Xử lý Firestore Timestamp hoặc Date
                              const date = customer.lastLoginAt instanceof Timestamp
                                ? customer.lastLoginAt.toDate()
                                : new Date(customer.lastLoginAt as any)
                              return date.toLocaleTimeString("vi-VN")
                            } catch (error) {
                              console.error("Lỗi format giờ:", error)
                              return "Lỗi format"
                            }
                          })()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Chưa đăng nhập</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {customer.isActive ? (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => setConfirmTarget({ id: customer.id, name: customer.name, isActive: customer.isActive })}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Khóa
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => setConfirmTarget({ id: customer.id, name: customer.name, isActive: customer.isActive })}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Mở khóa
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => { if (!open) setConfirmTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTarget?.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.isActive
                ? `Bạn có chắc muốn khóa tài khoản "${confirmTarget?.name}"? Người dùng sẽ không thể đăng nhập cho tới khi được mở khóa.`
                : `Bạn có chắc muốn mở khóa tài khoản "${confirmTarget?.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmTarget(null)}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmTarget) {
                  await handleToggleUserStatus(confirmTarget.id, confirmTarget.isActive)
                  setConfirmTarget(null)
                }
              }}
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
