// import { useState, useEffect, useRef, useCallback } from 'react';
// import { useWizard } from '@/context/WizardContext';
// import { Button } from '@/components/ui/button';
// import { ArrowLeft, ArrowRight, MousePointer2, Move, Type, Trash2, RefreshCw, Loader2, Layers } from 'lucide-react';
// import { toast } from 'sonner';
// import { cn } from '@/lib/utils';
// import { Rulers } from "@/components/Rulers";

// const GRID_SIZE = 10;

// export function TemplateAdapt() {
//     const {
//         uploadedFile,
//         generatedHTML,
//         setGeneratedHTML,
//         nextStep,
//         prevStep,
//     } = useWizard();

//     const [isLoading, setIsLoading] = useState(false);
//     const [localHtml, setLocalHtml] = useState(generatedHTML || "");
    
//     // Multi-select state
//     const [selectedElements, setSelectedElements] = useState<HTMLElement[]>([]);
//     const [isDragging, setIsDragging] = useState(false);
//     const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
//     const [initialTransforms, setInitialTransforms] = useState<{el: HTMLElement, x: number, y: number}[]>([]);

//     // Marquee selection state
//     const [marquee, setMarquee] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);

//     const editorRef = useRef<HTMLDivElement>(null);

//     // --- UTILS ---
//     const getTransform = (el: HTMLElement) => {
//         const style = window.getComputedStyle(el);
//         const matrix = new DOMMatrixReadOnly(style.transform);
//         return { x: matrix.m41, y: matrix.m42 };
//     };

//     // --- HTML FETCHING ---
//     const fetchHtml = async () => {
//         if (!uploadedFile) return;
//         setIsLoading(true);
//         const formData = new FormData();
//         formData.append('image', uploadedFile);

//         try {
//             const res = await fetch('http://localhost:5050/replicate-invoice', {
//                 method: 'POST',
//                 body: formData
//             });
//             const data = await res.json();
//             if (data.status === 'success') {
//                 setGeneratedHTML(data.full_html);
//                 setLocalHtml(data.full_html);
//                 toast.success("Design Template Generated");
//             }
//         } catch (error) {
//             toast.error("Connection Error: Is the backend running?");
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     useEffect(() => {
//         if (!generatedHTML && uploadedFile && !isLoading) fetchHtml();
//         else if (generatedHTML) setLocalHtml(generatedHTML);
//     }, [generatedHTML, uploadedFile]);

//     // --- SELECTION LOGIC ---
//     const clearSelection = useCallback(() => {
//         selectedElements.forEach(el => {
//             el.style.outline = "";
//             el.contentEditable = "false";
//         });
//         setSelectedElements([]);
//     }, [selectedElements]);

//     const handleClick = (e: React.MouseEvent) => {
//         const target = e.target as HTMLElement;
//         const isContainer = target.getAttribute('data-editor-container') === 'true';

//         if (isContainer) {
//             if (!e.shiftKey && !e.metaKey) clearSelection();
//             return;
//         }

//         e.stopPropagation();

//         let newSelection = [...selectedElements];
//         if (e.shiftKey || e.metaKey) {
//             if (newSelection.includes(target)) {
//                 target.style.outline = "";
//                 newSelection = newSelection.filter(el => el !== target);
//             } else {
//                 target.style.outline = "2px solid #2563eb";
//                 newSelection.push(target);
//             }
//         } else {
//             clearSelection();
//             target.style.outline = "2px solid #2563eb";
//             newSelection = [target];
//         }
//         setSelectedElements(newSelection);
//     };

//     // --- DRAG & MARQUEE LOGIC ---
//     const handleMouseDown = (e: React.MouseEvent) => {
//         const target = e.target as HTMLElement;
//         const isContainer = target.getAttribute('data-editor-container') === 'true';

//         setDragStart({ x: e.clientX, y: e.clientY });

//         if (!isContainer && selectedElements.includes(target)) {
//             // Start dragging elements
//             setIsDragging(true);
//             setInitialTransforms(selectedElements.map(el => ({
//                 el,
//                 ...getTransform(el)
//             })));
//         } else if (isContainer) {
//             // Start marquee selection
//             setMarquee({ x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY });
//         }
//     };

//     const handleMouseMove = useCallback((e: MouseEvent) => {
//         if (isDragging) {
//             const dx = e.clientX - dragStart.x;
//             const dy = e.clientY - dragStart.y;

//             initialTransforms.forEach(({ el, x, y }) => {
//                 const newX = Math.round((x + dx) / GRID_SIZE) * GRID_SIZE;
//                 const newY = Math.round((y + dy) / GRID_SIZE) * GRID_SIZE;
//                 el.style.transform = `translate(${newX}px, ${newY}px)`;
//                 if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
//             });
//         } else if (marquee) {
//             setMarquee(prev => prev ? { ...prev, x2: e.clientX, y2: e.clientY } : null);
//         }
//     }, [isDragging, marquee, dragStart, initialTransforms]);

//     const handleMouseUp = useCallback(() => {
//         if (marquee && editorRef.current) {
//             // Calculate selection from marquee
//             const rect = editorRef.current.getBoundingClientRect();
//             const xMin = Math.min(marquee.x1, marquee.x2);
//             const xMax = Math.max(marquee.x1, marquee.x2);
//             const yMin = Math.min(marquee.y1, marquee.y2);
//             const yMax = Math.max(marquee.y1, marquee.y2);

//             const children = Array.from(editorRef.current.children) as HTMLElement[];
//             const newlySelected: HTMLElement[] = [];

//             children.forEach(child => {
//                 const cRect = child.getBoundingClientRect();
//                 if (cRect.left >= xMin && cRect.right <= xMax && cRect.top >= yMin && cRect.bottom <= yMax) {
//                     child.style.outline = "2px solid #2563eb";
//                     newlySelected.push(child);
//                 }
//             });
            
//             if (newlySelected.length > 0) setSelectedElements(newlySelected);
//         }
//         setIsDragging(false);
//         setMarquee(null);
//     }, [marquee, editorRef]);

//     useEffect(() => {
//         window.addEventListener('mousemove', handleMouseMove);
//         window.addEventListener('mouseup', handleMouseUp);
//         return () => {
//             window.removeEventListener('mousemove', handleMouseMove);
//             window.removeEventListener('mouseup', handleMouseUp);
//         };
//     }, [handleMouseMove, handleMouseUp]);

//     // --- KEYBOARD NUDGE & DELETE ---
//     useEffect(() => {
//         const handleKeyDown = (e: KeyboardEvent) => {
//             if (selectedElements.length === 0 || (document.activeElement as HTMLElement)?.contentEditable === 'true') return;

//             if (e.key === 'Delete' || e.key === 'Backspace') {
//                 selectedElements.forEach(el => el.remove());
//                 setSelectedElements([]);
//                 return;
//             }

//             const nudge = e.shiftKey ? 10 : 1;
//             let dx = 0, dy = 0;

//             if (e.key === 'ArrowUp') dy = -nudge;
//             if (e.key === 'ArrowDown') dy = nudge;
//             if (e.key === 'ArrowLeft') dx = -nudge;
//             if (e.key === 'ArrowRight') dx = nudge;

//             if (dx !== 0 || dy !== 0) {
//                 e.preventDefault();
//                 selectedElements.forEach(el => {
//                     const { x, y } = getTransform(el);
//                     el.style.transform = `translate(${x + dx}px, ${y + dy}px)`;
//                 });
//             }
//         };

//         window.addEventListener('keydown', handleKeyDown);
//         return () => window.removeEventListener('keydown', handleKeyDown);
//     }, [selectedElements]);

//     const handleSave = () => {
//         if (editorRef.current) {
//             selectedElements.forEach(el => el.style.outline = "");
//             setGeneratedHTML(editorRef.current.innerHTML);
//         }
//         nextStep();
//     };

//     return (
//         <div className="flex flex-col h-[calc(100vh-140px)] w-full animate-in fade-in duration-500 relative select-none">
            
//             {/* TOOLBAR */}
//             <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur shadow-lg rounded-full px-6 py-2 flex items-center gap-6 border border-slate-200">
//                 <div className="flex items-center gap-3 border-r border-slate-200 pr-6">
//                     <MousePointer2 className="w-4 h-4 text-blue-600" />
//                     <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Editor</span>
//                 </div>

//                 {selectedElements.length > 0 ? (
//                     <div className="flex items-center gap-2">
//                         <span className="text-[10px] text-slate-400 font-bold uppercase mr-2">{selectedElements.length} Selected</span>
//                         {selectedElements.length === 1 && (
//                             <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
//                                 selectedElements[0].contentEditable = "true";
//                                 selectedElements[0].focus();
//                             }}><Type className="w-4 h-4" /></Button>
//                         )}
//                         <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => {
//                             selectedElements.forEach(el => el.remove());
//                             setSelectedElements([]);
//                         }}><Trash2 className="w-4 h-4" /></Button>
//                     </div>
//                 ) : (
//                     <span className="text-[10px] text-slate-400 italic">Shift + Click to multi-select</span>
//                 )}

//                 <Button variant="ghost" size="sm" onClick={fetchHtml} disabled={isLoading} className="text-[10px] font-bold">
//                     <RefreshCw className={cn("w-3 h-3 mr-2", isLoading && "animate-spin")} /> Reset
//                 </Button>
//             </div>

//             {/* CANVAS */}
//             <div className="flex-1 bg-slate-100 overflow-auto flex justify-center p-12 custom-scrollbar relative">
//                 {isLoading ? (
//                     <div className="flex flex-col items-center justify-center space-y-4">
//                         <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
//                         <p className="text-slate-500 text-sm">Generating Canvas...</p>
//                     </div>
//                 ) : (
//                     <div className="relative p-12 flex justify-center">
//                         <div className="relative">
//                             <Rulers zoom={1} />
//                             <div
//                                 ref={editorRef}
//                                 data-editor-container="true"
//                                 className="bg-white shadow-2xl min-h-[11in] w-[8.5in] relative origin-top overflow-hidden"
//                                 style={{ 
//                                     backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', 
//                                     backgroundSize: '20px 20px' 
//                                 }}
//                                 dangerouslySetInnerHTML={{ __html: localHtml }}
//                                 onClick={handleClick}
//                                 onMouseDown={handleMouseDown}
//                             />
                            
//                             {/* Selection Marquee Overlay */}
//                             {marquee && (
//                                 <div 
//                                     className="fixed border border-blue-500 bg-blue-500/10 z-[100] pointer-events-none"
//                                     style={{
//                                         left: Math.min(marquee.x1, marquee.x2),
//                                         top: Math.min(marquee.y1, marquee.y2),
//                                         width: Math.abs(marquee.x2 - marquee.x1),
//                                         height: Math.abs(marquee.y2 - marquee.y1),
//                                     }}
//                                 />
//                             )}
//                         </div>
//                     </div>
//                 )}
//             </div>

//             {/* FOOTER */}
//             <div className="absolute bottom-6 right-6 flex gap-3 z-50">
//                 <Button variant="outline" onClick={prevStep} className="h-12 px-6 bg-white font-bold uppercase text-xs">
//                     <ArrowLeft className="w-4 h-4 mr-2" /> Back
//                 </Button>
//                 <Button onClick={handleSave} className="h-12 px-8 bg-[#1c2b39] text-white font-bold uppercase text-xs">
//                     Finalize Design <ArrowRight className="w-4 h-4 ml-2" />
//                 </Button>
//             </div>
//         </div>
//     );
// }

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
        generatedHTML,
        setGeneratedHTML,
        nextStep,
        prevStep
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

        try {

            // const res = await fetch(
            //     "http://localhost:5050/replicate-invoice",
            //     {
            //         method: "POST",
            //         body: formData
            //     }
            const res = await fetch(`${flaskAPI}/replicate-invoice`, {
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

    const handleSave = () => {

        if (editorRef.current) {

            selectedElements.forEach(el => (el.style.outline = ""));
            setGeneratedHTML(editorRef.current.innerHTML);
        }

        nextStep();
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