import * as RadixTooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

export const TooltipProvider = RadixTooltip.Provider

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  disabled?: boolean
}

export function Tooltip({ content, children, side = 'top', disabled }: TooltipProps) {
  if (disabled) return <>{children}</>
  return (
    <RadixTooltip.Root delayDuration={120}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side} sideOffset={8}
          className="z-[80] animate-fade-in rounded-lg bg-navy px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lift dark:bg-surface-3 dark:text-ink"
        >
          {content}
          <RadixTooltip.Arrow className="fill-navy dark:fill-surface-3" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
