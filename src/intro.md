
For writers of line debuggers and other debugging-related utilities.

---

![Solidity storage allocation example layout](storage.png)

| Author | Harry Altman [@haltman-at] |
| -----------:|:------------ |
| Published | 2018-12-26 - Boxing Day |
| Last revised | 2019-06-07 |
| Copyright | 2018-2019 Truffle Blockchain Group |
| License | <a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/88x31.png" /></a> |
| Document Source | [ethdebug/solidity-data-representation](https://github.com/ethdebug/solidity-data-representation) |


---

## Purpose of this document

The point of this document is to explain representation of data in Solidity for
the purposes of locating and decoding it; more specifically, for writing a line
debugger that does such.  As such, other information about the type system or
data layout that aren't necessary for that may be skipped; and where location
is not entirely predictable but may be determined by other
systems of the debugger, we may rely on that.  See the
[Solidity documentation](https://solidity.readthedocs.io/) for things not
covered here, particularly the
[section on types](https://solidity.readthedocs.io/en/v0.5.2/solidity-in-depth.html),
the [ABI specification](https://solidity.readthedocs.io/en/v0.5.2/abi-spec.html),
and the [miscellaneous section](https://solidity.readthedocs.io/en/v0.5.2/miscellaneous.html);
and perhaps also see the [Ethereum yellow paper](https://ethereum.github.io/yellowpaper/paper.pdf).

This document is also primarily only concerned with variables that a user might
define, not special language-defined variables which will typically not be
stored in any of these locations, and so for the most part we will not discuss
these, although we will [make an exception for the special variables `msg.data`
and `msg.sig`](#user-content-locations-in-detail-calldata-in-detail-calldata-multivalue-and-lookup-types-reference-types-the-special-variable-msg-data).

Finally this document is only concerned with variables as they exist in the
Solidity language, and not in the underlying implementation; thus we will say
things like "calldata cannot directly contain value types", simply because
Solidity will not allow one to declare a calldata variable of value type (the
original value in calldata will always be copied onto the stack before use).
Obviously the value still exists in calldata, but since no variable points
there, it's not our concern.

_**Note**: This document pertains to **Solidity v0.5.9**, current as of this
writing._
