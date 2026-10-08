"""
Tests for the PDF validation in core_pack.py.

Run with `python research-tools/core-literature/test_core_pack.py`.
Uses only the standard library so it needs no test runner installed.
"""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from core_pack import (  # noqa: E402
    MIN_PDF_BYTES,
    is_terminal,
    validate_pdf_bytes,
    valid_pdf,
)


def make_pdf(body=b"/Type /Catalog\n1 0 obj\n", tail=b"\n%%EOF\n", header=b"%PDF-1.4\n"):
    filler = b"x" * max(0, MIN_PDF_BYTES + 64 - len(header) - len(body) - len(tail))
    return header + body + filler + tail


class ValidatePdfBytesTest(unittest.TestCase):
    def test_accepts_a_well_formed_pdf(self):
        self.assertIsNone(validate_pdf_bytes(make_pdf()))

    def test_rejects_a_wrong_header(self):
        self.assertEqual(
            validate_pdf_bytes(make_pdf(header=b"<html>\n")), "invalid_pdf_header"
        )

    def test_rejects_the_five_byte_file_the_old_check_accepted(self):
        # The previous check read only five bytes, so this passed.
        self.assertEqual(validate_pdf_bytes(b"%PDF-"), "pdf_too_small")

    def test_rejects_an_error_page_that_claims_to_be_a_pdf(self):
        page = b"%PDF-" + b"Service Unavailable" * 200
        self.assertIn(validate_pdf_bytes(page), {"pdf_too_small", "pdf_truncated", "pdf_no_structure"})

    def test_rejects_a_truncated_pdf(self):
        truncated = make_pdf(tail=b"\n")
        self.assertEqual(validate_pdf_bytes(truncated), "pdf_truncated")

    def test_accepts_a_pdf_with_metadata_appended_after_the_eof_marker(self):
        # Some writers append data after %%EOF, so the marker is not last.
        self.assertIsNone(validate_pdf_bytes(make_pdf() + b"\ntrailing metadata\n"))

    def test_rejects_bytes_with_no_pdf_structure(self):
        stub = b"%PDF-1.4\n" + (b"y" * 4096) + b"\n%%EOF\n"
        self.assertEqual(validate_pdf_bytes(stub), "pdf_no_structure")

    def test_accepts_an_xref_stream_pdf_that_has_no_plain_trailer(self):
        # PDF 1.5+ may use a cross-reference stream; /Type is still present.
        body = b"/Type /XRef\n/W [1 2 1]\n"
        self.assertIsNone(validate_pdf_bytes(make_pdf(body=body, tail=b"\n%%EOF\n")))

    def test_rejects_empty_input(self):
        self.assertEqual(validate_pdf_bytes(b""), "invalid_pdf_header")


class ValidPdfTest(unittest.TestCase):
    def test_accepts_a_good_file_on_disk(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "good.pdf"
            path.write_bytes(make_pdf())
            self.assertTrue(valid_pdf(path))

    def test_rejects_a_corrupt_file_on_disk_so_it_is_redownloaded(self):
        # A stub left by an interrupted run must not count as "already have it".
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "stub.pdf"
            path.write_bytes(b"%PDF-")
            self.assertFalse(valid_pdf(path))

    def test_returns_false_for_a_missing_file(self):
        self.assertFalse(valid_pdf(Path("/nonexistent/does-not-exist.pdf")))


class TerminalStatusTest(unittest.TestCase):
    def test_treats_every_new_pdf_failure_as_terminal(self):
        # Retrying the same URL cannot fix bytes the server sent.
        for status in ("invalid_pdf_header", "pdf_too_small", "pdf_truncated", "pdf_no_structure"):
            self.assertTrue(is_terminal(status), status)


if __name__ == "__main__":
    unittest.main()
