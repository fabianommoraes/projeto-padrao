import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meu treino",
    short_name: "Treino",
    description: "Aplicativo de acompanhamento de treino e progresso.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f4f1",
    theme_color: "#2f5bea",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
