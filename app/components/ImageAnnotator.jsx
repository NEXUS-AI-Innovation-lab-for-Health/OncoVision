import { useRef, useState } from "react";

export default function ImageAnnotator({ imageUrl }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("rectangle"); // rectangle | circle | text
  const [startPos, setStartPos] = useState(null);
  const [annotations, setAnnotations] = useState([]);

  // ========= API CALL DIRECT IN THE COMPONENT =========
  async function saveAnnotation(annotation) {
    try {
      await fetch("http://localhost:8000/annotations/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(annotation),
      });
      console.log("Annotation enregistrée ✔", annotation);
    } catch (err) {
      console.error("Erreur enregistrement annotation ❌ :", err);
    }
  }

  // ========= CANVAS EVENTS =========

  function onMouseDown(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    setStartPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  function onMouseUp(e) {
    if (!startPos) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    let annotation = null;

    if (tool === "rectangle") {
      annotation = {
        imageId: "biopsie-image-001",
        type: "rectangle",
        x: startPos.x,
        y: startPos.y,
        width: endX - startPos.x,
        height: endY - startPos.y,
        userId: "doctor-42",
        createdAt: new Date().toISOString(),
      };
    }

    if (tool === "circle") {
      const radius = Math.sqrt(
        Math.pow(endX - startPos.x, 2) + Math.pow(endY - startPos.y, 2)
      );
      annotation = {
        imageId: "biopsie-image-001",
        type: "circle",
        x: startPos.x,
        y: startPos.y,
        radius,
        userId: "doctor-42",
        createdAt: new Date().toISOString(),
      };
    }

    if (tool === "text") {
      const text = prompt("Entrez votre annotation textuelle :");
      if (!text) return;

      annotation = {
        imageId: "biopsie-image-001",
        type: "text",
        x: endX,
        y: endY,
        text,
        userId: "doctor-42",
        createdAt: new Date().toISOString(),
      };
    }

    setAnnotations((prev) => [...prev, annotation]);
    drawAnnotations([...annotations, annotation]);

    saveAnnotation(annotation); // ⬅️ Envoi au backend

    setStartPos(null);
  }

  // ========= DRAWING =========

  function drawAnnotations(all) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    all.forEach((a) => {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "red";
      ctx.fillStyle = "yellow";

      if (a.type === "rectangle") {
        ctx.rect(a.x, a.y, a.width, a.height);
        ctx.stroke();
      }

      if (a.type === "circle") {
        ctx.arc(a.x, a.y, a.radius, 0, 2 * Math.PI);
        ctx.stroke();
      }

      if (a.type === "text") {
        ctx.font = "16px Arial";
        ctx.fillText(a.text, a.x, a.y);
      }
    });
  }

  return (
    <div style={{ position: "relative", width: "fit-content" }}>
      <img
        src={imageUrl}
        alt="Image médicale"
        style={{ width: "800px", height: "auto" }}
      />

      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          border: "1px solid black",
          cursor: "crosshair",
        }}
      />

      <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
        <button onClick={() => setTool("rectangle")}>Rectangle</button>
        <button onClick={() => setTool("circle")}>Cercle</button>
        <button onClick={() => setTool("text")}>Texte</button>
      </div>
    </div>
  );
}
