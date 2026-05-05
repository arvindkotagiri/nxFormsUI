import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, ArrowLeft, Database, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldMappingSelectorProps {
  value?: string;
  onSelect: (fullMapping: string, fieldName: string) => void;
  selectedContext: any;
  placeholder?: string;
  className?: string;
}

export function FieldMappingSelector({ value, onSelect, selectedContext, placeholder = "Select field...", className }: FieldMappingSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

  const isOData = selectedContext?.isOData;
  const entities = selectedContext?.entities || [];
  const fieldsByEntity = selectedContext?.fields || {}; // For OData: { Entity: [fields] }
  const flatFields = Array.isArray(selectedContext?.fields) ? selectedContext.fields : []; // For non-OData: [fields]

  // Reset selected entity when popover closes
  useEffect(() => {
    if (!open) {
      setSelectedEntity(null);
    }
  }, [open]);

  // Extract display name
  // If the value is EntitySet.FieldName, show only FieldName
  const currentField = value?.includes('.') ? value.split('.')[1] : value;
  const displayValue = currentField || value || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-9 text-xs font-semibold bg-card", className)}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 shadow-2xl border-accent/20" align="start">
        <Command className="bg-card">
          {isOData ? (
            !selectedEntity ? (
              <>
                <div className="px-3 py-2 border-b bg-muted/20">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Entity Set</p>
                </div>
                <CommandInput placeholder="Search entity set..." className="text-xs h-9" />
                <CommandList className="max-h-[300px] custom-scrollbar">
                  <CommandEmpty>No entity set found.</CommandEmpty>
                  <CommandGroup>
                    {entities.map((entity: any) => (
                      <CommandItem
                        key={entity.name}
                        value={entity.name}
                        onSelect={() => setSelectedEntity(entity.name)}
                        className="text-xs cursor-pointer hover:bg-accent/5 transition-colors"
                      >
                        <Database className="mr-2 h-3.5 w-3.5 text-accent" />
                        <div className="flex flex-col">
                            <span className="font-semibold">{entity.label || entity.name}</span>
                            <span className="text-[9px] text-muted-foreground">{entity.name}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </>
            ) : (
              <>
                <div className="flex items-center border-b px-2 py-1.5 bg-accent/5">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 mr-2 hover:bg-accent/10 text-accent" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedEntity(null);
                    }}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Button>
                  <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase leading-none">Entity Set</span>
                      <span className="text-xs font-bold text-accent truncate">
                        {selectedEntity}
                      </span>
                  </div>
                </div>
                <CommandInput placeholder="Search field..." className="text-xs h-9" />
                <CommandList className="max-h-[300px] custom-scrollbar">
                  <CommandEmpty>No field found.</CommandEmpty>
                  <CommandGroup>
                    {fieldsByEntity[selectedEntity]?.map((field: any) => (
                      <CommandItem
                        key={field.name}
                        value={field.name}
                        onSelect={() => {
                          onSelect(`${selectedEntity}.${field.name}`, field.name);
                          setOpen(false);
                        }}
                        className="text-xs cursor-pointer hover:bg-accent/5 transition-colors"
                      >
                        <Tag className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        <div className="flex flex-col">
                            <span className="font-semibold">{field.label || field.name}</span>
                            <span className="text-[9px] text-muted-foreground">{field.name} ({field.type})</span>
                        </div>
                        {value === `${selectedEntity}.${field.name}` && (
                          <Check className="ml-auto h-3.5 w-3.5 text-accent" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </>
            )
          ) : (
            <>
              <CommandInput placeholder="Search field..." className="text-xs h-9" />
              <CommandList className="max-h-[300px] custom-scrollbar">
                <CommandEmpty>No field found.</CommandEmpty>
                <CommandGroup>
                  {flatFields.map((field: any) => (
                    <CommandItem
                      key={field.name || field}
                      value={field.name || field}
                      onSelect={() => {
                        onSelect(field.name || field, field.name || field);
                        setOpen(false);
                      }}
                      className="text-xs cursor-pointer hover:bg-accent/5 transition-colors"
                    >
                      <Tag className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold">{field.label || field.name || field}</span>
                      {value === (field.name || field) && (
                        <Check className="ml-auto h-3.5 w-3.5 text-accent" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
