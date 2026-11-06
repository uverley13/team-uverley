import { BadgeCheck, Clock, Headphones, Heart, Lock, ShieldCheck, Smartphone, Star, Truck, Wallet, Wrench, Zap, type LucideProps } from 'lucide-react'
import type { IconName } from '../lib/site-config'

const ICONS = { ShieldCheck, Zap, Wallet, Clock, Smartphone, Star, Heart, Lock, Truck, Wrench, Headphones, BadgeCheck }

export function SiteIcon({ name, ...props }: { name: IconName } & LucideProps) {
  const Icon = ICONS[name] ?? Star
  return <Icon {...props} />
}
