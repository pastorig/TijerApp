"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";

type ImportClientsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  barbershopSlug: string;
  onImported: () => void;
};

type ParsedClient = {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  tags?: string[];
};

type ImportResult = {
  created: number;
  skipped: number;
  invalid: number;
  invalidRows?: Array<{ index: number; reason: string }>;
};

/**
 * Parser CSV simple. Soporta:
 * - Separador: coma (`,`) o punto y coma (`;`)
 * - Quoting con doble comilla (`"`)
 * - Escape de comillas con doble comilla (`""`)
 * - BOM al inicio del archivo (lo descarta)
 *
 * No es 100% RFC4180, pero cubre Excel/Sheets en exportaciones típicas.
 */
function parseCsv(text: string): string[][] {
  // Strip BOM si está presente
  let input = text;
  if (input.charCodeAt(0) === 0xfeff) {
    input = input.slice(1);
  }

  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  // Detectar separador por la primera línea
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const sep = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === sep) {
        current.push(field);
        field = "";
      } else if (ch === "\n") {
        current.push(field);
        rows.push(current);
        current = [];
        field = "";
      } else if (ch === "\r") {
        // ignore, \n viene después
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

/**
 * Encuentra el índice de una columna en el header. Acepta variantes
 * y minúsculas/mayúsculas.
 */
function findColumnIndex(header: string[], aliases: string[]): number {
  const normalized = header.map((h) =>
    h
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim(),
  );
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

export function ImportClientsModal({
  isOpen,
  onClose,
  barbershopSlug,
  onImported,
}: ImportClientsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedClients, setParsedClients] = useState<ParsedClient[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [fileName, setFileName] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      setParsedClients([]);
      setParseWarnings([]);
      setResult(null);
      setErrorMessage("");
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !isImporting) onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose, isImporting]);

  async function handleFileSelected(file: File) {
    setFileName(file.name);
    setErrorMessage("");
    setResult(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        setErrorMessage("El archivo está vacío.");
        return;
      }
      const header = rows[0];
      const nameIdx = findColumnIndex(header, [
        "nombre",
        "name",
        "cliente",
      ]);
      const phoneIdx = findColumnIndex(header, [
        "telefono",
        "phone",
        "teléfono",
        "celular",
        "movil",
      ]);
      const emailIdx = findColumnIndex(header, ["email", "correo", "mail"]);
      const notesIdx = findColumnIndex(header, ["notas", "notes", "comentarios"]);
      const tagsIdx = findColumnIndex(header, ["tags", "etiquetas"]);

      if (nameIdx === -1 || phoneIdx === -1) {
        setErrorMessage(
          'El CSV debe tener al menos las columnas "Nombre" y "Telefono".',
        );
        return;
      }

      const warnings: string[] = [];
      const clients: ParsedClient[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const name = (row[nameIdx] ?? "").trim();
        const phone = (row[phoneIdx] ?? "").trim();
        if (!name || !phone) {
          warnings.push(`Fila ${i + 1}: sin nombre o teléfono, se omite.`);
          continue;
        }
        const tags = tagsIdx !== -1 && row[tagsIdx]
          ? (row[tagsIdx] || "")
              .split(/[\/,;|]/)
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined;
        clients.push({
          name,
          phone,
          email: emailIdx !== -1 ? (row[emailIdx] ?? "").trim() || undefined : undefined,
          notes: notesIdx !== -1 ? (row[notesIdx] ?? "").trim() || undefined : undefined,
          tags,
        });
      }

      if (clients.length === 0) {
        setErrorMessage("No encontramos filas válidas en el CSV.");
        return;
      }

      setParsedClients(clients);
      setParseWarnings(warnings);
    } catch {
      setErrorMessage("No pudimos leer el archivo. ¿Es un CSV válido?");
    }
  }

  async function handleImport() {
    if (parsedClients.length === 0) return;
    setIsImporting(true);
    setErrorMessage("");
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setErrorMessage("Sesión expirada. Volvé a iniciar sesión.");
        return;
      }
      const response = await fetch("/api/admin/clients/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          barbershopSlug,
          clients: parsedClients,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        created?: number;
        skipped?: number;
        invalid?: number;
        invalidRows?: Array<{ index: number; reason: string }>;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        setErrorMessage(payload.error ?? "No pudimos importar.");
        return;
      }
      setResult({
        created: payload.created ?? 0,
        skipped: payload.skipped ?? 0,
        invalid: payload.invalid ?? 0,
        invalidRows: payload.invalidRows,
      });
      if ((payload.created ?? 0) > 0) {
        onImported();
      }
    } catch {
      setErrorMessage("No pudimos importar.");
    } finally {
      setIsImporting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Importar clientes desde CSV"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isImporting) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-t-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] shadow-2xl sm:rounded-[var(--radius-lg)]">
        <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
              Importar clientes
            </p>
            <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
              Subí un CSV con columnas Nombre y Telefono (mínimo).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            aria-label="Cerrar"
            className="inline-flex size-8 items-center justify-center rounded-[var(--radius-xs)] text-[color:var(--text-subtle)] transition-colors hover:bg-[color:var(--surface-1)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {result ? (
            <div className="rounded-[var(--radius-sm)] border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--success)]">
                Importación completada
              </p>
              <ul className="mt-2 space-y-1 text-sm text-white">
                <li>
                  <strong className="font-mono text-[color:var(--success)]">
                    {result.created}
                  </strong>{" "}
                  clientes nuevos creados
                </li>
                {result.skipped > 0 ? (
                  <li>
                    <strong className="font-mono text-[color:var(--text-muted)]">
                      {result.skipped}
                    </strong>{" "}
                    omitidos (teléfono ya existía)
                  </li>
                ) : null}
                {result.invalid > 0 ? (
                  <li>
                    <strong className="font-mono text-[color:var(--danger)]">
                      {result.invalid}
                    </strong>{" "}
                    inválidos
                  </li>
                ) : null}
              </ul>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-[color:var(--brand-gold-hi)]"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              {parsedClients.length === 0 ? (
                <>
                  <div className="rounded-[var(--radius-sm)] border border-dashed border-[color:var(--border-default)] p-6 text-center">
                    <Upload className="mx-auto size-6 text-[color:var(--text-subtle)]" />
                    <p className="mt-2 text-sm font-bold text-white">
                      Elegí un archivo CSV
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                      Columnas aceptadas: Nombre, Telefono, Email, Notas, Tags
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFileSelected(file);
                      }}
                      className="hidden"
                      id="csv-file-input"
                    />
                    <label
                      htmlFor="csv-file-input"
                      className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
                    >
                      Seleccionar archivo
                    </label>
                  </div>
                  <p className="text-[10px] text-[color:var(--text-subtle)]">
                    Tip: exportá tu agenda de contactos como CSV desde Google
                    Contacts, Excel, o cualquier sistema previo.
                  </p>
                </>
              ) : (
                <>
                  <div className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
                      Previsualización
                    </p>
                    <p className="mt-2 text-sm font-bold text-white">
                      {parsedClients.length} clientes encontrados
                      {fileName ? ` en ${fileName}` : ""}.
                    </p>
                    {parseWarnings.length > 0 ? (
                      <div className="mt-3 max-h-24 overflow-y-auto text-[10px] text-amber-300">
                        {parseWarnings.slice(0, 5).map((w, i) => (
                          <p key={i}>{w}</p>
                        ))}
                        {parseWarnings.length > 5 ? (
                          <p>… y {parseWarnings.length - 5} más</p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-3 max-h-40 overflow-y-auto rounded-[var(--radius-xs)] border border-[color:var(--border-subtle)] bg-black p-2">
                      <ul className="space-y-1 text-[11px] text-[color:var(--text-secondary)]">
                        {parsedClients.slice(0, 6).map((c, i) => (
                          <li key={i} className="truncate">
                            <span className="font-bold text-white">
                              {c.name}
                            </span>{" "}
                            ·{" "}
                            <span className="font-mono">{c.phone}</span>
                          </li>
                        ))}
                        {parsedClients.length > 6 ? (
                          <li className="text-[color:var(--text-subtle)]">
                            … y {parsedClients.length - 6} más
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  </div>
                </>
              )}

              {errorMessage ? (
                <p
                  role="alert"
                  className="border-l-2 border-[color:var(--danger)] pl-3 text-sm font-semibold text-[color:var(--danger)]"
                >
                  {errorMessage}
                </p>
              ) : null}

              {parsedClients.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={isImporting}
                    className={cn(
                      "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                  >
                    <Upload className="size-3.5" />
                    {isImporting
                      ? "Importando…"
                      : `Importar ${parsedClients.length} clientes`}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedClients([]);
                      setParseWarnings([]);
                      setFileName("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    disabled={isImporting}
                    className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cambiar archivo
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
