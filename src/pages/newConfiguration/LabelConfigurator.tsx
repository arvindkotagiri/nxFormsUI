import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    Bar,
    Button,
    Card,
    CardHeader,
    Input,
    Label,
    Select,
    Option,
    Table,
    TableHeaderRow,
    TableHeaderCell,
    TableRow,
    TableCell,
    Title,
    Text,
    Dialog,
    Toolbar,
    ToolbarSpacer,
    MessageStrip,
} from "@ui5/webcomponents-react";

import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/filter.js";
import "@ui5/webcomponents-icons/dist/refresh.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/edit.js";
import "@ui5/webcomponents-icons/dist/decline.js";

import {
    getLabelConfigs,
    deleteLabelConfig,
    getCustomers,
    getPlants,
    getWarehouses,
    getProcessTypes,
} from "../../lib/api";

type SortDirection = "asc" | "desc";

type LabelConfig = {
    config_id: string;
    label_name: string;
    label_id: string;
    customer?: string | null;
    plant?: string | null;
    warehouse?: string | null;
    process_type?: string | null;
    priority: number;
    number_of_labels: number;
    active: boolean;
};

type SortConfig = { key: keyof LabelConfig; direction: SortDirection };

type Filters = {
    customer: string;
    plant: string;
    warehouse: string;
    process_type: string;
    active: "" | "true" | "false" | "all";
};

type RefItem = { id: string; name: string };

export default function LabelConfigurator() {
    const navigate = useNavigate();

    const [configs, setConfigs] = useState<LabelConfig[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        key: "priority",
        direction: "asc",
    });

    const [searchTerm, setSearchTerm] = useState<string>("");
    const [filters, setFilters] = useState<Filters>({
        customer: "",
        plant: "",
        warehouse: "",
        process_type: "",
        active: "",
    });

    const [referenceData, setReferenceData] = useState<{
        customers: RefItem[];
        plants: RefItem[];
        warehouses: RefItem[];
        processTypes: RefItem[];
    }>({ customers: [], plants: [], warehouses: [], processTypes: [] });

    const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
    const [deleteConfigId, setDeleteConfigId] = useState<string | null>(null);

    const [errorBanner, setErrorBanner] = useState<string | null>(null);

    const fetchConfigs = useCallback(async () => {
        setLoading(true);
        setErrorBanner(null);

        try {
            const applied: Record<string, any> = { ...filters };

            if (searchTerm.trim()) applied.label_name = searchTerm.trim();

            if (applied.active === "true") applied.active = true;
            else if (applied.active === "false") applied.active = false;
            else delete applied.active;

            Object.keys(applied).forEach((k) => {
                if (applied[k] === "" || applied[k] === "all") delete applied[k];
            });

            const data = await getLabelConfigs(applied);
            setConfigs(data);
        } catch (e: any) {
            setErrorBanner(e?.message || "Failed to load configurations");
        } finally {
            setLoading(false);
        }
    }, [filters, searchTerm]);

    const fetchReferenceData = useCallback(async () => {
        try {
            const [customers, plants, warehouses, processTypes] = await Promise.all([
                getCustomers(),
                getPlants(),
                getWarehouses(),
                getProcessTypes(),
            ]);
            setReferenceData({ customers, plants, warehouses, processTypes });
        } catch {
            // silent
        }
    }, []);

    useEffect(() => {
        fetchReferenceData();
        fetchConfigs();
    }, [fetchConfigs, fetchReferenceData]);

    const handleSort = (key: keyof LabelConfig) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
        }));
    };

    const sortedConfigs = useMemo(() => {
        const copy = [...configs];
        copy.sort((a: any, b: any) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            if (aVal == null) return 1;
            if (bVal == null) return -1;

            if (typeof aVal === "number" && typeof bVal === "number") {
                return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
            }

            const cmp = String(aVal).localeCompare(String(bVal));
            return sortConfig.direction === "asc" ? cmp : -cmp;
        });
        return copy;
    }, [configs, sortConfig]);

    const clearFilters = () => {
        setFilters({ customer: "", plant: "", warehouse: "", process_type: "", active: "" });
        setSearchTerm("");
    };

    const openDeleteDialog = (id: string) => {
        setDeleteConfigId(id);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteConfigId) return;

        try {
            await deleteLabelConfig(deleteConfigId);
            setDeleteDialogOpen(false);
            setDeleteConfigId(null);
            fetchConfigs();
        } catch (e: any) {
            setErrorBanner(e?.message || "Failed to delete configuration");
        }
    };

    return (
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 py-4 sm:py-6 space-y-4">
            {/* Page container */}
            <div>
                {/* Header */}
                <div >
                    <Bar
                        className="rounded-2xl border border-black/10 shadow-sm"
                        startContent={
                            <div className="flex flex-col">
                                <Title level="H3">Label Configurations</Title>
                                {/* <Text>Manage label determination rules and priorities</Text> */}
                            </div>
                        }
                        endContent={
                            <div className="flex flex-wrap items-center justify-end gap-2 py-1">
                                <Button
                                    icon="refresh"
                                    design="Transparent"
                                    onClick={fetchConfigs}
                                    disabled={loading}
                                >
                                    Refresh
                                </Button>
                                <Button
                                    icon="add"
                                    design="Emphasized"
                                    onClick={() => navigate("/config/new")}
                                >
                                    New Configuration
                                </Button>
                            </div>
                        }
                    />
                </div>

                {/* Error banner */}
                {errorBanner && (
                    <div className="rounded-xl overflow-hidden">
                        <MessageStrip
                            design="Negative"
                            hideCloseButton={false}
                            onClose={() => setErrorBanner(null)}
                        >
                            {errorBanner}
                        </MessageStrip>
                    </div>
                )}

                {/* Search & Filters */}
                <Card
                    className="mt-4"
                >
                    <div className="p-4 sm:p-5 space-y-3">
                        {/* Responsive toolbar: stack on mobile */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                            <div className="w-full md:flex-1">
                                <Input
                                    value={searchTerm}
                                    className="w-[inherit]"
                                    placeholder="Search by label name..."
                                    showClearIcon
                                    onInput={(e: any) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e: any) => {
                                        if (e.key === "Enter") fetchConfigs();
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2">
                                <Button
                                    icon="filter"
                                    design={showFilters ? "Emphasized" : "Transparent"}
                                    onClick={() => setShowFilters((v) => !v)}
                                >
                                    Filters
                                </Button>
                                <Button design="Transparent" icon="decline" onClick={clearFilters}>
                                    Clear
                                </Button>
                            </div>
                        </div>

                        {showFilters && (
                            <div className="pt-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                    <div className="space-y-1">
                                        <Label>Customer</Label>
                                        <Select
                                            value={filters.customer}
                                            onChange={(e: any) =>
                                                setFilters((p) => ({ ...p, customer: e.detail.selectedOption?.value || "" }))
                                            }
                                        >
                                            <Option value="all">All customers</Option>
                                            {referenceData.customers.map((c) => (
                                                <Option key={c.id} value={c.id}>
                                                    {c.name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <Label>Plant</Label>
                                        <Select
                                            value={filters.plant}
                                            onChange={(e: any) =>
                                                setFilters((p) => ({ ...p, plant: e.detail.selectedOption?.value || "" }))
                                            }
                                        >
                                            <Option value="all">All plants</Option>
                                            {referenceData.plants.map((p) => (
                                                <Option key={p.id} value={p.id}>
                                                    {p.name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <Label>Warehouse</Label>
                                        <Select
                                            value={filters.warehouse}
                                            onChange={(e: any) =>
                                                setFilters((p) => ({ ...p, warehouse: e.detail.selectedOption?.value || "" }))
                                            }
                                        >
                                            <Option value="all">All warehouses</Option>
                                            {referenceData.warehouses.map((w) => (
                                                <Option key={w.id} value={w.id}>
                                                    {w.name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <Label>Process Type</Label>
                                        <Select
                                            value={filters.process_type}
                                            onChange={(e: any) =>
                                                setFilters((p) => ({ ...p, process_type: e.detail.selectedOption?.value || "" }))
                                            }
                                        >
                                            <Option value="all">All types</Option>
                                            {referenceData.processTypes.map((pt) => (
                                                <Option key={pt.id} value={pt.id}>
                                                    {pt.name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <Label>Status</Label>
                                        <Select
                                            value={filters.active}
                                            onChange={(e: any) =>
                                                setFilters((p) => ({ ...p, active: (e.detail.selectedOption?.value || "") as any }))
                                            }
                                        >
                                            <Option value="all">All status</Option>
                                            <Option value="true">Active</Option>
                                            <Option value="false">Inactive</Option>
                                        </Select>
                                    </div>
                                </div>

                                {/* Apply button row (mobile friendly) */}
                                <div className="mt-4 flex justify-end">
                                    <Button design="Emphasized" onClick={fetchConfigs} disabled={loading}>
                                        Apply
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Table card */}
                <Card
                    className="mt-4 mb-10"
                    header={
                        <CardHeader
                            titleText="Configurations"
                            subtitleText={loading ? "Loading..." : `Showing ${sortedConfigs.length} item(s)`}
                        />
                    }
                >
                    {/* table wrapper: prevents layout breaking on small screens */}
                    <div className="p-2 sm:p-3">
                        <div className="w-full overflow-x-auto rounded-xl border border-black/5">
                            <div className="min-w-[980px]">
                                <Table
                                    noDataText={loading ? "Loading..." : "No configurations found."}
                                    headerRow={
                                        <TableHeaderRow sticky>
                                            <TableHeaderCell minWidth="200px" width="200px">
                                                <span
                                                    onClick={() => handleSort("label_name")}
                                                    className="cursor-pointer select-none"
                                                    title="Sort by Label Name"
                                                >
                                                    Label Name
                                                </span>
                                            </TableHeaderCell>

                                            <TableHeaderCell minWidth="150px">
                                                <span>Customer</span>
                                            </TableHeaderCell>

                                            <TableHeaderCell minWidth="120px">
                                                <span>Plant</span>
                                            </TableHeaderCell>

                                            <TableHeaderCell minWidth="120px">
                                                <span>Warehouse</span>
                                            </TableHeaderCell>

                                            <TableHeaderCell minWidth="120px">
                                                <span>Process Type</span>
                                            </TableHeaderCell>

                                            <TableHeaderCell minWidth="120px">
                                                <span
                                                    onClick={() => handleSort("priority")}
                                                    className="cursor-pointer select-none"
                                                    title="Sort by Priority"
                                                >
                                                    Priority
                                                </span>
                                            </TableHeaderCell>

                                            <TableHeaderCell minWidth="120px">
                                                <span># Labels</span>
                                            </TableHeaderCell>

                                            <TableHeaderCell minWidth="120px">
                                                <span>Status</span>
                                            </TableHeaderCell>

                                            <TableHeaderCell minWidth="120px">
                                                <span>Actions</span>
                                            </TableHeaderCell>
                                        </TableHeaderRow>
                                    }
                                >
                                    {sortedConfigs.map((c, idx) => (
                                        <TableRow
                                            key={c.config_id}
                                            rowKey={String(idx)}
                                            interactive
                                        //   onClick={() => navigate(`/config/${c.config_id}`)}
                                        >
                                            <TableCell>
                                                <span className="font-medium">{c.label_name}</span>
                                            </TableCell>

                                            <TableCell>
                                                <span>{c.customer || "—"}</span>
                                            </TableCell>

                                            <TableCell>
                                                <span>{c.plant || "—"}</span>
                                            </TableCell>

                                            <TableCell>
                                                <span>{c.warehouse || "—"}</span>
                                            </TableCell>

                                            <TableCell>
                                                <span>{c.process_type || "—"}</span>
                                            </TableCell>

                                            <TableCell>
                                                <span className="font-semibold">{c.priority}</span>
                                            </TableCell>

                                            <TableCell>
                                                <span>{c.number_of_labels}</span>
                                            </TableCell>

                                            <TableCell>
                                                <span className={c.active ? "text-emerald-700" : "text-gray-600"}>
                                                    {c.active ? "Active" : "Inactive"}
                                                </span>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        icon="edit"
                                                        design="Transparent"
                                                        onClick={() => navigate(`/config/${c.config_id}`)}
                                                        tooltip="Edit"
                                                    />
                                                    <Button
                                                        icon="delete"
                                                        design="Transparent"
                                                        onClick={() => openDeleteDialog(c.config_id)}
                                                        tooltip="Delete"
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </Table>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Delete Dialog */}
                <Dialog open={deleteDialogOpen} headerText="Delete Configuration">
                    <div className="p-4">
                        <Text>Are you sure you want to delete this configuration? This action cannot be undone.</Text>
                    </div>
                    <Bar
                        endContent={
                            <div className="flex gap-2">
                                <Button design="Transparent" icon="decline" onClick={() => setDeleteDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button design="Negative" icon="delete" onClick={handleDelete}>
                                    Delete
                                </Button>
                            </div>
                        }
                    />
                </Dialog>
            </div>
        </div>
    );
}
