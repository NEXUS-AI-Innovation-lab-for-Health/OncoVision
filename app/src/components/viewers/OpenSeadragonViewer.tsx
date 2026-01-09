import React, { useEffect, useRef } from "react";
import OpenSeadragon from "openseadragon";

type Props = {
  tileSource?: string | any;
  width?: string;
  height?: string;
  prefixUrl?: string;
  showNavigator?: boolean;
  onOpen?: () => void;
  onOpenFailed?: () => void;
};

export default function OpenSeadragonViewer({
  tileSource,
  width = "100%",
  height = "100%",
  prefixUrl = '/openseadragon/images/',
  showNavigator = true,
  onOpen,
  onOpenFailed,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    viewerRef.current = OpenSeadragon({
      element: containerRef.current,
      prefixUrl,
      showNavigator,
      animationTime: 0.25,
      blendTime: 0.1,
      maxZoomPixelRatio: 2,
      minZoomLevel: 0.5,
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
      crossOriginPolicy: 'Anonymous',
    });

    if (onOpen) viewerRef.current.addHandler('open', onOpen);
    if (onOpenFailed) viewerRef.current.addHandler('open-failed', onOpenFailed);

    if (tileSource) {
      viewerRef.current.open(tileSource);
    }

    return () => {
      try {
        viewerRef.current?.destroy();
      } catch (e) {
        // ignore
      }
      viewerRef.current = null;
    };
    // intentionally empty deps: we want single init; tileSource handled below
  }, []);

  useEffect(() => {
    if (tileSource && viewerRef.current) {
      viewerRef.current.open(tileSource);
    }
  }, [tileSource]);

  return <div ref={containerRef} style={{ width, height, background: '#000' }} />;
}
