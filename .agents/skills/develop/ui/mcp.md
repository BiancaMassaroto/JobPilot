# UI Source: MCP

## Figma or design MCP source

Use this route when the spec or direct user answer says to pull the design from Figma or another connected design MCP.

Pull the real design into `./design.md`: components, token references, named frames, and any asset references. Keep token and spacing values in the styling or theme system, not in `design.md`; preserve the real values from the design source there as the single source of truth rather than inventing approximations. Record the source file and named frames used in the report so each reference has clear provenance.

No MCP connected: say so, ask the engineer to connect it or pick another source. Do not silently switch to generated design.

After writing `design.md`, show a short summary, confirm the key tokens/source, then continue to `ui/implementation.md`.
