'use client'

import { Bell } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent
} from '@/components/ui/dropdown-menu'
import { NotificationList } from './NotificationList'
import { useNotifications } from '@/hooks/useNotifications'

export default function NotificationBell() {
  const { unreadCount } = useNotifications()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className={`relative inline-flex items-center justify-center p-2 focus:outline-none ${
            unreadCount > 0 ? 'text-gray-700 hover:text-blue-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold leading-none text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 sm:w-96 p-0" align="end">
        <NotificationList />
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 