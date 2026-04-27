import { useState, useEffect } from "react";
import { useWizard, type Transformation } from "@/context/WizardContext";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Trash2,
  Layers,
  Settings2,
  MousePointer2,
  Lock,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TransformationModal } from "./TransformationModal";
import { IfElseBuilder } from "./IfElseBuilder";
import { TransformationValueModal } from "./TransformationValueModal";

export function TemplateIdentify() {
  const {
    uploadedImage,
    cleanImage,
    uploadedFile,
    chunks,
    removeChunk,
    updateChunk,
    nextStep,
    prevStep,
    selectedContext,
  } = useWizard();

  const [selectedChunk, setSelectedChunk] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({
    width: 0,
    height: 0,
  });
  const [openTransformModal, setOpenTransformModal] = useState(false);
  const [openIfBuilder, setOpenIfBuilder] = useState(false);
  const [valueModalOpen, setValueModalOpen] = useState(false);
  const [selectedTransformation, setSelectedTransformation] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (chunks.length > 0 && !selectedChunk) {
      setSelectedChunk(chunks[0].id);
    }
  }, [chunks, selectedChunk]);

  const selectedChunkData = chunks.find((c) => c.id === selectedChunk);

  const displayImage = cleanImage || uploadedImage;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Stats */}
      <div className="flex justify-end gap-3">
        <span className="badge-neutral flex items-center gap-1.5">
          <Lock size={12} />
          {chunks.filter((c) => c.isStatic).length} Static
        </span>

        <span className="badge-info flex items-center gap-1.5">
          <Zap size={12} />
          {chunks.filter((c) => !c.isStatic).length} Dynamic
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] gap-5">
        {/* LEFT — Field List */}
        <div className="card-elevated flex flex-col">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <Layers size={14} />
            <h3 className="font-display text-xs font-semibold">Fields</h3>
          </div>

          <div className="p-2 space-y-1 overflow-y-auto max-h-[65vh]">
            {chunks.map((chunk) => (
              <button
                key={chunk.id}
                onClick={() => setSelectedChunk(chunk.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-body transition-all border",
                  selectedChunk === chunk.id
                    ? "bg-accent/10 border-accent"
                    : "border-transparent hover:border-border",
                )}
              >
                {chunk.isStatic ? (
                  <Lock size={12} className="text-primary" />
                ) : (
                  <Zap size={12} className="text-destructive" />
                )}

                <span className="truncate font-semibold uppercase tracking-tight">
                  {chunk.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* CENTER — Document Preview */}
        <div className="flex flex-col items-center">
          <div className="card-elevated relative flex justify-center">
            <img
              src={displayImage || ""}
              alt="Template"
              className="max-w-full h-auto select-none"
              onLoad={(e) => {
                const img = e.target as HTMLImageElement;
                setImgSize({
                  width: img.clientWidth,
                  height: img.clientHeight,
                });
              }}
            />

            {/* Overlay Boxes */}
            {imgSize.width > 0 &&
              chunks.map((chunk) => {
                const left = (chunk.x / 100) * imgSize.width;
                const top = (chunk.y / 100) * imgSize.height;
                const width = (chunk.width / 100) * imgSize.width;
                const height = (chunk.height / 100) * imgSize.height;
                const isSelected = selectedChunk === chunk.id;

                return (
                  <div
                    key={chunk.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedChunk(chunk.id);
                    }}
                    className={cn(
                      "absolute border-2 cursor-pointer transition-all duration-300",
                      chunk.type === 'table' ? "border-green-500" : (chunk.isStatic ? "border-primary" : "border-destructive"),
                      isSelected && "ring-8 ring-accent/30 z-10",
                    )}
                    style={{
                      left,
                      top,
                      width,
                      height,
                      boxShadow: isSelected ? '0 0 25px hsl(var(--accent) / 0.5)' : 'none',
                      backgroundColor: isSelected ? 'hsl(var(--accent) / 0.05)' : 'transparent',
                    }}
                  >
                    {isSelected && (
                      <div className="absolute -top-6 left-0 bg-accent text-white text-[10px] px-2 py-0.5 rounded-t font-bold shadow-lg whitespace-nowrap">
                        SELECTED: {chunk.label.toUpperCase()}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {uploadedFile?.type === "application/pdf" && (
            <p className="text-[10px] text-muted-foreground mt-3 italic">
              PDF converted to image for preview
            </p>
          )}
        </div>        {/* RIGHT — Properties */}
        <div className="card-elevated flex flex-col h-full overflow-hidden">
          <div className="p-3 border-b border-border flex items-center gap-2 bg-muted/30">
            <Settings2 size={14} className="text-accent" />
            <h3 className="font-display text-xs font-semibold">
              Property Editor
            </h3>
          </div>

          <div className="p-5 space-y-6 overflow-y-auto max-h-[75vh] custom-scrollbar">
            {!selectedChunkData && (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 opacity-50">
                  <MousePointer2 className="text-muted-foreground" size={20} />
                </div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                  Select field to edit
                </p>
              </div>
            )}

            {selectedChunkData && (
              <>
                {/* Visual Label */}
                <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Layers size={14} className="text-accent" />
                   </div>
                   <div className="min-w-0">
                      <div className="text-[10px] font-bold text-accent uppercase tracking-tight">Active Element</div>
                      <div className="text-sm font-semibold truncate uppercase">{selectedChunkData.label}</div>
                   </div>
                </div>

                {/* Label Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">
                    Field Name
                  </label>

                  <input
                    value={selectedChunkData.label}
                    onChange={(e) =>
                      updateChunk(selectedChunkData.id, {
                        label: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm font-semibold bg-card focus:ring-2 focus:ring-accent/30 outline-none transition-all"
                  />
                </div>

                {/* Table Management */}
                {selectedChunkData.type === 'table' && (
                  <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase text-green-600">Table Logic</label>
                      <button 
                        onClick={() => updateChunk(selectedChunkData.id, { isDynamicTable: !selectedChunkData.isDynamicTable })}
                        className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-colors",
                          selectedChunkData.isDynamicTable ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {selectedChunkData.isDynamicTable ? 'Dynamic Rows' : 'Static Table'}
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[9px] text-muted-foreground uppercase font-bold">Cell Mappings (First Row)</label>
                       <div className="space-y-1">
                          {(() => {
                            const firstRow = selectedChunkData.rows?.[0];
                            if (!firstRow) return <p className="text-[10px] text-muted-foreground italic">No row data found</p>;

                            // Handle if row is an array
                            if (Array.isArray(firstRow)) {
                              return firstRow.map((cell: any, idx: number) => (
                                <div key={idx} className="flex gap-2 items-center bg-card p-2 rounded-lg border border-border shadow-sm">
                                   <span className="text-[9px] font-mono text-muted-foreground w-4">C{idx+1}</span>
                                   <select 
                                     className="flex-1 bg-transparent text-[11px] font-semibold outline-none"
                                     value={cell.fieldMapping || ""}
                                     onChange={(e) => {
                                         const updatedRows = [...(selectedChunkData.rows || [])];
                                         updatedRows.forEach(r => {
                                             if (Array.isArray(r) && r[idx]) r[idx].fieldMapping = e.target.value;
                                         });
                                         updateChunk(selectedChunkData.id, { rows: updatedRows });
                                     }}
                                   >
                                     <option value="">Map Column...</option>
                                     {selectedContext?.fields?.map((field: any) => (
                                       <option key={field.path} value={field.name}>
                                         {field.name}
                                       </option>
                                     ))}
                                   </select>
                                </div>
                              ));
                            }

                            // Handle if row is an object
                            return Object.entries(firstRow).map(([key, cell]: [string, any], idx: number) => (
                              <div key={key} className="flex gap-2 items-center bg-card p-2 rounded-lg border border-border shadow-sm">
                                <span className="text-[9px] font-mono text-muted-foreground truncate w-16" title={key}>{key}</span>
                                <select 
                                  className="flex-1 bg-transparent text-[11px] font-semibold outline-none"
                                  value={cell.fieldMapping || ""}
                                  onChange={(e) => {
                                      const updatedRows = [...(selectedChunkData.rows || [])];
                                      updatedRows.forEach((r: any) => {
                                          if (r[key]) r[key].fieldMapping = e.target.value;
                                      });
                                      updateChunk(selectedChunkData.id, { rows: updatedRows });
                                  }}
                                >
                                  <option value="">Map Column...</option>
                                  {selectedContext?.fields?.map((field: any) => (
                                    <option key={field.path} value={field.name}>
                                      {field.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ));
                          })()}
                       </div>
                    </div>
                  </div>
                )}

                {/* Logic Type */}
                {selectedChunkData.type !== 'table' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                      Logic Type
                    </label>

                    <div className="flex border border-border rounded-lg overflow-hidden p-0.5 bg-muted">
                      <button
                        onClick={() =>
                          updateChunk(selectedChunkData.id, { isStatic: true })
                        }
                        className={cn(
                          "flex-1 py-1.5 text-[9px] font-bold tracking-wider rounded-md transition-all",
                          selectedChunkData.isStatic
                            ? "bg-white shadow-sm text-primary"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        STATIC
                      </button>

                      <button
                        onClick={() =>
                          updateChunk(selectedChunkData.id, { isStatic: false })
                        }
                        className={cn(
                          "flex-1 py-1.5 text-[9px] font-bold tracking-wider rounded-md transition-all",
                          !selectedChunkData.isStatic
                            ? "bg-white shadow-sm text-destructive"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        DYNAMIC
                      </button>
                    </div>
                  </div>
                )}

                {/* Mapping */}
                {!selectedChunkData.isStatic && selectedChunkData.type !== 'table' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                      SAP Field Mapping
                    </label>

                    <select
                      value={selectedChunkData.fieldMapping || ""}
                      onChange={(e) => {
                        updateChunk(selectedChunkData.id, {
                          fieldMapping: e.target.value,
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-border text-xs font-semibold bg-card focus:ring-2 focus:ring-accent/30 outline-none transition-all"
                    >
                      <option value="">Select field</option>
                      {selectedContext?.fields?.map((field: any) => (
                        <option key={field.path} value={field.name}>
                          {field.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Transformation Library */}
                {!selectedChunkData.isStatic && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                        Transformations
                        {selectedChunkData.transformations?.length > 0 && (
                          <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">{selectedChunkData.transformations.length}</span>
                        )}
                      </label>

                      <Button
                        variant="outline"
                        className="w-full text-xs h-9 rounded-xl border-dashed border-2 hover:border-accent hover:bg-accent/5 transition-all"
                        onClick={() => setOpenTransformModal(true)}
                      >
                        <Zap size={14} className="mr-2 text-accent" /> Add Transformation
                      </Button>
                    </div>
                    
                    {selectedChunkData?.transformations?.length > 0 && (
                      <div className="space-y-2">
                        {selectedChunkData.transformations.map((t, index) => (
                          <div
                            key={index}
                            className="bg-muted/50 rounded-xl px-3 py-2 text-[11px] flex justify-between items-center group"
                          >
                            <div className="min-w-0">
                              <div className="font-bold flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-accent" />
                                {t.type.replace('_', ' ').toUpperCase()}
                              </div>
                              {t.value && (
                                <div className="text-[10px] text-muted-foreground truncate">
                                  Default: {t.value}
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                const updated =
                                  selectedChunkData.transformations.filter(
                                    (_, i) => i !== index,
                                  );

                                updateChunk(selectedChunkData.id, {
                                  transformations: updated,
                                });
                              }}
                              className="w-6 h-6 rounded-md bg-transparent hover:bg-destructive/10 text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                
                {/* Delete */}
                <div className="pt-4">
                  <Button
                    variant="ghost"
                    className="w-full text-destructive text-[10px] font-bold uppercase tracking-widest hover:bg-destructive/5"
                    onClick={() => {
                      removeChunk(selectedChunkData.id);
                      setSelectedChunk(null);
                    }}
                  >
                    <Trash2 size={14} />
                    Delete Field
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between items-center border-t border-border pt-4">
        <Button
          variant="outline"
          onClick={prevStep}
          className="text-xs font-bold uppercase"
        >
          <ArrowLeft size={14} />
          Back
        </Button>

        <Button
          onClick={nextStep}
          className="bg-accent text-accent-foreground text-xs font-bold uppercase tracking-widest px-8"
        >
          Continue
          <ArrowRight size={14} />
        </Button>
      </div>

      <TransformationModal
        open={openTransformModal}
        onClose={() => setOpenTransformModal(false)}
        onSelect={(type) => {
          if (type === "IF_ELSE") {
            setOpenIfBuilder(true);
            return;
          }

          setSelectedTransformation(type);
          setValueModalOpen(true);
        }}
      />
      <TransformationValueModal
        open={valueModalOpen}
        type={selectedTransformation || ""}
        onClose={() => setValueModalOpen(false)}
        onSave={(value) => {
          const newTransformation: Transformation = {
            type: selectedTransformation as Transformation["type"],
            value,
          };

          updateChunk(selectedChunkData.id, {
            transformations: [
              ...(selectedChunkData.transformations || []),
              newTransformation,
            ],
          });

          setValueModalOpen(false);
        }}
      />
      <IfElseBuilder
        open={openIfBuilder}
        onClose={() => setOpenIfBuilder(false)}
        contextFields={selectedContext?.fields || []}
        targetFields={chunks.map((c) => ({
          name: c.label,
          path: c.id,
        }))}
        onSave={(data) => {
          updateChunk(selectedChunkData.id, {
            transformations: [
              ...(selectedChunkData.transformations || []),
              data,
            ],
          });

          setOpenIfBuilder(false);
        }}
      />
    </div>
  );
}
