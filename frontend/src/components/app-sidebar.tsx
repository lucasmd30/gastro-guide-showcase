"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, CalendarClock, CalendarDays, ClipboardList, FileBadge, FileText, LayoutDashboard, LogOut, UserCog, Users } from "lucide-react";

import { logout } from "@/app/actions/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

/**
 * Ordem (08/10/2026): o Dashboard (primeiro, como no protótipo), a conta,
 * depois o fluxo do dia — agenda (e a disponibilidade que a alimenta),
 * pacientes, prontuário — e por fim a ferramenta de consulta.
 */
const ITEMS = [
  // A distribuição por doença é dado clínico: só o médico.
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, doctorOnly: true },
  { title: "Meu perfil", url: "/perfil", icon: UserCog, doctorOnly: true },
  { title: "Agenda", url: "/agenda", icon: CalendarDays, doctorOnly: false },
  // Janelas, fechamentos, durações e valores — a secretária também administra.
  { title: "Disponibilidade", url: "/disponibilidade", icon: CalendarClock, doctorOnly: false },
  { title: "Pacientes", url: "/pacientes", icon: Users, doctorOnly: false },
  { title: "Prontuários modelo", url: "/prontuarios-modelo", icon: FileText, doctorOnly: true },
  // Atestados, declarações, encaminhamentos… — podem levar CID, então só o médico.
  { title: "Documentos", url: "/documentos", icon: FileBadge, doctorOnly: true },
  // Como no protótipo, logo depois de Documentos (a solicitação também vira documento).
  { title: "Solicitar exames", url: "/solicitar-exames", icon: ClipboardList, doctorOnly: true },
  { title: "Escalas e calculadoras", url: "/escalas", icon: Calculator, doctorOnly: true },
] as const;

export function AppSidebar({ role }: { role: "DOCTOR" | "SECRETARIA" }) {
  const pathname = usePathname();
  // No celular o menu é uma gaveta por cima da página: sem fechar ao tocar num
  // item, a página nova abria por baixo e o menu continuava cobrindo tudo.
  const { isMobile, setOpenMobile } = useSidebar();
  const isActive = (path: string) => pathname.startsWith(path);
  const items = ITEMS.filter((item) => !item.doctorOnly || role === "DOCTOR");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          {/* Logotipo oficial (13/10/2026). <img> simples: o app não usa next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Gastrohepato" width={36} height={36} className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Gastrohepato</span>
            <span className="text-xs text-muted-foreground">Prontuário clínico</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link
                      href={item.url}
                      onClick={() => isMobile && setOpenMobile(false)}
                      className="flex items-center gap-2"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={logout}>
              <SidebarMenuButton type="submit" tooltip="Sair">
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          v0.1 · Fase 0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
