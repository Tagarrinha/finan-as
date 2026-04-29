import { CSSProperties } from "react";

interface Props {
  world1Name: string; setWorld1Name: (v:string)=>void;
  world1Icon: string; setWorld1Icon: (v:string)=>void;
  world2Name: string; setWorld2Name: (v:string)=>void;
  world2Icon: string; setWorld2Icon: (v:string)=>void;
  accent: string; accentDark: string;
  cardBorder: string; subtext: string;
  onSave: ()=>void; onCancel: ()=>void;
}

export default function WorldEditor({
  world1Name, setWorld1Name, world1Icon, setWorld1Icon,
  world2Name, setWorld2Name, world2Icon, setWorld2Icon,
  accent, accentDark, cardBorder, subtext, onSave, onCancel,
}: Props) {
  const inp: CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "12px",
    color: "#e2e8f0",
    fontSize: 13,
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "'Sora',sans-serif",
    width: "100%",
  };

  return (
    <div style={{ fontFamily: "'Sora',sans-serif" }}>

      {/* Tip */}
      <div style={{ background: `${accent}12`, border: `1px solid ${accent}25`, borderRadius: 10, padding: "10px 12px", marginBottom: 16, fontSize: 12, color: accent, lineHeight: 1.5 }}>
        💡 Toca no quadrado do emoji → teclado abre → toca em 😊 para escolher qualquer emoji
      </div>

      {/* World 1 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: subtext, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 8 }}>Mundo 1</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...inp, width: 60, textAlign: "center", fontSize: 24, padding: "8px 4px" }}
            value={world1Icon}
            onChange={e => setWorld1Icon(e.target.value)}
            maxLength={2}
            placeholder="👤"
          />
          <input
            style={{ ...inp, flex: 1 }}
            value={world1Name}
            onChange={e => setWorld1Name(e.target.value)}
            placeholder="Nome (ex: Pessoal)"
          />
        </div>
      </div>

      {/* World 2 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: subtext, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 8 }}>Mundo 2</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...inp, width: 60, textAlign: "center", fontSize: 24, padding: "8px 4px" }}
            value={world2Icon}
            onChange={e => setWorld2Icon(e.target.value)}
            maxLength={2}
            placeholder="🏥"
          />
          <input
            style={{ ...inp, flex: 1 }}
            value={world2Name}
            onChange={e => setWorld2Name(e.target.value)}
            placeholder="Nome (ex: Clínica)"
          />
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onSave}
          style={{ flex: 1, padding: "12px 0", background: `linear-gradient(135deg,${accent},${accentDark})`, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Sora',sans-serif" }}
        >
          Guardar
        </button>
        <button
          onClick={onCancel}
          style={{ padding: "12px 16px", background: "rgba(255,255,255,0.05)", border: `1px solid ${cardBorder}`, borderRadius: 10, color: subtext, fontSize: 13, cursor: "pointer", fontFamily: "'Sora',sans-serif" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
