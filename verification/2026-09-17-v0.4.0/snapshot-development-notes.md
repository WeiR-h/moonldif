# Browser validation failure retained

The first two local runs used http://127.0.0.1:4190/moonldif/. Chromium passed all workflows; Firefox rejected initial navigation. A separate navigation probe observed title "Blocked Page" and H1 "This address is restricted". Port 4190 is refused by Firefox before the application loads. No application assertion was weakened. Validation continues at the established CI preview port 4188, with the original runner. The two original failure JSON records are retained.

The initial core comparison test also assumed ordinary lexical String sort order. MoonBit String ordering is length-first in this toolchain; the fixed positional expectation was corrected after inspecting the actual deterministic report. Independent model comparison validates change sets without depending on ordering.
