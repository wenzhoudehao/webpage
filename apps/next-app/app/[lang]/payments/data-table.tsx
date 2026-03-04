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
import { Search } from "./components/search"
import { ColumnToggle } from "./components/column-toggle"
import { usePaymentColumns, Payment } from "./columns"
import { GripVertical } from "lucide-react"

// 列宽配置
const MIN_COLUMN_WIDTH = 80
const MAX_COLUMN_WIDTH = 400
const DEFAULT_COLUMN_WIDTH = 150

// 默认列宽
const DEFAULT_COLUMN_SIZING: ColumnSizingState = {
  paymentNo: 140,
  customerName: 160,
  receivedAmount: 130,
  unallocatedBalance: 130,
  allocationStatus: 120,
  bankAccount: 120,
  paymentMethod: 100,
  actions: 150,
}

interface DataTableProps {
  data: Payment[]
  pagination?: {
    currentPage: number
    totalPages: number
    pageSize: number
    total: number
  }
  onViewDetail: (payment: Payment) => void
  onVerify: (payment: Payment) => void
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
  onVerify,
}: DataTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const columns = usePaymentColumns({ onViewDetail, onVerify })

  // Column visibility state management
  const COLUMN_VISIBILITY_KEY = 'payments-column-visibility'
  const COLUMN_SIZING_KEY = 'payments-column-sizing'

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(DEFAULT_COLUMN_SIZING)
  const [sorting, setSorting] = useState<SortingState>([])

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
    const sortBy = searchParams.get('sortBy')
    const sortDirection = searchParams.get('sortDirection')

    if (sortBy && sortDirection) {
      setSorting([{
        id: sortBy,
        desc: sortDirection === 'desc'
      }])
    }
  }, [searchParams])

  const table = useReactTable({
    data,
    columns: columns as ColumnDef<Payment>[],
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Search />
        <ColumnToggle table={table} />
      </div>

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
                  暂无收款记录
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
