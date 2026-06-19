# CLI demo for unseal — Charmbracelet VHS.
# Install: brew install vhs   (or: go install github.com/charmbracelet/vhs@latest)
# Render:  npm run capture     ->  assets/demo.gif
#
# Deterministic: the sample PDF is built by scripts/make-sample.mjs (no timestamps
# or network), so the GIF is reproducible. The `unseal` alias points at the real
# CLI via scripts/demo-run.sh (which only filters pdfjs's stdout chatter).

Output assets/demo.gif

Set FontSize 20
Set Width 1280
Set Height 760
Set Padding 28
Set Theme "Catppuccin Mocha"
Set TypingSpeed 45ms

# Quiet, readable prompt + an `unseal` alias for the recording.
Hide
Type "export PS1='$ ' && alias unseal='bash scripts/demo-run.sh' && clear"
Enter
Show

Sleep 800ms

# A document where someone drew a black box over a Social Security number.
Type "unseal audit secret.pdf"
Enter
Sleep 2.5s

# The text was never removed — unseal recovers it from under the box.
Type "unseal strip secret.pdf --output clean.pdf"
Enter
Sleep 3s

Hide
Type "rm -f clean.pdf"
Enter
Type "clear"
Show
Sleep 600ms
