"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Search as SearchIcon, X } from "lucide-react"

type SearchField = "paymentNo" | "customerName"
type AllocationStatus = "all" | "fully" | "partial" | "none"

// 收款账户选项（可根据实际情况调整）
const BANK_ACCOUNTS = [
  { value: "all", label: "全部账户" },
  { value: "中国银行", label: "中国银行" },
  { value: "工商银行", label: "工商银行" },
  { value: "建设银行", label: "建设银行" },
  { value: "农业银行", label: "农业银行" },
  { value: "招商银行", label: "招商银行" },
]

// 付款类型选项
const PAYMENT_METHODS = [
  { value: "all", label: "全部类型" },
  { value: "bank_transfer", label: "银行转账" },
  { value: "cash", label: "现金" },
  { value: "alipay", label: "支付宝" },
  { value: "wechat", label: "微信" },
  { value: "check", label: "支票" },
  { value: "other", label: "其他" },
]

export function Search() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchValue, setSearchValue] = useState(searchParams?.get("searchValue") || "")
  const [searchField, setSearchField] = useState<SearchField>((searchParams?.get("searchField") as SearchField) || "paymentNo")
  const [allocationStatus, setAllocationStatus] = useState<AllocationStatus>((searchParams?.get("allocationStatus") as AllocationStatus) || "all")
  const [bankAccount, setBankAccount] = useState(searchParams?.get("bankAccount") || "all")
  const [paymentMethod, setPaymentMethod] = useState(searchParams?.get("paymentMethod") || "all")

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newSearchParams = new URLSearchParams(searchParams?.toString())

      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === "all") {
          newSearchParams.delete(key)
        } else {
          newSearchParams.set(key, value)
        }
      })

      return newSearchParams.toString()
    },
    [searchParams]
  )

  const onSearch = () => {
    router.push(
      `${pathname}?${createQueryString({
        searchValue: searchValue || null,
        searchField,
        allocationStatus: allocationStatus === "all" ? null : allocationStatus,
        bankAccount: bankAccount === "all" ? null : bankAccount,
        paymentMethod: paymentMethod === "all" ? null : paymentMethod,
        page: "1",
      })}`
    )
  }

  const onFieldChange = (value: SearchField) => {
    setSearchField(value)
    setSearchValue("")
  }

  const onAllocationStatusChange = (value: AllocationStatus) => {
    setAllocationStatus(value)
    router.push(
      `${pathname}?${createQueryString({
        allocationStatus: value === "all" ? null : value,
        page: "1",
      })}`
    )
  }

  const onBankAccountChange = (value: string) => {
    setBankAccount(value)
    router.push(
      `${pathname}?${createQueryString({
        bankAccount: value === "all" ? null : value,
        page: "1",
      })}`
    )
  }

  const onPaymentMethodChange = (value: string) => {
    setPaymentMethod(value)
    router.push(
      `${pathname}?${createQueryString({
        paymentMethod: value === "all" ? null : value,
        page: "1",
      })}`
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch()
  }

  const handleClear = () => {
    setSearchValue("")
    setSearchField("paymentNo")
    setAllocationStatus("all")
    setBankAccount("all")
    setPaymentMethod("all")
    router.push(pathname)
  }

  const getSearchPlaceholder = () => {
    const fieldMap: Record<SearchField, string> = {
      paymentNo: "收款编号",
      customerName: "客户名称",
    }
    return `搜索${fieldMap[searchField]}...`
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1 flex-wrap">
      {/* 搜索字段选择 */}
      <Select value={searchField} onValueChange={onFieldChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paymentNo">收款编号</SelectItem>
          <SelectItem value="customerName">客户名称</SelectItem>
        </SelectContent>
      </Select>

      {/* 搜索输入框 */}
      <Input
        placeholder={getSearchPlaceholder()}
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="w-[200px]"
      />

      {/* 搜索按钮 */}
      <Button type="submit" size="icon" className="shrink-0">
        <SearchIcon className="h-4 w-4" />
      </Button>

      {/* 清空按钮 */}
      <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={handleClear}>
        <X className="h-4 w-4" />
      </Button>

      {/* 分隔线 */}
      <div className="mx-1 h-4 w-[1px] bg-border hidden sm:block" />

      {/* 分配状态筛选 */}
      <Select value={allocationStatus} onValueChange={onAllocationStatusChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">分配状态</SelectItem>
          <SelectItem value="fully">已全额分配</SelectItem>
          <SelectItem value="partial">部分分配</SelectItem>
          <SelectItem value="none">未分配</SelectItem>
        </SelectContent>
      </Select>

      {/* 收款账户筛选 */}
      <Select value={bankAccount} onValueChange={onBankAccountChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BANK_ACCOUNTS.map((account) => (
            <SelectItem key={account.value} value={account.value}>
              {account.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 付款类型筛选 */}
      <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAYMENT_METHODS.map((method) => (
            <SelectItem key={method.value} value={method.value}>
              {method.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  )
}
