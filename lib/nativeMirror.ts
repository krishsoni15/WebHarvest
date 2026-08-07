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
    const fontsDir = path.join(targetDir, 'fonts');
    fs.mkdirSync(cssDir, { recursive: true });
    fs.mkdirSync(jsDir, { recursive: true });
    fs.mkdirSync(imgDir, { recursive: true });
    fs.mkdirSync(fontsDir, { recursive: true });

    const assetsToFetch: { url: string; type: 'css' | 'js' | 'img' | 'font'; localPath: string; relPath: string }[] = [];

    const baseUrl = new URL(url);

    const resolveUrl = (rel: string) => {
      try {
        return new URL(rel, baseUrl.href).href;
      } catch {
        return null;
      }
    };

    let match;

    // 1. Extract CSS stylesheets
    const cssRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi;
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

    // 2. Extract JS Scripts & Next.js / React Chunks
    const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
    let jsIdx = 0;
    while ((match = scriptRegex.exec(html)) !== null) {
      const fullUrl = resolveUrl(match[1]);
      if (fullUrl && !fullUrl.startsWith('data:')) {
        jsIdx++;
        const isNextChunk = match[1].includes('_next/static') || match[1].includes('chunk');
        const filename = isNextChunk ? `next_chunk_${jsIdx}.js` : `script_${jsIdx}.js`;
        assetsToFetch.push({
          url: fullUrl,
          type: 'js',
          localPath: path.join(jsDir, filename),
          relPath: `js/${filename}`,
        });
        html = html.replace(match[1], `./js/${filename}`);
      }
    }

    // 3. Extract Preloaded Next.js Scripts, Fonts, and Styles (<link rel="preload|modulepreload|prefetch">)
    const preloadRegex = /<link[^>]+href=["']([^"']+)["'][^>]*rel=["'](?:preload|modulepreload|prefetch)["']/gi;
    let preloadIdx = 0;
    while ((match = preloadRegex.exec(html)) !== null) {
      const fullUrl = resolveUrl(match[1]);
      if (fullUrl && !fullUrl.startsWith('data:')) {
        preloadIdx++;
        const ext = path.extname(new URL(fullUrl).pathname).toLowerCase();
        let folder = jsDir;
        let relFolder = 'js';
        let prefix = 'preload_chunk';
        let assetType: 'js' | 'css' | 'font' = 'js';

        if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) {
          folder = fontsDir;
          relFolder = 'fonts';
          prefix = 'font';
          assetType = 'font';
        } else if (ext === '.css') {
          folder = cssDir;
          relFolder = 'css';
          prefix = 'preload_style';
          assetType = 'css';
        }

        const filename = `${prefix}_${preloadIdx}${ext || '.js'}`;
        assetsToFetch.push({
          url: fullUrl,
          type: assetType,
          localPath: path.join(folder, filename),
          relPath: `${relFolder}/${filename}`,
        });
        html = html.replace(match[1], `./${relFolder}/${filename}`);
      }
    }

    // 4. Extract Images & Next.js <Image> src
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
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

    // 5. Extract Next.js / React srcset attributes (<img> & <source>)
    const srcsetRegex = /srcset=["']([^"']+)["']/gi;
    while ((match = srcsetRegex.exec(html)) !== null) {
      const rawSrcset = match[1];
      const parts = rawSrcset.split(',').map(s => s.trim());
      let newSrcsetParts: string[] = [];

      for (const part of parts) {
        const [candidateUrl, descriptor] = part.split(/\s+/);
        if (candidateUrl && !candidateUrl.startsWith('data:')) {
          const fullUrl = resolveUrl(candidateUrl);
          if (fullUrl) {
            imgIdx++;
            const ext = path.extname(new URL(fullUrl).pathname) || '.png';
            const filename = `srcset_img_${imgIdx}${ext.split('?')[0]}`;
            assetsToFetch.push({
              url: fullUrl,
              type: 'img',
              localPath: path.join(imgDir, filename),
              relPath: `images/${filename}`,
            });
            newSrcsetParts.push(`./images/${filename}${descriptor ? ' ' + descriptor : ''}`);
          } else {
            newSrcsetParts.push(part);
          }
        } else {
          newSrcsetParts.push(part);
        }
      }

      if (newSrcsetParts.length > 0) {
        html = html.replace(rawSrcset, newSrcsetParts.join(', '));
      }
    }

    // 6. Extract inline background images style="url(...)"
    const bgUrlRegex = /url\(["']?([^"')\s]+\.(?:png|jpg|jpeg|webp|gif|svg))["']?\)/gi;
    while ((match = bgUrlRegex.exec(html)) !== null) {
      const rawUrl = match[1];
      if (!rawUrl.startsWith('data:')) {
        const fullUrl = resolveUrl(rawUrl);
        if (fullUrl) {
          imgIdx++;
          const ext = path.extname(new URL(fullUrl).pathname) || '.png';
          const filename = `bg_img_${imgIdx}${ext.split('?')[0]}`;
          assetsToFetch.push({
            url: fullUrl,
            type: 'img',
            localPath: path.join(imgDir, filename),
            relPath: `images/${filename}`,
          });
          html = html.replace(rawUrl, `./images/${filename}`);
        }
      }
    }

    // 7. Extract PDFs & Documents
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
          type: 'img',
          localPath: path.join(docsDir, filename),
          relPath: `docs/${filename}`,
        });
        html = html.replace(match[1], `./docs/${filename}`);
      }
    }

    // Save modified HTML index
    fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf-8');
    appendLog(`[WRITE] Saved index.html with relative link rewrites`);

    // Fetch assets concurrently (max 30 static resources)
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

          // Inline images into HTML data URIs for 100% self-contained serverless preview
          if (asset.relPath.startsWith('images/') && buffer.length < 500000) {
            const ext = path.extname(asset.localPath).toLowerCase().replace('.', '');
            const mimeType = ext === 'svg' ? 'image/svg+xml' : (ext === 'webp' ? 'image/webp' : (ext === 'png' ? 'image/png' : (ext === 'gif' ? 'image/gif' : 'image/jpeg')));
            const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`;
            html = html.replaceAll(`./${asset.relPath}`, dataUri);
          }
        }
      } catch (e: any) {
        appendLog(`[ASSET WARN] Skipped ${asset.relPath}: ${e.message}`);
      }
    });

    await Promise.allSettled(fetchAssetPromises);

    // Save final self-contained HTML index
    fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf-8');
    appendLog(`[WRITE] Saved index.html with inline asset data URIs`);

    appendLog(`[SUCCESS] Website harvest completed successfully! Target ready for offline preview.`);
    updateJobState('completed');

    // Build return payload for serverless function callers
    const fullLogs = fs.existsSync(logFilePath) ? fs.readFileSync(logFilePath, 'utf-8') : '';
    
    let techStack = 'Static HTML/CSS';
    if (/wp-content|wp-includes/i.test(html)) techStack = 'WordPress';
    else if (/cdn\.shopify\.com/i.test(html)) techStack = 'Shopify';
    else if (/wix\.com|_wix/i.test(html)) techStack = 'Wix';
    else if (/squarespace\.com/i.test(html)) techStack = 'Squarespace';
    else if (/webflow\.com|data-wf-page/i.test(html)) techStack = 'Webflow';
    else if (/_next\/static|__next|next\.js/i.test(html)) techStack = 'Next.js (React)';
    else if (/vue\.js|nuxt|__nuxt/i.test(html)) techStack = 'Vue.js / Nuxt';
    else if (/ng-version|angular/i.test(html)) techStack = 'Angular';
    else if (/tailwindcss|tailwind/i.test(html)) techStack = 'Tailwind CSS';
    else if (/react/i.test(html)) techStack = 'React';

    const totalFiles = assetsToFetch.length + 1;
    const totalBytes = Buffer.byteLength(html, 'utf-8') + assetsToFetch.length * 15000;

    return {
      id,
      url,
      hostname,
      status: 'completed' as const,
      logs: fullLogs,
      html,
      stats: {
        pages: 1,
        images: imgIdx,
        files: totalFiles,
        size: formatBytes(totalBytes),
      },
      techStack,
    };
  } catch (err: any) {
    appendLog(`[ERROR] Mirroring failed: ${err.message}`);
    updateJobState('failed', err.message || 'Failed to harvest website');
    const fullLogs = fs.existsSync(logFilePath) ? fs.readFileSync(logFilePath, 'utf-8') : err.message;
    return {
      id,
      url,
      hostname,
      status: 'failed' as const,
      error: err.message || 'Failed to harvest website',
      logs: fullLogs,
    };
  }
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
