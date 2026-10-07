const TABLES = [
  {
    table: "CUSTOMER",
    role: "Core master",
    live: "23,781",
    deleted: "360",
    pk: "CODE",
    migrate: "Yes",
    tone: "success",
    notes: "Authoritative customer list",
  },
  {
    table: "ITEMS",
    role: "Lookup",
    live: "15",
    deleted: "4",
    pk: "CODE",
    migrate: "Yes",
    tone: "success",
    notes: "Garment types (01–15)",
  },
  {
    table: "KARIGAR",
    role: "Core master",
    live: "54",
    deleted: "6",
    pk: "CODE",
    migrate: "Yes",
    tone: "success",
    notes: "Tailors / craftsmen",
  },
  {
    table: "RATE",
    role: "Pricing",
    live: "835",
    deleted: "0",
    pk: "CODE + ITEM",
    migrate: "Yes",
    tone: "success",
    notes: "Karigar piece-rate per item",
  },
  {
    table: "MEASURE",
    role: "Core master",
    live: "30,444",
    deleted: "375",
    pk: "CUST + ITEM (~FOLIO)",
    migrate: "Yes",
    tone: "success",
    notes: "Saved body measurements",
  },
  {
    table: "BOOKING",
    role: "Transactional",
    live: "21,088",
    deleted: "286,567",
    pk: "SLIP",
    migrate: "Yes",
    tone: "success",
    notes: "Active order lines (many soft-deleted)",
  },
  {
    table: "BOOKING1",
    role: "Archive / overlap",
    live: "21,279",
    deleted: "0",
    pk: "SLIP (~)",
    migrate: "Merge carefully",
    tone: "warning",
    notes: "Older bookings; ~12k SLIP overlap with BOOKING",
  },
  {
    table: "BOOKINGB",
    role: "Archive / overlap",
    live: "22,299",
    deleted: "3,223",
    pk: "SLIP",
    migrate: "Merge carefully",
    tone: "warning",
    notes: "2001–2009 era; heavy SLIP overlap",
  },
  {
    table: "MEASURE1",
    role: "Legacy hybrid",
    live: "5,029",
    deleted: "0",
    pk: "SLIP (~)",
    migrate: "Optional archive",
    tone: "warning",
    notes: "Measure + booking fields; older format",
  },
  {
    table: "CUSTOM",
    role: "Snapshot",
    live: "2,178",
    deleted: "0",
    pk: "CODE",
    migrate: "No (subset)",
    tone: "neutral",
    notes: "Older/shorter CUSTOMER copy",
  },
  {
    table: "INTERFAC",
    role: "Config",
    live: "1",
    deleted: "0",
    pk: "singleton",
    migrate: "Partial",
    tone: "info",
    notes: "Company + counters + passwords",
  },
  {
    table: "QUERY",
    role: "Temp workset",
    live: "49",
    deleted: "0",
    pk: "SLIP",
    migrate: "No",
    tone: "neutral",
    notes: "FoxPro query scratch table",
  },
  {
    table: "ABC",
    role: "Scratch",
    live: "2",
    deleted: "0",
    pk: "—",
    migrate: "No",
    tone: "neutral",
    notes: "Tiny ad-hoc aggregate",
  },
  {
    table: "FOXUSER",
    role: "IDE prefs",
    live: "19",
    deleted: "0",
    pk: "TYPE+ID+NAME",
    migrate: "No",
    tone: "neutral",
    notes: "Visual FoxPro UI preferences",
  },
];

const RELATIONS = [
  ["CUSTOMER.CODE", "MEASURE.CUST", "1 → N", "Near-perfect FK (1 orphan)"],
  ["CUSTOMER.CODE", "BOOKING.CUST", "1 → N", "Perfect on live BOOKING"],
  ["ITEMS.CODE", "MEASURE.ITEM", "1 → N", "Lookup garment type"],
  ["ITEMS.CODE", "BOOKING.ITEM", "1 → N", "Lookup garment type"],
  ["ITEMS.CODE", "RATE.ITEM", "1 → N", "Part of rate PK"],
  ["KARIGAR.CODE", "BOOKING.KARIGAR", "1 → N", "Nullable when unassigned"],
  ["KARIGAR.CODE", "RATE.CODE", "1 → N", "Karigar side of rate"],
  ["MEASURE.FOLIO", "BOOKING.FOIL", "1 → N", "3,716 / 3,718 live FOILs match"],
  ["BOOKING.FOIL", "BOOKING.SLIP", "1 → N", "Order (foil) has many piece slips"],
];

const CUSTOMER_FIELDS = [
  ["CODE", "C(5)", "PK", "Zero-padded customer id, e.g. 00001"],
  ["NAME", "C(30)", "", "Customer display name"],
  ["ADDRESS", "C(30)", "", "Address line 1"],
  ["ADDRESS2", "C(30)", "", "Address line 2"],
  ["PHONE1", "C(15)", "", "Primary phone"],
  ["PHONE2", "C(15)", "", "Alternate phone"],
  ["PHONE3", "C(15)", "", "Alternate phone"],
  ["OLD", "C(20)", "", "Legacy/old-code marker (~1.4% filled)"],
];

const KARIGAR_FIELDS = [
  ["CODE", "C(5)", "PK", "Zero-padded karigar id"],
  ["NAME", "C(30)", "", "Name / specialty note"],
  ["ADDRESS / ADDRESS2", "C(30)", "", "Sparse"],
  ["PHONE1–3", "C(15)", "", "Sparse"],
  ["OLD", "C(10)", "", "Unused in live data"],
];

const ITEM_ROWS = [
  ["01", "SHALWAR KAMEEZ"],
  ["02", "PAINT"],
  ["03", "SAFARI SUIT"],
  ["04", "SHART"],
  ["05", "COAT"],
  ["06", "APRAN"],
  ["07", "SHERWANI"],
  ["08", "KAMIZ"],
  ["09", "SHALWAR"],
  ["10", "WASCOAT"],
  ["11", "SLEEPING SUIT"],
  ["12", "PAINT.COAT"],
  ["13", "3 PIECE WASCOAT"],
  ["14", "PRINCE COAT"],
  ["15", "KURTI"],
];

const MEASURE_GROUPS = [
  {
    title: "Keys / identity",
    fields: "CUST, ITEM, FOLIO",
    meaning: "Customer + garment type; FOLIO is measurement card / folio number",
  },
  {
    title: "Upper garment (kameez / shirt / coat)",
    fields: "LENGTH, TERA, TAKHTI, ARM, COLLAR, CHEST, WASTE, W1–W5, C1–C5, K1–K5",
    meaning: "Body lengths, chest/waist, collar, arm; W/C/K series are style/extra measures",
  },
  {
    title: "Lower garment (shalwar / pant)",
    fields: "LEN, MORI, GHERA, ASAN, KK, SHER",
    meaning: "Pant/shalwar length, bottom opening, flare, crotch, etc.",
  },
  {
    title: "Style / finishing notes",
    fields: "PATTI, CUF, FP, SP, CANTA, CTC, SPECAIL, PARTI2, TOP1–7, STCH",
    meaning: "Cuff, pocket, stitch, special instructions — mostly free text, not pure numbers",
  },
];

const BOOKING_EXTRA = [
  ["FOIL", "C(10)", "FK→MEASURE.FOLIO", "Order / job number grouping pieces"],
  ["SLIP", "C(7)", "PK", "Unique piece line, e.g. 0700101"],
  ["DATE", "D", "", "Booking date"],
  ["KARIGAR", "C(5)", "FK→KARIGAR", "Assigned tailor"],
  ["RCV", "L", "", "Received flag"],
  ["RCVDATE", "D", "", "Receive date"],
  ["DLV_DATE", "D", "", "Promised / delivery date"],
  ["DLVRD", "L", "", "Delivered flag"],
  ["AMOUNT", "N(10)", "", "Amount for the piece / line"],
];

const MODERN_TABLES = [
  ["customers", "CUSTOMER", "code PK, phones[], addresses[], old_code"],
  ["items", "ITEMS", "code PK, name"],
  ["karigars", "KARIGAR", "same shape as customers"],
  ["karigar_rates", "RATE", "unique(karigar_code, item_code), rate"],
  [
    "measurements",
    "MEASURE",
    "unique(customer_code, item_code); folio unique; JSON/JSONB for measure map",
  ],
  ["orders", "derived from FOIL", "one row per FOIL + customer + booking date"],
  [
    "order_lines",
    "BOOKING live",
    "slip PK, order_id, item, karigar, status flags, amount, embedded measures",
  ],
  [
    "app_settings",
    "INTERFAC",
    "company name, next counters; never migrate plain passwords as-is",
  ],
];

const TONE_PILL = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-800",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  info: "border-sky-300 bg-sky-50 text-sky-900",
  neutral: "border-slate-line bg-mist text-ink/70",
};

const TONE_ROW = {
  success: "bg-emerald-50/40",
  warning: "bg-amber-50/50",
  info: "bg-sky-50/40",
  neutral: "",
};

function Pill({ tone = "neutral", children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${TONE_PILL[tone] || TONE_PILL.neutral}`}
    >
      {children}
    </span>
  );
}

function Callout({ tone = "info", title, children }) {
  const styles = {
    info: "border-sky-200 bg-sky-50 text-sky-950",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${styles[tone] || styles.info}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-relaxed opacity-90">{children}</p>
    </div>
  );
}

function SectionCard({ title, badge, children }) {
  return (
    <section className="rounded-2xl border border-slate-line/80 bg-mist/60">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-line/70 px-4 py-3">
        <h3 className="font-display text-xl text-ink">{title}</h3>
        {badge}
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

function DataTable({ headers, rows, rowTones }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-line/70">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-ink text-white/90">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`border-t border-slate-line/60 ${rowTones?.[i] ? TONE_ROW[rowTones[i]] : "bg-white/70"}`}
            >
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 align-top text-ink/85">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RelationDiagram() {
  const nodes = [
    { id: "CUSTOMER", x: 20, y: 20 },
    { id: "ITEMS", x: 20, y: 90 },
    { id: "KARIGAR", x: 20, y: 160 },
    { id: "MEASURE", x: 220, y: 40 },
    { id: "RATE", x: 220, y: 150 },
    { id: "BOOKING", x: 420, y: 90 },
  ];
  const edges = [
    { from: "CUSTOMER", to: "MEASURE", label: "CUST" },
    { from: "ITEMS", to: "MEASURE", label: "ITEM" },
    { from: "CUSTOMER", to: "BOOKING", label: "CUST" },
    { from: "ITEMS", to: "BOOKING", label: "ITEM" },
    { from: "KARIGAR", to: "BOOKING", label: "KARIGAR" },
    { from: "KARIGAR", to: "RATE", label: "CODE" },
    { from: "ITEMS", to: "RATE", label: "ITEM" },
    { from: "MEASURE", to: "BOOKING", label: "FOLIO→FOIL" },
  ];
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const w = 120;
  const h = 36;

  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 560 220" className="h-auto w-full min-w-[520px] max-w-3xl">
        {edges.map((e) => {
          const a = byId[e.from];
          const b = byId[e.to];
          const x1 = a.x + w;
          const y1 = a.y + h / 2;
          const x2 = b.x;
          const y2 = b.y + h / 2;
          return (
            <g key={`${e.from}-${e.to}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#9aa3af"
                strokeWidth="1.5"
              />
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 6}
                textAnchor="middle"
                className="fill-muted"
                fontSize="10"
              >
                {e.label}
              </text>
            </g>
          );
        })}
        {nodes.map((n) => (
          <g key={n.id}>
            <rect
              x={n.x}
              y={n.y}
              width={w}
              height={h}
              rx="8"
              className="fill-white stroke-slate-line"
              strokeWidth="1.5"
            />
            <text
              x={n.x + w / 2}
              y={n.y + 23}
              textAnchor="middle"
              className="fill-ink"
              fontSize="12"
              fontWeight="600"
            >
              {n.id}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function LegacyDataSchemaPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass-deep">
          Documentation · Legacy FoxPro data
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">
          Legacy data <span className="italic text-brass">schema map</span>
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          FoxPro/dBASE tables from TayGaff_Data → csv_out. Source: converted CSVs +
          DBF headers. Use this when designing MongoDB or PostgreSQL migration.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["14", "DBF tables"],
          ["6", "Core to migrate"],
          ["~23.8k", "Customers (live)"],
          ["~21k", "Live booking lines"],
        ].map(([value, label]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-line/80 bg-mist/70 px-4 py-3"
          >
            <p className="font-display text-3xl text-ink">{value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">
              {label}
            </p>
          </div>
        ))}
      </div>

      <Callout tone="info" title="Business model in one sentence">
        A tailor shop: customers have saved measurements per garment type; each
        job (FOIL) creates one or more piece slips (SLIP) assigned to a karigar at
        a piece rate.
      </Callout>

      <SectionCard title="Core entity relationships">
        <RelationDiagram />
        <p className="text-xs text-muted">
          Archives BOOKING1 / BOOKINGB / MEASURE1 / CUSTOM omitted — same shapes,
          overlapping ids.
        </p>
      </SectionCard>

      <div className="space-y-3">
        <h2 className="font-display text-2xl text-ink">Table inventory</h2>
        <DataTable
          headers={["Table", "Role", "Live", "Deleted", "Key", "Migrate?", "Notes"]}
          rowTones={TABLES.map((t) => t.tone)}
          rows={TABLES.map((t) => [
            t.table,
            t.role,
            t.live,
            t.deleted,
            t.pk,
            <Pill key={`${t.table}-m`} tone={t.tone}>
              {t.migrate}
            </Pill>,
            t.notes,
          ])}
        />
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-2xl text-ink">Confirmed relationships</h2>
        <DataTable
          headers={["Parent", "Child", "Cardinality", "Evidence"]}
          rows={RELATIONS}
        />
      </div>

      <h2 className="font-display text-2xl text-ink">Field catalogs</h2>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="CUSTOMER" badge={<Pill tone="success">PK: CODE</Pill>}>
          <DataTable
            headers={["Field", "Type", "Key", "Meaning"]}
            rows={CUSTOMER_FIELDS}
          />
          <p className="text-xs text-muted">
            KARIGAR uses the same column layout. CUSTOM is an older subset (~2.2k
            rows).
          </p>
        </SectionCard>

        <SectionCard title="ITEMS + RATE" badge={<Pill tone="success">PK: CODE</Pill>}>
          <h4 className="text-sm font-semibold text-ink">ITEMS</h4>
          <DataTable headers={["CODE", "NAME"]} rows={ITEM_ROWS} />
          <p className="text-sm text-ink/80">
            <span className="font-semibold">RATE:</span> CODE → KARIGAR.CODE, ITEM →
            ITEMS.CODE, RATE N(10,2). Unique on (CODE, ITEM). 835 rows.
          </p>
          <h4 className="text-sm font-semibold text-ink">KARIGAR</h4>
          <DataTable
            headers={["Field", "Type", "Key", "Notes"]}
            rows={KARIGAR_FIELDS}
          />
        </SectionCard>
      </div>

      <SectionCard
        title="MEASURE — saved measurements"
        badge={<Pill tone="success">~PK: CUST+ITEM / FOLIO</Pill>}
      >
        <p className="text-sm text-ink/80">
          47 fields. Almost one measurement card per customer+item (30,443 unique).
          FOLIO is nearly unique and is referenced by booking FOIL.
        </p>
        <DataTable
          headers={["Group", "Fields", "Meaning"]}
          rows={MEASURE_GROUPS.map((g) => [g.title, g.fields, g.meaning])}
        />
        <Callout tone="warning" title="Types are mostly Character">
          Even numeric-looking measures are C(10) free text (e.g. &quot;44*KHD45&quot;,
          &quot;2.5.10&quot;). Keep as text or structured JSON on migrate — do not force
          DECIMAL without cleaning.
        </Callout>
      </SectionCard>

      <SectionCard
        title="BOOKING — order piece lines"
        badge={<Pill tone="success">PK: SLIP</Pill>}
      >
        <p className="text-sm text-ink/80">
          Same 47 measure/style fields as MEASURE, plus workflow columns below. One
          FOIL (order) can contain many SLIP lines (multi-piece jobs; max ~107
          pieces on one foil).
        </p>
        <DataTable
          headers={["Field", "Type", "Key", "Meaning"]}
          rows={BOOKING_EXTRA}
        />
        <div className="flex flex-wrap gap-2">
          <Pill tone="warning">286,567 soft-deleted rows in BOOKING</Pill>
          <Pill tone="neutral">BOOKING1 / BOOKINGB = archives with overlapping SLIPs</Pill>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="INTERFAC (singleton config)">
          <DataTable
            headers={["Field", "Type", "Meaning"]}
            rows={[
              ["DATE", "D", "System / cutoff date (corrupt: 2060-12-31)"],
              ["CUST", "N(5)", "Next customer counter (24206)"],
              ["KARIGAR", "N(5)", "Next karigar counter (60)"],
              ["PASS1–4", "C(10)", "Legacy passwords (masked as ?)"],
              ["COMPANY", "C(20)", "Tay Gaff Tailors"],
            ]}
          />
        </SectionCard>
        <SectionCard title="Skip on migrate">
          <ul className="space-y-2 text-sm text-ink/80">
            <li>
              <span className="font-semibold">FOXUSER</span> — VFP browse/window prefs
            </li>
            <li>
              <span className="font-semibold">QUERY</span> — temporary search result set
            </li>
            <li>
              <span className="font-semibold">ABC</span> — 2-row scratch totals
            </li>
            <li>
              <span className="font-semibold">CUSTOM</span> — superseded by CUSTOMER
            </li>
          </ul>
        </SectionCard>
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-2xl text-ink">Suggested modern target model</h2>
        <Callout tone="success" title="PostgreSQL fits this domain best">
          Clear relational keys (customer, item, karigar, order, order_line, rate).
          Store free-text measurement bags as JSONB. MongoDB works if you embed
          measurements + recent orders under customer documents — still keep rates
          and items normalized.
        </Callout>
        <DataTable
          headers={["Target table", "Source", "Design notes"]}
          rows={MODERN_TABLES}
        />
      </div>

      <SectionCard title="Migration order (recommended)">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-ink/85">
          <li>items → karigars → customers</li>
          <li>karigar_rates (RATE)</li>
          <li>measurements (MEASURE live rows)</li>
          <li>
            orders + order_lines from BOOKING live rows (group by FOIL); then
            reconcile BOOKING1 / BOOKINGB only for SLIPs not already present
          </li>
          <li>app_settings from INTERFAC (counters only; reset auth separately)</li>
        </ol>
        <p className="text-xs text-muted">
          Preserve `_deleted` history separately if needed — do not import 286k
          deleted booking rows into the live production table.
        </p>
      </SectionCard>

      <p className="text-xs text-muted">
        Analysis based on csv_out/*.csv and TayGaff_Data/*.DBF field headers.
        Soft-delete flag from dbf_to_csv.js `_deleted` column.
      </p>
    </div>
  );
}
