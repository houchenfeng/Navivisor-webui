import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { buildRemoteCommand, validateSshExperimentRequest } from './research-ssh-runner.service';

const valid = () => ({
  projectId: 'project-1', host: '10.61.48.10', port: 22, username: 'hcf', password: 'transient-secret',
  codeDir: '/home/hcf/test-code', dataDir: '/home/hcf/nas_hcf_data/test-data/data',
  resultsDir: '/home/hcf/nas_hcf_data/test-data/results', documentDir: '/home/hcf/nas_hcf_data/test-data/documents',
  condaEnv: 'yolo26', experimentDocument: '# Camera anomaly experiment',
});

describe('ResearchSshRunner request and command', () => {
  it('rejects missing credentials and unsafe remote paths', () => {
    expect(() => validateSshExperimentRequest({ ...valid(), password: undefined, privateKey: undefined })).toThrow(BadRequestException);
    expect(() => validateSshExperimentRequest({ ...valid(), resultsDir: '../escape' })).toThrow(BadRequestException);
    expect(() => validateSshExperimentRequest({ ...valid(), codeDir: '/home/hcf/../escape' })).toThrow(BadRequestException);
  });

  it('builds GPU-idle selection, CPU fallback and conda execution without embedding credentials', () => {
    const command = buildRemoteCommand(validateSshExperimentRequest(valid()), '/tmp/results/run-1', '/tmp/docs/run-1');
    expect(command).toContain('memory.used,utilization.gpu');
    expect(command).toContain('$2+0 < 512 && $3+0 < 10');
    expect(command).toContain('COMPUTE="cpu"');
    expect(command).toContain("conda run -n 'yolo26' python");
    expect(command).toContain("'/home/hcf/test-code/run_navivisor_experiment.py'");
    expect(command).not.toContain('transient-secret');
  });
});
