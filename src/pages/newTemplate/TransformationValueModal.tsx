import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useEffect } from "react";

interface Props {
    open: boolean;
    type: string;
    existingValue?: string;
    onClose: () => void;
    onSave: (value: string) => void;
}

export function TransformationValueModal({
    open,
    type,
    onClose,
    existingValue,
    onSave,
}: Props) {
    // const [value, setValue] = useState("");
    const [value, setValue] = useState(existingValue || "");

    useEffect(() => {
        setValue(existingValue || "");
    }, [existingValue]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{type}</DialogTitle>
                </DialogHeader>

                <input
                    placeholder="Enter value"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full border px-3 py-2 rounded text-sm"
                />

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>

                    <Button
                        onClick={() => {
                            onSave(value);
                            setValue("");
                        }}
                    >
                        Save
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
