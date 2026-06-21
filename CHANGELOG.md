# Changelog

## [2.0.0] - Upcoming

ST-Hands-Free-Voice 2.0.0 is the first maintained stable release line for the extension. It keeps the original hands-free voice loop, but makes the experience safer, clearer, and more consistent inside SillyTavern.

### Added

- SillyTavern-style microphone button in the chatbar.
- Clear chatbar states for off, armed, listening/recording, and processing.
- Clear setup error messages for common blockers:
  - speech-to-text provider not configured
  - missing API key for providers that require one
  - missing or invalid local/custom endpoint
  - microphone permission denied
  - conflict with the official SillyTavern Speech Recognition extension
- Support for enabling Hands-Free Voice in a stale chat without manually replaying character TTS first.

### Changed

- No floating UI; controls now live in the chatbar and extension settings.
- The extension defaults to OFF after a SillyTavern reload.
- The extension switches OFF when changing characters.
- Cleaner handoff between character TTS and user STT.
- Safer microphone and audio cleanup.
- Improved reliability around the TTS/STT handoff.

### Fixed

- Fixed microphone activation desync in various situations.
- Fixed cases where the extension could listen while character TTS was still being read.
- Fixed cases where the extension could listen during message generation.
- Fixed cases where the extension could generate unintended extra messages.
- Fixed cases where every generating message could trigger listening again, causing repeated or fork-bomb-like generation behavior.
- Fixed cases where false activation could abort listening and cause generation spam.
- Fixed undefined behavior after SillyTavern reload or character switch.
- Fixed unclear active/listening state in the UI.

### Known Issues

- No known issues from current testing.

## [1.0.0] - Proof of Concept

The original proof-of-concept release established the core idea of ST-Hands-Free-Voice: a hands-free conversation loop that connects SillyTavern character TTS with user speech-to-text input.

### Added

- Initial hands-free voice flow for SillyTavern.
- Waiting for character TTS to finish before opening the microphone.
- Recording user speech through the browser microphone.
- Stopping recording after silence.
- Sending recorded audio to the configured speech-to-text provider.
- Sending or inserting the transcription as the user message.
- Support for continuing the conversation when the user pauses or does not speak.
- Basic provider and API configuration settings.

### Known Issues in v1

- Microphone activation could desync in various situations.
- The extension could listen while character TTS was still being read.
- The extension could listen during message generation.
- The extension could generate unintended extra messages.
- Every generating message could trigger listening again, causing repeated or fork-bomb-like generation behavior.
- False activation could abort listening and cause generation spam.
- Reloading SillyTavern or switching characters could leave the extension in an undefined state.
- The UI did not clearly communicate when the extension was active or listening.
