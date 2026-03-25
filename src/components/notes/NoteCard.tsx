import { Note } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, Eye, Clock } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface NoteCardProps {
  note: Note;
  onView: (note: Note) => void;
  onEdit: (note: Note) => void;
  onDelete: (noteId: string) => void;
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

function getPreview(content: string, maxLength: number = 120): string {
  const stripped = content
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/!\[.*?\]\(.+?\)/g, '')
    .replace(/>\s/g, '')
    .replace(/-\s/g, '')
    .replace(/\n+/g, ' ')
    .trim();

  if (stripped.length <= maxLength) return stripped;
  return stripped.substring(0, maxLength) + '...';
}

export function NoteCard({ note, onView, onEdit, onDelete }: NoteCardProps) {
  const { getUserById } = useApp();
  const author = getUserById(note.createdBy);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(note.content);
      toast.success("Đã sao chép nội dung!");
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      layout
    >
      <Card
        className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/30 group h-full flex flex-col"
        onClick={() => onView(note)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold line-clamp-1">
            {note.title || "Không tiêu đề"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pb-2">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {getPreview(note.content)}
          </p>
        </CardContent>
        <CardFooter className="pt-2 pb-3 px-4 flex flex-col gap-2 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-full">
              <Avatar className="h-5 w-5 flex-shrink-0">
                <AvatarImage src={author?.photoURL} alt={author?.displayName} />
                <AvatarFallback className="text-[10px]">{author?.displayName?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <span className="font-medium truncate max-w-[80px]">{author?.displayName || 'Người dùng ẩn danh'}</span>
              <span className="opacity-50">·</span>
              <span className="truncate">{formatDate(note.updatedAt || note.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(note);
                }}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xóa ghi chú?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn có chắc muốn xóa "{note.title}"? Hành động này không thể hoàn tác.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(note.id);
                      }}
                    >
                      Xóa
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
