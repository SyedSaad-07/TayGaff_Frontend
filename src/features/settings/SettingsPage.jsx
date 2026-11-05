import { Link } from "react-router-dom";
import {
  Building2,
  FileText,
  ArrowRight,
  Tags,
  HardHat,
  Database,
  Images,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { isAdmin } from "@/features/auth/roles";
import { UsersSection } from "@/features/settings/UsersSection";
import { BookingStatusesSection } from "@/features/settings/BookingStatusesSection";

/**
 * Settings hub — shop setup + admin user access.
 */
export function SettingsPage() {
  const { user } = useAuth();
  const admin = isAdmin(user);

  const links = [
    ...(admin
      ? [
          {
            to: "/branches",
            title: "Branches / shops",
            description: "Add or edit shop locations",
            icon: Building2,
          },
          {
            to: "/garments",
            title: "Garment types",
            description: "Add or edit stitching garment codes and names",
            icon: Tags,
          },
          {
            to: "/karigars",
            title: "Karigars & rates",
            description: "Manage tailors and piece rates per garment",
            icon: HardHat,
          },
          {
            to: "/karigar-payroll",
            title: "Karigar work & payments",
            description: "Open cloths by rate and payment records",
            icon: HardHat,
          },
          {
            to: "/settings/import",
            title: "Import legacy Booking pack",
            description: "Upload FoxPro DBF/SQL zip (customers, karigars, measures, bookings)",
            icon: Database,
          },
          {
            to: "/settings/website-media",
            title: "Website content",
            description:
              "Services, Unstitched Clothing, Gallery, and About image",
            icon: Images,
          },
        ]
      : []),
    {
      to: "/docs/legacy-schema",
      title: "Data help (legacy map)",
      description: "Technical reference for old FoxPro data",
      icon: FileText,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
          Settings
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">Shop settings</h1>
        <p className="mt-2 text-sm text-muted">
          Manage shop options and who can open each section of the system.
        </p>
      </div>

      {admin ? <UsersSection /> : null}
      {admin ? <BookingStatusesSection /> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-line/80 bg-white">
        {links.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-4 border-b border-slate-line/70 px-4 py-4 transition last:border-b-0 hover:bg-mist/80"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brass/10 text-brass">
              <item.icon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{item.title}</p>
              <p className="mt-0.5 text-sm text-muted">{item.description}</p>
            </div>
            <ArrowRight size={18} className="shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
