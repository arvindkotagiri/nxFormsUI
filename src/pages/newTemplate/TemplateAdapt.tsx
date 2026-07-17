import { toBlob } from 'html-to-image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useWizard } from '@/context/WizardContext';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { useCustomFonts } from '@/hooks/useCustomFonts';
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
    Layers,
    Undo2,
    Redo2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FieldMappingSelector } from './FieldMappingSelector';
import { TransformationModal, type TransformationPayload } from './TransformationModal';

const flaskAPI = import.meta.env.VITE_FLASK_API;
const nodeAPI = import.meta.env.VITE_NODE_API;

const GRID_SIZE = 10;

export function TemplateAdapt() {
    const {
        uploadedFile,
        uploadedImage,
        chunks,
        setChunks,
        generatedHTML,
        setGeneratedHTML,
        nextStep,
        prevStep,
        setModifiedLabelBlob,
        setGeneratedZPL,
        setGeneratedXDP,
        selectedContext
    } = useWizard();

    const { fonts: customFonts } = useCustomFonts();

    const [isLoading, setIsLoading] = useState(false);
    const [localHtml, setLocalHtml] = useState("");

    // Undo/Redo states
    const [historyState, setHistoryState] = useState<{ list: string[]; index: number }>({
        list: [],
        index: -1,
    });

    const pushState = useCallback((newHtml: string) => {
        setLocalHtml(newHtml);
        setHistoryState(prev => {
            const newList = prev.list.slice(0, prev.index + 1);
            if (newList[newList.length - 1] === newHtml) {
                return prev;
            }
            return {
                list: [...newList, newHtml],
                index: newList.length,
            };
        });
    }, []);

    const historyStateRef = useRef(historyState);
    useEffect(() => {
        historyStateRef.current = historyState;
    }, [historyState]);

    const [selectedElements, setSelectedElements] = useState<HTMLElement[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        if (!editorRef.current) return;
        
        // Clear outline on ALL editor elements first
        const allEditorEls = editorRef.current.querySelectorAll("[data-editor-element], [id^='chunk-']");
        allEditorEls.forEach(node => {
            (node as HTMLElement).style.outline = "";
        });

        const activeElements: HTMLElement[] = [];
        selectedIds.forEach(id => {
            const el = editorRef.current?.querySelector(`[id="${id}"]`) as HTMLElement;
            if (el) {
                el.style.outline = "2px dashed #f43f5e";
                activeElements.push(el);
            }
        });
        setSelectedElements(activeElements);
    }, [localHtml, selectedIds]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [initialTransforms, setInitialTransforms] = useState<
        { el: HTMLElement; x: number; y: number }[]
    >([]);
    const [marquee, setMarquee] = useState<any>(null);
    const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
    const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
    const toolbarDragStart = useRef({ x: 0, y: 0 });

    const [retentionImages, setRetentionImages] = useState<any[]>([]);

    // Mapping & Transformations Modal detailed states
    const [openTransformModal, setOpenTransformModal] = useState(false);

    const editorRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    // -------------------------------------------------
    // Fetch Image Retention Options
    // -------------------------------------------------
    useEffect(() => {
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

        fetchRetentionImages();
    }, []);

    const undo = useCallback(() => {
        const { list, index } = historyStateRef.current;
        if (index > 0) {
            const nextIndex = index - 1;
            setHistoryState(prev => ({ ...prev, index: nextIndex }));
            setLocalHtml(list[nextIndex]);
            selectedElements.forEach(el => (el.style.outline = ""));
            setSelectedElements([]);
            toast.info("Undo");
        }
    }, [selectedElements]);

    const redo = useCallback(() => {
        const { list, index } = historyStateRef.current;
        if (index < list.length - 1) {
            const nextIndex = index + 1;
            setHistoryState(prev => ({ ...prev, index: nextIndex }));
            setLocalHtml(list[nextIndex]);
            selectedElements.forEach(el => (el.style.outline = ""));
            setSelectedIds([]);
            setSelectedElements([]);
            toast.info("Redo");
        }
    }, [selectedElements]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName.toLowerCase() === 'input' || activeEl.tagName.toLowerCase() === 'textarea')) {
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                undo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [undo, redo]);

    // Auto-annotation of dynamic placeholders
    const annotateHtmlPlaceholders = useCallback((htmlStr: string, chunksList: any[]): string => {
        if (!htmlStr) return htmlStr;
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlStr, 'text/html');
        if (!doc || !doc.body) {
            console.warn("[annotateHtmlPlaceholders] Parsed document or body is null.");
            return htmlStr;
        }
        
        const elements = Array.from(doc.body.getElementsByTagName('*')) as HTMLElement[];
        
        // Match text fields with dynamic placeholders
        elements.forEach(el => {
            if (el.tagName.toLowerCase() === 'img') return;
            
            const textContent = el.textContent?.trim() || '';
            const match = textContent.match(/^\{\{(.+)\}\}$/);
            if (match) {
                const placeholderName = match[1];
                const matchingChunk = chunksList.find(c => {
                    if (c.isStatic || !c.fieldMapping) return false;
                    const fieldName = c.fieldMapping.split('.').pop();
                    return fieldName === placeholderName;
                });
                
                if (matchingChunk) {
                    el.id = matchingChunk.id;
                    if (!el.getAttribute("data-sap-mapping")) {
                        el.setAttribute("data-sap-mapping", matchingChunk.fieldMapping);
                    }
                    el.setAttribute("data-editor-element", "true");
                    if (matchingChunk.transformations && !el.getAttribute("data-transformations")) {
                        el.setAttribute("data-transformations", JSON.stringify(matchingChunk.transformations));
                    }
                } else {
                    if (!el.getAttribute("data-sap-mapping")) {
                        el.setAttribute("data-sap-mapping", "unmapped");
                        el.setAttribute("data-editor-element", "true");
                    }
                }
            }
        });

        // Match image/logo/signature/barcode elements with chunks list
        const logoChunks = chunksList.filter(c => c.type === 'logo');
        const signatureChunks = chunksList.filter(c => c.type === 'signature');
        const barcodeChunks = chunksList.filter(c => c.type === 'barcode');

        let logoIndex = 0;
        let signatureIndex = 0;
        let barcodeIndex = 0;

        elements.forEach(el => {
            // Skip inner images if parent is already positioned absolute (to avoid double annotation)
            if (el.tagName.toLowerCase() === 'img' && el.parentElement && (el.parentElement.getAttribute("style") || "").includes("position: absolute")) {
                return;
            }

            const img = el.querySelector("img") || (el.tagName.toLowerCase() === 'img' ? el : null);
            if (img) {
                const src = img.getAttribute("src") || "";
                const alt = img.getAttribute("alt") || "";
                const imgId = img.id || "";
                const htmlText = el.outerHTML.toLowerCase();

                let imgType: 'logo' | 'signature' | 'barcode' | null = null;
                let bType: 'qr' | 'code128' = 'code128';

                const attrChunkType = el.getAttribute("data-chunk-type") || img.getAttribute("data-chunk-type");
                const attrBarcodeType = el.getAttribute("data-barcode-type") || img.getAttribute("data-barcode-type");

                if (attrChunkType === 'logo') {
                    imgType = 'logo';
                } else if (attrChunkType === 'signature') {
                    imgType = 'signature';
                } else if (attrChunkType === 'barcode') {
                    imgType = 'barcode';
                    bType = (attrBarcodeType || 'code128') as any;
                } else if (src.includes("logo") || imgId.includes("logo") || alt.toLowerCase().includes("logo") || htmlText.includes("logo")) {
                    imgType = 'logo';
                } else if (src.includes("signature") || imgId.includes("signature") || alt.toLowerCase().includes("signature") || htmlText.includes("signature")) {
                    imgType = 'signature';
                } else if (src.includes("qrcode") || src.includes("qr_code") || src.includes("qr") || imgId.includes("qrcode") || imgId.includes("qr_code") || alt.toLowerCase().includes("qr") || htmlText.includes("qrcode") || htmlText.includes("qr_code")) {
                    imgType = 'barcode';
                    bType = 'qr';
                } else if (src.includes("barcode") || imgId.includes("barcode") || alt.toLowerCase().includes("barcode") || htmlText.includes("barcode")) {
                    imgType = 'barcode';
                    bType = 'code128';
                }

                if (imgType === 'logo') {
                    const chunk = logoChunks[logoIndex++];
                    const fallbackId = chunk?.id || `chunk-logo-${logoIndex}-${Date.now()}`;
                    el.id = fallbackId;
                    el.setAttribute("data-chunk-type", "logo");
                    el.setAttribute("data-editor-element", "true");
                    el.setAttribute("data-sap-mapping", "unmapped");
                    img.setAttribute("data-chunk-type", "logo");
                    img.id = fallbackId;
                } else if (imgType === 'signature') {
                    const chunk = signatureChunks[signatureIndex++];
                    const fallbackId = chunk?.id || `chunk-signature-${signatureIndex}-${Date.now()}`;
                    el.id = fallbackId;
                    el.setAttribute("data-chunk-type", "signature");
                    el.setAttribute("data-editor-element", "true");
                    el.setAttribute("data-sap-mapping", "unmapped");
                    img.setAttribute("data-chunk-type", "signature");
                    img.id = fallbackId;
                } else if (imgType === 'barcode') {
                    const chunk = barcodeChunks[barcodeIndex++];
                    const fallbackId = chunk?.id || `chunk-barcode-${barcodeIndex}-${Date.now()}`;
                    const actualBType = chunk?.barcodeType || bType;

                    el.id = fallbackId;
                    el.setAttribute("data-chunk-type", "barcode");
                    el.setAttribute("data-barcode-type", actualBType);
                    el.setAttribute("data-editor-element", "true");
                    img.setAttribute("data-chunk-type", "barcode");
                    img.setAttribute("data-barcode-type", actualBType);
                    img.id = fallbackId;

                    if (chunk && chunk.fieldMapping) {
                        el.setAttribute("data-sap-mapping", chunk.fieldMapping);
                    } else {
                        el.setAttribute("data-sap-mapping", "unmapped");
                    }
                    if (chunk && chunk.value) {
                        el.setAttribute("data-barcode-value", chunk.value);
                        img.setAttribute("data-barcode-value", chunk.value);
                    }

                    // Override the src attribute with a clean vector SVG mockup so that we see a QR/barcode instead of a cropped image
                    if (actualBType === 'qr') {
                        const cleanQrSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
                            '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"><rect width="150" height="150" fill="white"/><g fill="black"><rect x="15" y="15" width="30" height="30"/><rect x="25" y="25" width="10" height="10" fill="white"/><rect x="105" y="15" width="30" height="30"/><rect x="115" y="25" width="10" height="10" fill="white"/><rect x="15" y="105" width="30" height="30"/><rect x="25" y="115" width="10" height="10" fill="white"/><rect x="65" y="65" width="20" height="20"/><rect x="95" y="95" width="20" height="20"/></g></svg>'
                        )}`;
                        img.setAttribute("src", cleanQrSvg);
                        img.setAttribute("alt", "QR Code");
                    } else {
                        const cleanBarcodeSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
                            `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80" viewBox="0 0 200 80"><rect width="200" height="80" fill="white"/><g fill="black">${
                                Array.from({ length: 25 }).map((_, i) => `<rect x="${10 + i * 7}" y="10" width="${i % 3 === 0 ? 4 : (i % 2 === 0 ? 2 : 1)}" height="50"/>`).join("")
                            }</g></svg>`
                        )}`;
                        img.setAttribute("src", cleanBarcodeSvg);
                        img.setAttribute("alt", "Barcode");
                    }
                }
            }
        });

        return doc.body.innerHTML;
    }, []);

    // Sync canvas to chunks on save
    const syncCanvasToChunks = useCallback(() => {
        if (!editorRef.current) return;
        
        const elements = Array.from(editorRef.current.querySelectorAll("*")) as HTMLElement[];
        const absoluteElements = elements.filter(el => {
            const style = window.getComputedStyle(el);
            return style.position === "absolute" || el.getAttribute("data-editor-element") === "true";
        });
        
        const canvasWidth = editorRef.current.offsetWidth || 816;
        const canvasHeight = editorRef.current.offsetHeight || 1056;
        
        const updatedChunks = absoluteElements.map((el, index) => {
            const style = el.style;
            const styleLeft = style.left ? parseFloat(style.left) : el.offsetLeft;
            const styleTop = style.top ? parseFloat(style.top) : el.offsetTop;
            const styleWidth = style.width ? parseFloat(style.width) : el.offsetWidth;
            const styleHeight = style.height ? parseFloat(style.height) : el.offsetHeight;
            
            const x = (styleLeft / canvasWidth) * 100;
            const y = (styleTop / canvasHeight) * 100;
            const width = (styleWidth / canvasWidth) * 100;
            const height = (styleHeight / canvasHeight) * 100;
            
            const sapMapping = el.getAttribute("data-sap-mapping");
            const transformationsRaw = el.getAttribute("data-transformations");
            let transformations = [];
            if (transformationsRaw) {
                try {
                    transformations = JSON.parse(transformationsRaw);
                } catch (e) {
                    console.error("Error parsing transformations:", e);
                }
            }
            
            const textContent = el.textContent?.trim() || "";
            
            let type: 'text' | 'barcode' | 'logo' | 'signature' | 'table' = 'text';
            let barcodeType: 'code128' | 'code39' | 'itf14' | 'qr' | undefined = undefined;

            const chunkTypeAttr = el.getAttribute("data-chunk-type");
            const barcodeTypeAttr = el.getAttribute("data-barcode-type");

            if (chunkTypeAttr) {
                type = chunkTypeAttr as any;
                if (type === 'barcode') {
                    barcodeType = (barcodeTypeAttr || 'code128') as any;
                }
            } else {
                const img = el.querySelector("img") || (el.tagName.toLowerCase() === 'img' ? el : null);
                if (img) {
                    const src = img.getAttribute("src") || "";
                    if (src.includes("logo") || img.id?.includes("logo")) {
                        type = 'logo';
                    } else if (src.includes("signature") || img.id?.includes("signature")) {
                        type = 'signature';
                    } else if (src.includes("qrcode") || src.includes("qr_code") || img.id?.includes("qrcode") || img.id?.includes("qr_code") || img.getAttribute("alt")?.includes("QR")) {
                        type = 'barcode';
                        barcodeType = 'qr';
                    } else if (src.includes("barcode") || img.id?.includes("barcode") || img.getAttribute("alt")?.includes("Barcode")) {
                        type = 'barcode';
                        barcodeType = 'code128';
                    }
                }
            }
            
            const isStatic = !sapMapping || (sapMapping === "unmapped" && !(textContent.startsWith("{{") && textContent.endsWith("}}")));
            
            let label = textContent;
            if (sapMapping && sapMapping !== "unmapped") {
                label = sapMapping.split(".").pop() || textContent;
            }
            if (label.startsWith("{{") && label.endsWith("}}")) {
                label = label.slice(2, -2);
            }
            if (!label) {
                label = type === 'logo' ? 'Logo' : (type === 'signature' ? 'Signature' : (type === 'barcode' ? (barcodeType === 'qr' ? 'QR Code' : 'Barcode') : `Field_${index}`));
            }
            
            if (!el.id) {
                el.id = `chunk-${index}-${Date.now()}`;
            }
            const chunkId = el.id;
            
            return {
                id: chunkId,
                type,
                x,
                y,
                width,
                height,
                label,
                value: textContent,
                isStatic,
                fieldMapping: sapMapping && sapMapping !== "unmapped" ? sapMapping : undefined,
                transformations,
                barcodeType
            };
        });
        
        setChunks(updatedChunks);
    }, [setChunks]);

    // 🔥 Sync localHtml when generatedHTML is loaded from WizardContext
    useEffect(() => {
        if (generatedHTML && !localHtml) {
            const annotated = annotateHtmlPlaceholders(generatedHTML, chunks);
            setLocalHtml(annotated);
            setHistoryState({
                list: [annotated],
                index: 0
            });
        }
    }, [generatedHTML, localHtml, chunks, annotateHtmlPlaceholders]);

    // Sync chunks from DOM elements when canvas state is updated
    useEffect(() => {
        if (localHtml && editorRef.current) {
            syncCanvasToChunks();
        }
    }, [localHtml, syncCanvasToChunks]);

    useEffect(() => {
        if (!generatedHTML) {
            setLocalHtml("");
            setHistoryState({ list: [], index: -1 });
        }
    }, [generatedHTML]);

    // -------------------------------------------------
    // DOM Utils
    // -------------------------------------------------
    const getTransform = (el: HTMLElement) => {
        const style = window.getComputedStyle(el);
        const transform = style.transform;
        if (!transform || transform === "none") {
            return { x: 0, y: 0 };
        }
        
        // 1. Try DOMMatrixReadOnly if available
        if (typeof window !== "undefined" && (window.DOMMatrixReadOnly || (window as any).DOMMatrix)) {
            try {
                const MatrixClass = window.DOMMatrixReadOnly || (window as any).DOMMatrix;
                const matrix = new MatrixClass(transform);
                return { x: matrix.m41, y: matrix.m42 };
            } catch (e) {
                // fallback
            }
        }
        
        // 2. Try WebKitCSSMatrix fallback
        if (typeof window !== "undefined" && (window as any).WebKitCSSMatrix) {
            try {
                const matrix = new (window as any).WebKitCSSMatrix(transform);
                return { x: matrix.m41, y: matrix.m42 };
            } catch (e) {
                // fallback
            }
        }
        
        // 3. Regex parser fallback
        if (transform.startsWith("matrix(")) {
            const values = transform.slice(7, -1).split(",").map(parseFloat);
            return { x: values[4] || 0, y: values[5] || 0 };
        }
        if (transform.startsWith("matrix3d(")) {
            const values = transform.slice(9, -1).split(",").map(parseFloat);
            return { x: values[12] || 0, y: values[13] || 0 };
        }
        if (transform.startsWith("translate(")) {
            const values = transform.slice(10, -1).split(",").map(val => parseFloat(val.trim()));
            return { x: values[0] || 0, y: values[1] || 0 };
        }
        
        return { x: 0, y: 0 };
    };

    const clearSelection = () => {
        selectedElements.forEach(el => (el.style.outline = ""));
        setSelectedIds([]);
        setSelectedElements([]);
    };

    // -------------------------------------------------
    // Selection Logic & Drag Interceptor
    // -------------------------------------------------
    const getAbsoluteAncestor = (el: HTMLElement | null): HTMLElement | null => {
        if (!el || !editorRef.current) return null;
        if (el === editorRef.current) return null;
        let current: HTMLElement | null = el;
        while (current && current !== editorRef.current) {
            const style = window.getComputedStyle(current);
            const isAbsolute = style.position === "absolute" || current.getAttribute("data-editor-element") === "true";
            if (isAbsolute) {
                // Ignore the top-level full page absolute wrapper
                if (current.parentElement === editorRef.current) {
                    const w = current.offsetWidth;
                    const h = current.offsetHeight;
                    if (w > 700 && h > 900) {
                        current = current.parentElement;
                        continue;
                    }
                }
                return current;
            }
            current = current.parentElement;
        }
        return null;
    };

    const handleClick = (e: React.MouseEvent) => {
        const rawTarget = e.target as HTMLElement;
        const target = getAbsoluteAncestor(rawTarget);

        if (!target) {
            if (!e.shiftKey && !e.metaKey) clearSelection();
            return;
        }

        e.stopPropagation();

        // If we just finished a drag (i.e. mouse moved), we don't want to change selection
        const dx = Math.abs(e.clientX - dragStart.x);
        const dy = Math.abs(e.clientY - dragStart.y);
        if (dx > 3 || dy > 3) {
            // It was a drag, do not toggle selection on click
            return;
        }

        const targetId = target.id;
        if (e.shiftKey || e.metaKey) {
            if (selectedIds.includes(targetId)) {
                target.style.outline = "";
                setSelectedIds(prev => prev.filter(id => id !== targetId));
                setSelectedElements(prev => prev.filter(el => el !== target));
            } else {
                target.style.outline = "2px dashed #f43f5e";
                setSelectedIds(prev => [...prev, targetId]);
                setSelectedElements(prev => [...prev, target]);
            }
        } else {
            selectedElements.forEach(el => {
                if (el.id !== targetId) el.style.outline = "";
            });
            target.style.outline = "2px dashed #f43f5e";
            setSelectedIds([targetId]);
            setSelectedElements([target]);
        }
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

        if (target) {
            let nextSelection = [...selectedElements];
            const targetId = target.id;

            if (!selectedIds.includes(targetId)) {
                if (!e.shiftKey && !e.metaKey) {
                    // Exclusive selection
                    selectedElements.forEach(el => (el.style.outline = ""));
                    target.style.outline = "2px dashed #f43f5e";
                    nextSelection = [target];
                    setSelectedIds([targetId]);
                    setSelectedElements([target]);
                } else {
                    // Incremental selection
                    target.style.outline = "2px dashed #f43f5e";
                    nextSelection = [...selectedElements, target];
                    setSelectedIds(prev => [...prev, targetId]);
                    setSelectedElements(nextSelection);
                }
            }

            setIsDragging(true);
            setInitialTransforms(
                nextSelection.map(el => ({
                    el,
                    ...getTransform(el)
                }))
            );
        } else {
            setMarquee({
                x1: e.clientX,
                y1: e.clientY,
                x2: e.clientX,
                y2: e.clientY
            });
        }
    };

    const handleToolbarMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('select') || target.closest('input')) return;
        e.preventDefault();
        setIsDraggingToolbar(true);
        toolbarDragStart.current = {
            x: e.clientX - toolbarPos.x,
            y: e.clientY - toolbarPos.y
        };
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDraggingToolbar) {
            const newX = e.clientX - toolbarDragStart.current.x;
            const newY = e.clientY - toolbarDragStart.current.y;
            setToolbarPos({ x: newX, y: newY });
        } else if (isDragging) {
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
    }, [isDraggingToolbar, isDragging, marquee, dragStart, initialTransforms]);

    const handleMouseUp = useCallback(() => {
        setIsDraggingToolbar(false);
        if (marquee && editorRef.current) {
            const xMin = Math.min(marquee.x1, marquee.x2);
            const xMax = Math.max(marquee.x1, marquee.x2);
            const yMin = Math.min(marquee.y1, marquee.y2);
            const yMax = Math.max(marquee.y1, marquee.y2);

            const children = Array.from(
                editorRef.current.querySelectorAll("*")
            ).filter(el => {
                const style = window.getComputedStyle(el);
                return style.position === "absolute" || el.getAttribute("data-editor-element") === "true";
            }) as HTMLElement[];

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

            if (newlySelected.length > 0) {
                setSelectedIds(newlySelected.map(el => el.id).filter(Boolean));
                setSelectedElements(newlySelected);
            }
        }

        if (isDragging && editorRef.current) {
            // Sync drag positions back to state cleanly
            pushState(editorRef.current.innerHTML);
        }

        setIsDragging(false);
        setMarquee(null);
    }, [marquee, isDragging, pushState]);

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
    
    const selectedChunk = selectedElement ? chunks.find(c => c.id === selectedElement.id) : null;

    const isBarcodeOrQr = (el: HTMLElement | null): boolean => {
        if (!el) return false;
        if (el.getAttribute("data-chunk-type") === "barcode" || el.getAttribute("data-barcode-type")) return true;
        const img = el.querySelector("img") || (el.tagName.toLowerCase() === "img" ? el : null);
        if (img) {
            if (img.getAttribute("data-chunk-type") === "barcode" || img.getAttribute("data-barcode-type")) return true;
            const src = img.getAttribute("src") || "";
            const alt = img.getAttribute("alt") || "";
            const id = img.id || "";
            if (
                src.includes("qrcode") || src.includes("qr_code") ||
                src.includes("barcode") || id.includes("qrcode") ||
                id.includes("qr_code") || id.includes("barcode") ||
                alt.toLowerCase().includes("qr") || alt.toLowerCase().includes("barcode")
            ) {
                return true;
            }
        }
        return false;
    };

    const isBarcodeOrQrSelected = selectedChunk?.type === 'barcode' || isBarcodeOrQr(selectedElement);
    const isImageSelected = activeImageNode !== null && activeImageNode.id !== "watermark-element" && !isBarcodeOrQrSelected;

    const isGraphicsSelected = activeImageNode !== null && activeImageNode.id !== "watermark-element";
    const currentGraphicsType = selectedElement?.getAttribute("data-chunk-type") || selectedChunk?.type || "logo";

    const replaceSelectedImage = async (imageId: string) => {
        const imageNode = getSelectedImageNode(selectedElement);
        if (imageNode && isImageSelected) {
            try {
                const targetUrl = `${nodeAPI}/image-retention/${imageId}/image`;
                const token = localStorage.getItem("access_token");
                const response = await fetch(targetUrl, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${response.statusText}`);
                }
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    imageNode.src = reader.result as string;
                    if (editorRef.current) {
                        pushState(editorRef.current.innerHTML);
                    }
                    toast.success("Logo replaced successfully");
                };
                reader.readAsDataURL(blob);
            } catch (err) {
                console.error("Failed to replace image:", err);
                toast.error("Failed to replace image");
            }
        }
    };

    const updateBarcodeOrQrPreview = async (el: HTMLElement, bType: 'code128' | 'code39' | 'itf14' | 'qr', bVal: string, isStat: boolean, mapping: string) => {
        const img = el.querySelector("img") || (el.tagName.toLowerCase() === "img" ? el : null);
        if (!img) return;

        el.setAttribute("data-chunk-type", "barcode");
        el.setAttribute("data-barcode-type", bType);
        img.setAttribute("data-chunk-type", "barcode");
        img.setAttribute("data-barcode-type", bType);

        if (isStat) {
            el.setAttribute("data-sap-mapping", "unmapped");
            el.removeAttribute("data-transformations");
            el.setAttribute("data-barcode-value", bVal);
            img.setAttribute("data-barcode-value", bVal);

            if (bType === 'qr') {
                try {
                    const dataUrl = await QRCode.toDataURL(bVal || "QR Code");
                    img.setAttribute("src", dataUrl);
                    img.setAttribute("alt", "QR Code");
                } catch (err) {
                    console.error("Failed to generate QR Code:", err);
                }
            } else {
                const barcodePlaceholder = `data:image/svg+xml;utf8,${encodeURIComponent(
                    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80" viewBox="0 0 200 80"><rect width="200" height="80" fill="white"/><g fill="black">${
                        Array.from({ length: 25 }).map((_, i) => `<rect x="${10 + i * 7}" y="10" width="${i % 3 === 0 ? 4 : (i % 2 === 0 ? 2 : 1)}" height="60"/>`).join("")
                    }</g></svg>`
                )}`;
                img.setAttribute("src", barcodePlaceholder);
                img.setAttribute("alt", "Barcode");
            }
        } else {
            el.setAttribute("data-sap-mapping", mapping);
            el.removeAttribute("data-barcode-value");
            img.removeAttribute("data-barcode-value");

            const displayLabel = mapping.split('.').pop() || "Dynamic";
            if (bType === 'qr') {
                try {
                    const dataUrl = await QRCode.toDataURL(`{{${displayLabel}}}`);
                    img.setAttribute("src", dataUrl);
                    img.setAttribute("alt", `QR Code: {{${displayLabel}}}`);
                } catch (err) {
                    console.error("Failed to generate QR Code preview:", err);
                }
            } else {
                const barcodePlaceholder = `data:image/svg+xml;utf8,${encodeURIComponent(
                    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80" viewBox="0 0 200 80"><rect width="200" height="80" fill="white"/><g fill="black">${
                        Array.from({ length: 25 }).map((_, i) => `<rect x="${10 + i * 7}" y="10" width="${i % 3 === 0 ? 4 : (i % 2 === 0 ? 2 : 1)}" height="50"/>`).join("")
                    }</g><text x="100" y="70" font-family="monospace" font-size="10" text-anchor="middle">{{${displayLabel}}}</text></svg>`
                )}`;
                img.setAttribute("src", barcodePlaceholder);
                img.setAttribute("alt", `Barcode: {{${displayLabel}}}`);
            }
        }
    };

    const handleGraphicsTypeChange = async (newType: 'logo' | 'signature' | 'barcode') => {
        if (!selectedElement) return;
        
        selectedElement.setAttribute("data-chunk-type", newType);
        const img = selectedElement.querySelector("img") || (selectedElement.tagName.toLowerCase() === "img" ? selectedElement : null);
        if (img) {
            img.setAttribute("data-chunk-type", newType);
        }

        if (newType === 'barcode') {
            const bVal = selectedElement.getAttribute("data-barcode-value") || "Value";
            await updateBarcodeOrQrPreview(selectedElement, 'code128', bVal, true, "unmapped");
        } else {
            selectedElement.removeAttribute("data-barcode-type");
            selectedElement.removeAttribute("data-barcode-value");
            selectedElement.setAttribute("data-sap-mapping", "unmapped");
            if (img) {
                img.removeAttribute("data-barcode-type");
                img.removeAttribute("data-barcode-value");
                img.setAttribute("alt", newType === 'logo' ? 'Logo' : 'Signature');
            }
        }

        if (editorRef.current) {
            pushState(editorRef.current.innerHTML);
            syncCanvasToChunks();
        }
        toast.success(`Changed element type to ${newType}`);
    };

    const handleBarcodeTypeChange = async (newType: 'code128' | 'code39' | 'itf14' | 'qr') => {
        if (!selectedElement) return;
        const bVal = selectedElement.getAttribute("data-barcode-value") || selectedChunk?.value || "Value";
        const isStat = !selectedElement.getAttribute("data-sap-mapping") || selectedElement.getAttribute("data-sap-mapping") === "unmapped";
        const mapping = selectedElement.getAttribute("data-sap-mapping") || "";
        
        await updateBarcodeOrQrPreview(selectedElement, newType, bVal, isStat, mapping);
        
        if (editorRef.current) {
            pushState(editorRef.current.innerHTML);
            syncCanvasToChunks();
        }
        toast.success(`Changed barcode type to ${newType}`);
    };

    const handleBarcodeValueChange = async (newVal: string) => {
        if (!selectedElement) return;
        const bType = (selectedElement.getAttribute("data-barcode-type") || 'code128') as any;
        const isStat = true;
        const mapping = "unmapped";
        
        await updateBarcodeOrQrPreview(selectedElement, bType, newVal, isStat, mapping);
        
        if (editorRef.current) {
            setLocalHtml(editorRef.current.innerHTML);
        }
    };

    const handleBarcodeValueBlur = () => {
        if (editorRef.current) {
            pushState(editorRef.current.innerHTML);
            syncCanvasToChunks();
        }
    };

    const handleBarcodeToggleStatic = async () => {
        if (!selectedElement) return;
        const bType = (selectedElement.getAttribute("data-barcode-type") || 'code128') as any;
        const bVal = selectedElement.getAttribute("data-barcode-value") || selectedChunk?.value || "Value";
        
        await updateBarcodeOrQrPreview(selectedElement, bType, bVal, true, "unmapped");
        
        if (editorRef.current) {
            pushState(editorRef.current.innerHTML);
            syncCanvasToChunks();
        }
        toast.info("Changed barcode logic to Static");
    };

    const handleBarcodeMappingSelect = async (fullPath: string, fieldName: string) => {
        if (!selectedElement) return;
        const bType = (selectedElement.getAttribute("data-barcode-type") || 'code128') as any;
        
        await updateBarcodeOrQrPreview(selectedElement, bType, "", false, fullPath);
        
        if (editorRef.current) {
            pushState(editorRef.current.innerHTML);
            syncCanvasToChunks();
        }
        toast.success(`Mapped barcode to ${fieldName}`);
    };
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
            pushState(editorRef.current.innerHTML);
        }
        setSelectedElements([selectedElement]);
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
            pushState(editorRef.current.innerHTML);
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

    const handleTextBlur = () => {
        if (editorRef.current) {
            pushState(editorRef.current.innerHTML);
        }
    };

    const handleApplyTransformations = (transformations: TransformationPayload[]) => {
        if (!selectedElement) return;
        selectedElement.setAttribute("data-transformations", JSON.stringify(transformations));
        if (editorRef.current) {
            pushState(editorRef.current.innerHTML);
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
                            
                            style.transform = ""; // Remove translation
                        }
                    }
                });

                // Sync canvas elements back to chunks state
                syncCanvasToChunks();

                // Clear overlays or outlines again to be safe
                const outerHtmlContent = editorRef.current.outerHTML;

                // Capture the current canvas state as a blob for downstream ZPL/XDP generation
                const blob = await toBlob(editorRef.current, {
                    backgroundColor: '#ffffff',
                    width: editorRef.current.offsetWidth,
                    height: editorRef.current.offsetHeight,
                });

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
                <div 
                    onMouseDown={handleToolbarMouseDown}
                    style={{ transform: `translate(calc(-50% + ${toolbarPos.x}px), ${toolbarPos.y}px)` }}
                    className="absolute top-6 left-1/2 z-50 bg-white/95 backdrop-blur shadow-2xl rounded-full px-6 py-2.5 flex items-center gap-6 border border-slate-200 animate-in fade-in duration-300 cursor-move"
                >
                    <div className="flex items-center gap-3 border-r border-slate-200 pr-6">
                        <MousePointer2 className="w-4 h-4 text-rose-500 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Editor</span>
                    </div>

                    {/* Undo / Redo controls */}
                    <div className="flex items-center gap-1 border-r border-slate-200 pr-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                            onClick={undo}
                            disabled={historyState.index <= 0}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo2 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                            onClick={redo}
                            disabled={historyState.index >= historyState.list.length - 1}
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo2 className="w-4 h-4" />
                        </Button>
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
                                        pushState(editorRef.current.innerHTML);
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
                        onClick={() => {
                            if (generatedHTML) {
                                pushState(generatedHTML);
                                toast.info("Canvas reset to initial template");
                            }
                        }}
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
                            Customize and configure logo positions and mappings
                        </p>
                    </div>

                    {/* Unified Graphic Type Selector & Image Inspector Section */}
                    {isGraphicsSelected && (
                        <div className="space-y-4 rounded-2xl border border-slate-100 p-5 bg-gradient-to-b from-slate-50/20 to-white shadow-sm animate-in slide-in-from-right duration-300">
                            <div className="flex items-center gap-2 text-slate-600 font-extrabold text-[10px] uppercase tracking-widest border-b border-slate-100/50 pb-2">
                                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                                Graphic Element Type
                            </div>

                            {/* Graphic Type Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-500 block">Graphic Type</label>
                                <select
                                    value={currentGraphicsType}
                                    onChange={(e) => handleGraphicsTypeChange(e.target.value as any)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-body focus:outline-none focus:ring-2 focus:ring-slate-500/20 transition-all shadow-sm font-medium"
                                >
                                    <option value="logo">Logo</option>
                                    <option value="signature">Signature</option>
                                    <option value="barcode">Barcode / QR Code</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Logo/Image Swapper Section */}
                    {isGraphicsSelected && (currentGraphicsType === 'logo' || currentGraphicsType === 'signature') && (
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

                    {/* Barcode/QR Code Properties & Mapping Panel */}
                    {isGraphicsSelected && currentGraphicsType === 'barcode' && (
                        <div className="space-y-4 rounded-2xl border border-purple-100 p-5 bg-gradient-to-b from-purple-50/20 to-white shadow-sm animate-in slide-in-from-right duration-300">
                            <div className="flex items-center gap-2 text-purple-600 font-extrabold text-[10px] uppercase tracking-widest border-b border-purple-100/50 pb-2">
                                <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
                                Barcode / QR Code Properties
                            </div>

                            {/* Barcode/QR Code Type Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-500 block">Code Type</label>
                                <select
                                    value={selectedElement?.getAttribute("data-barcode-type") || selectedChunk?.barcodeType || "code128"}
                                    onChange={(e) => handleBarcodeTypeChange(e.target.value as any)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-body focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all shadow-sm font-medium"
                                >
                                    <option value="qr">QR Code</option>
                                    <option value="code128">Code 128</option>
                                    <option value="code39">Code 39</option>
                                    <option value="itf14">ITF-14</option>
                                </select>
                            </div>

                            {/* Static / Dynamic Toggle */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-500 block">Logic Type</label>
                                <div className="flex border border-slate-200 rounded-lg overflow-hidden p-0.5 bg-slate-100">
                                    <button
                                        onClick={handleBarcodeToggleStatic}
                                        className={cn(
                                            "flex-1 py-1 text-[9px] font-bold tracking-wider rounded-md transition-all uppercase flex items-center justify-center gap-1",
                                            (!selectedElement?.getAttribute("data-sap-mapping") || selectedElement?.getAttribute("data-sap-mapping") === "unmapped")
                                                ? "bg-white shadow-sm text-slate-800"
                                                : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        <Lock className="w-2.5 h-2.5" /> Static Code
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (selectedElement) {
                                                selectedElement.setAttribute("data-sap-mapping", "unmapped");
                                                if (editorRef.current) {
                                                    pushState(editorRef.current.innerHTML);
                                                    syncCanvasToChunks();
                                                }
                                            }
                                        }}
                                        className={cn(
                                            "flex-1 py-1 text-[9px] font-bold tracking-wider rounded-md transition-all uppercase flex items-center justify-center gap-1",
                                            (selectedElement?.getAttribute("data-sap-mapping") && selectedElement?.getAttribute("data-sap-mapping") !== "unmapped")
                                                ? "bg-white shadow-sm text-purple-600"
                                                : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        <Zap className="w-2.5 h-2.5 text-purple-500" /> Dynamic SAP
                                    </button>
                                </div>
                            </div>

                            {/* Static Code Value Input */}
                            {(!selectedElement?.getAttribute("data-sap-mapping") || selectedElement?.getAttribute("data-sap-mapping") === "unmapped") ? (
                                <div className="space-y-2 animate-in fade-in duration-200">
                                    <label className="text-[10px] font-bold uppercase text-slate-500 block">Static Data / Value</label>
                                    <textarea
                                        value={selectedElement?.getAttribute("data-barcode-value") || selectedChunk?.value || ""}
                                        onChange={(e) => handleBarcodeValueChange(e.target.value)}
                                        onBlur={handleBarcodeValueBlur}
                                        rows={3}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-body focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all shadow-sm font-medium"
                                        placeholder="Enter barcode/QR data..."
                                    />
                                    <p className="text-[9px] text-slate-400 leading-normal">
                                        Enter the static value to be encoded in the QR/barcode.
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
                                            onSelect={handleBarcodeMappingSelect}
                                        />
                                        <p className="text-[9px] text-slate-400 leading-normal">
                                            Choose an SAP field from the active catalog to populate the QR/barcode dynamically.
                                        </p>
                                    </div>
                                </div>
                            )}
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
                                                if (editorRef.current) pushState(editorRef.current.innerHTML);
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
                                        onBlur={handleTextBlur}
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
                                            sourceLabel={selectedElement?.textContent || ""}
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
                                                                if (editorRef.current) pushState(editorRef.current.innerHTML);
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

                            {/* Font Family Selector */}
                            <div className="space-y-2 border-t border-slate-100 pt-4">
                                <label className="text-[10px] font-bold uppercase text-slate-500 block">Font Family</label>
                                <select
                                    value={selectedElement?.style.fontFamily?.replace(/['"]/g, "") || ""}
                                    onChange={(e) => {
                                        if (selectedElement) {
                                            selectedElement.style.fontFamily = e.target.value ? `'${e.target.value}'` : "";
                                            if (editorRef.current) {
                                                pushState(editorRef.current.innerHTML);
                                            }
                                        }
                                    }}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-body focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm font-medium"
                                >
                                    <option value="">Default Font (Inherit)</option>
                                    <optgroup label="System Fonts">
                                        <option value="sans-serif">Sans-Serif</option>
                                        <option value="serif">Serif</option>
                                        <option value="monospace">Monospace</option>
                                        <option value="Arial">Arial</option>
                                        <option value="Helvetica">Helvetica</option>
                                        <option value="Times New Roman">Times New Roman</option>
                                        <option value="Georgia">Georgia</option>
                                        <option value="Courier New">Courier New</option>
                                    </optgroup>
                                    {customFonts && customFonts.length > 0 && (
                                        <optgroup label="Custom Fonts">
                                            {customFonts.map((font: any) => (
                                                <option key={font.id} value={font.name}>
                                                    {font.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Default state Help Inspector */}
                    {!isImageSelected && !isTextSelected && !isBarcodeOrQrSelected && (
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