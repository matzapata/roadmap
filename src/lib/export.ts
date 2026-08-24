import { toPng } from "html-to-image";

export async function exportChartPng(rootEl: HTMLElement, filename: string): Promise<void> {
  const viewport = rootEl.querySelector(".react-flow__viewport") as HTMLElement | null;
  const target = viewport ?? rootEl;
  const dataUrl = await toPng(target, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#fcfcfc",
  });
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  a.click();
}
