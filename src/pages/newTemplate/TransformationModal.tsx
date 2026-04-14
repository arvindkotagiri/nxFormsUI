import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { TRANSFORMATIONS } from "./transformations";

interface Props {
    open: boolean;
    onClose: () => void;
    onSelect: (type: string) => void;
}

export function TransformationModal({ open, onClose, onSelect }: Props) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Add Transformation</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {Object.entries(TRANSFORMATIONS).map(([category, list]) => (
                        <div key={category} className="space-y-2">
                            <h4 className="text-xs font-bold uppercase text-muted-foreground">
                                {category.replace("_", " ")}
                            </h4>

                            <div className="flex flex-wrap gap-2">
                                {list.map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => onSelect(t)}
                                        className="px-3 py-1 text-xs border rounded hover:bg-accent"
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
