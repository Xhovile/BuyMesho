import assert from "node:assert/strict";
import test from "node:test";
import {
  REVIEW_MEDIA_MAX_COUNT,
  REVIEW_MEDIA_MAX_FILE_SIZE,
  validateReviewMediaFiles,
} from "../../lib/reviewMedia.js";

test("review media accepts up to three images", () => {
  assert.equal(
    validateReviewMediaFiles([
      { mimetype: "image/jpeg", size: 1_000 },
      { mimetype: "image/png", size: 1_000 },
      { mimetype: "image/webp", size: 1_000 },
    ]),
    null,
  );
  assert.equal(REVIEW_MEDIA_MAX_COUNT, 3);
});

test("review media accepts one video plus two images", () => {
  assert.equal(
    validateReviewMediaFiles([
      { mimetype: "video/mp4", size: 1_000 },
      { mimetype: "image/jpeg", size: 1_000 },
      { mimetype: "image/png", size: 1_000 },
    ]),
    null,
  );
});

test("review media rejects more than three files", () => {
  assert.equal(
    validateReviewMediaFiles([
      { mimetype: "image/jpeg", size: 1_000 },
      { mimetype: "image/jpeg", size: 1_000 },
      { mimetype: "image/jpeg", size: 1_000 },
      { mimetype: "image/jpeg", size: 1_000 },
    ]),
    "A review can contain up to 3 media files.",
  );
});

test("review media rejects more than one video", () => {
  assert.equal(
    validateReviewMediaFiles([
      { mimetype: "video/mp4", size: 1_000 },
      { mimetype: "video/webm", size: 1_000 },
    ]),
    "A review can contain only 1 video.",
  );
});

test("review media rejects SVG and oversized files", () => {
  assert.equal(
    validateReviewMediaFiles([{ mimetype: "image/svg+xml", size: 1_000 }]),
    "Reviews support image and video files only.",
  );
  assert.equal(
    validateReviewMediaFiles([{ mimetype: "image/jpeg", size: REVIEW_MEDIA_MAX_FILE_SIZE + 1 }]),
    "Each review media file must be 10 MB or smaller.",
  );
});
