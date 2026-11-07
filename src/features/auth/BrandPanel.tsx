import { LineChart, ShieldCheck, Sparkles, Target } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'

const POINTS = [
  { icon: LineChart, title: 'Claridad inmediata', text: 'Ingresos, egresos y saldo disponible en un solo panel.' },
  { icon: Target, title: 'Presupuestos que avisan', text: 'Límites por categoría con alertas antes de excederlos.' },
  { icon: Sparkles, title: 'Lecturas inteligentes', text: 'MONIQ interpreta tus números y destaca lo importante.' },
]

/** Panel de identidad: propuesta de valor y vista previa ilustrativa del producto. */
export function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#050D22] text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16" aria-label="Acerca de MONIQ">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full bg-[#2F6BFF]/30 blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[460px] w-[460px] rounded-full bg-[#19D3A2]/12 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'linear-gradient(rgba(125,180,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(125,180,255,.07) 1px, transparent 1px)',
            backgroundSize: '56px 56px', maskImage: 'linear-gradient(135deg, black, transparent 70%)', WebkitMaskImage: 'linear-gradient(135deg, black, transparent 70%)',
          }}
        />
      </div>

      <Logo size={42} tone="onDark" className="relative" />

      <div className="relative max-w-[520px]">
        <p className="eyebrow !text-[#7DB4FF]">Inteligencia financiera personal</p>
        <h2 className="mt-4 text-[2.9rem] font-extrabold leading-[1.05] tracking-tight xl:text-[3.4rem]">
          Tu dinero,<br />con <span className="bg-gradient-to-r from-[#7DB4FF] to-[#19D3A2] bg-clip-text text-transparent">inteligencia</span>.
        </h2>
        <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-white/65">
          Registra, entiende y planifica tus finanzas con una plataforma pensada para decidir mejor, no solo para anotar.
        </p>

        {/* Vista previa ilustrativa */}
        <div aria-hidden className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Saldo disponible</p>
              <p className="num mt-1.5 font-display text-3xl font-extrabold">S/ 18,420.50</p>
            </div>
            <span className="rounded-full bg-[#19D3A2]/15 px-2.5 py-1 text-[11.5px] font-bold text-[#19D3A2]">+12.4%</span>
          </div>
          <svg viewBox="0 0 400 90" className="mt-4 h-[84px] w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="bp-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4C8BFF" stopOpacity=".4" /><stop offset="1" stopColor="#4C8BFF" stopOpacity="0" /></linearGradient>
            </defs>
            <path d="M0 70 C40 62 60 74 100 56 S170 40 210 48 S290 22 330 28 S380 10 400 6 V90 H0Z" fill="url(#bp-fill)" />
            <path d="M0 70 C40 62 60 74 100 56 S170 40 210 48 S290 22 330 28 S380 10 400 6" fill="none" stroke="#7DB4FF" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="400" cy="6" r="4" fill="#19D3A2" />
          </svg>
        </div>
      </div>

      <ul className="relative grid gap-5 xl:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3 xl:block">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.07] text-[#7DB4FF] xl:mb-3"><Icon className="h-[18px] w-[18px]" /></span>
            <div>
              <p className="text-[13.5px] font-semibold">{title}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-white/50">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="relative mt-8 flex items-center gap-2 text-[12px] text-white/40"><ShieldCheck className="h-3.5 w-3.5" /> Versión de demostración: tus datos se guardan solo en este navegador.</p>
    </aside>
  )
}
