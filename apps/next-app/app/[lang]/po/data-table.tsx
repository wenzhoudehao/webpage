"use client"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  VisibilityState,
  useReactTable,
  ColumnSizingState,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useState, useEffect, useCallback, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ColumnToggle } from "./components/column-toggle"
import { usePOColumns, POOrder } from "./columns"
import { GripVertical, Search, X, RefreshCw } from "lucide-react"

// 列宽配置
const MIN_COLUMN_WIDTH = 80
const MAX_COLUMN_WIDTH = 400
const DEFAULT_COLUMN_WIDTH = 150

// 默认列宽
const DEFAULT_COLUMN_SIZING: ColumnSizingState = {
  piNo: 140,
  productionNo: 120,
  customerName: 160,
  totalAmount: 130,
  outstandingBalance: 130,
  verificationStatus: 110,
  shippingStatus: 110,
  relatedPayments: 100,
  actions: 120,
}

interface DataTableProps {
  data: POOrder[]
  pagination?: {
    currentPage: number
    totalPages: number
    pageSize: number
    total: number
  }
  onViewDetail: (order: POOrder) => void
  onRefresh: () => void
  isLoading?: boolean
}

// 可调整宽度的表头组件
function ResizableHeader({
  header,
  columnSizing,
  onColumnSizingChange,
}: {
  header: any
  columnSizing: ColumnSizingState
  onColumnSizingChange: (columnId: string, width: number) => void
}) {
  const resizeRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)

    const startX = e.clientX
    const startWidth = columnSizing[header.column.id] || DEFAULT_COLUMN_WIDTH

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX
      const newWidth = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, startWidth + diff))
      onColumnSizingChange(header.column.id, newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [header.column.id, columnSizing, onColumnSizingChange])

  const width = columnSizing[header.column.id] || DEFAULT_COLUMN_WIDTH

  return (
    <TableHead
      key={header.id}
      style={{ width: `${width}px`, minWidth: `${width}px`, position: 'relative' }}
      className="relative group"
    >
      <div className="flex items-center justify-between pr-4">
        {header.isPlaceholder
          ? null
          : flexRender(header.column.columnDef.header, header.getContext())}
      </div>

      {/* 调整宽度手柄 */}
      <div
        ref={resizeRef}
        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group-hover:bg-primary/30 transition-colors ${
          isResizing ? 'bg-primary' : ''
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-3 text-muted-foreground" />
        </div>
      </div>
    </TableHead>
  )
}

export function DataTable({
  data,
  pagination,
  onViewDetail,
  onRefresh,
  isLoading,
}: DataTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const columns = usePOColumns({ onViewDetail })

  // Column visibility state management
  const COLUMN_VISIBILITY_KEY = 'po-column-visibility'
  const COLUMN_SIZING_KEY = 'po-column-sizing'

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(DEFAULT_COLUMN_SIZING)
  const [sorting, setSorting] = useState<SortingState>([])
  const [searchValue, setSearchValue] = useState(searchParams?.get("searchValue") || "")
  const [shippingStatus, setShippingStatus] = useState(searchParams?.get("shippingStatus") || "all")

  // 更新列宽
  const handleColumnSizingChange = useCallback((columnId: string, width: number) => {
    setColumnSizing(prev => ({
      ...prev,
      [columnId]: width,
    }))
  }, [])

  // Load column visibility and sizing from localStorage after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedVisibility = localStorage.getItem(COLUMN_VISIBILITY_KEY)
      if (savedVisibility) {
        try {
          setColumnVisibility(JSON.parse(savedVisibility))
        } catch (e) {
          console.error('Failed to parse saved column visibility:', e)
        }
      }

      const savedSizing = localStorage.getItem(COLUMN_SIZING_KEY)
      if (savedSizing) {
        try {
          setColumnSizing(JSON.parse(savedSizing))
        } catch (e) {
          console.error('Failed to parse saved column sizing:', e)
        }
      }
    }
  }, [])

  // Persist column visibility to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(columnVisibility))
    }
  }, [columnVisibility])

  // Persist column sizing to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLUMN_SIZING_KEY, JSON.stringify(columnSizing))
    }
  }, [columnSizing])

  // Initialize sorting from URL parameters
  useEffect(() => {
    const sortBy = searchParams?.get('sortBy')
    const sortDirection = searchParams?.get('sortDirection')

    if (sortBy && sortDirection) {
      setSorting([{
        id: sortBy,
        desc: sortDirection === 'desc'
      }])
    }
  }, [searchParams])

  const table = useReactTable({
    data,
    columns: columns as ColumnDef<POOrder>[],
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater
      setSorting(newSorting)

      // Update URL with new sorting parameters
      const newSearchParams = new URLSearchParams(window.location.search)

      if (newSorting.length > 0) {
        newSearchParams.set('sortBy', newSorting[0].id)
        newSearchParams.set('sortDirection', newSorting[0].desc ? 'desc' : 'asc')
      } else {
        newSearchParams.delete('sortBy')
        newSearchParams.delete('sortDirection')
      }

      // Reset to first page when sorting changes
      newSearchParams.set('page', '1')
      router.push(`${pathname}?${newSearchParams.toString()}`)
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: {
      columnVisibility,
      sorting,
      columnSizing,
    },
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: 'onChange',
  })

  const handlePageChange = (page: number) => {
    const newSearchParams = new URLSearchParams(window.location.search)
    newSearchParams.set("page", page.toString())
    router.push(`${pathname}?${newSearchParams.toString()}`)
  }

  const handleSearch = () => {
    const newSearchParams = new URLSearchParams(window.location.search)
    if (searchValue) {
      newSearchParams.set("searchValue", searchValue)
    } else {
      newSearchParams.delete("searchValue")
    }
    newSearchParams.set("page", "1")
    router.push(`${pathname}?${newSearchParams.toString()}`)
  }

  const handleClear = () => {
    setSearchValue("")
    setShippingStatus("all")
    router.push(pathname)
  }

  const handleShippingStatusChange = (value: string) => {
    setShippingStatus(value)
    const newSearchParams = new URLSearchParams(window.location.search)
    if (value === "all") {
      newSearchParams.delete("shippingStatus")
    } else {
      newSearchParams.set("shippingStatus", value)
    }
    newSearchParams.set("page", "1")
    router.push(`${pathname}?${newSearchParams.toString()}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch()
  }

  return (
    <div className="space-y-4">
      {/* 搜索和筛选栏 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1 flex-wrap">
          {/* 搜索输入框 */}
          <Input
            placeholder="搜索 PI号 / 客户..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-[200px]"
          />

          {/* 搜索按钮 */}
          <Button type="submit" size="icon" className="shrink-0">
            <Search className="h-4 w-4" />
          </Button>

          {/* 清空按钮 */}
          <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>

          {/* 分隔线 */}
          <div className="mx-1 h-4 w-[1px] bg-border hidden sm:block" />

          {/* 出货状态筛选 */}
          <Select value={shippingStatus} onValueChange={handleShippingStatusChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="出货状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待生产</SelectItem>
              <SelectItem value="producing">生产中</SelectItem>
              <SelectItem value="inspecting">待验货</SelectItem>
              <SelectItem value="shipped">已出货</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
            </SelectContent>
          </Select>
        </form>

        {/* 右侧操作按钮 */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
          <ColumnToggle table={table} />
        </div>
      </div>

      {/* 表格 */}
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table style={{ width: '100%', tableLayout: 'fixed' }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <ResizableHeader
                    key={header.id}
                    header={header}
                    columnSizing={columnSizing}
                    onColumnSizingChange={handleColumnSizingChange}
                  />
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onViewDetail(row.original)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const width = columnSizing[cell.column.id] || DEFAULT_COLUMN_WIDTH
                    return (
                      <TableCell
                        key={cell.id}
                        style={{ width: `${width}px`, minWidth: `${width}px` }}
                        onClick={(e) => {
                          // 阻止操作列的点击事件冒泡
                          if (cell.column.id === 'actions') {
                            e.stopPropagation()
                          }
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {isLoading ? "加载中..." : "暂无订单数据"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                className={pagination.currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                label="上一页"
              />
            </PaginationItem>

            {Array.from({ length: pagination.totalPages }).map((_, index) => {
              const page = index + 1;
              // Show first page, last page, and pages around current page
              if (
                page === 1 ||
                page === pagination.totalPages ||
                (page >= pagination.currentPage - 2 && page <= pagination.currentPage + 2)
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={page === pagination.currentPage}
                      onClick={() => handlePageChange(page)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              }
              // Show ellipsis for gaps
              if (
                page === pagination.currentPage - 3 ||
                page === pagination.currentPage + 3
              ) {
                return (
                  <PaginationItem key={page}>
                    <span className="flex h-9 w-9 items-center justify-center">...</span>
                  </PaginationItem>
                );
              }
              return null;
            })}

            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                className={pagination.currentPage >= pagination.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                label="下一页"
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
