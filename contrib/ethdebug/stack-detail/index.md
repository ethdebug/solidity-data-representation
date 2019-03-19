# Data Representation in Solidity

For writers of line debuggers and other debugging-related utilities.

---

![Solidity storage allocation example layout](storage.png)

| Author | Harry Altman [@haltman-at] |
| -----------:|:------------ |
| Published | 2018-12-26 - Boxing Day |
| Last revised | 2019-3-18 |
| Copyright | 2018-2019 Truffle |
| License | <a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/88x31.png" /></a> |
| Document Source | [ethdebug/solidity-data-representation](https://github.com/ethdebug/solidity-data-representation) |


---

<a name="user-content-purpose-of-this-document"></a>
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

_**Note**: This document pertains to **Solidity v0.5.6**, current as of this
writing._


<a name="user-content-contents"></a>
## Contents
* [Purpose of this document](#user-content-purpose-of-this-document)
* [Contents](#user-content-contents)
* [Locations: Basics](#user-content-locations-basics)
* [Types Overview](#user-content-types-overview)
    * [Terminology](#user-content-types-overview-terminology)
    * [Types and locations](#user-content-types-overview-types-and-locations)
        * [Table of types and locations](#user-content-types-overview-types-and-locations-table-of-types-and-locations)
    * [Overview of the types: Direct types](#user-content-types-overview-overview-of-the-types-direct-types)
        * [Basics of direct types: Packing and padding](#user-content-types-overview-overview-of-the-types-direct-types-basics-of-direct-types-packing-and-padding)
        * [Table of direct types](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types)
        * [Representations of direct types](#user-content-types-overview-overview-of-the-types-direct-types-representations-of-direct-types)
        * [Presently unstoreable functions](#user-content-types-overview-overview-of-the-types-direct-types-presently-unstoreable-functions)
    * [Overview of the types: Multivalue types](#user-content-types-overview-overview-of-the-types-multivalue-types)
    * [Overview of the types: Lookup types](#user-content-types-overview-overview-of-the-types-lookup-types)
        * [Table of lookup types](#user-content-types-overview-overview-of-the-types-lookup-types-table-of-lookup-types)
    * [Overview of the types: Pointer types](#user-content-types-overview-overview-of-the-types-pointer-types)
        * [Table of pointer types](#user-content-types-overview-overview-of-the-types-pointer-types-table-of-pointer-types)
* [Locations in Detail](#user-content-locations-in-detail)
    * [The stack in detail](#user-content-locations-in-detail-the-stack-in-detail)
        * [The stack: Direct types and pointer types](#user-content-locations-in-detail-the-stack-in-detail-the-stack-direct-types-and-pointer-types)
        * [The stack: data layout](#user-content-locations-in-detail-the-stack-in-detail-the-stack-data-layout)
    * [Memory in detail](#user-content-locations-in-detail-memory-in-detail)
        * [Memory: Direct types and pointer types](#user-content-locations-in-detail-memory-in-detail-memory-direct-types-and-pointer-types)
        * [Memory: Multivalue types](#user-content-locations-in-detail-memory-in-detail-memory-multivalue-types)
        * [Memory: Lookup types](#user-content-locations-in-detail-memory-in-detail-memory-lookup-types)
        * [Pointers to memory](#user-content-locations-in-detail-memory-in-detail-pointers-to-memory)
    * [Calldata in detail](#user-content-locations-in-detail-calldata-in-detail)
        * [Slots in calldata and the offset](#user-content-locations-in-detail-calldata-in-detail-slots-in-calldata-and-the-offset)
        * [Calldata: Direct types and pointer types](#user-content-locations-in-detail-calldata-in-detail-calldata-direct-types-and-pointer-types)
        * [Calldata: Multivalue and lookup types (reference types)](#user-content-locations-in-detail-calldata-in-detail-calldata-multivalue-and-lookup-types-reference-types)
            * [The special variable `msg.data`](#user-content-locations-in-detail-calldata-in-detail-calldata-multivalue-and-lookup-types-reference-types-the-special-variable-msg-data)
        * [Pointers to calldata](#user-content-locations-in-detail-calldata-in-detail-pointers-to-calldata)
        * [Pointers to calldata from calldata](#user-content-locations-in-detail-calldata-in-detail-pointers-to-calldata-from-calldata)
        * [Pointers to calldata from the stack](#user-content-locations-in-detail-calldata-in-detail-pointers-to-calldata-from-the-stack)
    * [Storage in detail](#user-content-locations-in-detail-storage-in-detail)
        * [Storage: Data layout](#user-content-locations-in-detail-storage-in-detail-storage-data-layout)
        * [Storage: Direct types](#user-content-locations-in-detail-storage-in-detail-storage-direct-types)
        * [Storage: Multivalue types](#user-content-locations-in-detail-storage-in-detail-storage-multivalue-types)
        * [Storage: Lookup types](#user-content-locations-in-detail-storage-in-detail-storage-lookup-types)
        * [Pointers to storage](#user-content-locations-in-detail-storage-in-detail-pointers-to-storage)


<a name="user-content-locations-basics"></a>
## Locations: Basics
<sup>[ [&and;](#user-content-contents) _Back to contents_ ]</sup>

The EVM has a number of locations where data can be stored.  We will be
concerned with four of them: The stack, storage, memory, and calldata.  (We will
also be incidentally concerned with code, but we will mostly ignore it.  We will
ignore returndata entirely.  There are also some other "special locations" that
I will mention briefly in the calldata section but will mostly ignore.)

The stack and storage are made of words ("slots"), while memory and calldata are
made of bytes; however, we will basically ignore this distinction.  We will, for
the stack and storage, conventionally consider the large end of each word to be
the earlier (left) end; and, for the other locations, conventionally consider
the location as divided up into words ("slots") of 32 bytes, with the earlier
end of each word being the large end.  Or, in other words, everything is
big-endian (or construed as big-endian) unless stated otherwise.  With this
convention, we can ignore the distinction between the slot-based locations and
the byte-based locations.  (My apologies in advance for the abuse of terminology
that results from this, but I think using this convention here saves more
trouble than it causes.)

(For calldata, we will actually use a slightly different convention, as
[detailed later](#user-content-locations-in-detail-calldata-in-detail-slots-in-calldata-and-the-offset),
but you can ignore that for now.  We will also occasionally use a different
convention in memory, as [also detailed later](#user-content-locations-in-detail-memory-in-detail), but you can again ignore that
for now.)

Memory and calldata will always be accessed through pointers to such; as such,
we will only discuss concrete data layout for storage and for the stack, as
those are the only locations we'll access without a pointer (but for the stack
we'll mostly rely on the debugger having other ways of determining location).


<a name="user-content-types-overview"></a>
## Types Overview
<sup>[ [&and;](#user-content-contents) _Back to contents_ ]</sup>

* [Terminology](#user-content-types-overview-terminology)
* [Types and locations](#user-content-types-overview-types-and-locations)
    * [Table of types and locations](#user-content-types-overview-types-and-locations-table-of-types-and-locations)
* [Overview of the types: Direct types](#user-content-types-overview-overview-of-the-types-direct-types)
    * [Basics of direct types: Packing and padding](#user-content-types-overview-overview-of-the-types-direct-types-basics-of-direct-types-packing-and-padding)
    * [Table of direct types](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types)
    * [Representations of direct types](#user-content-types-overview-overview-of-the-types-direct-types-representations-of-direct-types)
    * [Presently unstoreable functions](#user-content-types-overview-overview-of-the-types-direct-types-presently-unstoreable-functions)
* [Overview of the types: Multivalue types](#user-content-types-overview-overview-of-the-types-multivalue-types)
* [Overview of the types: Lookup types](#user-content-types-overview-overview-of-the-types-lookup-types)
    * [Table of lookup types](#user-content-types-overview-overview-of-the-types-lookup-types-table-of-lookup-types)
* [Overview of the types: Pointer types](#user-content-types-overview-overview-of-the-types-pointer-types)
    * [Table of pointer types](#user-content-types-overview-overview-of-the-types-pointer-types-table-of-pointer-types)

<a name="user-content-types-overview-terminology"></a>
### Terminology
<sup>[ [&and;](#user-content-types-overview) _Back to Types Overview_ ]</sup>

There are a number of ways of dividing up the types into classes.  The system
I'll use here is my own, based on what I think is useful here.

A variable of *direct type* can, for our purposes, be considered as a value by itself.

A variable of *multivalue type* holds a fixed number of other element variables,
stored consecutively.

A variable of *lookup type* holds a number of other element variables not fixed in
advance.

A variable of *pointer type* holds a reference to another multivalue or lookup
variable to be found elsewhere.  They never point to variables of direct type or
other variables of pointer type.  (Note that pointers are not, in Solidity, an
actual type separate from that of what they point to, but they're useful to
consider as a separate type here.)

This will be our fourfold division of types.  Some other type terminology, as
defined by the language, is useful:

*Value types* are certain specific direct types; see the [table of direct
types](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types) for a list of which ones.

The term *reference types* refers collectively to multivalue and lookup types.

A *static type* is either
1. A direct type, or
2. A multivalue type, all of whose element variables are also of static type.

A *dynamic type* is any type that is not static.  (Pointers don't fit into this
dichotomy, not being an actual Solidity type.)

Then there are the *elementary types*, which are relevant to mappings.  See the
[section on lookup types](#user-content-types-overview-overview-of-the-types-lookup-types) for more on
these.

(*Warning*: The Solidity documentation uses the term "elementary type" in
several conflicting ways.  Here, it will always refer to a type that can be used
as the key for a mapping, and not any of the other meanings.)

Finally, to avoid confusion with other meanings of the word "value", I'm going
to speak of "keys and elements" rather than "keys and values"; I'm going to
consistently speak of "elements" rather than "values" or "children" or
"members".

<a name="user-content-types-overview-types-and-locations"></a>
### Types and locations
<sup>[ [&and;](#user-content-types-overview) _Back to Types Overview_ ]</sup>

What types can go in what locations?

The stack can hold only direct types and pointer types.

Directly pointed-to variables living in memory or calldata can only be of
reference type, although their elements, also living in memory or calldata, can
of course also be of direct or pointer type.

Some types are not allowed in calldata, especially if `ABIEncoderV2` is not
being used; but we will assume it is.  Note, though, that circular types are never
allowed in calldata.

In addition, the locations memory and calldata may not hold mappings, which may
go only in storage.  (However, structs that *contain* mappings can go in memory,
though the mappings will be omitted; see [the section on
memory](#user-content-locations-in-detail-memory-in-detail-memory-lookup-types) for more detail.)

Storage does not hold pointer types as there is never any reason for it to do
so.

While this is not a type-level concern, it is likely worth noting here that
memory (and no other location) can contain circular structs.  Storage can also
contain structs of circular type, but not actual circular structs.

Note that reference types, in Solidity, include the location as part of the type
(with the exception of mappings as it would be unnecessary there); however we
will ignore this from here on out, since if we are talking about a particular
location then obviously we are talking only about types that go in that
location.

The rest of this section will give a brief overview of the various types.
However, one should see the appropriate location sections for more information.
Still, here is a summary table one may use (this also covers some things not
mentioned above):

<a name="user-content-types-overview-types-and-locations-table-of-types-and-locations"></a>
#### Table of types and locations

| Location | Direct types                                       | Multivalue types                     | Lookup types            | Mappings in structs are... | Pointer types                                 |
|----------|----------------------------------------------------|--------------------------------------|-------------------------|----------------------------|-----------------------------------------------|
| Stack    | Yes                                                | No (only as pointers)                | No (only as pointers)   | N/A                        | To storage, memory, or calldata               |
| Storage  | Yes                                                | Yes                                  | Yes                     | Legal                      | No                                            |
| Memory   | Only as elements of other types                    | Yes                                  | Yes, excluding mappings | Omitted                    | To memory (only as elements of other types)   |
| Calldata | Only as elements of other types, with restrictions | Yes, excluding circular struct types | Yes, excluding mappings | Illegal                    | To calldata (only as elements of other types) |

Note that with the exception of the special case of mappings in structs, it is
otherwise true that if the type of some element of some given type is illegal
in that location, then so is the type as a whole.

<a name="user-content-types-overview-overview-of-the-types-direct-types"></a>
### Overview of the types: Direct types
<sup>[ [&and;](#user-content-types-overview) _Back to Types Overview_ ]</sup>

<a name="user-content-types-overview-overview-of-the-types-direct-types-basics-of-direct-types-packing-and-padding"></a>
#### Basics of direct types: Packing and padding

With regard to direct types, storage is a packed location -- multiple variables
of direct type may share a storage slot, within which each variable only takes
up as much space as it need to; see the table below for information on sizes.
(Note that variables of direct type may not cross word boundaries.)

The stack, memory, and calldata, however, are padded locations -- each variable
of direct type always takes up a full slot.  (There are two exceptions to this
-- the individual `byte`s in a `bytes` or `string` are packed rather than
padded; and external functions take up *two* slots on the stack.  Both these
will be described in more detail later ([1](#user-content-locations-in-detail-memory-in-detail-memory-lookup-types),
[2](#user-content-locations-in-detail-the-stack-in-detail)).)  The exact method of padding varies by type,
as detailed in [the table below](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types).

(Again, note that for calldata we are using a somewhat unusual notion of slot;
[see the calldata section](#user-content-locations-in-detail-calldata-in-detail-slots-in-calldata-and-the-offset) for more
information.)

<a name="user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types"></a>
#### Table of direct types

Here is a table of all the (general classes of) direct types and their key
properties.  Some of this information may not yet make sense if you have only
read up to this point.  See the [next section](#user-content-types-overview-overview-of-the-types-direct-types-representations-of-direct-types)
for more detail on how these types are actually represented.

| Type                | Size in storage (bytes)                     | Padding in padded locations             | Default value                             | Is value type? | Is elementary type? | Allowed in calldata? |
|---------------------|---------------------------------------------|-----------------------------------------|-------------------------------------------|----------------|---------------------|----------------------|
| `bool`              | 1                                           | Zero-padded, left                       | `false`                                   | Yes            | Yes                 | Yes                  |
| `uintN`             | N/8                                         | Zero-padded, left                       | 0                                         | Yes            | Yes                 | Yes                  |
| `intN`              | N/8                                         | Sign-padded, left                       | 0                                         | Yes            | Yes                 | Yes                  |
| `address [payable]` | 20                                          | Zero-padded, left                       | Zero address (not valid!)                 | Yes            | Yes                 | Yes                  |
| `contract` types    | 20                                          | Zero-padded, left                       | Zero address (not valid!)                 | No             | No                  | Yes                  |
| `bytesN`            | N                                           | Zero-padded, right                      | All zeroes                                | Yes            | Yes                 | Yes                  |
| `enum` types        | As many as needed to hold all possibilities | Zero-padded, left                       | Whichever possibility is represented by 0 | Yes            | No                  | Yes                  |
| `function internal` | 8                                           | Zero-padded, left                       | Depends on location, but always invalid   | No             | No                  | No                   |
| `function external` | 24                                          | Zero-padded, right, except on the stack | Zero address, zero selector (not valid!)  | No             | No                  | Yes                  |
| `ufixedMxN`         | M/8                                         | Zero-padded, left                       | 0                                         | Yes            | Yes                 | Yes                  |
| `fixedMxN`          | M/8                                         | Sign-padded, left                       | 0                                         | Yes            | Yes                 | Yes                  |

Some remarks:

1. As the table states, external functions act a bit oddly on the stack; see the
   [section on the stack](#user-content-locations-in-detail-the-stack-in-detail-the-stack-direct-types-and-pointer-types)
   for details.
2. The `ufixedMxN` and `fixedMxN` types are not implemented yet.  Their listed
   properies are largely inferred based on what we can expect.
3. Some direct types have aliases; these have not been listed in the above table.
   `uint` and `int` are aliases for `uint256` and `int256`; `ufixed` and `fixed`
   for `ufixed128x18` and `fixed128x18`; and `byte` for `bytes1`.
4. Each direct type's default value is simply whatever value is represented by
   a string of all zero bytes, with the one exception of internal functions in
   locations other than storage.  In non-storage locations, the default value for
   an internal function variable is a special function which throws an
   `assert`-style exception (i.e. it reverts the transaction and consumes all
   available gas).  This special function has the bytecode `0x5bfe` (a `JUMPDEST`
   followed by an `INVALID`), but will only be included in the contract if
   Solidity deems it necessary.  In storage, the default value for an internal
   function is  `0`, which if called has the same effect, because the
   instruction at address `0` will never be a `JUMPDEST`.
5. The `N` in `uintN` and `intN` must be a multiple of 8, from 8 to 256.  The
   `M` in `ufixedMxN` and `fixedMxN` must be a multiple of 8, from 8 to 256,
   while `N` must be from 0 to 80.  The `N` in `bytesN` must be from 1 to 32.
6. Function types are, of course, more complex than just their division into
   `internal` and `external`; they also have input parameter types, output
   parameter types, and mutability modifiers (`pure`, `view`, `payable`).
   However, these will not concern us here, and we will ignore them.

<a name="user-content-types-overview-overview-of-the-types-direct-types-representations-of-direct-types"></a>
#### Representations of direct types

`uintN` is an `N`-bit binary number (big-endian).  The signed variant `intN`
uses 2's-complement.

`bytesN` is simply a string of `N` bytes.

Booleans are represented by `0` for `false` and `1` for true; they act like
`uint8`, just restricted to `0` and `1`.

Addresses just act like `uint160`.  Contracts are represented by their underying
addresses.

Enums are represented by integers; the possibility listed first by `0`, the next
by `1`, and so forth.  An enum type just acts like `uintN`, where `N` is the
smallest legal value large enough to accomodate all the possibilities.

Internal functions are represented by the code address (in bytes from the
beginning of code) of the beginning of said function (specifically, the
`JUMPDEST` instruction that begins it).

External functions are represented by a 20-byte address and a 4-byte selector;
in locations other than the stack, this consists of first the 20-byte address
and then the 4-byte selector.  On the stack, however, it is more complicated.
See the [section on the stack](#user-content-locations-in-detail-the-stack-in-detail-the-stack-direct-types-and-pointer-types) for details.

`ufixedMxN` and `fixedMxN` are interpreted as follows: If interpreting as a
(`M`-bit, big-endian) binary number (unsigned or signed as appropriate) would
yield `k`, the result is interpreted as the rational number `k/10**N`.

<a name="user-content-types-overview-overview-of-the-types-direct-types-presently-unstoreable-functions"></a>
#### Presently unstoreable functions

Some legal values of function type presently have no representation and so
cannot be stored in a variable.  These are:

1.  External functions with a specified amount of `gas` or `value` attached
    (even if that amount is zero).
2.  External functions of libraries -- including library functions declared
    `public` when not in that library -- because there is presently no way
    to represent that they should be called with `DELEGATECALL`; and functions
    created by `using ... for ...` directives.
3.  Special functions defined by the language.  This means globally available
    functions; functions which are members of arrays; functions which are
    members of addresses; and functions which are members of external functions.

So, the question of how these are presently represented when stored, is that
they are not.  (There are other presently unstoreable functions, too, but since
their unstorability is due to other issues, we will not discuss them here.)

<a name="user-content-types-overview-overview-of-the-types-multivalue-types"></a>
### Overview of the types: Multivalue types
<sup>[ [&and;](#user-content-types-overview) _Back to Types Overview_ ]</sup>

The multivalue types are `type[n]` (here `n` must be positive), which has `n`
elements of type `type`; and the various user-defined `struct` types, whose
multiple element variables (of which there must be at least one) are as
specified in the appropriate `struct` definition, and occur in the order
specified there.

Note that it is legal to include a `mapping` type as an element of a `struct`
type; this does *not* preclude the `struct` type from being used in memory (even
though, as per the following section, mappings cannot appear in memory), but
rather, the mapping is simply omitted in memory.  See the [memory
section](#user-content-locations-in-detail-memory-in-detail-memory-lookup-types) for more details.  Such a struct is barred from
appearing in calldata, however.

Also note that circular struct types are allowed, so long as the circularity is
mediated by a lookup type.  That is to say, if a struct type `T0` has a element
type `T1` which has a element type ... which has a element type `Tn` with `Tn`
equal to T0, this is legal only if at least one of the types `Ti` is a lookup
type.  However, such types are allowed only in storage and memory, not
calldata.

The default value for a multivalue type consists of assigning the default value
to each of its element variables.

(There's no table for this section as there would be little point.)

<a name="user-content-types-overview-overview-of-the-types-lookup-types"></a>
### Overview of the types: Lookup types
<sup>[ [&and;](#user-content-types-overview) _Back to Types Overview_ ]</sup>

The lookup types are `type[]`; `mapping(keyType => elementType)`; `bytes`; and
`string`.

Dynamic arrays, `type[]`, have an indefinite number of elements of type `type`.
Mappings, `mapping(keyType => elementType`, have an indefinite number of
elements of type `elementType`.  Bytestrings, `bytes`, have an indefinite number
of elements of type `byte`.

The type `string` is something of a special case; strings are UTF-8 encoded to
form a string of bytes, and then that string of bytes is stored exactly as if it
were a `bytes`.  For this reason, we will basically ignore the type `string`
from here on out; it basically acts exactly like `bytes`, except that one cannot
meaningfully speak of its elements.

As mentioned above, mappings can go only in storage (but [see previous
section](#user-content-types-overview-overview-of-the-types-multivalue-types) about mappings in structs).
The key type for a mapping must be an elementary type, which means either:

1. A value type other than an `enum` type, or
2. One of `string` or `bytes`.

Observe that elementary types may all be meaningfully converted to a string of
bytes.  Also, as an alternative to the above definition, one may see the
appropriate tables to see which [direct](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types) or
[lookup](#user-content-types-overview-overview-of-the-types-lookup-types-table-of-lookup-types) types are elementary.

The default value for a lookup type is for it to be empty.  For the particular
case of a `type[]` in memory, the default value once it has been initialized to
a particular size is for all its elements to have their default value.

The information above is also summarized in the following table.

<a name="user-content-types-overview-overview-of-the-types-lookup-types-table-of-lookup-types"></a>
#### Table of lookup types

| Type                              | Element type                                    | Restricted to storage? | Is elementary? |
|-----------------------------------|-------------------------------------------------|------------------------|----------------|
| `type[]`                          | `type`                                          | No                     | No             |
| `mapping(keyType => elementType)` | `elementType`                                   | Yes                    | No             |
| `bytes`                           | `byte` (`bytes1`)                               | No                     | Yes            |
| `string`                          | N/A, but underlying `bytes` has `byte` elements | No                     | Yes            |

Note that mappings have other special features -- e.g., they cannot be copied or
deleted -- but we will not go into that here.

<a name="user-content-types-overview-overview-of-the-types-pointer-types"></a>
### Overview of the types: Pointer types
<sup>[ [&and;](#user-content-types-overview) _Back to Types Overview_ ]</sup>

Pointers usually take up a single word, although some take up two words. See the
appropriate location section for information on pointers to that location
([1](#user-content-locations-in-detail-memory-in-detail-pointers-to-memory),
[2](#user-content-locations-in-detail-calldata-in-detail-pointers-to-calldata),
[3](#user-content-locations-in-detail-storage-in-detail-pointers-to-storage)), but you may find a
[summarizing table](#user-content-types-overview-overview-of-the-types-pointer-types-table-of-pointer-types) below.

Again, remember that pointers are not, in Solidity, an actual type separate from
that of what they point to, but we're considering them here separately all the
same.

Pointers always either point from the stack to somewhere else, or from one
location to somewhere else in that same location.  Pointers never go between
different non-stack locations.

The default value for a memory pointer to a variable of lookup type is `0x60`,
the null pointer; see the [section on memory pointers](#user-content-locations-in-detail-memory-in-detail-pointers-to-memory) for
more information.  Attempting to delete a memory pointer to a variable of
multivalue type instead allocates a new instance of that type, of its default
value, and sets the pointer to point at this, so memory pointers to variables of
multivalue type have no fixed default value.

The default value for a storage pointer is a pointer to the `0` slot -- beware,
making use of such a pointer *can* lead to nonsense!  Don't do this!  (Note that
while it is legal to leave a storage pointer uninitialized, it is not legal to
delete one.)

Calldata pointers don't have a default value; they're never uninitialized and
it's illegal to delete them.

<a name="user-content-types-overview-overview-of-the-types-pointer-types-table-of-pointer-types"></a>
#### Table of pointer types

| Type                                                 | Absolute or relative?        | Measured in... | Has second word for length? | Default value                                                  |
|------------------------------------------------------|------------------------------|----------------|-----------------------------|----------------------------------------------------------------|
| Pointer to storage                                   | Absolute                     | Words          | No                          | `0` (may be garbage, don't use!)                               |
| Pointer to memory                                    | Absolute                     | Bytes          | No                          | `0x60` for lookup types; no fixed default for multivalue types |
| Pointer to calldata from calldata                    | Relative (in an unusual way) | Bytes          | No                          | N/A                                                            |
| Pointer to calldata multivalue type from the stack   | Absolute                     | Bytes          | No                          | N/A                                                            |
| Pointer to calldata lookup type from the stack       | Absolute (with an offset)    | Bytes          | Yes                         | N/A                                                            |


<a name="user-content-locations-in-detail"></a>
## Locations in Detail
<sup>[ [&and;](#user-content-contents) _Back to contents_ ]</sup>

* [The stack in detail](#user-content-locations-in-detail-the-stack-in-detail)
    * [The stack: Direct types and pointer types](#user-content-locations-in-detail-the-stack-in-detail-the-stack-direct-types-and-pointer-types)
    * [The stack: data layout](#user-content-locations-in-detail-the-stack-in-detail-the-stack-data-layout)
* [Memory in detail](#user-content-locations-in-detail-memory-in-detail)
    * [Memory: Direct types and pointer types](#user-content-locations-in-detail-memory-in-detail-memory-direct-types-and-pointer-types)
    * [Memory: Multivalue types](#user-content-locations-in-detail-memory-in-detail-memory-multivalue-types)
    * [Memory: Lookup types](#user-content-locations-in-detail-memory-in-detail-memory-lookup-types)
    * [Pointers to memory](#user-content-locations-in-detail-memory-in-detail-pointers-to-memory)
* [Calldata in detail](#user-content-locations-in-detail-calldata-in-detail)
    * [Slots in calldata and the offset](#user-content-locations-in-detail-calldata-in-detail-slots-in-calldata-and-the-offset)
    * [Calldata: Direct types and pointer types](#user-content-locations-in-detail-calldata-in-detail-calldata-direct-types-and-pointer-types)
    * [Calldata: Multivalue and lookup types (reference types)](#user-content-locations-in-detail-calldata-in-detail-calldata-multivalue-and-lookup-types-reference-types)
        * [The special variable `msg.data`](#user-content-locations-in-detail-calldata-in-detail-calldata-multivalue-and-lookup-types-reference-types-the-special-variable-msg-data)
    * [Pointers to calldata](#user-content-locations-in-detail-calldata-in-detail-pointers-to-calldata)
    * [Pointers to calldata from calldata](#user-content-locations-in-detail-calldata-in-detail-pointers-to-calldata-from-calldata)
    * [Pointers to calldata from the stack](#user-content-locations-in-detail-calldata-in-detail-pointers-to-calldata-from-the-stack)
* [Storage in detail](#user-content-locations-in-detail-storage-in-detail)
    * [Storage: Data layout](#user-content-locations-in-detail-storage-in-detail-storage-data-layout)
    * [Storage: Direct types](#user-content-locations-in-detail-storage-in-detail-storage-direct-types)
    * [Storage: Multivalue types](#user-content-locations-in-detail-storage-in-detail-storage-multivalue-types)
    * [Storage: Lookup types](#user-content-locations-in-detail-storage-in-detail-storage-lookup-types)
    * [Pointers to storage](#user-content-locations-in-detail-storage-in-detail-pointers-to-storage)

<a name="user-content-locations-in-detail-the-stack-in-detail"></a>
### The stack in detail
<sup>[ [&and;](#user-content-locations-in-detail) _Back to Locations in Detail_ ]</sup>

The stack, as [mentioned above](#user-content-types-overview-types-and-locations), can hold only direct types and pointer types.
It's also the one location other than storage that we will access directly
rather than through storage, so we'll take some time to discuss data layout
on the stack.

<a name="user-content-locations-in-detail-the-stack-in-detail-the-stack-direct-types-and-pointer-types"></a>
#### The stack: Direct types and pointer types

The stack is, as mentioned above, is a [padded
location](#user-content-types-overview-overview-of-the-types-direct-types-basics-of-direct-types-packing-and-padding), so all direct types are
padded to a full word in the manner described in the [direct types
table](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types).

There are two special cases that must be noted here, that each take up two words
instead of one.  The first special case is that of external functions.  An
external function is represented by a 20-byte address and a 4-byte selector;
these are stored in two separate words, with the address in the bottom word and
the selector in the top word.  Both these are zero-padded on the *left*, not the
right [like in the other padded locations](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types).

The second two-word special case is that of pointers to calldata lookup types;
see the section on [pointers to calldata from the
stack](#user-content-locations-in-detail-calldata-in-detail-pointers-to-calldata-pointers-to-calldata-from-the-stack) for details.

<a name="user-content-locations-in-detail-the-stack-in-detail-the-stack-data-layout"></a>
#### The stack: data layout

Stack variables are local variables, so naturally things will change as the
contract executes.  But, we can still describe how things are at any given
time.  Note that if you are actually writing a debugger, you may want to rely
on other systems to determine data layout on the stack.

The stack is of course not used only for storing local variables, but also as a
working space.  And of course it also holds return addresses.  The stack is
divided into stackframes; each stackframe begins with the return address.
(There is no frame pointer, for those used to such a thing; just a return
address.)  The exception is constructors, which do not include a return
address.  In addition, if the initial function call (i.e. stackframe) of the
EVM stackframe (i.e. message call or creation call) is not a constructor or
fallback function, the function selector will be stored on the stack below the
first stackframe.

Note that only function calls create new stackframes; function modifiers and
base constructor invocations (whether placed on the constructor or on the
contract) do not create new stackframes.

Within each stackframe, all variables are always stored below the workspace. So
while the workspace may be unpredictable, we can ignore it for the purposes of
data layout within a given stackframe.  (Of course, the workspace in one
stackframe does come between that stackframe's variables and the start of the
next stackframe.)

Restricting our attention the variables, then, the stack acts, as expected, as
a stack; variables are pushed onto it when needed, and are popped off of it
when no longer needed.  These pushes and pops are arranged in a way that is
compatible with the stack structure; i.e., they are in fact pushes and pops.

The parameters of the function being called, including output parameters, are
pushed onto the stack when the function is called and the stackframe is
entered, and are not popped until the function, *including all modifiers*,
exits.  It's necessary here to specify the order they go onto the stack.  First
come the input parameters, in the order they were given, followed by the output
parameters, in the order they were given.  Anonymous output parameters are
treated the same as named output parameters for these purposes.

Ordinary local variables, as declared in a function or modifier, have a are
pushed onto the stack at their declaration and are popped when their containing
block exits (for variables declared in the initializer of a `for` loop, the
containing block is considered to be the `for` loop).  If multiple variables
are declared within a single statement, they go on the stack in the order they
were declared within that statement.

Parameters to a modifier are pushed onto the stack when that modifier begins
and are popped when that modifier exits.  Again, they go in the stack in the
order they were given.  Note that (like other local variables declared in
modifiers) these variables are still on the stack while the placeholder
statement `_;` is running, even if they are inaccessible.  Remember that
modifiers are run in order from left to right.

This leaves the case of parameters to base constructor invocations (whether on
the constructor or on the contract).  When a constructor is called, after its
parameters' lifetimes have begun (after they are put on the stack), all
parameters to all of its (direct) base constructor calls are pushed onto the
stack.  They go on in order from left to right; that is, the order of the
parameters within each base constructor call is from left to right, and the
order of the base constructor calls' parameter regions is from left to right as
well.  When a base constructor call exits, its parameters are popped from the
stack (remember that base constructor calls are run in order from right to
left).

<a name="user-content-locations-in-detail-memory-in-detail"></a>
### Memory in detail
<sup>[ [&and;](#user-content-locations-in-detail) _Back to Locations in Detail_ ]</sup>

We won't discuss layout in memory since, as mentioned, we only access it via
pointers.  We'll break this down into sections depending on what type of
variable we're looking at.

*Remark*: Although memory objects ordinarily start on a word, there is a bug in
versions 0.5.3, 0.5.5, and 0.5.6 of Solidity specifically that can occasionally cause them to
start in the middle of a word.  In this case, for the purposes of decoding that
object, you should consider slots to begin at the beginning of that object. (Of
course, once you follow a pointer, you'll have to have your slots based on that
pointer.  Again, since we only access memory through pointers, this is mostly
not a concern, and it only happens at all in those specific versions of Solidity.)

<a name="user-content-locations-in-detail-memory-in-detail-memory-direct-types-and-pointer-types"></a>
#### Memory: Direct types and pointer types

Memory is a [padded location](#user-content-types-overview-overview-of-the-types-direct-types-basics-of-direct-types-packing-and-padding), so
direct types are padded as [described in their table](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types).
Pointers, as mentioned above, always take up a full word.

<a name="user-content-locations-in-detail-memory-in-detail-memory-multivalue-types"></a>
#### Memory: Multivalue types

A multivalue type in memory is simply represented by concatenating together the
representation of its elements; with the exceptions that elements of reference
type (both multivalue and lookup types), other than mappings, are [represented
as pointers](#user-content-locations-in-detail-memory-in-detail-pointers-to-memory); and that elements of `mapping` type are
simply omitted, as mappings cannot appear in memory.  As such, each non-mapping
element takes up exactly one word (because direct types are padded and all
reference types are stored as pointers).  Elements of structs go in the order
they're specified in.

Note that is possible to have in memory a struct that contains *only* mappings;
such a struct doesn't really have a representation in memory, since in memory it
has zero length (although it seems that it may be represented internally by a
single word of all zeroes).  Of course, since we only access memory through
pointers, if we are given a pointer to such a struct, we need not decode
anything, as all of the struct's elements have been omitted.

Note that it is possible to have circular structs -- not just circular struct
types, but actual circular structs -- in memory.  This is not possible in any
other location.

<a name="user-content-locations-in-detail-memory-in-detail-memory-lookup-types"></a>
#### Memory: Lookup types

There are two lookup types that can go in memory: `type[]` and `bytes` (there is
also `string`, but [we will not treat that separately from
`bytes`](#user-content-types-overview-overview-of-the-types-lookup-types)).

A dynamic array of type `type[]` is represented by a slot containing the length
of the array (call it `n`), followed immediately by the array itself,
represented just as if it were an array of type `type[n]`; see the [section
above](#user-content-locations-in-detail-memory-in-detail-memory-multivalue-types).

A `bytes` is represented by a slot containing the length of the bytestring,
followed by a sequence of slots containing the bytestring; the bytes in the
string are *not* individually padded, but rather are simply stored in sequence.
Since the last slot may not contain a full 32 bytes, it is zero-padded on the
right.

*Remark*: In a few specific versions of Solidity, there is a bug that can cause
particular `bytes` and `string`s to lack the padding on the end, resulting in the alignment bug
[mentioned above](#user-content-locations-in-detail-memory-in-detail).


<a name="user-content-locations-in-detail-memory-in-detail-pointers-to-memory"></a>
#### Pointers to memory

Pointers to memory are absolute and given in bytes.  Since memory is padded, all
pointers will point to the start of a word and thus be a multiple of `0x20`.
(With the exception, [mentioned above](#user-content-locations-in-detail-memory-in-detail),
of some pointers in some specific versions of Solidity.)

The pointer `0x60` is something of a null pointer; it points to a reserved slot
which is always zero.  By the previous section, this slot can therefore
represent any empty variable of lookup type in memory, and in fact it's used as
a default value for memory pointers of lookup type.

<a name="user-content-locations-in-detail-calldata-in-detail"></a>
### Calldata in detail
<sup>[ [&and;](#user-content-locations-in-detail) _Back to Locations in Detail_ ]</sup>

Calldata is largely the same as [memory](#user-content-locations-in-detail-memory-in-detail); so rather than
describing calldata from scratch, we will simply describe how it differs from
memory.

Importantly, we will use a different convention when talking about "slots" in
calldata; see the [following subsection](#user-content-locations-in-detail-calldata-in-detail-slots-in-calldata-and-the-offset).
(Although it's not *that* important, since, like with memory, we only access
calldata through pointers.  You just don't want to find yourself surprised by
it.)

<a name="user-content-locations-in-detail-calldata-in-detail-slots-in-calldata-and-the-offset"></a>
#### Slots in calldata and the offset

The first four bytes of calldata are the function selector, and are not followed
by any padding.  As such, in calldata, we consider words and slots to begin not
on the [usual word boundaries](#user-content-locations-basics) (multiples of `0x20`) but
rather to begin offset by 4-bytes; "slots" in calldata will begin at bytes whose
address is congruent to `0x4` modulo `0x20`.  (Since calldata is byte-based
rather than word-based, this offset is not disastrous like it would be in, say,
storage.)

Because we will only access calldata through pointers, this offset is not that
relevant, but it is worth noting.

Also note that in constructors, there is no 4-byte offset, but that's because in
constructors, calldata is empty (the special variable `msg.sig` is padded to
contain 4 zero bytes).  Parameters passed to constructors actually go in *code*
rather than calldata -- and are represented the same way but with a different
offset -- but since we will only deal with them once they have been copied onto
the stack or into memory, we will ignore this.

<a name="user-content-locations-in-detail-calldata-in-detail-calldata-direct-types-and-pointer-types"></a>
#### Calldata: Direct types and pointer types

Direct types are the [same as in memory](#user-content-locations-in-detail-memory-in-detail-memory-direct-types-and-pointer-types).
Nothing more needs to be said. [Pointers to calldata](#user-content-locations-in-detail-calldata-in-detail-pointers-to-calldata)
are a bit different from
[pointers to memory](#user-content-locations-in-detail-memory-in-detail-pointers-to-memory),
but you can see below about that.

<a name="user-content-locations-in-detail-calldata-in-detail-calldata-multivalue-and-lookup-types-reference-types"></a>
#### Calldata: Multivalue and lookup types (reference types)

In order to understand reference types in calldata, we need the distinction of
*static* and *dynamic* types that was [introduced earlier](#user-content-types-overview-terminology).

With that in hand, then, variables of reference type in calldata are stored
similarly to in memory ([1](#user-content-locations-in-detail-memory-in-detail-memory-multivalue-types),
[2](#user-content-locations-in-detail-memory-in-detail-memory-lookup-types)), with the difference that any of their elements of
static reference type are *not* stored as pointers, but are simply stored
inline; so unlike in memory, elements may take up multiple words.  Elements of
dynamic type are still stored as pointers (but see the [section
below](#user-content-locations-in-detail-calldata-in-detail-pointers-to-calldata) about how those work).

Also, structs that contain mappings are entirely illegal in calldata, unlike
in memory where the mappings are simply omitted.

<a name="user-content-locations-in-detail-calldata-in-detail-calldata-multivalue-and-lookup-types-reference-types-the-special-variable-msg-data"></a>
##### The special variable <code>msg.data</code>

While I've thus far avoided discussing special variables, it's worth pausing
here to discuss the special variable `msg.data`, the one special variable of
reference type.  It is a `bytes calldata`.  But it's not represented like other
variables of type `bytes calldata`, is it?  It's not some location in calldata
with the number of bytes followed by the string of bytes; it simply *is* all of
calldata.  Accesses to it are simply accesses to the string of bytes that is
calldata.  (This might raise some problems if it were possible to assign to a
variable holding a pointer to calldata, but it isn't.)

This raises the question: Given that calldata is of variable length, where is
the length of `msg.data` stored?  The answer, of course, is that this length is
what is returned by the `CALLDATASIZE` instruction.  This instruction could be
considered something of a special location, and indeed many of the Solidity
language's special [globally available
variables](https://solidity.readthedocs.io/en/v0.5.2/units-and-global-variables.html)
are "stored" in such special locations, each with their own EVM opcode.

We have thus far ignored these special locations here and how they are encoded.
However, since [the variables kept in these other special
locations](https://solidity.readthedocs.io/en/v0.5.2/units-and-global-variables.html#block-and-transaction-properties)
are all of type `uint256` or `address payable`; these special locations are
word-based rather than byte-based (to the extent that distinction is meaningful
here); and values from these special locations will always be copied to the
(also word-based) stack before use, there is little to say about encoding in
these special locations.   One could say that addresses are, as always,
zero-padded on the left, and that integers are, as always, stored in binary; and
these statements would be true in a sense, but also largely meaningless.

Anyway, none of this is really relevant here, so let's move on from this
digression and discuss pointers to calldata.

<a name="user-content-locations-in-detail-calldata-in-detail-pointers-to-calldata"></a>
#### Pointers to calldata

Pointers to calldata are different depending on whether they are from calldata
or from the stack; and pointers to calldata from the stack are different
depending on whether they point to a multivalue type or to a lookup type.

Note, by the way, that there is no need for any sort of
[null pointer](#user-content-locations-in-detail-pointers-to-memory) in calldata, and so no equivalent exists.
(Variables in calldata of lookup type may be empty, of course, but distinct
empty calldata variables are kept separate from another, not coalesced into a
single null location like in memory.)

<a name="user-content-locations-in-detail-calldata-in-detail-pointers-to-calldata-from-calldata"></a>
#### Pointers to calldata from calldata

Pointers to calldata from calldata are relative, though in a slightly unusual
manner.  They are also given in bytes, but are relative not to the current
location, but rather to the [structure they are a part
of](#user-content-locations-in-detail-calldata-in-detail-calldata-multivalue-and-lookup-types-reference-types) (since they never
stand alone.)

For pointers to calldata stored in variables of multivalue type, the pointer is
relative to the start of that containing variable.

For pointers to calldata stored in variables of lookup type, the pointer is
relative to the start of the list of elements, i.e., the word *after* the length.

Or, to put it differently, either way it is always relative to the start of the
list of elements it is contained in.

Note that pointers to calldata from calldata will always be multiples of `0x20`,
since calldata, like memory, is padded (and these pointers are relative rather
than absolute).

<a name="user-content-locations-in-detail-calldata-in-detail-pointers-to-calldata-from-the-stack"></a>
#### Pointers to calldata from the stack

Pointers to a calldata multivalue types from the stack work just like [pointers
to memory](#user-content-locations-in-detail-pointers-to-memory): They are
absolute, given in bytes, and always point to the start of a word.  In
calldata, though, the [start of a word](#user-content-locations-in-detail-calldata-in-detail-slots-in-calldata-and-the-offset)
is congruent to `0x4` modulo `0x20`, rather than being a multiple of `0x20`.

Pointers to calldata lookup types from the stack take up two words on the stack
rather than just one.  The bottom word is a pointer -- absolute and given in
bytes -- but points not to the word containing the length, but rather the start
of the content, i.e., the word after the length (as described in the section on
[lookup types in memory](#user-content-locations-in-detail-memory-in-detail-memory-lookup-types)), since [lookup types in
calldata](#user-content-locations-in-detail-calldata-in-detail-calldata-multivalue-and-lookup-types-reference-types) are
similar).  The top word contains the length.  Note, obviously, that if the length is
zero then the value of the pointer is irrelevant (and the word it points to may
contain unrelated data).


<a name="user-content-locations-in-detail-storage-in-detail"></a>
### Storage in detail
<sup>[ [&and;](#user-content-locations-in-detail) _Back to Locations in Detail_ ]</sup>

Storage, unlike the other locations mentioned thus far, is a
[packed](#user-content-types-overview-overview-of-the-types-direct-types-basics-of-direct-types-packing-and-padding), not padded, location.
The sizes in bytes of the direct types can be found in the [direct types
table](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types).

Storage is the one location other than the stack where we sometimes access
variables directly rather than through pointers, so we will begin by describing
data layout in storage.

<a name="user-content-locations-in-detail-storage-in-detail-storage-data-layout"></a>
#### Storage: Data layout

First, we consider the case of a contract that does not inherit from any others.

In this case, Variables in storage are always laid out in the order that they were declared,
starting from the beginning of storage.  However, within a word, variables are
laid out from *right to left*, not left to right (with one sort-of-exception to
be [described later](#user-content-locations-in-detail-storage-in-detail-storage-lookup-types)).  Variables of direct type may not
cross a word boundary; if there is not enough room left at the top of a word for
what comes next, the unused space at the top of the word remains filled with
zeroes, and the next variable starts at the bottom of the next word.

Note that this right-to-left orientation does not mean that the representations
of direct types themselves are in any way reversed, only the order they're laid
out in within a word.

Vaiables of lookup type are, for this purpose, regarded as taking up one word;
see the [subsection on lookup types](#user-content-locations-in-detail-storage-in-detail-storage-lookup-types) for more
information.

Variables of multivalue type must start on a word boundary, and always occupy
whole words (i.e. the next variable after must start on a word boundary).

Variables declared `constant` are skipped; these variables are optimized out by
the compiler.

Subject to the above restrictions, every variable is placed as early as
possible.

Now, we consider inheritance.

In cases of inheritance, the variables of the base class go before those of the
derived class.  Note that there is *not* any sort of barrier between the
variables of the base class and those of the derived class; variables of the
base class and variables of the derived class may share a slot (so the first
variable of the derived class need not start on a slot boundary).

In cases of multiple inheritance, Solidity uses the [C3
linearization](https://en.wikipedia.org/wiki/C3_linearization) to order classes
from "most base" to "most derived", and then, as mentioned above, lays out
variables starting with the most base and ending with the most derived.
(Remember that, when listing parent classes, Solidity considers parents listed
*first* to be "more base"; as the [Solidity docs
note](https://solidity.readthedocs.io/en/v0.5.2/contracts.html#multiple-inheritance-and-linearization),
this is the reverse order from, say, Python.)

<a name="user-content-locations-in-detail-storage-in-detail-storage-direct-types"></a>
#### Storage: Direct types

The layout of direct types has already been described
[above](#user-content-locations-in-detail-storage-in-detail-storage-data-layout), and the sizes of the direct types are found in the
[direct types table](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types).  Note that there are [no pointer
types in storage](#user-content-types-overview-overview-of-the-types-pointer-types).

<a name="user-content-locations-in-detail-storage-in-detail-storage-multivalue-types"></a>
#### Storage: Multivalue types

Variables of multivalue type simply have the elements stored consecutively
within storage -- they are packed within the multivalue type [just as variables
are packed within storage](#user-content-locations-in-detail-storage-in-detail-storage-data-layout).  The rules are exactly the same.

Again, remember that variables of multivalue type must occupy whole words; they
start on a word boundary, and whatever comes after starts on a word boundary
too.  And, obviously, this applies to variables of multivalue type *within*
another variable of multivalue type since, as mentioned, the rules are exactly
the same.   (But I thought that case was worth highlighting.)

<a name="user-content-locations-in-detail-storage-in-detail-storage-lookup-types"></a>
#### Storage: Lookup types

There are three lookup types that can go in storage: `type[]`, `bytes` (and
`string`, but [again we will not treat that
separately](#user-content-types-overview-overview-of-the-types-lookup-types)), and `mapping(keyType =>
elementType)`.

As [mentioned above](#user-content-locations-in-detail-storage-in-detail-storage-data-layout), we regard each lookup type as taking
up one word; we will call this the "main word".

For `type[]`, i.e. an array, the main word contains the length of the array.
Suppose the main word is in slot `p` and the length it contains is `n`.  Then
the array itself is stored exactly as if it were an array of type `type[n]`
([see section above](#user-content-locations-in-detail-storage-in-detail-storage-multivalue-types)), except that it starts in the
slot `keccak256(p)`.

(Yes, that is the *position* being used; no explicit pointer to the array
location is stored.  Other lookup types will be similar in this regard.)

For `bytes`, if the length (call it `n`) is less than 32, the low byte of the
main word contains `n<<1`, and the string of bytes itself is stored in the same
word, in sequence from *left to right*; any unused space within the word is left
as zero.

If, on the other hand, the length `n` is at least 32, then the low byte of the
main word contains `(n<<1)|0x1`, and the string of bytes is stored starting in
the slot `keccak256(p)`, where `p` is the position of the main word.  This
bytestring, too, goes from *left to right* within words, but (like an array) can
take up as many words as necessary.  Again, any unused space left within the
last word is left as zero.

(Type `bytes` (and `string`) is the one sort-of-exception I mentioned to the
[right-to-left rule within storage](#user-content-locations-in-detail-storage-in-detail-storage-data-layout).)

Finally, we have mappings.  For mappings, the main word itself is unused and
left as zero; only its position `p` is used.  Mappings, famously, do not store
what keys exist; keys that don't exist and keys whose corresponding element is
`0` (which is always the encoding of the default value
([1](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types), [2](#user-content-types-overview-overview-of-the-types-multivalue-types),
[3](#user-content-types-overview-overview-of-the-types-lookup-types), [4](#user-content-locations-in-detail-storage-in-detail-storage-multivalue-types),
[5](#user-content-locations-in-detail-storage-in-detail-storage-lookup-types)) for anything in storage) are treated the same.

For a mapping `map` and a key `key`, then, the element `map[key]` is stored
starting at `keccak256(key . p)`, where `.` represents concatenation and `key`
here has been converted to a string of bytes -- something that is meaningful
for every [elementary type](#user-content-types-overview-overview-of-the-types-lookup-types) (the
legal key types).  For the elementary types which are direct, the padded form
is used; the value can be converted to a string of bytes by the representations
listed in the [section on direct types](#user-content-types-overview-overview-of-the-types-direct-types-representations-of-direct-types),
with the padding as listed in the [direct types table](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types);
for the lookup elementary type `bytes` ([and `string`](#user-content-types-overview-overview-of-the-types-lookup-types)),
well, this by itself represents a string of bytes!  (No padding is applied to
these.)  Similarly, the position `p` is regarded as a 32-byte unsigned integer,
because that is how storage locations are accessed.

Note that if an element of a mapping is of direct type, this means it will
always start on a slot boundary, even if it doesn't normally have to.  In any
case, regardless of type, the element is stored [exactly the same as it would be
anywhere else in storage](#user-content-locations-in-detail-storage-in-detail).

<a name="user-content-locations-in-detail-storage-in-detail-pointers-to-storage"></a>
#### Pointers to storage

Pointers to storage are absolute and are measured in words (slots), not bytes.
(Such pointers are most easily regarded as pointing to the full slot, rather
than a byte position within it; if you like, though, you can imagine it pointing
to the *latest* position within the word, rather than the earliest, in
accordance with the [right-to-left nature of storage multivalue
types](#user-content-locations-in-detail-storage-in-detail-storage-multivalue-types), and the [use of the low
byte](#user-content-locations-in-detail-storage-in-detail-storage-lookup-types) in types `bytes` and `string`.)  This might seem to
limit the locations such a pointer can point to; however, pointers to storage
will always point to a variable of multivalue or lookup type, and such variables
always start on a word boundary, so there is no problem here.

Note that pointers to storage have a default value of `0x0`.  As stated earlier,
one must beware -- making use of such a pointer *can* lead to nonsense!  Such a
pointer should not actually be used.  (And note again that while it is legal to
leave a storage pointer uninitialized, it is not legal to delete one.)


---

<p align="center">
⚡
</p>

---
