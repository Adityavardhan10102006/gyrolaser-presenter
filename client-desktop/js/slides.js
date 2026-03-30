// OLD — pdfDoc was a local variable, lost after load
async function loadPDF(file) {
  const pdfDoc = await pdfjsLib.getDocument(data).promise; // ← local, gone after function ends
  renderPage(pdfDoc, 1); // ← only ever called once
}

// NEW — pdfDoc lives at module level, currentPage is tracked
let pdfDoc      = null;  // ← persists
let currentPage = 1;     // ← persists

async function renderPage(pageNum) {
  if (renderTask) { renderTask.cancel(); }  // ← cancel any in-progress render

  const page     = await pdfDoc.getPage(pageNum);
  const scale    = Math.min(maxW / vp.width, maxH / vp.height);
  const viewport = page.getViewport({ scale });

  pdfCanvas.width  = viewport.width;   // ← resize canvas per page
  pdfCanvas.height = viewport.height;

  renderTask = page.render({ canvasContext: pdfCtx, viewport });
  await renderTask.promise;

  currentPage = pageNum;               // ← update tracker
  UI.updateCounter(pageNum, pdfDoc.numPages);
}

// These now work because pdfDoc and currentPage persist
async function nextPDFPage() { await renderPage(currentPage + 1); }
async function prevPDFPage() { await renderPage(currentPage - 1); }