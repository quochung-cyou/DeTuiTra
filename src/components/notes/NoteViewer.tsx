import { Note } from "@/types";
import { Button } from "@/components/ui/button";
import { Copy, X, Pencil, Clock } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useApp } from "@/context/AppContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NoteViewerProps {
  open: boolean;
  onClose: () => void;
  note: Note | null;
  onEdit: (note: Note) => void;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function NoteViewer({ open, onClose, note, onEdit }: NoteViewerProps) {
  const { getUserById } = useApp();
  
  if (!note) return null;

  const author = getUserById(note.createdBy);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(note.content);
      toast.success("Đã sao chép nội dung!");
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold break-words">
                {note.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={author?.photoURL} alt={author?.displayName} />
                  <AvatarFallback className="text-[10px]">{author?.displayName?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{author?.displayName || 'Người dùng ẩn danh'}</span>
                  <span>·</span>
                  <Clock className="h-3 w-3 ml-1" />
                  <span>
                    Tạo: {formatDate(note.createdAt)}
                    {note.updatedAt && note.updatedAt !== note.createdAt && (
                      <> · Cập nhật: {formatDate(note.updatedAt)}</>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  onClose();
                  setTimeout(() => onEdit(note), 200);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
