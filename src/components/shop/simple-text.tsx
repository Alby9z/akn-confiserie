/**
 * Rendu sûr d'un texte saisi dans l'administration :
 * « ## Titre », « ### Sous-titre », « - élément » et paragraphes. Aucun HTML n'est interprété.
 */
export function SimpleText({ content }: { content: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flushList = () => {
    if (list.length) blocks.push(<ul key={blocks.length}>{list.map((l, i) => <li key={i}>{highlight(l)}</li>)}</ul>);
    list = [];
  };
  const flushPara = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{highlight(para.join(" "))}</p>);
    para = [];
  };
  for (const raw of content.split("\n")) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) { flushList(); flushPara(); blocks.push(<h2 key={blocks.length}>{line.slice(3)}</h2>); }
    else if (line.startsWith("### ")) { flushList(); flushPara(); blocks.push(<h3 key={blocks.length}>{line.slice(4)}</h3>); }
    else if (/^[-*] /.test(line)) { flushPara(); list.push(line.slice(2)); }
    else if (!line.trim()) { flushList(); flushPara(); }
    else { flushList(); para.push(line); }
  }
  flushList();
  flushPara();
  return <div className="prose-shop">{blocks}</div>;
}

/** Met en évidence les zones à compléter « [À COMPLÉTER : …] » */
function highlight(text: string): React.ReactNode {
  const parts = text.split(/(\[À COMPLÉTER[^\]]*\])/g);
  return parts.map((p, i) => (p.startsWith("[À COMPLÉTER") ? <mark key={i} className="rounded bg-amber-200 px-1 text-amber-950">{p}</mark> : p));
}
