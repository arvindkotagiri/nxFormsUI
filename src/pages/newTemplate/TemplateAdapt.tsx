import { toBlob } from 'html-to-image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useWizard } from '@/context/WizardContext';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    ArrowRight,
    MousePointer2,
    Type,
    Trash2,
    RefreshCw,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
const flaskAPI = import.meta.env.VITE_FLASK_API;

const GRID_SIZE = 10;

export function TemplateAdapt() {

    const {
        uploadedFile,
        chunks,
        generatedHTML,
        setGeneratedHTML,
        nextStep,
        prevStep,
        setModifiedLabelBlob,
        setGeneratedZPL,
        setGeneratedXDP
    } = useWizard();

    const [isLoading, setIsLoading] = useState(false);
    const [localHtml, setLocalHtml] = useState(generatedHTML || "");

    const [selectedElements, setSelectedElements] = useState<HTMLElement[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const [initialTransforms, setInitialTransforms] = useState<
        { el: HTMLElement; x: number; y: number }[]
    >([]);

    const [marquee, setMarquee] = useState<any>(null);

    const editorRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    // -------------------------------------------------
    // Backend HTML Generation
    // -------------------------------------------------

    const fetchHtml = async () => {

        if (!uploadedFile) return;

        setIsLoading(true);

        const formData = new FormData();
        formData.append("image", uploadedFile);

        // Add pre-detected crops
        const logo = chunks.find(c => c.type === 'logo')?.cropped_b64;
        const sig = chunks.find(c => c.type === 'signature')?.cropped_b64;
        if (logo) formData.append("logo_b64", logo);
        if (sig) formData.append("signature_b64", sig);

        try {

            // const res = await fetch(
            //     "http://localhost:5050/replicate-invoice",
            //     {
            //         method: "POST",
            //         body: formData
            //     }
            const baseUrl = flaskAPI || 'http://localhost:5050';
            const res = await fetch(`${baseUrl}/replicate-invoice`, {
                method: "POST",
                body: formData
             }
             
            );

            const data = await res.json();

            if (data.status === "success") {
                setGeneratedHTML(data.full_html);
                setLocalHtml(data.full_html);
                toast.success("Design Template Generated");
            }

        } catch {
            toast.error("Backend connection failed");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!generatedHTML && uploadedFile && !isLoading) fetchHtml();
        else if (generatedHTML) setLocalHtml(generatedHTML);
    }, [generatedHTML, uploadedFile]);

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
    // Selection Logic
    // -------------------------------------------------

    const handleClick = (e: React.MouseEvent) => {

        const target = e.target as HTMLElement;

        const isContainer =
            target.getAttribute("data-editor-container") === "true";

        if (isContainer) {
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
                target.style.outline = "2px solid #2563eb";
                newSelection.push(target);
            }

        } else {

            clearSelection();
            target.style.outline = "2px solid #2563eb";
            newSelection = [target];
        }

        setSelectedElements(newSelection);
    };

    // -------------------------------------------------
    // Drag + Move
    // -------------------------------------------------

    const handleMouseDown = (e: React.MouseEvent) => {

        const target = e.target as HTMLElement;

        const isContainer =
            target.getAttribute("data-editor-container") === "true";

        setDragStart({
            x: e.clientX,
            y: e.clientY
        });

        if (!isContainer && selectedElements.includes(target)) {

            setIsDragging(true);

            setInitialTransforms(
                selectedElements.map(el => ({
                    el,
                    ...getTransform(el)
                }))
            );

        } else if (isContainer) {

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

                el.style.transform = `translate(${newX}px, ${newY}px)`;
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
                    child.style.outline = "2px solid #2563eb";
                    newlySelected.push(child);
                }
            });

            if (newlySelected.length > 0)
                setSelectedElements(newlySelected);
        }

        setIsDragging(false);
        setMarquee(null);

    }, [marquee]);

    // -------------------------------------------------
    // ResizeObserver (🔥 Best Practice)
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

    // -------------------------------------------------
    // Save
    // -------------------------------------------------

    const handleSave = async () => {
        if (editorRef.current) {
            setIsLoading(true);
            try {
                // Clear selection outlines before capturing
                selectedElements.forEach(el => (el.style.outline = ""));
                
                // Capture the current canvas state as a blob for downstream generation (ZPL/XDP)
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

                setGeneratedHTML(editorRef.current.outerHTML);
                nextStep();
            } catch (err) {
                console.error("Capture Error:", err);
                toast.error("Failed to capture design snapshot");
                // Still allow moving forward but warn
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

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] relative select-none">

            {/* Toolbar */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur shadow-lg rounded-full px-6 py-2 flex items-center gap-6 border border-slate-200">

                <div className="flex items-center gap-3 border-r border-slate-200 pr-6">
                    <MousePointer2 className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold uppercase">Editor</span>
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
                                onClick={() => {
                                    selectedElements[0].contentEditable = "true";
                                    selectedElements[0].focus();
                                }}
                            >
                                <Type className="w-4 h-4" />
                            </Button>
                        )}

                        <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => {
                                selectedElements.forEach(el => el.remove());
                                setSelectedElements([]);
                            }}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </>
                ) : (
                    <span className="text-[10px] text-slate-400 italic">
                        Shift + Click to multi-select
                    </span>
                )}

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchHtml}
                    disabled={isLoading}
                >
                    <RefreshCw className={cn("w-3 h-3 mr-2", isLoading && "animate-spin")} />
                    Reset
                </Button>

            </div>

            {/* Canvas */}
            <div className="flex-1 bg-slate-100 overflow-auto flex justify-center p-12 relative">

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                        <p className="text-sm text-slate-500 mt-3">
                            Generating Canvas...
                        </p>
                    </div>
                ) : (
                    <div className="relative p-12 flex justify-center" ref={canvasRef}>

                        <div className="relative">

                            <div
                                ref={editorRef}
                                data-editor-container="true"
                                className="bg-white shadow-2xl min-h-[11in] w-[8.5in] relative overflow-hidden"
                                dangerouslySetInnerHTML={{ __html: localHtml }}
                                onClick={handleClick}
                                onMouseDown={handleMouseDown}
                            />

                            {marquee && (
                                <div
                                    className="fixed border border-blue-500 bg-blue-500/10 pointer-events-none"
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

            {/* Footer */}
            <div className="absolute bottom-6 right-6 flex gap-3">

                <Button variant="outline" onClick={prevStep}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                <Button onClick={handleSave} className="bg-[#1c2b39] text-white">
                    Finalize Design
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

            </div>

        </div>
    );
}