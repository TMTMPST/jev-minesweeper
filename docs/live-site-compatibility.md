# Live-site compatibility limits

This disabled-by-default compatibility experiment supports only a user-started casual board at `https://minesweeper.online/`. It is not an anti-cheat bypass and does not play competitive modes. The CLI refuses account, Arena, Duel, Lobby, ranked, leaderboard, market, shop, payment, invoice, and event routes before creating a cell locator or sending input.

Observed public board contract: cells use `#cell_<x>_<y>` plus `data-x` and `data-y`; status classes are `closed`, `opened`, `flag`, and `type0` through `type8`. Interaction is pointer/context-menu based, and the site records synthetic untrusted events. DOM changes can break this experiment. It uses normal Playwright locator pointer actions only.
