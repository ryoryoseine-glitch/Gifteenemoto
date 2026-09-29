/** 画面の報告書（原案）を Word で開ける形で書き出す。記入は Word の上で行う */
export function downloadWord(filename: string) {
  const el = document.querySelector("[data-report-doc]");
  if (!el) return;
  const clone = el.cloneNode(true) as HTMLElement;
  // 画像は絶対パスに、コピーのボタンなど紙に要らないものは外す
  clone.querySelectorAll("img").forEach((img) => img.setAttribute("src", new URL(img.getAttribute("src") ?? "", location.origin).href));
  clone.querySelectorAll("button").forEach((b) => b.remove());
  clone.querySelectorAll("[data-fill]").forEach((f) => {
    (f as HTMLElement).setAttribute("style", "border:1px dashed #e0612f;background:#fdf1ec;color:#c8542a;padding:6pt;");
  });
  const css = `
    body{font-family:"游ゴシック","Yu Gothic","Hiragino Sans",sans-serif;font-size:10.5pt;color:#232323;line-height:1.6}
    h2{font-size:16pt;margin:0 0 4pt} h3{font-size:12pt;border-bottom:1px solid #999;padding-bottom:2pt;margin:16pt 0 6pt}
    table{border-collapse:collapse;width:100%;margin:4pt 0} th,td{border:1px solid #bbb;padding:3pt 5pt;font-size:9.5pt;vertical-align:top}
    th{background:#f2f3f4;text-align:left} img{max-width:160px;height:auto} svg{display:none}
    p{margin:3pt 0}`;
  const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${filename}</title><style>${css}</style></head><body>${clone.innerHTML}<p style="color:#888;font-size:8pt">この文書は自動で作った原案です。【自治体が記入】の欄を書き足してから送付してください。</p></body></html>`;
  const url = URL.createObjectURL(new Blob(["\ufeff", html], { type: "application/msword" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}
