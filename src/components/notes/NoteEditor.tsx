import { useState, useEffect } from "react";
import { Note } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, Save, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface NoteEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { title: string; content: string }) => void;
  note?: Note | null;
  isSaving?: boolean;
}

export function NoteEditor({ open, onClose, onSave, note, isSaving }: NoteEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(note?.title || "");
      setContent(note?.content || "");
      setShowPreview(false);
    }
  }, [open, note]);

  const handleSave = () => {
    if (!title.trim()) {
      return;
    }
    onSave({ title: title.trim(), content });
  };

  const isEdit = !!note;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>{isEdit ? "Chỉnh sửa ghi chú" : "Tạo ghi chú mới"}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <Input
              placeholder="Tiêu đề ghi chú..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-medium"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {showPreview ? "Xem trước" : "Soạn thảo"} (Markdown)
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-1.5"
            >
              {showPreview ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Soạn thảo
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Xem trước
                </>
              )}
            </Button>
          </div>

          {showPreview ? (
            <div className="min-h-[300px] border rounded-md p-4 prose prose-sm dark:prose-invert max-w-none">
              {content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground italic">Chưa có nội dung...</p>
              )}
            </div>
          ) : (
            <Textarea
              placeholder="Viết nội dung ghi chú bằng Markdown..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[300px] resize-none font-mono text-sm"
            />
          )}
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            <X className="h-4 w-4 mr-1" />
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || isSaving}>
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
