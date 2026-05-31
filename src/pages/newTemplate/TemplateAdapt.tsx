import { toBlob } from 'html-to-image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useWizard } from '@/context/WizardContext';
import { Button } from '@/components/ui/button';
import { bootstrapTokenIfMissing } from '@/lib/api';
import { Checkbox } from '@/components/ui/checkbox';
import {
    ArrowLeft,
    ArrowRight,
    MousePointer2,
    Type,
    Trash2,
    RefreshCw,
    Loader2,
    Settings,
    Image as ImageIcon,
    Sliders,
    HelpCircle,
    Compass,
    Move,
    Eye,
    RotateCw,
    Lock,
    Zap,
    Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FieldMappingSelector } from './FieldMappingSelector';
import { TransformationModal, type TransformationPayload } from './TransformationModal';

const flaskAPI = import.meta.env.VITE_FLASK_API;
const nodeAPI = import.meta.env.VITE_NODE_API;

const GRID_SIZE = 10;

// Helper to convert base64 data URI back to File for robust page refresh recovery
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

export function TemplateAdapt() {
    const {
        uploadedFile,
        uploadedImage,
        chunks,
        generatedHTML,
        setGeneratedHTML,
        nextStep,
        prevStep,
        setModifiedLabelBlob,
        setGeneratedZPL,
        setGeneratedXDP,
        watermarkName,
        selectedContext
    } = useWizard();

    const [isLoading, setIsLoading] = useState(false);
    const [localHtml, setLocalHtml] = useState("");

    const [selectedElements, setSelectedElements] = useState<HTMLElement[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [initialTransforms, setInitialTransforms] = useState<
        { el: HTMLElement; x: number; y: number }[]
    >([]);
    const [marquee, setMarquee] = useState<any>(null);

    const [watermarkSrc, setWatermarkSrc] = useState<string | null>(null);
    const [retentionImages, setRetentionImages] = useState<any[]>([]);

    // Mapping & Transformations Modal detailed states
    const [openTransformModal, setOpenTransformModal] = useState(false);

    // Watermark detailed states
    const [isWatermarkEnabled, setIsWatermarkEnabled] = useState(false);
    const [wmWidth, setWmWidth] = useState(300);
    const [wmOpacity, setWmOpacity] = useState(0.05);
    const [wmLeft, setWmLeft] = useState(150);
    const [wmTop, setWmTop] = useState(150);
    const [wmRotate, setWmRotate] = useState(0);

    const editorRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const hasInitializedRef = useRef(false);

    // -------------------------------------------------
    // Fetch Watermark & Image Retention Options
    // -------------------------------------------------
    useEffect(() => {
        const fetchWatermark = async () => {
            if (!watermarkName || !nodeAPI) return;
            try {
                await bootstrapTokenIfMissing();
                const token = localStorage.getItem("access_token");
                const response = await fetch(`${nodeAPI}/image-retention`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                const data = await response.json();
                if (Array.isArray(data)) {
                    const matched = data.find((item: any) => item.name === watermarkName);
                    if (matched) {
                        setWatermarkSrc(`${nodeAPI}/image-retention/${matched.id}/image`);
                    }
                }
            } catch (err) {
                console.error("Failed to load watermark", err);
            }
        };

        const fetchRetentionImages = async () => {
            if (!nodeAPI) return;
            try {
                await bootstrapTokenIfMissing();
                const token = localStorage.getItem("access_token");
                const response = await fetch(`${nodeAPI}/image-retention`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                const data = await response.json();
                if (Array.isArray(data)) {
                    setRetentionImages(data);
                }
            } catch (err) {
                console.error("Failed to fetch retention images", err);
            }
        };

        fetchWatermark();
        fetchRetentionImages();
    }, [watermarkName]);

    // Parse existing watermark values on mount/load
    useEffect(() => {
        if (localHtml && !hasInitializedRef.current) {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = localHtml;
            const watermarkEl = tempDiv.querySelector("#watermark-element") as HTMLElement;
            if (watermarkEl) {
                hasInitializedRef.current = true;
                setIsWatermarkEnabled(true);
                setWmWidth(parseInt(watermarkEl.style.width) || 300);
                setWmOpacity(parseFloat(watermarkEl.style.opacity) || 0.05);
                setWmLeft(parseInt(watermarkEl.style.left) || 150);
                setWmTop(parseInt(watermarkEl.style.top) || 150);
                const rotAttr = watermarkEl.getAttribute("data-rotation");
                setWmRotate(rotAttr ? parseInt(rotAttr) : 0);
            }
        }
    }, [localHtml]);

    // -------------------------------------------------
    // Dynamic Watermark Synchronizer
    // -------------------------------------------------
    const syncWatermarkInDOM = (updates: {
        enabled?: boolean;
        width?: number;
        opacity?: number;
        left?: number;
        top?: number;
        rotate?: number;
    }) => {
        const editorEl = editorRef.current;
        if (!editorEl) return;

        let watermarkEl = editorEl.querySelector("#watermark-element") as HTMLElement;
        const targetEnabled = updates.enabled !== undefined ? updates.enabled : isWatermarkEnabled;

        if (targetEnabled) {
            // Inject watermark if it doesn't exist
            if (!watermarkEl && watermarkSrc) {
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = `<img id="watermark-element" crossorigin="anonymous" data-editor-element="true" src="${watermarkSrc}" style="position: absolute; left: ${wmLeft}px; top: ${wmTop}px; width: ${wmWidth}px; height: auto; opacity: ${wmOpacity}; pointer-events: auto; user-select: none; z-index: 1; transform: rotate(${wmRotate}deg); transition: opacity 0.2s;" data-rotation="${wmRotate}" />`;
                watermarkEl = tempDiv.firstElementChild as HTMLElement;
                editorEl.appendChild(watermarkEl);
            }

            // Update styles in real-time
            if (watermarkEl) {
                if (updates.width !== undefined) watermarkEl.style.width = `${updates.width}px`;
                if (updates.opacity !== undefined) watermarkEl.style.opacity = `${updates.opacity}`;
                if (updates.left !== undefined) watermarkEl.style.left = `${updates.left}px`;
                if (updates.top !== undefined) watermarkEl.style.top = `${updates.top}px`;
                if (updates.rotate !== undefined) {
                    watermarkEl.style.transform = `rotate(${updates.rotate}deg)`;
                    watermarkEl.setAttribute("data-rotation", String(updates.rotate));
                }
            }
        } else {
            // Remove watermark from DOM
            if (watermarkEl) {
                watermarkEl.remove();
            }
        }

        // Sync with React State (Always use innerHTML to avoid nesting canvas container wrapper!)
        setLocalHtml(editorEl.innerHTML);
    };

    // Checkbox toggler
    const handleToggleWatermark = (checked: boolean) => {
        setIsWatermarkEnabled(checked);
        syncWatermarkInDOM({ enabled: checked });
        if (checked) {
            toast.success("Watermark added to canvas");
        } else {
            toast.info("Watermark removed");
        }
    };

    // -------------------------------------------------
    // Backend HTML Generation
    // -------------------------------------------------
    const fetchHtml = async () => {
        let fileToSend = uploadedFile;
        if (!fileToSend && uploadedImage) {
            try {
                fileToSend = dataURLtoFile(uploadedImage, "template.png");
            } catch (e) {
                console.error("Failed to restore file from base64:", e);
            }
        }

        if (!fileToSend) return;

        setIsLoading(true);
        const formData = new FormData();
        formData.append("image", fileToSend);

        // Add pre-detected crops
        const logo = chunks.find(c => c.type === 'logo')?.cropped_b64;
        const sig = chunks.find(c => c.type === 'signature')?.cropped_b64;
        if (logo) formData.append("logo_b64", logo);
        if (sig) formData.append("signature_b64", sig);

        try {
            const baseUrl = flaskAPI || 'http://localhost:5050';
            const res = await fetch(`${baseUrl}/replicate-invoice`, {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            if (data.status === "success") {
                setGeneratedHTML(data.full_html);
                setLocalHtml(data.full_html);
                hasInitializedRef.current = false; // Reset to parse new loaded template if needed
                toast.success("Design Template Generated");
            } else {
                toast.error(data.error || "Generation failed");
            }
        } catch {
            toast.error("Backend connection failed");
        } finally {
            setIsLoading(false);
        }
    };

    // 🔥 FIX: Only initialize localHtml ONCE when generatedHTML is fetched or loaded.
    // This stops React state cycles from constantly overwriting local edits or logo swaps!
    useEffect(() => {
        if (!generatedHTML && (uploadedFile || uploadedImage) && !isLoading) {
            fetchHtml();
        } else if (generatedHTML && !localHtml) {
            setLocalHtml(generatedHTML);
        }
    }, [generatedHTML, uploadedFile, uploadedImage, localHtml]);

    // -------------------------------------------------
    // DOM Utils
    // -------------------------------------------------
    const getTransform = (el: HTMLElement) => {
        const style = window.getComputedStyle(el);
        const matrix = new DOMMatrixReadOnly(style.transform);
        return { x: matrix.m41, y: matrix.m42 };
    };

    const clearSelection = () => {
        selectedElements.forEach(el => (el.style.outline = ""));
        setSelectedElements([]);
    };

    // -------------------------------------------------
    // Selection Logic & Drag Interceptor
    // -------------------------------------------------
    const getAbsoluteAncestor = (el: HTMLElement | null): HTMLElement | null => {
        if (!el || !editorRef.current) return null;
        if (el === editorRef.current) return null;
        let current: HTMLElement | null = el;
        let highestAbsolute: HTMLElement | null = null;
        while (current && current !== editorRef.current) {
            const style = window.getComputedStyle(current);
            if (style.position === "absolute" || current.getAttribute("data-editor-element") === "true") {
                highestAbsolute = current;
            }
            current = current.parentElement;
        }
        return highestAbsolute;
    };

    const handleClick = (e: React.MouseEvent) => {
        const rawTarget = e.target as HTMLElement;
        const target = getAbsoluteAncestor(rawTarget);

        if (!target) {
            if (!e.shiftKey && !e.metaKey) clearSelection();
            return;
        }

        e.stopPropagation();
        let newSelection = [...selectedElements];

        if (e.shiftKey || e.metaKey) {
            if (newSelection.includes(target)) {
                target.style.outline = "";
                newSelection = newSelection.filter(el => el !== target);
            } else {
                target.style.outline = "2px dashed #f43f5e";
                newSelection.push(target);
            }
        } else {
            clearSelection();
            target.style.outline = "2px dashed #f43f5e";
            newSelection = [target];
        }

        setSelectedElements(newSelection);
    };

    // -------------------------------------------------
    // Drag + Move
    // -------------------------------------------------
    const handleMouseDown = (e: React.MouseEvent) => {
        const rawTarget = e.target as HTMLElement;
        const target = getAbsoluteAncestor(rawTarget);

        setDragStart({
            x: e.clientX,
            y: e.clientY
        });

        if (target && selectedElements.includes(target)) {
            setIsDragging(true);
            setInitialTransforms(
                selectedElements.map(el => ({
                    el,
                    ...getTransform(el)
                }))
            );
        } else if (!target) {
            setMarquee({
                x1: e.clientX,
                y1: e.clientY,
                x2: e.clientX,
                y2: e.clientY
            });
        }
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging) {
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;

            initialTransforms.forEach(({ el, x, y }) => {
                const newX = Math.round((x + dx) / GRID_SIZE) * GRID_SIZE;
                const newY = Math.round((y + dy) / GRID_SIZE) * GRID_SIZE;
                
                if (el.id === "watermark-element") {
                    const rot = el.getAttribute("data-rotation") || "0";
                    el.style.transform = `translate(${newX}px, ${newY}px) rotate(${rot}deg)`;
                } else {
                    el.style.transform = `translate(${newX}px, ${newY}px)`;
                }
            });
        } else if (marquee) {
            setMarquee(prev =>
                prev ? { ...prev, x2: e.clientX, y2: e.clientY } : null
            );
        }
    }, [isDragging, marquee, dragStart, initialTransforms]);

    const handleMouseUp = useCallback(() => {
        if (marquee && editorRef.current) {
            const xMin = Math.min(marquee.x1, marquee.x2);
            const xMax = Math.max(marquee.x1, marquee.x2);
            const yMin = Math.min(marquee.y1, marquee.y2);
            const yMax = Math.max(marquee.y1, marquee.y2);

            const children = Array.from(
                editorRef.current.querySelectorAll("[data-editor-element]")
            ) as HTMLElement[];

            const newlySelected: HTMLElement[] = [];

            children.forEach(child => {
                const rect = child.getBoundingClientRect();
                if (
                    rect.left >= xMin &&
                    rect.right <= xMax &&
                    rect.top >= yMin &&
                    rect.bottom <= yMax
                ) {
                    child.style.outline = "2px dashed #f43f5e";
                    newlySelected.push(child);
                }
            });

            if (newlySelected.length > 0)
                setSelectedElements(newlySelected);
        }

        if (isDragging && editorRef.current) {
            // Sync drag positions back to state cleanly
            setLocalHtml(editorRef.current.innerHTML);
        }

        setIsDragging(false);
        setMarquee(null);
    }, [marquee, isDragging]);

    // -------------------------------------------------
    // ResizeObserver
    // -------------------------------------------------
    useEffect(() => {
        const observer = new ResizeObserver(() => {
            if (canvasRef.current) {
                canvasRef.current.getBoundingClientRect();
            }
        });

        if (canvasRef.current)
            observer.observe(canvasRef.current);

        return () => observer.disconnect();
    }, []);

    // Mouse listeners
    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    // Selected element utilities
    const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;

    // Helper to get selected image node (handles wrapper containers or direct image tag clicks)
    const getSelectedImageNode = (el: HTMLElement | null): HTMLImageElement | null => {
        if (!el) return null;
        if (el.tagName.toLowerCase() === "img") return el as HTMLImageElement;
        const childImg = el.querySelector("img");
        if (childImg) return childImg as HTMLImageElement;
        return null;
    };

    const activeImageNode = getSelectedImageNode(selectedElement);
    const isImageSelected = activeImageNode !== null && activeImageNode.id !== "watermark-element";

    const replaceSelectedImage = async (imageId: string) => {
        const imageNode = getSelectedImageNode(selectedElement);
        if (imageNode && isImageSelected) {
            try {
                const targetUrl = `${nodeAPI}/image-retention/${imageId}/image`;
                imageNode.crossOrigin = "anonymous";
                imageNode.src = targetUrl;
                if (editorRef.current) {
                    setLocalHtml(editorRef.current.innerHTML);
                }
                toast.success("Logo replaced successfully");
            } catch (err) {
                console.error("Failed to replace image:", err);
                toast.error("Failed to replace image");
            }
        }
    // -------------------------------------------------
    // Dynamic Studio Text & Mapping Helpers
    // -------------------------------------------------
    const isTextSelected = selectedElement !== null && 
        selectedElement.tagName.toLowerCase() !== "img" && 
        selectedElement.id !== "watermark-element";

    const selectedElementMapping = selectedElement?.getAttribute("data-sap-mapping") || "";
    const isElementStatic = !selectedElementMapping;

    // Parses JSON string representation of transformations from element attributes
    const getElementTransformations = (): any[] => {
        if (!selectedElement) return [];
        const raw = selectedElement.getAttribute("data-transformations");
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch {
            return [];
        }
    };
    const elementTransformations = getElementTransformations();

    const handleMappingSelect = (fullPath: string, fieldName: string) => {
        if (!selectedElement) return;
        
        selectedElement.textContent = `{{${fieldName}}}`;
        selectedElement.setAttribute("data-sap-mapping", fullPath);
        selectedElement.setAttribute("data-editor-element", "true");
        
        if (editorRef.current) {
            setLocalHtml(editorRef.current.innerHTML);
        }
        toast.success(`Mapped to ${fieldName} successfully`);
    };

    const handleToggleStatic = () => {
        if (!selectedElement) return;
        
        selectedElement.removeAttribute("data-sap-mapping");
        selectedElement.removeAttribute("data-transformations");
        
        // Strip placeholders if present
        if (selectedElement.textContent?.startsWith("{{") && selectedElement.textContent?.endsWith("}}")) {
            const inner = selectedElement.textContent.slice(2, -2);
            selectedElement.textContent = inner;
        }
        
        if (editorRef.current) {
            setLocalHtml(editorRef.current.innerHTML);
        }
        toast.info("Changed mapping to Static text");
    };

    const handleTextChange = (newVal: string) => {
        if (!selectedElement) return;
        selectedElement.textContent = newVal;
        if (editorRef.current) {
            setLocalHtml(editorRef.current.innerHTML);
        }
    };

    const handleApplyTransformations = (transformations: TransformationPayload[]) => {
        if (!selectedElement) return;
        selectedElement.setAttribute("data-transformations", JSON.stringify(transformations));
        if (editorRef.current) {
            setLocalHtml(editorRef.current.innerHTML);
        }
        setOpenTransformModal(false);
        toast.success("Applied transformations successfully");
    };

    const contextFields = (() => {
        if (!selectedContext?.fields) return [];
        if (Array.isArray(selectedContext.fields)) return selectedContext.fields;
        
        const flat: { name: string; path: string }[] = [];
        Object.entries(selectedContext.fields).forEach(([entity, fields]: [string, any]) => {
            if (Array.isArray(fields)) {
                fields.forEach((f) => {
                    flat.push({
                        name: f.name || f,
                        path: `${entity}.${f.path || f.name || f}`,
                    });
                });
            }
        });
        return flat;
    })();

    const targetFields = (() => {
        if (!editorRef.current) return [];
        const elements = Array.from(editorRef.current.querySelectorAll("[data-editor-element], [data-sap-mapping]")) as HTMLElement[];
        return elements.map((el, index) => {
            const mapping = el.getAttribute("data-sap-mapping");
            const label = mapping ? mapping.split('.').pop()! : (el.textContent || `Element ${index}`);
            return {
                name: label,
                path: mapping || `element-${index}`
            };
        });
    })();
    // -------------------------------------------------

    // -------------------------------------------------
    // Save (Absolute Coordinates Translation)
    // -------------------------------------------------
    const handleSave = async () => {
        if (editorRef.current) {
            setIsLoading(true);
            try {
                // Clear selection outlines before saving
                selectedElements.forEach(el => (el.style.outline = ""));
                setSelectedElements([]);

                // 🔥 Convert absolute translate positions to clean left/top coordinates for ALL dragged elements
                const elements = Array.from(editorRef.current.querySelectorAll("*")) as HTMLElement[];
                elements.forEach(el => {
                    const style = el.style;
                    if (style.transform && style.transform.includes("translate")) {
                        const match = style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
                        if (match) {
                            const dx = parseFloat(match[1]);
                            const dy = parseFloat(match[2]);

                            let currentLeft = 0;
                            let currentTop = 0;

                            if (style.left) {
                                currentLeft = parseFloat(style.left) || 0;
                            } else {
                                currentLeft = el.offsetLeft - dx;
                            }

                            if (style.top) {
                                currentTop = parseFloat(style.top) || 0;
                            } else {
                                currentTop = el.offsetTop - dy;
                            }

                            style.left = `${currentLeft + dx}px`;
                            style.top = `${currentTop + dy}px`;
                            
                            // Keep rotation transform intact on watermark saving
                            if (el.id === "watermark-element") {
                                const rot = el.getAttribute("data-rotation") || "0";
                                style.transform = `rotate(${rot}deg)`;
                            } else {
                                style.transform = ""; // Remove translation
                            }
                        }
                    }
                });

                // Clear overlays or outlines again to be safe
                const outerHtmlContent = editorRef.current.outerHTML;

                // 2286 IQ Move: Temporarily remove the watermark element from the DOM during snapshot capture.
                // This guarantees the captured PNG canvas snapshot is 100% free of watermark clutter
                // so that the downstream ZPL/XDP generation is never affected by it, while preserving the logo.
                const watermarkEl = editorRef.current.querySelector("#watermark-element") as HTMLElement;
                if (watermarkEl) {
                    watermarkEl.remove();
                }

                // Capture the current canvas state as a blob for downstream ZPL/XDP generation
                const blob = await toBlob(editorRef.current, {
                    backgroundColor: '#ffffff',
                    width: editorRef.current.offsetWidth,
                    height: editorRef.current.offsetHeight,
                });

                // Restore the watermark element back to the editor DOM for continuous visual editing
                if (watermarkEl) {
                    editorRef.current.appendChild(watermarkEl);
                }

                if (blob) {
                    setModifiedLabelBlob(blob);
                    // Reset generated codes so Step 4 regenerates them from the NEW blob
                    setGeneratedZPL(null);
                    setGeneratedXDP(null);
                }

                setGeneratedHTML(outerHtmlContent);
                nextStep();
            } catch (err) {
                console.error("Capture Error:", err);
                toast.error("Failed to capture design snapshot");
                nextStep();
            } finally {
                setIsLoading(false);
            }
        } else {
            nextStep();
        }
    };

    // -------------------------------------------------
    // Render
    // -------------------------------------------------
    const isMultiPage = localHtml.includes("multi-page-container") || localHtml.includes("pdf-page-wrapper");

    return (
        <div className="flex h-[calc(100vh-140px)] w-full select-none relative overflow-hidden bg-slate-100 rounded-3xl border border-slate-200 shadow-inner">
            {/* Editor Workspace (Left) */}
            <div className="flex-1 flex flex-col relative h-full">
                {/* Toolbar */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur shadow-2xl rounded-full px-6 py-2.5 flex items-center gap-6 border border-slate-200 animate-in fade-in duration-300">
                    <div className="flex items-center gap-3 border-r border-slate-200 pr-6">
                        <MousePointer2 className="w-4 h-4 text-rose-500 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Editor</span>
                    </div>

                    {selectedElements.length > 0 ? (
                        <>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">
                                {selectedElements.length} Selected
                            </span>

                            {selectedElements.length === 1 && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-slate-600 hover:bg-slate-50"
                                    onClick={() => {
                                        if (selectedElement) {
                                            selectedElement.contentEditable = "true";
                                            selectedElement.focus();
                                        }
                                    }}
                                >
                                    <Type className="w-4 h-4" />
                                </Button>
                            )}

                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                    selectedElements.forEach(el => el.remove());
                                    setSelectedElements([]);
                                    if (editorRef.current) {
                                        setLocalHtml(editorRef.current.innerHTML);
                                    }
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </>
                    ) : (
                        <span className="text-[10px] text-slate-400 italic">
                            Shift + Click to select multiple elements
                        </span>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-600 hover:bg-slate-50 text-[10px] font-bold"
                        onClick={fetchHtml}
                        disabled={isLoading}
                    >
                        <RefreshCw className={cn("w-3 h-3 mr-2", isLoading && "animate-spin")} />
                        Reset Canvas
                    </Button>
                </div>

                {/* Canvas Area (Removed p-12 double-whitespace padding on page wrappers) */}
                <div className="flex-1 bg-slate-100 overflow-auto flex justify-center p-2 relative custom-scrollbar shadow-inner">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center m-auto">
                            <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
                            <p className="text-sm font-semibold text-slate-500 mt-3 animate-pulse">
                                Re-rendering canvas safely...
                            </p>
                        </div>
                    ) : (
                        <div className="relative flex justify-center p-0" ref={canvasRef}>
                            <div className="relative">
                                <div
                                    ref={editorRef}
                                    data-editor-container="true"
                                    className={cn(
                                        "relative border border-slate-200/50 transition-all duration-300",
                                        isMultiPage 
                                            ? "bg-transparent shadow-none w-auto" 
                                            : "bg-white shadow-2xl min-h-[11in] w-[8.5in] overflow-hidden"
                                    )}
                                    dangerouslySetInnerHTML={{ __html: localHtml }}
                                    onClick={handleClick}
                                    onMouseDown={handleMouseDown}
                                />

                                <style dangerouslySetInnerHTML={{ __html: `
                                    [data-editor-container] * {
                                        transition: outline 0.08s ease-in-out;
                                    }
                                    [data-editor-container] *:hover {
                                        outline: 1.5px dashed #3b82f6 !important;
                                        cursor: pointer;
                                    }
                                    [data-editor-container] [data-sap-mapping] {
                                        border-bottom: 2px double #f43f5e;
                                    }
                                `}} />

                                {marquee && (
                                    <div
                                        className="fixed border border-blue-500 bg-blue-500/10 pointer-events-none z-[100]"
                                        style={{
                                            left: Math.min(marquee.x1, marquee.x2),
                                            top: Math.min(marquee.y1, marquee.y2),
                                            width: Math.abs(marquee.x2 - marquee.x1),
                                            height: Math.abs(marquee.y2 - marquee.y1)
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Canvas Navigation Footer */}
                <div className="bg-white border-t border-slate-200 p-4 flex justify-end gap-3 z-40">
                    <Button variant="outline" onClick={prevStep} className="h-10 px-5 font-bold uppercase text-xs tracking-wider border-slate-300 hover:bg-slate-50">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>

                    <Button onClick={handleSave} className="h-10 px-8 bg-[#1c2b39] hover:bg-slate-800 text-white font-bold uppercase text-xs tracking-wider shadow-lg">
                        Finalize Design
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>

            {/* Premium, High-End Control Inspector Panel (Right) - FIXED flex-shrink-0 to prevent compression */}
            <div className="w-[360px] flex-shrink-0 border-l border-slate-200 bg-white p-6 flex flex-col justify-between overflow-y-auto z-40 shadow-2xl select-none custom-scrollbar transition-all duration-300">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2">
                            <Settings className="w-5 h-5 text-rose-500 animate-spin-slow" />
                            <h3 className="font-display text-[12px] font-extrabold text-slate-800 uppercase tracking-widest">
                                Properties Inspector
                            </h3>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 font-body">
                            Customize and configure watermarks and logos
                        </p>
                    </div>

                    {/* Watermark Section */}
                    <div className="space-y-4 rounded-2xl border border-slate-200/80 p-5 bg-gradient-to-b from-slate-50/80 to-white shadow-sm">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2 text-rose-600 font-extrabold text-[10px] uppercase tracking-widest">
                                <Compass className="w-3.5 h-3.5 text-rose-500" />
                                Canvas Watermark
                            </div>
                            <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-full border border-slate-200/40">
                                <span className="text-[9px] font-bold text-slate-600 uppercase">Enable</span>
                                <Checkbox
                                    checked={isWatermarkEnabled}
                                    onCheckedChange={(checked) => handleToggleWatermark(!!checked)}
                                    className="data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                                    aria-label="Toggle watermark visibility"
                                />
                            </div>
                        </div>

                        {isWatermarkEnabled && (
                            <div className="space-y-5 pt-3 animate-in fade-in duration-300">
                                {/* VISUAL GROUP: APPEARANCE */}
                                <div className="space-y-3">
                                    <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Sliders className="w-3 h-3 text-slate-300" /> Appearance
                                    </div>
                                    
                                    {/* Size (Width) */}
                                    <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-inner">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                                            <span className="flex items-center gap-1.5"><Sliders className="w-3 h-3 text-slate-400" /> Size (Width)</span>
                                            <div className="flex items-center gap-1 font-mono">
                                                <input 
                                                    type="number" 
                                                    value={wmWidth} 
                                                    onChange={(e) => {
                                                        const val = Math.max(100, Math.min(800, parseInt(e.target.value) || wmWidth));
                                                        setWmWidth(val);
                                                        syncWatermarkInDOM({ width: val });
                                                    }}
                                                    className="w-12 text-center bg-slate-50 border rounded text-[10px] py-0.5 focus:outline-rose-400 font-bold"
                                                />
                                                <span className="text-slate-400 text-[9px]">px</span>
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="100"
                                            max="800"
                                            step="10"
                                            value={wmWidth}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setWmWidth(val);
                                                syncWatermarkInDOM({ width: val });
                                            }}
                                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                                        />
                                    </div>

                                    {/* Opacity */}
                                    <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-inner">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                                            <span className="flex items-center gap-1.5"><Eye className="w-3 h-3 text-slate-400" /> Opacity</span>
                                            <div className="flex items-center gap-1 font-mono">
                                                <input 
                                                    type="number" 
                                                    min="0.01" 
                                                    max="0.20" 
                                                    step="0.01" 
                                                    value={wmOpacity} 
                                                    onChange={(e) => {
                                                        const val = Math.max(0.01, Math.min(0.20, parseFloat(e.target.value) || wmOpacity));
                                                        setWmOpacity(val);
                                                        syncWatermarkInDOM({ opacity: val });
                                                    }}
                                                    className="w-12 text-center bg-slate-50 border rounded text-[10px] py-0.5 focus:outline-rose-400 font-bold"
                                                />
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.01"
                                            max="0.20"
                                            step="0.01"
                                            value={wmOpacity}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setWmOpacity(val);
                                                syncWatermarkInDOM({ opacity: val });
                                            }}
                                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                                        />
                                    </div>
                                </div>

                                {/* VISUAL GROUP: ALIGNMENT & ORIENTATION */}
                                <div className="space-y-3">
                                    <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Move className="w-3 h-3 text-slate-300" /> Alignment & Orientation
                                    </div>

                                    {/* X Offset (Left) */}
                                    <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-inner">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                                            <span className="flex items-center gap-1.5"><Move className="w-3 h-3 text-slate-400" /> Position X</span>
                                            <div className="flex items-center gap-1 font-mono">
                                                <input 
                                                    type="number" 
                                                    value={wmLeft} 
                                                    onChange={(e) => {
                                                        const val = Math.max(0, Math.min(800, parseInt(e.target.value) || wmLeft));
                                                        setWmLeft(val);
                                                        syncWatermarkInDOM({ left: val });
                                                    }}
                                                    className="w-12 text-center bg-slate-50 border rounded text-[10px] py-0.5 focus:outline-rose-400 font-bold"
                                                />
                                                <span className="text-slate-400 text-[9px]">px</span>
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="800"
                                            step="5"
                                            value={wmLeft}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setWmLeft(val);
                                                syncWatermarkInDOM({ left: val });
                                            }}
                                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                                        />
                                    </div>

                                    {/* Y Offset (Top) */}
                                    <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-inner">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                                            <span className="flex items-center gap-1.5"><Move className="w-3 h-3 text-slate-400" /> Position Y</span>
                                            <div className="flex items-center gap-1 font-mono">
                                                <input 
                                                    type="number" 
                                                    value={wmTop} 
                                                    onChange={(e) => {
                                                        const val = Math.max(0, Math.min(1000, parseInt(e.target.value) || wmTop));
                                                        setWmTop(val);
                                                        syncWatermarkInDOM({ top: val });
                                                    }}
                                                    className="w-12 text-center bg-slate-50 border rounded text-[10px] py-0.5 focus:outline-rose-400 font-bold"
                                                />
                                                <span className="text-slate-400 text-[9px]">px</span>
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1000"
                                            step="5"
                                            value={wmTop}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setWmTop(val);
                                                syncWatermarkInDOM({ top: val });
                                            }}
                                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                                        />
                                    </div>

                                    {/* Rotation */}
                                    <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-inner">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                                            <span className="flex items-center gap-1.5"><RotateCw className="w-3 h-3 text-slate-400" /> Rotation</span>
                                            <div className="flex items-center gap-1 font-mono">
                                                <input 
                                                    type="number" 
                                                    value={wmRotate} 
                                                    onChange={(e) => {
                                                        const val = Math.max(-180, Math.min(180, parseInt(e.target.value) || wmRotate));
                                                        setWmRotate(val);
                                                        syncWatermarkInDOM({ rotate: val });
                                                    }}
                                                    className="w-12 text-center bg-slate-50 border rounded text-[10px] py-0.5 focus:outline-rose-400 font-bold"
                                                />
                                                <span className="text-slate-400 text-[9px]">°</span>
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="-180"
                                            max="180"
                                            step="5"
                                            value={wmRotate}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setWmRotate(val);
                                                syncWatermarkInDOM({ rotate: val });
                                            }}
                                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                                        />
                                    </div>
                                </div>

                                <p className="text-[9px] text-muted-foreground italic leading-relaxed text-center px-1">
                                    💡 Tip: A transparency of 5% - 8% is ideal so the watermark stays invisible to high-contrast ZPL binarization.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Logo/Image Swapper Section */}
                    {isImageSelected && (
                        <div className="space-y-4 rounded-2xl border border-rose-100 p-5 bg-gradient-to-b from-rose-50/20 to-white shadow-sm animate-in slide-in-from-right duration-300">
                            <div className="flex items-center gap-2 text-rose-600 font-extrabold text-[10px] uppercase tracking-widest border-b border-rose-100/50 pb-2">
                                <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
                                Image/Logo Placeholder
                            </div>

                            {/* Swap Image from Image Retention */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-600 block">
                                    Replace from Image Retention
                                </label>
                                <select
                                    onChange={(e) => replaceSelectedImage(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-body focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all shadow-sm font-medium"
                                    defaultValue=""
                                >
                                    <option value="" disabled>Choose an image...</option>
                                    {retentionImages.map((img) => (
                                        <option key={img.id} value={img.id}>
                                            {img.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[9px] text-muted-foreground mt-1 leading-normal">
                                    Select any image imported in your Image Retention master to swap it into this placeholder position.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Text Field Properties & Mapping Panel */}
                    {isTextSelected && (
                        <div className="space-y-4 rounded-2xl border border-blue-100 p-5 bg-gradient-to-b from-blue-50/20 to-white shadow-sm animate-in slide-in-from-right duration-300">
                            <div className="flex items-center gap-2 text-blue-600 font-extrabold text-[10px] uppercase tracking-widest border-b border-blue-100/50 pb-2">
                                <Type className="w-3.5 h-3.5 text-blue-500" />
                                Text Field Properties
                            </div>

                            {/* Static / Dynamic Toggle */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-500 block">Logic Type</label>
                                <div className="flex border border-slate-200 rounded-lg overflow-hidden p-0.5 bg-slate-100">
                                    <button
                                        onClick={handleToggleStatic}
                                        className={cn(
                                            "flex-1 py-1 text-[9px] font-bold tracking-wider rounded-md transition-all uppercase flex items-center justify-center gap-1",
                                            isElementStatic
                                                ? "bg-white shadow-sm text-slate-800"
                                                : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        <Lock className="w-2.5 h-2.5" /> Static Text
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (selectedElement && isElementStatic) {
                                                selectedElement.setAttribute("data-sap-mapping", "unmapped");
                                                if (editorRef.current) setLocalHtml(editorRef.current.innerHTML);
                                            }
                                        }}
                                        className={cn(
                                            "flex-1 py-1 text-[9px] font-bold tracking-wider rounded-md transition-all uppercase flex items-center justify-center gap-1",
                                            !isElementStatic
                                                ? "bg-white shadow-sm text-rose-600"
                                                : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        <Zap className="w-2.5 h-2.5 text-rose-500" /> Dynamic SAP
                                    </button>
                                </div>
                            </div>

                            {/* Static Text Input */}
                            {isElementStatic ? (
                                <div className="space-y-2 animate-in fade-in duration-200">
                                    <label className="text-[10px] font-bold uppercase text-slate-500 block">Text Value</label>
                                    <textarea
                                        value={selectedElement?.textContent || ""}
                                        onChange={(e) => handleTextChange(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-body focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm font-medium"
                                    />
                                    <p className="text-[9px] text-slate-400 leading-normal">
                                        Edit the visual static label directly. Changes are automatically updated in ZPL/HTML.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    {/* SAP Field Mapping Dropdown */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase text-slate-500 block">SAP Field Mapping</label>
                                        <FieldMappingSelector 
                                            value={selectedElementMapping === "unmapped" ? "" : selectedElementMapping}
                                            selectedContext={selectedContext}
                                            onSelect={handleMappingSelect}
                                        />
                                        <p className="text-[9px] text-slate-400 leading-normal">
                                            Choose an SAP field from the active catalog to replace this text block with a dynamic templated value.
                                        </p>
                                    </div>

                                    {/* Transformations */}
                                    <div className="space-y-2 border-t border-slate-100 pt-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold uppercase text-slate-500">Transformations</label>
                                            {elementTransformations.length > 0 && (
                                                <span className="text-[9px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full animate-pulse">
                                                    {elementTransformations.length}
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => setOpenTransformModal(true)}
                                            disabled={!selectedElementMapping || selectedElementMapping === "unmapped"}
                                            className="w-full text-xs h-9 rounded-xl border-dashed border-2 hover:border-blue-500 hover:bg-blue-50/10 transition-all font-semibold flex items-center justify-center gap-1.5"
                                        >
                                            <Zap className="w-3.5 h-3.5 text-rose-500 animate-bounce" />
                                            Add Transformation
                                        </Button>

                                        {elementTransformations.length > 0 && (
                                            <div className="space-y-1.5 pt-2">
                                                {elementTransformations.map((t: any, index: number) => (
                                                    <div key={index} className="bg-slate-50 rounded-xl px-3 py-2 text-[10px] font-medium flex justify-between items-center border border-slate-100">
                                                        <div className="min-w-0">
                                                            <div className="font-bold flex items-center gap-1.5 uppercase text-slate-700">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                                {t.type.replace('_', ' ')}
                                                            </div>
                                                            {t.value && (
                                                                <div className="text-[9px] text-slate-400 truncate">Value: {t.value}</div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const updated = elementTransformations.filter((_, i) => i !== index);
                                                                selectedElement.setAttribute("data-transformations", JSON.stringify(updated));
                                                                if (editorRef.current) setLocalHtml(editorRef.current.innerHTML);
                                                            }}
                                                            className="w-5 h-5 rounded-md hover:bg-red-50 text-red-500 flex items-center justify-center transition-all"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Default state Help Inspector */}
                    {!isImageSelected && !isTextSelected && (
                        <div className="space-y-4 text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 animate-in fade-in duration-300 shadow-sm">
                            <HelpCircle className="w-8 h-8 text-slate-400 mx-auto animate-pulse" />
                            <div className="space-y-1.5 px-5">
                                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Studio Inspector</h4>
                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                    Click any text block, barcode, watermark, or logo on the canvas to configure properties or map data.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Helpful Guidelines */}
                <div className="border-t border-slate-100 pt-4 bg-slate-50/30 p-3.5 rounded-2xl border mt-6">
                    <h5 className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5">Canvas Guidelines</h5>
                    <ul className="text-[9px] text-slate-500 space-y-1.5 list-disc pl-4.5 leading-normal">
                        <li>Hover elements to inspect. Click any element to map or edit.</li>
                        <li>Dynamic database fields are marked with a double underline.</li>
                        <li>Drag elements freely; coordinates are saved automatically.</li>
                    </ul>
                </div>
            </div>

            {/* Transformations builder Modal */}
            <TransformationModal
                open={openTransformModal}
                onClose={() => setOpenTransformModal(false)}
                onApply={handleApplyTransformations}
                contextFields={contextFields}
                targetFields={targetFields}
                existingTransformations={elementTransformations}
            />
        </div>
    );
}