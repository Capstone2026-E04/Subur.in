"use client";

import { useState, useTransition } from "react";
import { MdEdit, MdCheck, MdClose, MdPerson } from "react-icons/md";
import { API_URL } from "@/services/api";

interface EditNameFormProps {
  currentName: string;
  backendToken?: string;
}

export default function EditNameForm({ currentName, backendToken }: EditNameFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [inputValue, setInputValue] = useState(currentName);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  function handleEdit() {
    setInputValue(name);
    setIsEditing(true);
    setStatus("idle");
  }

  function handleCancel() {
    setInputValue(name);
    setIsEditing(false);
    setStatus("idle");
  }

  function handleSave() {
    const trimmed = inputValue.trim();
    if (!trimmed || trimmed === name) {
      setIsEditing(false);
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/users/me`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {}),
            },
            body: JSON.stringify({ name: trimmed }),
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          console.error("Gagal update nama:", errText);
          setStatus("error");
          return;
        }

        setName(trimmed);
        setIsEditing(false);
        setStatus("success");
        setTimeout(() => setStatus("idle"), 3000);
      } catch (err) {
        console.error("Gagal menghubungi server:", err);
        setStatus("error");
      }
    });
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        Nama Tampilan
      </label>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            maxLength={60}
            className="flex-1 rounded-lg border border-primary/30 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            placeholder="Masukkan nama baru..."
          />
          <button
            onClick={handleSave}
            disabled={isPending}
            aria-label="Simpan nama"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-light disabled:opacity-50 transition-colors cursor-pointer"
          >
            <MdCheck size={18} />
          </button>
          <button
            onClick={handleCancel}
            aria-label="Batal"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <MdClose size={18} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-black/8 bg-white px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <MdPerson size={16} className="text-primary/60 shrink-0" />
            <span className="text-sm font-medium text-gray-800">{name}</span>
          </div>
          <button
            onClick={handleEdit}
            aria-label="Edit nama"
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/8 transition-colors cursor-pointer"
          >
            <MdEdit size={14} />
            Edit
          </button>
        </div>
      )}

      {status === "success" && (
        <p className="text-xs text-emerald-600 font-medium">
          ✓ Nama berhasil diperbarui.
        </p>
      )}
      {status === "error" && (
        <p className="text-xs text-rose-500 font-medium">
          Gagal menyimpan. Coba lagi.
        </p>
      )}
    </div>
  );
}
