import type { GuiaBlock } from "@/data/guias";

/**
 * Renderiza el cuerpo de una guía.
 *
 * Los artículos son datos tipados (`src/data/guias.ts`) y esto los convierte en
 * HTML semántico. Se hace acá y no con una librería de markdown porque el
 * proyecto no suma dependencias sin justificarlo, y porque así los títulos, las
 * listas y las tablas salen con los mismos tokens que el resto del sitio.
 *
 * Los `h2`/`h3` son etiquetas reales, no divs con estilo: Google usa la
 * jerarquía de encabezados para entender de qué trata cada parte, y los
 * lectores de pantalla para navegar.
 */
export function GuiaBlocks({ blocks }: { blocks: GuiaBlock[] }) {
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h2":
            return (
              <h2
                key={index}
                className="mt-6 text-2xl font-black uppercase tracking-tight text-balance text-white sm:mt-8 sm:text-3xl"
              >
                {block.text}
              </h2>
            );

          case "h3":
            return (
              <h3
                key={index}
                className="mt-2 text-lg font-bold tracking-tight text-[color:var(--brand-gold)] sm:text-xl"
              >
                {block.text}
              </h3>
            );

          case "p":
            return (
              <p
                key={index}
                className="text-base leading-7 text-[color:var(--text-secondary)] sm:text-[17px] sm:leading-8"
              >
                {block.text}
              </p>
            );

          case "ul":
            return (
              <ul key={index} className="flex flex-col gap-2 pl-1">
                {block.items.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-base leading-7 text-[color:var(--text-secondary)] sm:text-[17px]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[10px] size-1.5 shrink-0 rounded-full bg-[color:var(--brand-gold)]"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );

          case "ol":
            return (
              <ol key={index} className="flex flex-col gap-3 pl-1">
                {block.items.map((item, itemIndex) => (
                  <li
                    key={item}
                    className="flex gap-3 text-base leading-7 text-[color:var(--text-secondary)] sm:text-[17px]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] font-mono text-xs font-black text-[color:var(--brand-gold)]"
                    >
                      {itemIndex + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            );

          case "quote":
            return (
              <blockquote
                key={index}
                className="border-l-2 border-[color:var(--brand-gold)] pl-5 text-lg font-semibold leading-8 text-white sm:text-xl"
              >
                {block.text}
              </blockquote>
            );

          case "table":
            return (
              // La tabla scrollea sola en pantalla chica: sin esto, una tabla de
              // 5 columnas hace scrollear la página entera para el costado.
              <div
                key={index}
                className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
              >
                <div className="min-w-[560px] overflow-hidden rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[color:var(--surface-1)]">
                      <tr className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                        {block.headers.map((header) => (
                          <th key={header} className="px-4 py-3 font-bold">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row) => (
                        <tr
                          key={row.join("|")}
                          className="border-t border-[color:var(--border-subtle)]"
                        >
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className={
                                cellIndex === 0
                                  ? "px-4 py-3 font-bold text-white"
                                  : "px-4 py-3 text-[color:var(--text-secondary)]"
                              }
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
        }
      })}
    </div>
  );
}
