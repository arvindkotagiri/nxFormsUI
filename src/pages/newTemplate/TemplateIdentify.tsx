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

  const isDynamic = selectedChunkData && !selectedChunkData.isStatic;
  const hasFieldMapping = !!selectedChunkData?.fieldMapping;

  const canUseTransformations = isDynamic && hasFieldMapping;

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

                return (
                  <div
                    key={chunk.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedChunk(chunk.id);
                    }}
                    className={cn(
                      "absolute border-2 cursor-pointer transition-all",
                      chunk.isStatic ? "border-primary" : "border-destructive",
                      selectedChunk === chunk.id && "ring-4 ring-accent/20",
                    )}
                    style={{
                      left,
                      top,
                      width,
                      height,
                    }}
                  />
                );
              })}
          </div>

          {uploadedFile?.type === "application/pdf" && (
            <p className="text-[10px] text-muted-foreground mt-3 italic">
              PDF converted to image for preview
            </p>
          )}
        </div>

        {/* RIGHT — Properties */}
        <div className="card-elevated flex flex-col">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <Settings2 size={14} />
            <h3 className="font-display text-xs font-semibold">
              Property Editor
            </h3>
          </div>

          <div className="p-5 space-y-6">
            {!selectedChunkData && (
              <div className="text-center py-16">
                <MousePointer2 className="mx-auto text-muted-foreground mb-3" />
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Select field to edit
                </p>
              </div>
            )}

            {selectedChunkData && (
              <>
                {/* Label */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">
                    Field Label
                  </label>

                  <input
                    value={selectedChunkData.label}
                    onChange={(e) =>
                      updateChunk(selectedChunkData.id, {
                        label: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm font-semibold bg-card focus:ring-2 focus:ring-accent/30 outline-none"
                  />
                </div>

                {/* Logic Type */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">
                    Logic Type
                  </label>

                  <div className="flex border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() =>
                        updateChunk(selectedChunkData.id, { isStatic: true })
                      }
                      className={cn(
                        "flex-1 py-2 text-[10px] font-bold tracking-wider",
                        selectedChunkData.isStatic
                          ? "bg-background text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      STATIC
                    </button>

                    <button
                      onClick={() =>
                        updateChunk(selectedChunkData.id, { isStatic: false })
                      }
                      className={cn(
                        "flex-1 py-2 text-[10px] font-bold tracking-wider",
                        !selectedChunkData.isStatic
                          ? "bg-background text-destructive"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      DYNAMIC
                    </button>
                  </div>
                </div>

                {/* Mapping */}
                {!selectedChunkData.isStatic && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                      SAP Field Mapping
                    </label>

                    {/* <select
                      value={selectedChunkData.fieldMapping || ""}
                      onChange={(e) =>
                        updateChunk(selectedChunkData.id, {
                          fieldMapping: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border text-xs font-semibold bg-card focus:ring-2 focus:ring-accent/30 outline-none"
                    >
                      <option value="">Select field</option>
                      {selectedContext?.fields?.map((field: any) => (
                        <option key={field.path} value={field.path}>
                          {field.name}
                        </option>
                      ))}
                    </select> */}
                    <select
  value={selectedChunkData.fieldMapping || ""}
  onChange={(e) => {
    const value = e.target.value;

    console.log("selectedContext:", selectedContext);

    const selectedField = selectedContext?.fields?.find(
      (f: any) => f.path === value
    );
    console.log("value:", value);
    console.log("selected field:", selectedField);
    console.log("field.name:", selectedField?.name);
    console.log("field.path:", selectedField?.path);
    const cleanValue = value.split(".").pop();
    console.log("cleanValue", cleanValue)
    updateChunk(selectedChunkData.id, {
      fieldMapping: cleanValue,
    });
  }}
  className="w-full px-3 py-2 rounded-lg border border-border text-xs font-semibold bg-card focus:ring-2 focus:ring-accent/30 outline-none"
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
                {isDynamic && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">
                        Transformation Library
                      </label>

                      {/* <select
                        disabled={!canUseTransformations}
                        onChange={(e) => {
                          const type = e.target.value as Transformation["type"];
                          if (!type) return;

                          const newTransformation: Transformation = { type };

                          updateChunk(selectedChunkData.id, {
                            transformations: [
                              ...(selectedChunkData.transformations || []),
                              newTransformation,
                            ],
                          });

                          e.target.value = "";
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-border text-xs font-semibold bg-card"
                      >
                        <option value="">Add Transformation</option>
                        <option value="to_upper">To Upper</option>
                        <option value="to_lower">To Lower</option>
                        <option value="concatenate">Concatenate</option>
                        <option value="format_date">Format Date</option>
                        <option value="add">Add</option>
                        <option value="multiply">Multiply</option>
                        <option value="if_else">If-Then-Else</option>
                        <option value="default_value">Default Value</option>
                      </select> */}
                      <Button
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => setOpenTransformModal(true)}
                      >
                        + Add Transformation
                      </Button>
                    </div>
                    {selectedChunkData?.transformations?.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">
                          Applied Transformations
                        </label>

                        {selectedChunkData.transformations.map((t, index) => (
                          <div
                            key={index}
                            className="border rounded-lg px-3 py-2 text-xs flex justify-between items-center"
                          >
                            <div>
                              <div className="font-semibold">{t.type}</div>

                              {t.value && (
                                <div className="text-muted-foreground">
                                  Value: {t.value}
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
                              className="text-destructive text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {/* Delete */}
                <Button
                  variant="ghost"
                  className="w-full text-destructive text-[10px] font-bold uppercase tracking-widest"
                  onClick={() => {
                    removeChunk(selectedChunkData.id);
                    setSelectedChunk(null);
                  }}
                >
                  <Trash2 size={14} />
                  Delete Field
                </Button>
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
