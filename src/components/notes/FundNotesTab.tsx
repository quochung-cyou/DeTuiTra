import { useState, useEffect, useCallback } from "react";
import { Note } from "@/types";
import { Fund } from "@/types";
import { useApp } from "@/context/AppContext";
import { getFundNotes, createNote, updateNote, deleteNote } from "@/firebase/noteService";
import { NoteList } from "@/components/notes/NoteList";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteViewer } from "@/components/notes/NoteViewer";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface FundNotesTabProps {
  fund: Fund;
}

export function FundNotesTab({ fund }: FundNotesTabProps) {
  const { currentUser } = useApp();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);

  const loadNotes = useCallback(async () => {
    if (!fund) return;
    try {
      setIsLoading(true);
      const fundNotes = await getFundNotes(fund.id);
      setNotes(fundNotes);
    } catch (error) {
      console.error("Error loading notes:", error);
      toast.error("Không thể tải ghi chú");
    } finally {
      setIsLoading(false);
    }
  }, [fund.id]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleCreateNew = () => {
    setEditingNote(null);
    setEditorOpen(true);
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setEditorOpen(true);
  };

  const handleView = (note: Note) => {
    setViewingNote(note);
    setViewerOpen(true);
  };

  const handleSave = async (data: { title: string; content: string }) => {
    if (!currentUser) return;
    try {
      setIsSaving(true);
      if (editingNote) {
        await updateNote(editingNote.id, data);
        setNotes((prev) =>
          prev.map((n) =>
            n.id === editingNote.id
              ? { ...n, ...data, updatedAt: Date.now() }
              : n
          )
        );
        toast.success("Đã cập nhật ghi chú!");
      } else {
        const newNote = await createNote({
          fundId: fund.id,
          createdBy: currentUser.id,
          ...data,
        });
        setNotes((prev) => [newNote, ...prev]);
        toast.success("Đã tạo ghi chú mới!");
      }
      setEditorOpen(false);
      setEditingNote(null);
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Không thể lưu ghi chú");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success("Đã xóa ghi chú!");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Không thể xóa ghi chú");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {notes.length} ghi chú trong quỹ
        </p>
        <Button onClick={handleCreateNew} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tạo ghi chú
        </Button>
      </div>

      <NoteList
        notes={notes}
        isLoading={isLoading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <NoteEditor
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingNote(null);
        }}
        onSave={handleSave}
        note={editingNote}
        isSaving={isSaving}
      />

      <NoteViewer
        open={viewerOpen}
        onClose={() => {
          setViewerOpen(false);
          setViewingNote(null);
        }}
        note={viewingNote}
        onEdit={handleEdit}
      />
    </div>
  );
}
