import React, { useState } from 'react';

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setStatus('No file selected');

    const form = new FormData();
    form.append('file', file, file.name);

    setStatus('Uploading...');
    try {
      const res = await fetch('http://localhost:8000/files/upload', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (res.ok) setStatus(`Uploaded: ${data.filename}`);
      else setStatus(`Error: ${JSON.stringify(data)}`);
    } catch (err: any) {
      setStatus(`Upload failed: ${err.message}`);
    }
  }

  return (
    <form onSubmit={handleUpload} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
      <button type="submit">Upload</button>
      {status && <span style={{ marginLeft: 8 }}>{status}</span>}
    </form>
  );
}
