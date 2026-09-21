# Local board DOM contract

The local demo renders one `.cell` element for every board coordinate under `#CellsBlock`. Every cell has an ID `cell_<x>_<y>` and decimal `data-x` / `data-y` attributes. `#CellsBlock[data-game-status]` is one of `ready`, `playing`, `won`, or `lost`.

A cell has exactly one state: `closed`, `opened`, or `closed flag`. Opened cells additionally have exactly one number class, `type0` through `type8`. Number classes are legal only with `opened`; `flag` is legal only with `closed`. Adapters read this rendered DOM only and never inspect page state.
