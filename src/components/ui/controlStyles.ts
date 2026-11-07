/**
 * Estilo compartido de los disparadores personalizados (selectores y fechas).
 * Replica el aspecto de `Input`/`Select` de Field.tsx, pero el anillo de foco solo aparece con teclado
 * (`focus-visible`) y mientras el panel está abierto (`aria-expanded`), para no dejar el campo «iluminado»
 * después de hacer clic.
 */
export const TRIGGER_CLASS =
  'flex h-11 w-full items-center gap-2.5 rounded-xl border bg-surface-2 px-3.5 text-left text-sm text-ink ' +
  'transition-colors duration-150 hover:border-line-strong ' +
  'focus-visible:border-brand focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 ' +
  'aria-expanded:border-brand aria-expanded:bg-surface aria-expanded:ring-4 aria-expanded:ring-brand/15 ' +
  'disabled:cursor-not-allowed disabled:opacity-60'
