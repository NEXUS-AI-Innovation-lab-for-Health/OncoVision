import React, { useState } from "react";
import OpenSeadragonViewer from "../OpenSeadragonViewer";

export default function WsiViewer({ dziUrl, height = "600px" }: { dziUrl: string; height?: string; }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {loading && <p>Chargement de la lame WSI...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <OpenSeadragonViewer
        tileSource={dziUrl}
        height={height}
        prefixUrl="https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/"
        showNavigator
        onOpen={() => { setLoading(false); setError(null); }}
        onOpenFailed={() => { setError("Impossible de charger la lame WSI"); setLoading(false); }}
      />
    </div>
  );
}