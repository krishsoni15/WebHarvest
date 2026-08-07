import fs from 'fs';
import path from 'path';
import { activeJobs, Job } from '@/lib/jobStore';

export async function runNativeMirror(id: string, url: string, hostname: string, downloadDir: string) {
  const targetDir = path.join(downloadDir, hostname);
  const logFilePath = path.join(downloadDir, 'crawl_logs.txt');
  const jobJsonPath = path.join(downloadDir, 'job.json');

  const appendLog = (msg: string) => {
    try {
      fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] ${msg}\n`);
    } catch {}
  };

  const updateJobState = (status: 'downloading' | 'completed' | 'failed', errMessage?: string) => {
    const job: Job = {
      id,
      url,
      hostname,
      status,
      error: errMessage,
      addedAt: Date.now(),
      completedAt: status !== 'downloading' ? Date.now() : undefined,
    };
    activeJobs.set(id, job);
    try {
      fs.writeFileSync(jobJsonPath, JSON.stringify(job, null, 2));
    } catch {}
  };

  try {
    fs.mkdirSync(targetDir, { recursive: true });
    appendLog(`[START] Initializing High-Speed WebHarvest Mirroring Engine for ${url}`);
    updateJobState('downloading');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    let html = await response.text();
    appendLog(`[FETCH] Main HTML document retrieved (${html.length} bytes)`);

    // Create subdirectories for asset types
    const cssDir = path.join(targetDir, 'css');
    const jsDir = path.join(targetDir, 'js');
    const imgDir = path.join(targetDir, 'images');
    fs.mkdirSync(cssDir, { recursive: true });
    fs.mkdirSync(jsDir, { recursive: true });
    fs.mkdirSync(imgDir, { recursive: true });

    // Extract asset URLs using regex
    const cssRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi;
    const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;

    const assetsToFetch: { url: string; type: 'css' | 'js' | 'img'; localPath: string; relPath: string }[] = [];

    const baseUrl = new URL(url);

    const resolveUrl = (rel: string) => {
      try {
        return new URL(rel, baseUrl.href).href;
      } catch {
        return null;
      }
    };

    // Extract CSS
    let match;
    let cssIdx = 0;
    while ((match = cssRegex.exec(html)) !== null) {
      const fullUrl = resolveUrl(match[1]);
      if (fullUrl && !fullUrl.startsWith('data:')) {
        cssIdx++;
        const filename = `style_${cssIdx}.css`;
        assetsToFetch.push({
          url: fullUrl,
          type: 'css',
          localPath: path.join(cssDir, filename),
          relPath: `css/${filename}`,
        });
        html = html.replace(match[1], `./css/${filename}`);
      }
    }

    // Extract JS
    let jsIdx = 0;
    while ((match = scriptRegex.exec(html)) !== null) {
      const fullUrl = resolveUrl(match[1]);
      if (fullUrl && !fullUrl.startsWith('data:')) {
        jsIdx++;
        const filename = `script_${jsIdx}.js`;
        assetsToFetch.push({
          url: fullUrl,
          type: 'js',
          localPath: path.join(jsDir, filename),
          relPath: `js/${filename}`,
        });
        html = html.replace(match[1], `./js/${filename}`);
      }
    }

    // Extract Images
    let imgIdx = 0;
    while ((match = imgRegex.exec(html)) !== null) {
      const fullUrl = resolveUrl(match[1]);
      if (fullUrl && !fullUrl.startsWith('data:')) {
        imgIdx++;
        const ext = path.extname(new URL(fullUrl).pathname) || '.png';
        const filename = `image_${imgIdx}${ext.split('?')[0]}`;
        assetsToFetch.push({
          url: fullUrl,
          type: 'img',
          localPath: path.join(imgDir, filename),
          relPath: `images/${filename}`,
        });
        html = html.replace(match[1], `./images/${filename}`);
      }
    }

    // Extract PDFs & Documents
    const docsDir = path.join(targetDir, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    const docLinkRegex = /<(?:a|iframe|embed|object)[^>]+(?:href|src|data)=["']([^"']+\.(?:pdf|doc|docx|xls|xlsx|ppt|pptx|csv|txt|zip)(?:\?[^"']*)?)["']/gi;
    let docIdx = 0;
    while ((match = docLinkRegex.exec(html)) !== null) {
      const fullUrl = resolveUrl(match[1]);
      if (fullUrl && !fullUrl.startsWith('data:')) {
        docIdx++;
        const rawExt = path.extname(new URL(fullUrl).pathname) || '.pdf';
        const cleanExt = rawExt.split('?')[0];
        const baseName = path.basename(new URL(fullUrl).pathname, rawExt) || `document_${docIdx}`;
        const filename = `${baseName}_${docIdx}${cleanExt}`;
        assetsToFetch.push({
          url: fullUrl,
          type: 'img', // queued for asset fetcher
          localPath: path.join(docsDir, filename),
          relPath: `docs/${filename}`,
        });
        html = html.replace(match[1], `./docs/${filename}`);
      }
    }

    // Save modified HTML index
    fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf-8');
    appendLog(`[WRITE] Saved index.html with relative link rewrites`);

    // Fetch assets concurrently (max 15 assets)
    appendLog(`[ASSETS] Fetching ${assetsToFetch.length} static resources...`);
    const fetchAssetPromises = assetsToFetch.slice(0, 30).map(async (asset) => {
      try {
        const ac = new AbortController();
        const tid = setTimeout(() => ac.abort(), 6000);
        const res = await fetch(asset.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: ac.signal,
        });
        clearTimeout(tid);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          fs.writeFileSync(asset.localPath, buffer);
          appendLog(`[ASSET SUCCESS] Downloaded ${asset.relPath}`);
        }
      } catch (e: any) {
        appendLog(`[ASSET WARN] Skipped ${asset.relPath}: ${e.message}`);
      }
    });

    await Promise.allSettled(fetchAssetPromises);

    appendLog(`[SUCCESS] Website harvest completed successfully! Target ready for offline preview.`);
    updateJobState('completed');
  } catch (err: any) {
    appendLog(`[ERROR] Mirroring failed: ${err.message}`);
    updateJobState('failed', err.message || 'Failed to harvest website');
  }
}
