import { Note } from "@/types";
import { NoteCard } from "./NoteCard";
import { Input } from "@/components/ui/input";
import { Search, X, StickyNote } from "lucide-react";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";

interface NoteListProps {
  notes: Note[];
  isLoading: boolean;
  onView: (note: Note) => void;
  onEdit: (note: Note) => void;
  onDelete: (noteId: string) => void;
}

export function NoteList({ notes, isLoading, onView, onEdit, onDelete }: NoteListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm ghi chú..."
          className="pl-9"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <StickyNote className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">
            {searchTerm ? "Không tìm thấy ghi chú nào" : "Chưa có ghi chú nào"}
          </p>
          <p className="text-sm mt-1">
            {searchTerm ? "Thử từ khóa khác" : "Nhấn \"Tạo ghi chú\" để bắt đầu"}
          </p>
        </div>
      )}
    </div>
  );
}
