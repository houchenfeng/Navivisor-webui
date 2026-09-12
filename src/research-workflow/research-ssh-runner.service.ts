import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { dirname, posix, relative, resolve } from 'node:path';
import { Client, type ConnectConfig } from 'ssh2';
import { ResearchWorkspaceService } from './research-workspace.service';

export interface SshExperimentRequest {
  projectId: string; host: string; port?: number; username: string;
  password?: string; privateKey?: string; codeDir: string; dataDir: string;
  resultsDir: string; documentDir: string; condaEnv?: string; experimentDocument: string;
}
export interface SshExperimentJob {
  jobId: string; projectId: string;
  status: 'queued'|'connecting'|'running'|'downloading'|'completed'|'failed';
  message: string; compute?: string; remoteResultsDir?: string;
  localRelativeDir?: string; artifacts?: Array<{artifactId:string;path:string;name:string;mediaType:string;simulated:boolean}>; startedAt: string; finishedAt?: string;
}

@Injectable()
export class ResearchSshRunnerService {
  private readonly jobs = new Map<string,SshExperimentJob>();
  constructor(private readonly workspaces: ResearchWorkspaceService) {}

  start(raw: SshExperimentRequest) {
    const input = validateSshExperimentRequest(raw);
    const job: SshExperimentJob = { jobId: randomUUID(), projectId: input.projectId, status: 'queued', message: '等待 SSH 连接', startedAt: new Date().toISOString() };
    this.jobs.set(job.jobId, job); void this.execute(job, input); return { ...job };
  }
  get(jobId: string) {
    const job=this.jobs.get(jobId); if(!job) throw new NotFoundException('SSH experiment job not found'); return {...job,artifacts:job.artifacts?[...job.artifacts]:undefined};
  }

  private async execute(job:SshExperimentJob,input:ReturnType<typeof validateSshExperimentRequest>) {
    let client:Client|undefined;
    try {
      const workspace=await this.workspaces.getWorkspace(input.projectId);
      job.status='connecting'; job.message='正在连接 SSH 服务器';
      client=await connectSsh({host:input.host,port:input.port,username:input.username,password:input.password,privateKey:input.privateKey,readyTimeout:15000,keepaliveInterval:10000});
      input.password=undefined; input.privateKey=undefined;
      const remoteRun=posix.join(input.resultsDir,job.jobId); const remoteDocs=posix.join(input.documentDir,job.jobId);
      job.remoteResultsDir=remoteRun; job.status='running'; job.message='正在选择空闲 GPU 并执行实验';
      const localScript=resolve(process.cwd(),'research-tools','ssh-experiment','run_navivisor_experiment.py');
      await mkdir(resolve(workspace.rootPath,'experiment','real-runs',job.jobId),{recursive:true});
      await execSsh(client,'mkdir -p '+[input.codeDir,input.dataDir,remoteRun,remoteDocs].map(shellQuote).join(' '));
      await uploadFiles(client,[localScript],[posix.join(input.codeDir,'run_navivisor_experiment.py')]);
      const documentRemote=posix.join(remoteDocs,'experiment-spec.md');
      await uploadBuffers(client,[Buffer.from(input.experimentDocument,'utf8')],[documentRemote]);
      const command=buildRemoteCommand(input,remoteRun,remoteDocs);
      const output=await execSsh(client,command);
      job.compute=output.stdout.match(/NAVIVISOR_COMPUTE=(.+)/)?.[1]?.trim()||'unknown';
      job.status='downloading'; job.message='正在复制远端结果';
      const localRelative=posix.join('experiment','real-runs',job.jobId);
      const localDir=resolve(workspace.rootPath,...localRelative.split('/'));
      const check=relative(resolve(workspace.rootPath),localDir); if(check.startsWith('..')||check.includes(':')) throw new Error('Local output escaped workspace');
      const names=['metrics.csv','run.json','experiment-results.md','algorithm-details.md','experiment-spec.md'];
      const remote=[posix.join(remoteRun,'metrics.csv'),posix.join(remoteRun,'run.json'),posix.join(remoteDocs,'experiment-results.md'),posix.join(remoteDocs,'algorithm-details.md'),documentRemote];
      await downloadFiles(client,remote,names.map(name=>resolve(localDir,name)));
      const saved = await Promise.all([
        this.workspaces.saveVersion(input.projectId,posix.join(localRelative,'experiment-results.md'),'experiment-results',{stage:'experiment.run',mode:'real',simulated:true}),
        this.workspaces.saveVersion(input.projectId,posix.join(localRelative,'algorithm-details.md'),'method-architecture',{stage:'experiment.run',mode:'real',simulated:true}),
        this.workspaces.saveVersion(input.projectId,posix.join(localRelative,'metrics.csv'),'experiment-results',{stage:'experiment.run',mode:'real',simulated:true}),
      ]);
      job.localRelativeDir=localRelative; job.artifacts=saved.map(artifact=>({artifactId:artifact.artifactId,path:String(artifact.metadata?.sourcePath??artifact.path),name:artifact.name,mediaType:artifact.mediaType,simulated:artifact.simulated})); job.status='completed';
      job.message='远端计算完成；输入为合成测试数据，保留 simulated 标记'; job.finishedAt=new Date().toISOString();
    } catch(error) { job.status='failed'; job.message=safeSshError(error); job.finishedAt=new Date().toISOString(); }
    finally { client?.end(); input.password=undefined; input.privateKey=undefined; }
  }
}

export function validateSshExperimentRequest(value:SshExperimentRequest) {
  const required=['projectId','host','username','codeDir','dataDir','resultsDir','documentDir','experimentDocument'] as const;
  for(const key of required) if(!String(value?.[key]??'').trim()) throw new BadRequestException(String(key)+' is required');
  for(const key of ['codeDir','dataDir','resultsDir','documentDir'] as const) {
    const path=value[key].trim(); if(!path.startsWith('/')||path.includes('..')||/[\n\r\0]/.test(path)) throw new BadRequestException(String(key)+' must be a safe absolute POSIX path');
  }
  if(!value.password&&!value.privateKey) throw new BadRequestException('password or privateKey is required');
  const port=value.port??22; if(!Number.isInteger(port)||port<1||port>65535) throw new BadRequestException('invalid SSH port');
  if(value.experimentDocument.length>200000) throw new BadRequestException('experimentDocument is too large');
  return {...value,projectId:value.projectId.trim(),host:value.host.trim(),username:value.username.trim(),port,codeDir:value.codeDir.trim(),dataDir:value.dataDir.trim(),resultsDir:value.resultsDir.trim(),documentDir:value.documentDir.trim(),condaEnv:value.condaEnv?.trim()||'yolo26',experimentDocument:value.experimentDocument.trim()};
}

export function buildRemoteCommand(input:ReturnType<typeof validateSshExperimentRequest>,runDir:string,docDir:string) {
  const q=shellQuote; const script=posix.join(input.codeDir,'run_navivisor_experiment.py');
  const title=input.experimentDocument.split(/\r?\n/).find(line=>line.trim())?.replace(/^#+\s*/,'')||'Navivisor SSH experiment';
  return [
    'set -euo pipefail',
    'mkdir -p '+[input.codeDir,input.dataDir,runDir,docDir].map(q).join(' '),
    "GPU_ID=$(command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi --query-gpu=index,memory.used,utilization.gpu --format=csv,noheader,nounits | awk -F, '$2+0 < 512 && $3+0 < 10 {gsub(/ /,\"\",$1); print $1; exit}' || true)",
    'if [ -n "$GPU_ID" ]; then export CUDA_VISIBLE_DEVICES="$GPU_ID"; COMPUTE="gpu:$GPU_ID"; else export CUDA_VISIBLE_DEVICES=""; COMPUTE="cpu"; fi',
    "if command -v conda >/dev/null 2>&1; then if ! conda env list | awk '{print $1}' | grep -Fxq "+q(input.condaEnv)+"; then conda create -y -n "+q(input.condaEnv)+" python=3.11; fi; RUNNER=\"conda run -n "+q(input.condaEnv)+" python\"; else RUNNER=\"python3\"; fi",
    '$RUNNER '+q(script)+' --data-dir '+q(input.dataDir)+' --results-dir '+q(runDir)+' --document-dir '+q(docDir)+' --compute "$COMPUTE" --title '+q(title),
    'printf "NAVIVISOR_COMPUTE=%s\\n" "$COMPUTE"'
  ].join('\n');
}
function shellQuote(value:string){return "'"+value.replaceAll("'","'\\''")+"'";}
function connectSsh(config:ConnectConfig){return new Promise<Client>((ok,fail)=>{const c=new Client();c.once('ready',()=>ok(c)).once('error',fail).connect(config);});}
function execSsh(client:Client,command:string){return new Promise<{stdout:string;stderr:string}>((ok,fail)=>client.exec('bash -lc '+shellQuote(command),(error,stream)=>{if(error)return fail(error);let stdout='',stderr='';stream.on('data',(c:Buffer)=>stdout+=c.toString());stream.stderr.on('data',(c:Buffer)=>stderr+=c.toString());stream.on('close',(code:number|undefined)=>code===0?ok({stdout,stderr}):fail(new Error('Remote command failed ('+String(code)+'): '+stderr.slice(-1000))));}));}
function uploadFiles(client:Client,local:string[],remote:string[]){return sftpAction(client,sftp=>Promise.all(local.map((p,i)=>new Promise<void>((ok,fail)=>sftp.fastPut(p,remote[i],e=>e?fail(e):ok())))).then(()=>undefined));}
function uploadBuffers(client:Client,buffers:Buffer[],remote:string[]){return sftpAction(client,sftp=>Promise.all(buffers.map((b,i)=>new Promise<void>((ok,fail)=>{const s=sftp.createWriteStream(remote[i]);s.on('close',ok).on('error',fail).end(b);}))).then(()=>undefined));}
function downloadFiles(client:Client,remote:string[],local:string[]){return sftpAction(client,sftp=>Promise.all(remote.map((p,i)=>mkdir(dirname(local[i]),{recursive:true}).then(()=>new Promise<void>((ok,fail)=>sftp.fastGet(p,local[i],e=>e?fail(e):ok()))))).then(()=>undefined));}
function sftpAction(client:Client,action:(sftp:import('ssh2').SFTPWrapper)=>Promise<void>){return new Promise<void>((ok,fail)=>client.sftp((e,sftp)=>{if(e)return fail(e);action(sftp).then(()=>{sftp.end();ok();},fail);}));}
function safeSshError(error:unknown){const message=error instanceof Error?error.message:String(error);if(/timed out|ETIMEDOUT/i.test(message))return 'SSH 连接超时：请检查服务器网络、VPN和端口。';if(/authentication/i.test(message))return 'SSH 认证失败：请检查用户名、密码或私钥。';return message.replace(/password=[^\s]+/gi,'password=[redacted]').slice(0,1200);}
