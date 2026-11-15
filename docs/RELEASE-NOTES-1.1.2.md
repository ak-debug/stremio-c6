# Stremio AK 1.1.2 — on-screen playback statistics

Adds a visible **Stats** button beside subtitles/audio/playback speed in the player controls. Press OK during playback to show the controls, then select Stats. Select Stats again or press Back to close the panel. The optional remote Info key remains supported; an Info key is not required.

The pinned frontend's normal focus/navigation component renders the button. The panel appears at the top right, stays separate from loading telemetry, stops polling when closed, and closes on leaving playback. It does not change the selected stream, playback position, pause state or selected backend.

Validated on OLED55C6PLA with an owner-selected working 3840×2160 stream. Opening and closing with Back left the route and media source unchanged; playback advanced and remained unpaused. Nine automated backend tests, bundle syntax checks, pinned patch application and IPK timestamps passed.

During an earlier update-restoration attempt, a saved pre-update route did not reliably restore the working source and the player reported an error. The owner selected a working source, that stream was then left untouched, and the temporary maintenance checkpoint was removed. This update does not claim new automatic exact-source resume behavior.

Separate playback inspection before the update confirmed 3840×2160 native/direct HEVC playback and no decoder error; the owner confirmed the LG Picture menu was in HDR mode. This is evidence for that stream, not Dolby Vision certification or source/mastering verification. Detailed pipeline HDR access was denied by the TV; frame-drop counters did not provide usable measurements.

Unofficial fork; the [licensing and redistribution review](RELEASE-READINESS.md) still applies to public binary publication.
