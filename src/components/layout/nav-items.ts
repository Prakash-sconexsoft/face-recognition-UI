import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, ScanFace, Settings, Users } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "People", href: "/people", icon: Users },
  { label: "Recognize", href: "/recognize", icon: ScanFace },
  { label: "Settings", href: "/settings", icon: Settings },
];
