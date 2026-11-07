import {
  Banknote, BookOpen, Briefcase, Bus, Car, Coffee, Dumbbell, Gift, GraduationCap, HeartPulse, Home, Landmark,
  Laptop, Music2, PiggyBank, Plane, Receipt, Shirt, ShoppingBasket, Smartphone, Sparkles, TrendingUp, Tv, Utensils,
  Wallet, Wifi, Zap, type LucideIcon,
} from 'lucide-react'

export const ICON_REGISTRY: Record<string, LucideIcon> = {
  wallet: Wallet, banknote: Banknote, briefcase: Briefcase, laptop: Laptop, trending: TrendingUp, landmark: Landmark,
  piggy: PiggyBank, gift: Gift, home: Home, zap: Zap, wifi: Wifi, basket: ShoppingBasket, utensils: Utensils,
  coffee: Coffee, car: Car, bus: Bus, plane: Plane, heart: HeartPulse, graduation: GraduationCap, book: BookOpen,
  tv: Tv, music: Music2, shirt: Shirt, dumbbell: Dumbbell, phone: Smartphone, receipt: Receipt, sparkles: Sparkles,
}

export const ICON_KEYS = Object.keys(ICON_REGISTRY)

export function getIcon(key: string): LucideIcon {
  return ICON_REGISTRY[key] ?? Wallet
}

export const CATEGORY_COLORS = [
  '#2F6BFF', '#6D5DF6', '#14B8D4', '#19B98A', '#8BC34A', '#F5B73B',
  '#F58A3B', '#F2594F', '#E0549B', '#8A94A8', '#3F4F7A', '#0E8C74',
] as const
