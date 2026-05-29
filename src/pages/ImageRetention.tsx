import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { bootstrapTokenIfMissing } from "@/lib/api";
import { Eye, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const API_URL = import.meta.env.VITE_NODE_API;

type ImageRow = {
  id: string;
  imageName: string;
  size: string;
  resolution: string;
  color: boolean;
};

export default function ImageRetention() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewImageName, setPreviewImageName] = useState<string>("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<ImageRow | null>(null);
  const [sortBy, setSortBy] = useState<keyof ImageRow>("imageName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const getTokenHeader = useCallback(async () => {
    await bootstrapTokenIfMissing();
    const token = localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchRows = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const headers = await getTokenHeader();
      const response = await fetch(`${API_URL}/image-retention`, { headers });
      const responseJson = await response.json();
      if (!response.ok) {
        throw new Error(responseJson?.error ?? "Failed to load image list");
      }

      const mapped = (responseJson as any[]).map((row) => ({
        id: String(row.id),
        imageName: row.name,
        size: row.size,
        resolution: row.resolution,
        color: !!row.color,
      })) as ImageRow[];

      setRows(mapped);
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error while loading image list");
    } finally {
      setListLoading(false);
    }
  }, [getTokenHeader]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onSelectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList) return;
    setSelectedFiles(Array.from(fileList));
    setError(null);
  };

  const handleImport = async () => {
    if (selectedFiles.length === 0) {
      setError("Please choose at least one PNG or JPEG file.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const headers = await getTokenHeader();

      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("images", file));

      const response = await fetch(`${API_URL}/image-retention/metadata`, {
        method: "POST",
        headers,
        body: formData,
      });

      const responseJson = await response.json();
      if (!response.ok) {
        throw new Error(responseJson?.error ?? "Failed to import images");
      }

      await fetchRows();
      setSelectedFiles([]);
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error while importing images");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedFiles([]);
    setError(null);
  };

  const handleSort = (column: keyof ImageRow) => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDirection("asc");
  };

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const left = a[sortBy];
      const right = b[sortBy];
      if (typeof left === "boolean" && typeof right === "boolean") {
        if (left === right) return 0;
        return left ? 1 : -1;
      }
      const compared = String(left).localeCompare(String(right), undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortDirection === "asc" ? compared : -compared;
    });
    return copy;
  }, [rows, sortBy, sortDirection]);

  const handlePreview = async (row: ImageRow) => {
    setPreviewLoading(true);
    setError(null);
    try {
      const headers = await getTokenHeader();
      const response = await fetch(`${API_URL}/image-retention/${row.id}/image`, {
        headers,
      });
      if (!response.ok) {
        const maybeJson = await response.json().catch(() => null);
        throw new Error(maybeJson?.error ?? "Failed to preview image");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return objectUrl;
      });
      setPreviewImageName(row.imageName);
      setIsPreviewOpen(true);
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error while loading preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const openDeleteModal = (row: ImageRow) => {
    setRowToDelete(row);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!rowToDelete) return;
    setError(null);
    setDeleteLoading(true);
    try {
      const headers = await getTokenHeader();
      const response = await fetch(`${API_URL}/image-retention/${rowToDelete.id}`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const maybeJson = await response.json().catch(() => null);
        throw new Error(maybeJson?.error ?? "Failed to delete image");
      }

      setRows((prev) => prev.filter((r) => r.id !== rowToDelete.id));
      if (previewImageName === rowToDelete.imageName) {
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return null;
        });
        setPreviewImageName("");
        setIsPreviewOpen(false);
      }
      setIsDeleteOpen(false);
      setRowToDelete(null);
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error while deleting image");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Image Library
        </h1>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Import PNG/JPEG images and view extracted metadata.
        </p>
      </div>

      <div className="card-elevated p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground font-body tracking-wide uppercase">
            Upload Images
          </label>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            multiple
            onChange={onSelectFiles}
            className="block w-full text-sm rounded-lg border border-border bg-card p-2 font-body text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-semibold"
          />
          <p className="text-xs text-muted-foreground">
            Supported formats: PNG, JPEG
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleImport}
            disabled={loading || selectedFiles.length === 0}
            className="font-body font-semibold"
          >
            {loading ? "Importing..." : "Import"}
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            className="font-body font-semibold"
          >
            Clear
          </Button>
        </div>

        {selectedFiles.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {selectedFiles.length} file(s) selected
          </p>
        )}
      </div>

      {error && (
        <div className="card-elevated p-4 border border-red-200 bg-red-50 rounded-lg animate-fade-in">
          <p className="text-sm text-red-600 font-body">{error}</p>
        </div>
      )}

      <div className="card-elevated p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Image Master
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-3 py-2 border-b border-border">
                  <button onClick={() => handleSort("imageName")} className="font-semibold">
                    Image Name {sortBy === "imageName" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </button>
                </th>
                <th className="px-3 py-2 border-b border-border">
                  <button onClick={() => handleSort("size")} className="font-semibold">
                    Size {sortBy === "size" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </button>
                </th>
                <th className="px-3 py-2 border-b border-border">
                  <button onClick={() => handleSort("resolution")} className="font-semibold">
                    Resolution {sortBy === "resolution" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </button>
                </th>
                <th className="px-3 py-2 border-b border-border">
                  <button onClick={() => handleSort("color")} className="font-semibold">
                    Color {sortBy === "color" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </button>
                </th>
                <th className="px-3 py-2 border-b border-border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 border-b border-border">{row.imageName}</td>
                  <td className="px-3 py-2 border-b border-border">{row.size}</td>
                  <td className="px-3 py-2 border-b border-border">{row.resolution}</td>
                  <td className="px-3 py-2 border-b border-border">
                    {row.color ? "true" : "false"}
                  </td>
                  <td className="px-3 py-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Preview image"
                        onClick={() => handlePreview(row)}
                        className="h-8 w-8"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete image"
                        onClick={() => openDeleteModal(row)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!listLoading && sortedRows.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                    No rows found in image_master.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {listLoading && <p className="text-sm text-muted-foreground">Loading rows...</p>}
      {previewLoading && <p className="text-sm text-muted-foreground">Loading preview...</p>}

      <Dialog
        open={isPreviewOpen}
        onOpenChange={(open) => {
          setIsPreviewOpen(open);
          if (!open) {
            setPreviewUrl((old) => {
              if (old) URL.revokeObjectURL(old);
              return null;
            });
            setPreviewImageName("");
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Image Preview</DialogTitle>
            <DialogDescription className="font-body">{previewImageName}</DialogDescription>
          </DialogHeader>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={previewImageName}
              className="max-h-[65vh] w-full rounded border border-border object-contain"
            />
          ) : (
            <p className="text-sm text-muted-foreground font-body">No image selected.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) setRowToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">Delete image?</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              {rowToDelete
                ? `Are you sure you want to delete "${rowToDelete.imageName}"? This action cannot be undone.`
                : "Are you sure you want to delete this image? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}