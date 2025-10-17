"use client"

import type { User } from "./types"
import { db, auth } from "./firebase"
import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc } from "firebase/firestore"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth"
import { createLogoutNotification, createProfileUpdateNotification, updateLastLogin } from "./firestore-actions"

export async function login(email: string, password: string): Promise<User | null> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const uid = cred.user.uid
    // Lấy profile từ Firestore
    const profileSnap = await getDoc(doc(db, "users", uid))
    if (!profileSnap.exists()) {
      // Tối thiểu trả về từ Auth nếu chưa có profile
      const minimal: User = {
        id: uid,
        email: cred.user.email || email,
        password: "",
        name: cred.user.displayName || "",
        phone: "",
        role: "customer",
        isActive: true,
        createdAt: new Date(),
      }
      localStorage.setItem("currentUser", JSON.stringify(minimal))
      return minimal
    }
    const data = profileSnap.data() as Omit<User, "id">
    const userData: User = { id: uid, ...data }
    
    // Kiểm tra tài khoản có bị khóa không
    if (!userData.isActive) {
      // Đăng xuất ngay lập tức nếu tài khoản bị khóa
      await signOut(auth)
      throw new Error("Tài khoản của bạn hiện đang bị khóa.\n Vui lòng liên hệ quản trị viên để được hỗ trợ.")
    }
    
    // Cập nhật lần đăng nhập cuối
    await updateLastLogin(uid)
    
    localStorage.setItem("currentUser", JSON.stringify(userData))
    return userData
  } catch (error: any) {
    console.error("Lỗi đăng nhập:", error)
    
    // Nếu là lỗi tài khoản bị khóa, throw lại để hiển thị thông báo
    if (error.message && error.message.includes("bị khóa")) {
      throw error
    }
    
    return null
  }
}

export async function logout() {
  try {
    // Đăng xuất khỏi Firebase Auth
    await signOut(auth)
    
    // Xóa thông tin user khỏi localStorage
    localStorage.removeItem("currentUser")
  } catch (error) {
    console.error("Lỗi đăng xuất:", error)
    // Vẫn xóa localStorage ngay cả khi có lỗi
    localStorage.removeItem("currentUser")
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null
  const userStr = localStorage.getItem("currentUser")
  return userStr ? JSON.parse(userStr) : null
}

export async function register(userData: Omit<User, "id" | "createdAt">): Promise<User | null> {
  try {
    // Tạo user trên Firebase Auth
    const cred = await createUserWithEmailAndPassword(auth, userData.email, userData.password)
    const uid = cred.user.uid

    try {
      // Lưu profile vào Firestore (không lưu password)
      const profile: Omit<User, "id" | "password"> = {
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
        customerType: userData.customerType,
        isActive: true,
        createdAt: new Date(),
      }
      await setDoc(doc(db, "users", uid), profile)

      const createdUser: User = { id: uid, password: "", ...profile }
      // Chỉ lưu localStorage khi mọi thứ thành công
      localStorage.setItem("currentUser", JSON.stringify(createdUser))
      return createdUser
    } catch (e) {
      // Nếu lưu Firestore thất bại, rollback user trên Auth
      try { const { deleteUser } = await import("firebase/auth"); await deleteUser(cred.user) } catch {}
      throw e
    }
  } catch (error) {
    console.error("Lỗi đăng ký:", error)
    throw error
  }
}

export async function updateUserProfile(userId: string, updates: Partial<User>): Promise<User | null> {
  try {
    const userRef = doc(db, "users", userId)
    // Không cập nhật password trong profile Firestore
    const { password, ...rest } = updates
    
    // Lấy thông tin user hiện tại để so sánh
    const currentUser = getCurrentUser()
    if (!currentUser || currentUser.id !== userId) {
      throw new Error("Không tìm thấy thông tin người dùng")
    }
    
    // Tạo danh sách các thay đổi
    const changes: string[] = []
    if (rest.name && rest.name !== currentUser.name) {
      changes.push(`Tên: "${currentUser.name}" → "${rest.name}"`)
    }
    if (rest.email && rest.email !== currentUser.email) {
      changes.push(`Email: "${currentUser.email}" → "${rest.email}"`)
    }
    if (rest.phone && rest.phone !== currentUser.phone) {
      changes.push(`Số điện thoại: "${currentUser.phone}" → "${rest.phone}"`)
    }
    if (rest.customerType && rest.customerType !== currentUser.customerType) {
      const oldType = currentUser.customerType === 'shipper' ? 'Shipper' : 'Người gửi thường'
      const newType = rest.customerType === 'shipper' ? 'Shipper' : 'Người gửi thường'
      changes.push(`Loại khách hàng: "${oldType}" → "${newType}"`)
    }
    
    await updateDoc(userRef, rest)
    
    // Tạo thông báo nếu có thay đổi
    if (changes.length > 0) {
      await createProfileUpdateNotification({
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      }, changes)
    }
    
    // Cập nhật localStorage
    const updatedUser = { ...currentUser, ...rest }
    localStorage.setItem("currentUser", JSON.stringify(updatedUser))
    return updatedUser
  } catch (error) {
    console.error("Lỗi cập nhật profile:", error)
    return null
  }
}
