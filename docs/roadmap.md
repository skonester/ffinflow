# Development Roadmap & Safety Matrix

## 1. Long-Term Strategic Roadmap (12-24 Months)

### Phase 1: Infrastructure Hardening (Months 1-3)
- Implement strict dependency pinning (FFmpeg version locking) to prevent runtime regressions.
- Refactor logging subsystem to produce structured JSON output for easier pipeline integration.
- Add comprehensive CI validation for all supported platforms (Windows, macOS, Linux).

### Phase 2: Performance & Scalability (Months 4-9)
- Optimize memory usage during high-throughput batch processing; introduce lazy loading for large metadata sets.
- Introduce parallel pipeline execution for independent filter chains.
- Benchmark transcoding throughput across common codecs (H.264, H.265, AAC, Opus).

### Phase 3: Extensibility & Ecosystem (Months 10-18)
- Define and implement a plugin architecture allowing external modules to inject custom filters or IO handlers.
- Build a lightweight GUI shell wrapping the CLI/API for interactive use cases.
- Create RESTful API endpoint exposing stream status and control functions.

### Phase 4: Advanced Features (Months 19-24)
- Enhance metadata handling with deep embedding extraction and automatic tagging.
- Implement live streaming protocols (RTSP ingest, HLS output) with adaptive bitrate logic.
- Add machine-learning-assisted filter parameter tuning for quality/performance trade-offs.

---

## 2. Technical Debt & Improvement Vectors

| Priority | Area | Description | Effort | Impact |
|----------|------|-------------|--------|--------|
| 🔴 High | Dependency Management | Lack of version pinning for FFmpeg and Python libs risks breakage across environments. | Low | Very High |
| 🟠 Medium | Logging System | Current logs are unstructured text; difficult to parse programmatically. | Medium | High |
| 🟠 Medium | Memory Efficiency | Batch processing loads entire files into RAM; not scalable for multi-hour streams. | High | High |
| 🟢 Low | Test Coverage | Missing unit/integration tests for edge cases in filter graphs and error paths. | Medium | Medium |
| 🟢 Low | Documentation | Architecture doc is solid; missing detailed API reference and migration guides. | Low | Medium |

---

## 3. Codebase Safety Matrix

### 🟢 Green Zone (Safe to Change)
- **Utility Modules**: Helper functions for path normalization, CLI argument parsing, generic I/O wrappers.
- **Experimental Filters**: Any plugin stubs or prototype filter implementations not yet in mainline.
- **Configuration Profiles**: Preset definitions and environment variable mappings.
- **Logging Infrastructure**: Adding structured output, log rotation, and level tuning.

### 🟡 Yellow Zone (Handle with Care)
- **Core Transcoding Pipeline**: Filter graph construction and execution logic; changes risk breaking video/audio sync.
- **Stream Protocols**: RTSP, RTMP, HLS handlers; tightly coupled to FFmpeg internal APIs.
- **Metadata Extraction**: Parsing logic for embedded subtitles and tags; fragile against format variations.
- **Batch Scheduler**: Job queue and concurrency control; modifications may affect throughput guarantees.

### 🔴 Red Zone (Do Not Touch / Avoid)
- **FFmpeg Binary Wrapper**: Direct calls to native FFmpeg binaries; platform-specific and brittle.
- **Legacy Input Validation**: Old regex-based checks in file handlers; likely incomplete and hard to test.
- **Core CLI Interface**: Main entry point scripts; changes propagate to all user-facing commands.
- **Hardcoded Presets**: Embedded codec/quality defaults; risk of silent quality degradation.

---

**Summary**: The architecture supports a modular, extensible evolution path. Prioritize infrastructure hardening and logging first, then performance, followed by plugin architecture. Treat the core pipeline and FFmpeg wrapper as red zones; keep all refactoring within green/yellow boundaries unless absolutely necessary.