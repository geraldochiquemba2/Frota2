import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileIcon, ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  accept?: string;
}

export function ImageUpload({ value, onChange, label, accept = "image/*,.pdf" }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Falha no upload");

      const data = await res.json();
      onChange(data.url);
      toast({ title: "Ficheiro enviado com sucesso" });
    } catch (error) {
      toast({ title: "Erro no upload", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const isPdf = value?.toLowerCase().endsWith(".pdf");

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="flex items-center gap-4">
        {value ? (
          <div className="relative group">
            <div className="w-20 h-20 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center">
              {isPdf ? (
                <FileIcon className="w-8 h-8 text-muted-foreground" />
              ) : (
                <img src={value} alt="Preview" className="w-full h-full object-cover" />
              )}
            </div>
            <button
              onClick={() => onChange(null)}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              type="button"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
        )}

        <div className="flex-1">
          <Input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
            id={`file-upload-${label?.replace(/\s/g, "-")}`}
          />
          <Label
            htmlFor={`file-upload-${label?.replace(/\s/g, "-")}`}
            className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? "Enviando..." : value ? "Substituir" : "Selecionar Ficheiro"}
          </Label>
          <p className="text-[10px] text-muted-foreground mt-1">Máx 5MB. JPG, PNG ou PDF.</p>
        </div>
      </div>
    </div>
  );
}
