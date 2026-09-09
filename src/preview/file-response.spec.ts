import { guessMimeType, parseRangeHeader } from './file-response';

describe('preview file response helpers', () => {
  it('parses bounded, open-ended, and suffix byte ranges', () => {
    expect(parseRangeHeader('bytes=0-255', 1000)).toEqual({
      start: 0,
      end: 255,
    });
    expect(parseRangeHeader('bytes=500-', 1000)).toEqual({
      start: 500,
      end: 999,
    });
    expect(parseRangeHeader('bytes=-100', 1000)).toEqual({
      start: 900,
      end: 999,
    });
  });

  it('rejects invalid or unsatisfiable ranges', () => {
    expect(parseRangeHeader('items=0-1', 1000)).toBe('invalid');
    expect(parseRangeHeader('bytes=1000-1001', 1000)).toBe('invalid');
    expect(parseRangeHeader('bytes=10-9', 1000)).toBe('invalid');
  });

  it('detects compound archive MIME types', () => {
    expect(guessMimeType('project.tar.gz')).toBe('application/gzip');
    expect(guessMimeType('project.tar.xz')).toBe('application/x-xz');
    expect(guessMimeType('slides.pptx')).toBe(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
  });
});
