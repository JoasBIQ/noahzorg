'use client'

import { useState, useMemo } from 'react'
import {
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  startOfWeek,
  endOfWeek,
  format,
} from 'date-fns'
import { nl } from 'date-fns/locale'

export type CalendarView = 'day' | 'week' | 'month'

export function useCalendarNavigation(initialView: CalendarView = 'month') {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [view, setView] = useState<CalendarView>(initialView)

  const goToday = () => {
    setCurrentDate(new Date())
  }

  const goPrev = () => {
    setCurrentDate((prev) => {
      switch (view) {
        case 'day':
          return subDays(prev, 1)
        case 'week':
          return subWeeks(prev, 1)
        case 'month':
          return subMonths(prev, 1)
      }
    })
  }

  const goNext = () => {
    setCurrentDate((prev) => {
      switch (view) {
        case 'day':
          return addDays(prev, 1)
        case 'week':
          return addWeeks(prev, 1)
        case 'month':
          return addMonths(prev, 1)
      }
    })
  }

  const title = useMemo(() => {
    switch (view) {
      case 'day':
        return format(currentDate, 'EEEE d MMMM yyyy', { locale: nl })
      case 'week': {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
        const startDay = format(weekStart, 'd', { locale: nl })
        const endDay = format(weekEnd, 'd', { locale: nl })
        const startMonth = format(weekStart, 'MMMM', { locale: nl })
        const endMonth = format(weekEnd, 'MMMM', { locale: nl })
        const year = format(weekEnd, 'yyyy', { locale: nl })

        if (startMonth === endMonth) {
          return `${startDay} - ${endDay} ${endMonth} ${year}`
        }
        return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`
      }
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: nl })
    }
  }, [currentDate, view])

  return {
    currentDate,
    view,
    setView,
    goToday,
    goPrev,
    goNext,
    title,
  }
}
