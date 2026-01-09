import WsiViewer from "../components/viewers/wsi/WsiViewer";

export default function WsiPage() {
  return (
    <div>
      <h2>Visualisation WSI</h2>

      <WsiViewer dziUrl="http://localhost:5000/wsi/slide.dzi" />
    </div>
  );
}
