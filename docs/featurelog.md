Implemented the improvements in FFinflow, with E-AC3 → FLAC conversion preserved.
- Added a strictly typed pipeline that evaluates every audio/video track.
- Compatible video stays unchanged; stereo and surround channel counts are preserved.
- Fixed routing when both video and audio need conversion.
- Added validated caching, duplicate-job prevention, and explicit failure handling.
- Fixed original-file lookup for subtitles and resume positions.
- Updated the [README](C:/Users/admin/Documents/GitHub/ffinflow/readme.md).
Validation: compilation, strict pipeline checks, and all 16 tests passed. Real E-AC3 fixtures produced non-silent decoded audio. A generated 7680×4320 fixture retained its dimensions and identical compressed-video hash.
One behavior change: prepared files now use the application’s temporary cache instead of creating _FIXED.mp4 beside the source.