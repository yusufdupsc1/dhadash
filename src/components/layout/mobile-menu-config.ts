export type MobileMenuIconKey =
  | "dashboard"
  | "user-round"
  | "graduation-cap"
  | "users"
  | "bar-chart"
  | "book-open"
  | "bookmark"
  | "clipboard-check"
  | "school"
  | "credit-card"
  | "calendar"
  | "bell"
  | "megaphone"
  | "archive"
  | "shield-check"
  | "upload"
  | "settings"
  | "file-text"
  | "file-badge";

export interface MobileMenuItem {
  href: string;
  label: string;
  icon: MobileMenuIconKey;
}

export interface MobileMenuSection {
  title: string;
  items: MobileMenuItem[];
}

interface MobileMenuItemConfig {
  href: string;
  label: string;
  icon: MobileMenuIconKey;
  roles?: string[];
  hideInGovtPrimary?: boolean;
}

interface MobileMenuSectionConfig {
  title: string;
  items: MobileMenuItemConfig[];
}

const NAV_SECTIONS: MobileMenuSectionConfig[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: "dashboard",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF"],
      },
      {
        href: "/dashboard/portal/teacher",
        label: "Teacher Portal",
        icon: "user-round",
        roles: ["TEACHER"],
      },
      {
        href: "/dashboard/portal/student",
        label: "Student Portal",
        icon: "graduation-cap",
        roles: ["STUDENT"],
      },
      {
        href: "/dashboard/portal/parent",
        label: "Parent Portal",
        icon: "users",
        roles: ["PARENT"],
      },
      {
        href: "/dashboard/analytics",
        label: "Analytics",
        icon: "bar-chart",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF"],
        hideInGovtPrimary: true,
      },
    ],
  },
  {
    title: "Academic",
    items: [
      {
        href: "/dashboard/students",
        label: "Students",
        icon: "graduation-cap",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF"],
      },
      {
        href: "/dashboard/students/reports",
        label: "Student Reports",
        icon: "file-text",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF", "TEACHER"],
      },
      {
        href: "/dashboard/subjects",
        label: "Subjects",
        icon: "bookmark",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF"],
      },
      {
        href: "/dashboard/teachers",
        label: "Teachers",
        icon: "users",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF"],
      },
      {
        href: "/dashboard/classes",
        label: "Classes",
        icon: "book-open",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF"],
      },
      {
        href: "/dashboard/attendance",
        label: "Attendance",
        icon: "clipboard-check",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF", "TEACHER"],
      },
      {
        href: "/dashboard/grades",
        label: "Grades",
        icon: "school",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF", "TEACHER"],
      },
      {
        href: "/dashboard/exams/primary",
        label: "Primary Exams",
        icon: "file-badge",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF", "TEACHER"],
      },
      {
        href: "/dashboard/timetable",
        label: "Timetable",
        icon: "calendar",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF", "TEACHER"],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        href: "/dashboard/finance",
        label: "Finance",
        icon: "credit-card",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
      },
      {
        href: "/dashboard/events",
        label: "Events",
        icon: "calendar",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF", "TEACHER"],
      },
      {
        href: "/dashboard/announcements",
        label: "Announcements",
        icon: "megaphone",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF", "TEACHER"],
      },
      {
        href: "/dashboard/notices",
        label: "Notice Board",
        icon: "bell",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "STAFF", "TEACHER"],
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        href: "/dashboard/control/inactive",
        label: "Inactive Records",
        icon: "archive",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
        hideInGovtPrimary: true,
      },
      {
        href: "/dashboard/settings?tab=access",
        label: "Access Requests",
        icon: "shield-check",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
        hideInGovtPrimary: true,
      },
      {
        href: "/dashboard/control/visitors",
        label: "Visitor Control",
        icon: "users",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
        hideInGovtPrimary: true,
      },
      {
        href: "/dashboard/control/imports",
        label: "Import Center",
        icon: "upload",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
        hideInGovtPrimary: true,
      },
      {
        href: "/dashboard/settings?tab=profile",
        label: "Profile & Logo",
        icon: "settings",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
      },
      {
        href: "/dashboard/settings?tab=academic&focus=signatures",
        label: "Academic & Signatures",
        icon: "settings",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
      },
      {
        href: "/dashboard/settings?tab=fees",
        label: "Fee Categories",
        icon: "credit-card",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
      },
      {
        href: "/dashboard/settings?tab=academic&focus=public",
        label: "Guest Public Reports",
        icon: "file-text",
        roles: ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"],
        hideInGovtPrimary: true,
      },
    ],
  },
];

const sectionLabelMap: Record<string, string> = {
  Overview: "overview",
  Academic: "academic",
  Administration: "administration",
  System: "system",
};

const itemLabelMap: Record<string, string> = {
  Dashboard: "dashboard",
  "Teacher Portal": "teacher_portal",
  "Student Portal": "student_portal",
  "Parent Portal": "parent_portal",
  Analytics: "analytics",
  Students: "student",
  "Student Reports": "reports",
  Teachers: "assistant_teacher",
  Attendance: "attendance",
  Finance: "fees",
  Events: "routine",
  Grades: "result",
  "Profile & Logo": "profile_and_logo",
  "Fee Categories": "fee_categories",
  Subjects: "subjects",
  Classes: "classes",
  Announcements: "notice",
  "Notice Board": "notice_board",
  Timetable: "routine",
  "Primary Exams": "primary_exams",
};

interface MenuOptions {
  role?: string;
  govtPrimaryMode: boolean;
  t: (key: string) => string;
  tg: (key: string) => string;
}

export function getMobileMenuSections({
  role,
  govtPrimaryMode,
  t,
  tg,
}: MenuOptions): MobileMenuSection[] {
  const localizeSection = (label: string) => {
    const key = sectionLabelMap[label];
    if (!key) return label;
    const translated = t(key);
    return translated === key ? label : translated;
  };

  const localizeItem = (label: string) => {
    if (govtPrimaryMode && label === "Teacher Portal") {
      return t("assistant_teacher_portal");
    }
    if (govtPrimaryMode && label === "Students") return t("student");
    if (govtPrimaryMode && label === "Teachers") return tg("assistant_teacher");
    if (govtPrimaryMode && label === "Classes") return t("primary_classes");
    if (govtPrimaryMode && label === "Events") return tg("routine");
    if (govtPrimaryMode && label === "Announcements") return tg("notice_board");
    if (govtPrimaryMode && label === "Grades") return tg("result_sheet");
    const key = itemLabelMap[label];
    if (!key) return label;
    const translated = t(key);
    return translated === key ? label : translated;
  };

  return NAV_SECTIONS.map((section) => {
    const items = section.items
      .filter((item) => {
        const roleAllowed = !item.roles || item.roles.includes(role ?? "");
        if (!roleAllowed) return false;
        if (govtPrimaryMode && item.hideInGovtPrimary) return false;
        return true;
      })
      .map((item) => ({
        href: item.href,
        label: localizeItem(item.label),
        icon: item.icon,
      }));

    return {
      title: localizeSection(section.title),
      items,
    };
  }).filter((section) => section.items.length > 0);
}
