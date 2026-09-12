import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const MAX_TEX_BYTES = 2 * 1024 * 1024;
const MAX_BIB_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

interface CompileBody {
  tex?: string;
  bib?: string;
  figures?: Record<string, string>;
}

@Injectable()
export class ResearchWritingService {
  async compile(body: CompileBody): Promise<Buffer> {
    const tex = body.tex?.trim();
    if (!tex) throw new Error('缺少 main.tex 内容');
    if (Buffer.byteLength(tex, 'utf8') > MAX_TEX_BYTES) throw new Error('main.tex 文件过大');

    const workDir = join(tmpdir(), `navivisor-latex-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await mkdir(workDir, { recursive: true });
    try {
      await this.copyTemplate(workDir);
      await writeFile(join(workDir, 'main.tex'), tex, 'utf8');
      const bib = body.bib ?? '';
      if (Buffer.byteLength(bib, 'utf8') > MAX_BIB_BYTES) throw new Error('main.bib 文件过大');
      await writeFile(join(workDir, 'main.bib'), bib, 'utf8');
      await this.writeFigures(workDir, body.figures ?? {});

      const args = ['-interaction=nonstopmode', '-halt-on-error', '-file-line-error', 'main.tex'];
      await this.runLatex(workDir, args);
      if (bib.trim()) await this.runCommand(this.bibtexCommand(), ['main'], workDir);
      await this.runLatex(workDir, args);
      await this.runLatex(workDir, args);
      return await readFile(join(workDir, 'main.pdf'));
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async copyTemplate(workDir: string): Promise<void> {
    const roots = [
      join(process.cwd(), 'web', 'public', 'cvpr-template'),
      join(process.cwd(), 'public', 'cvpr-template'),
    ];
    const names = ['cvpr.sty', 'preamble.tex', 'ieeenat_fullname.bst'];
    for (const root of roots) {
      try {
        for (const name of names) await writeFile(join(workDir, name), await readFile(join(root, name)));
        return;
      } catch {
        // Try the production path after the dev source path.
      }
    }
    throw new ServiceUnavailableException(
      '找不到 CVPR 官方模板文件，请检查 web/public/cvpr-template',
    );
  }

  private async writeFigures(workDir: string, figures: Record<string, string>): Promise<void> {
    const dir = join(workDir, 'figures');
    await mkdir(dir, { recursive: true });
    for (const [name, value] of Object.entries(figures)) {
      if (!/^[a-zA-Z0-9_-]+\.(png|jpe?g)$/i.test(name)) continue;
      const match = value.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/i);
      if (!match) continue;
      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.length > MAX_IMAGE_BYTES) throw new Error(`图片过大：${name}`);
      await writeFile(join(dir, name), buffer);
    }
  }

  private async runLatex(workDir: string, args: string[]): Promise<void> {
    await this.runCommand(process.env.LATEX_COMMAND?.trim() || 'pdflatex', args, workDir);
  }

  private bibtexCommand(): string {
    const configuredLatex = process.env.LATEX_COMMAND?.trim();
    if (configuredLatex && configuredLatex.includes('\\')) {
      return join(dirname(configuredLatex), process.platform === 'win32' ? 'bibtex.exe' : 'bibtex');
    }
    return process.env.BIBTEX_COMMAND?.trim() || 'bibtex';
  }

  private async runCommand(command: string, args: string[], cwd: string): Promise<void> {
    try {
      await execFileAsync(command, args, {
        cwd,
        windowsHide: true,
        timeout: 120_000,
        maxBuffer: 2 * 1024 * 1024,
      });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        throw new ServiceUnavailableException(
          `未找到 ${command}。请按 README 安装 TeX Live 或 MiKTeX，并将其加入 PATH。`,
        );
      }
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`${command} 执行失败：${detail.slice(0, 1200)}`);
    }
  }
}
