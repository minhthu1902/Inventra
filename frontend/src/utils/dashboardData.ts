export type StatCard = {
  id: string;
  label: string;
  value: string;
  unit: string;
  change: string;
  changeDirection: "up" | "down";
  changeLabel: string;
  changeTone: "positive" | "negative" | "neutral";
  icon: "box" | "trendingDown" | "inbound" | "outbound";
  iconTone: "blue" | "green" | "purple" | "amber";
};

export const statCards: StatCard[] = [
  {
    id: "total-stock",
    label: "Total Stock",
    value: "12,482",
    unit: "items",
    change: "4.2%",
    changeDirection: "up",
    changeLabel: "vs last week",
    changeTone: "positive",
    icon: "box",
    iconTone: "blue",
  },
  {
    id: "low-stock",
    label: "Low Stock",
    value: "24",
    unit: "items",
    change: "6",
    changeDirection: "up",
    changeLabel: "vs last week",
    changeTone: "negative",
    icon: "trendingDown",
    iconTone: "green",
  },
  {
    id: "inbound-today",
    label: "Inbound Today",
    value: "245",
    unit: "items / 8 receiving orders",
    change: "12%",
    changeDirection: "up",
    changeLabel: "vs yesterday",
    changeTone: "positive",
    icon: "inbound",
    iconTone: "purple",
  },
  {
    id: "outbound-today",
    label: "Outbound Today",
    value: "189",
    unit: "items / 5 pending shipments",
    change: "8%",
    changeDirection: "up",
    changeLabel: "vs yesterday",
    changeTone: "positive",
    icon: "outbound",
    iconTone: "amber",
  },
];

export type TrendPoint = {
  label: string;
  stockLevel: number;
  inbound: number;
  outbound: number;
};

export const inventoryTrend: TrendPoint[] = [
  { label: "Sep 3", stockLevel: 14200, inbound: 9200, outbound: 5400 },
  { label: "Sep 4", stockLevel: 15600, inbound: 9800, outbound: 5800 },
  { label: "Sep 5", stockLevel: 14800, inbound: 10200, outbound: 6200 },
  { label: "Sep 6", stockLevel: 16400, inbound: 9600, outbound: 5600 },
  { label: "Sep 7", stockLevel: 15200, inbound: 10400, outbound: 6400 },
  { label: "Sep 8", stockLevel: 16800, inbound: 9400, outbound: 5200 },
  { label: "Sep 9", stockLevel: 15800, inbound: 9900, outbound: 5900 },
];

export const trendSummary = {
  totalStock: { value: "12,482", change: "4.2%", direction: "up" as const },
  inbound: { value: "3,240", change: "12%", direction: "up" as const },
  outbound: { value: "2,804", change: "8%", direction: "up" as const },
};

export type Alert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  time: string;
};

export const alerts: Alert[] = [
  {
    id: "alert-1",
    severity: "critical",
    title: "Potential stockout",
    description: "SKU-1042 (Steel Valve) · 3 units remaining · Est 12h left",
    time: "2h ago",
  },
  {
    id: "alert-2",
    severity: "warning",
    title: "Location mismatch",
    description: "SKU-3172 (Control Module) · Expected A3-12 · Found B2-03",
    time: "4h ago",
  },
  {
    id: "alert-3",
    severity: "warning",
    title: "Unusual outbound pattern",
    description: "SO-7721 (Pump Parts) · 42% higher than average",
    time: "6h ago",
  },
  {
    id: "alert-4",
    severity: "info",
    title: "Inbound shipment received",
    description: "PO-4587 (Steel Pipe) · 120 items · Warehouse A",
    time: "1d ago",
  },
];

export type Transaction = {
  id: string;
  date: string;
  type: "Inbound" | "Outbound" | "Transfer" | "Adjustment";
  reference: string;
  item: string;
  quantity: string;
  location: string;
  status: "Received" | "Shipped" | "Transferred" | "Adjusted";
};

export const recentTransactions: Transaction[] = [
  {
    id: "t1",
    date: "Sep 9, 2026 09:42 AM",
    type: "Inbound",
    reference: "PO-4587",
    item: "Steel Valve",
    quantity: "120",
    location: "A1-01",
    status: "Received",
  },
  {
    id: "t2",
    date: "Sep 9, 2026 09:18 AM",
    type: "Outbound",
    reference: "SO-7721",
    item: "Pump Parts",
    quantity: "85",
    location: "B2-03",
    status: "Shipped",
  },
  {
    id: "t3",
    date: "Sep 9, 2026 08:30 AM",
    type: "Inbound",
    reference: "PO-4586",
    item: "Control Module",
    quantity: "50",
    location: "A2-05",
    status: "Received",
  },
  {
    id: "t4",
    date: "Sep 8, 2026 04:22 PM",
    type: "Outbound",
    reference: "SO-7719",
    item: "Filter Element",
    quantity: "30",
    location: "C1-02",
    status: "Shipped",
  },
  {
    id: "t5",
    date: "Sep 8, 2026 02:17 PM",
    type: "Transfer",
    reference: "TR-3321",
    item: "Bearing",
    quantity: "15",
    location: "C3-01 → B1-04",
    status: "Transferred",
  },
  {
    id: "t6",
    date: "Sep 8, 2026 11:03 AM",
    type: "Adjustment",
    reference: "ADJ-0145",
    item: "Seal Ring",
    quantity: "-5",
    location: "A1-03",
    status: "Adjusted",
  },
];

export const transactionTabs = [
  { id: "all", label: "All", count: 12 },
  { id: "inbound", label: "Inbound", count: 4 },
  { id: "outbound", label: "Outbound", count: 5 },
  { id: "transfer", label: "Transfer", count: 2 },
  { id: "adjustment", label: "Adjustment", count: 1 },
];

export type QuickAction = {
  id: string;
  label: string;
  description: string;
  icon: "receive" | "shipment" | "transfer" | "addItem";
  tone: "green" | "blue" | "purple" | "amber";
};

export const quickActions: QuickAction[] = [
  { id: "receive", label: "Receive Stock", description: "Create inbound", icon: "receive", tone: "green" },
  { id: "shipment", label: "Create Shipment", description: "Process outbound", icon: "shipment", tone: "blue" },
  { id: "transfer", label: "Transfer Stock", description: "Move between locations", icon: "transfer", tone: "purple" },
  { id: "add-item", label: "Add Item", description: "New inventory item", icon: "addItem", tone: "amber" },
];

export const warehouseUtilization = {
  usedPercent: 68,
  usedArea: "8,160 m²",
  availableArea: "3,840 m²",
  totalArea: "12,000 m²",
};

export type WorkflowStep = {
  id: string;
  label: string;
  description: string;
  icon: "purchaseOrder" | "receiving" | "putAway" | "salesOrder" | "shipping";
  count: number;
  tone: "blue" | "green" | "purple" | "indigo" | "teal";
};

export const workflowSteps: WorkflowStep[] = [
  { id: "po", label: "Purchase Order", description: "Create PO & confirm", icon: "purchaseOrder", count: 4, tone: "blue" },
  { id: "receiving", label: "Receiving", description: "Inspect & verify", icon: "receiving", count: 3, tone: "green" },
  { id: "putaway", label: "Put Away", description: "Assign location", icon: "putAway", count: 6, tone: "purple" },
  { id: "salesorder", label: "Sales Order", description: "Pick & pack", icon: "salesOrder", count: 8, tone: "indigo" },
  { id: "shipping", label: "Shipping", description: "Create shipment", icon: "shipping", count: 5, tone: "teal" },
];

export const aiInsights = [
  {
    id: "insight-1",
    severity: "critical" as const,
    title: "Potential Stockout",
    subtitle: "SKU-1042 · Steel Valve",
    currentStock: "3 units",
    avgUsage: "6 units",
    estimate: "~ 12 hours",
    suggestion: "Review reorder quantity and check pending PO.",
  },
];
