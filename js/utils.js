// Pure utility functions — no side effects, no DOM access

export function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function escRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function wordCount(md) {
  return md.trim() ? md.trim().split(/\s+/).length : 0;
}

export function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

export function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function parsePdfDate(s) {
  if (!s) return '';
  const m = s.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?/);
  return m ? `${m[1]}-${m[2]}-${m[3]}${m[4] ? ' ' + m[4] + ':' + (m[5] || '00') : ''}` : s;
}

export function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function friendlyError(err) {
  const n = err?.name ?? '';
  if (n === 'PasswordException') return 'PDF is password-protected.';
  if (n === 'InvalidPDFException') return 'Invalid or corrupted file.';
  return err?.message ? `Error: ${err.message}` : 'An unknown error occurred.';
}

export async function loadScript(src, globalKey, retries = 2) {
  if (globalKey && window[globalKey]) return;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let el;
    try {
      await new Promise((resolve, reject) => {
        el = Object.assign(document.createElement('script'), {
          src, onload: resolve, onerror: () => reject(new Error('Failed to load ' + src)),
        });
        document.head.appendChild(el);
      });
      return;
    } catch (err) {
      if (el) el.remove();
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result.split(',')[1]);
    fr.onerror = () => reject(new Error('Failed to read file: ' + (file.name || 'unknown')));
    fr.readAsDataURL(file);
  });
}

export function generateFrontmatter(meta, filename) {
  const esc = s => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const lines = ['---'];
  const title = meta?.Title || filename?.replace(/\.[^.]+$/, '') || 'Untitled';
  lines.push(`title: "${esc(title)}"`);
  lines.push(`date: ${new Date().toISOString().split('T')[0]}`);
  if (meta?.Author) lines.push(`author: "${esc(meta.Author)}"`);
  if (meta?.Source) lines.push(`source: "${esc(meta.Source)}"`);
  lines.push('---\n\n');
  return lines.join('\n');
}
