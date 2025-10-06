"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { mockUsers } from "@/lib/mock-data"
import { Search, UserCheck, UserX } from "lucide-react"

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const customers = mockUsers.filter((u) => u.role === "customer")

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm),
  )

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
                <TableHead>Họ tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Số điện thoại</TableHead>
                <TableHead>Loại tài khoản</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
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
                  <TableCell>{new Date(customer.createdAt).toLocaleDateString("vi-VN")}</TableCell>
                  <TableCell className="text-right">
                    {customer.isActive ? (
                      <Button size="sm" variant="destructive">
                        <UserX className="h-4 w-4 mr-1" />
                        Khóa
                      </Button>
                    ) : (
                      <Button size="sm" variant="default">
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
    </div>
  )
}
