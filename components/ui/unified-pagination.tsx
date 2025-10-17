"use client"

interface UnifiedPaginationProps {
  page: number
  setPage: (page: number) => void
  total: number
  pageSize: number
  className?: string
  showTotalInfo?: boolean
}

export function UnifiedPagination({ page, setPage, total, pageSize, className = "", showTotalInfo = true }: UnifiedPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  
  if (total <= pageSize) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(total, page * pageSize)

  // Logic để hiển thị 5 trang trên mobile, tất cả trên desktop
  const getVisiblePages = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    
    // Trên mobile: chỉ hiển thị 5 trang xung quanh trang hiện tại
    const startPage = Math.max(1, page - 2)
    const endPage = Math.min(totalPages, startPage + 4)
    
    // Điều chỉnh nếu gần cuối
    const adjustedStartPage = Math.max(1, endPage - 4)
    
    return Array.from({ length: endPage - adjustedStartPage + 1 }, (_, i) => adjustedStartPage + i)
  }

  const visiblePages = getVisiblePages()

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Thông tin tổng số mục */}
      {showTotalInfo && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Hiển thị {start}-{end} trong tổng số {total} mục
          </p>
        </div>
      )}
      
      {/* Pagination controls */}
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        <button
          className={`px-2 sm:px-3 py-1 rounded border text-xs sm:text-sm ${page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          Trước
        </button>
        
        {/* Hiển thị trang đầu nếu không trong range */}
        {visiblePages[0] > 1 && (
          <>
            <button
              className="px-2 sm:px-3 py-1 rounded border text-xs sm:text-sm hover:bg-gray-100"
              onClick={() => setPage(1)}
            >
              1
            </button>
            {visiblePages[0] > 2 && (
              <span className="px-1 text-xs sm:text-sm text-muted-foreground">...</span>
            )}
          </>
        )}
        
        {/* Hiển thị các trang trong range */}
        {visiblePages.map((p) => (
          <button
            key={p}
            className={`px-2 sm:px-3 py-1 rounded border text-xs sm:text-sm ${p === page ? 'bg-[#2E3192] text-white border-[#2E3192]' : 'hover:bg-gray-100'}`}
            onClick={() => setPage(p)}
          >
            {p}
          </button>
        ))}
        
        {/* Hiển thị trang cuối nếu không trong range */}
        {visiblePages[visiblePages.length - 1] < totalPages && (
          <>
            {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
              <span className="px-1 text-xs sm:text-sm text-muted-foreground">...</span>
            )}
            <button
              className="px-2 sm:px-3 py-1 rounded border text-xs sm:text-sm hover:bg-gray-100"
              onClick={() => setPage(totalPages)}
            >
              {totalPages}
            </button>
          </>
        )}
        
        <button
          className={`px-2 sm:px-3 py-1 rounded border text-xs sm:text-sm ${page === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          Sau
        </button>
      </div>
    </div>
  )
}
