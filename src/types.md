### Terminology
{"gitdown": "scroll-up", "upRef": "#user-content-types-overview", "upTitle": "Back to Types Overview"}

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

The term *reference types* refers collectively to multivalue and lookup types.

A *static type* is either
1. A direct type, or
2. A multivalue type, all of whose element variables are also of static type.

(*Remark*: In pre-0.5.0 versions of Solidity, when static-length of arrays of
length 0 were allowed, these were automatically static regardless of the base
type, since, after all, there are no element variables.)

A *dynamic type* is any type that is not static.  (Pointers don't fit into this
dichotomy, not being an actual Solidity type.)

We'll also use the term *key types* to denote types that can be used as
mapping keys.  See the
[section on lookup types](#user-content-types-overview-overview-of-the-types-lookup-types) for more on
these.

Finally, to avoid confusion with other meanings of the word "value", I'm going
to speak of "keys and elements" rather than "keys and values"; I'm going to
consistently speak of "elements" rather than "values" or "children" or
"members".

### Types and locations
{"gitdown": "scroll-up", "upRef": "#user-content-types-overview", "upTitle": "Back to Types Overview"}

What types can go in what locations?

The stack can hold only direct types and pointer types.

Directly pointed-to variables living in memory or calldata can only be of
reference type, although their elements, also living in memory or calldata, can
of course also be of direct or pointer type.

Some types are not allowed in calldata, especially if `ABIEncoderV2` is not
being used; but we will assume it is.  Note, though, that circular types are never
allowed in calldata.

Only direct types may go in code as immutables; moreover, variables of type
`function external` cannot presently go in code this way.  (Nor can they go
in memory as immutables, when memory is being used to store immutables.)

In addition, the locations memory and calldata may not hold mappings, which may
go only in storage.  (However, structs that *contain* mappings, or that contain
(possibly multidimensional) arrays of mappings, were allowed in memory prior to
Solidity 0.7.0, though such mappings or arrrays would be omitted from the
struct; see [the section on
memory](#user-content-locations-in-detail-memory-in-detail-memory-lookup-types)
for more detail.)

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

#### Table of types and locations

| Location | Direct types                                       | Multivalue types                     | Lookup types            | Mappings and arrays of such in structs are... | Pointer types                                 |
|----------|----------------------------------------------------|--------------------------------------|-------------------------|-----------------------------------------------|-----------------------------------------------|
| Stack    | Yes                                                | No (only as pointers)                | No (only as pointers)   | N/A                                           | To storage, memory, or calldata               |
| Storage  | Yes                                                | Yes                                  | Yes                     | Legal                                         | No                                            |
| Memory   | Only as elements of other types or as immutables   | Yes                                  | Yes, excluding mappings | Illegal (omitted prior to 0.7.0)              | To memory (only as elements of other types)   |
| Calldata | Only as elements of other types, with restrictions | Yes, excluding circular struct types | Yes, excluding mappings | Illegal                                       | To calldata (only as elements of other types) |
| Code     | Yes, with restrictions                             | No                                   | No                      | N/A                                           | No                                            |

Note that with the exception of the special case of mappings (or possibly
multidimensional arrays of such) in structs, it is otherwise true that if the
type of some element of some given type is illegal in that location, then so is
the type as a whole.  Also, immutables in memory have the same restrictions that
they do in code.

### Overview of the types: Direct types
{"gitdown": "scroll-up", "upRef": "#user-content-types-overview", "upTitle": "Back to Types Overview"}

#### Basics of direct types: Packing and padding

With regard to direct types, storage is a packed location -- multiple variables
of direct type may share a storage slot, within which each variable only takes
up as much space as it need to; see the table below for information on sizes.
(Note that variables of direct type may not cross word boundaries.)

The stack, memory, calldata, and code, however, are padded locations -- each
variable of direct type always takes up a full slot.  (There are two exceptions
to this -- the individual `byte`s in a `bytes` or `string` are packed rather
than padded; and external functions take up *two* slots on the stack.  Both
these will be described in more detail later
([1](#user-content-locations-in-detail-memory-in-detail-memory-lookup-types),
[2](#user-content-locations-in-detail-the-stack-in-detail)).)  The exact method
of padding varies by type, as detailed in [the table
below](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types).
Note that immutables have slightly unusual padding, whether stored in code or
memory, as will be detailed later ([1](#user-content-locations-in-detail-code-in-detail-code-direct-types), [2](#user-content-locations-in-detail-memory-in-detail-memory-direct-types-and-pointer-types)).

(Again, note that for calldata we are using a somewhat unusual notion of slot;
[see the calldata
section](#user-content-locations-in-detail-calldata-in-detail-slots-in-calldata-and-the-offset)
for more information.)

#### Table of direct types

Here is a table of all the (general classes of) direct types and their key
properties.  Some of this information may not yet make sense if you have only
read up to this point.  See the [next section](#user-content-types-overview-overview-of-the-types-direct-types-representations-of-direct-types)
for more detail on how these types are actually represented.

| Type                     | Size in storage (bytes)                     | Padding in padded locations         | Default value                             | Is key type? | Allowed in calldata? | Allowed as immutable? | Can back a UDVT? |
|--------------------------|---------------------------------------------|-------------------------------------|-------------------------------------------|--------------|----------------------|-----------------------|------------------|
| `bool`                   | 1                                           | Zero padded, left                   | `false`                                   | Yes          | Yes                  | Yes                   | Yes              |
| `uintN`                  | N/8                                         | Zero-padded, left\*                 | 0                                         | Yes          | Yes                  | Yes                   | Yes              |
| `intN`                   | N/8                                         | Sign-padded, left\*                 | 0                                         | Yes          | Yes                  | Yes                   | Yes              |
| `address [payable]`      | 20                                          | Zero-padded, left\*                 | Zero address (not valid!)                 | Yes          | Yes                  | Yes                   | Yes              |
| `contract` types         | 20                                          | Zero-padded, left\*                 | Zero address (not valid!)                 | Yes          | Yes                  | Yes                   | Yes              |
| `bytesN`                 | N                                           | Zero-padded, right\*                | All zeroes                                | Yes          | Yes                  | Yes                   | No               |
| `enum` types             | As many as needed to hold all possibilities | Zero-padded, left                   | Whichever possibility is represented by 0 | Yes          | Yes                  | Yes                   | Yes              |
| `function internal`      | 8                                           | Zero-padded, left                   | Depends on location, but always invalid   | No           | No                   | Yes                   | No               |
| `function external`      | 24                                          | Zero-padded, right, except on stack | Zero address, zero selector (not valid!)  | No           | Yes                  | No                    | No               |
| `ufixedMxN`              | M/8                                         | Zero-padded, left\*                 | 0                                         | Yes          | Yes                  | Yes                   | Yes              |
| `fixedMxN`               | M/8                                         | Sign-padded, left\*                 | 0                                         | Yes          | Yes                  | Yes                   | Yes              |
| User-defined value types | Same as underlying type (except in 0.8.8)   | Same as underlying type\*           | Same as underlying type                   | Yes          | Yes                  | Yes                   | No               |

Some remarks:

1. As the table states, external functions act a bit oddly on the stack; see the
   [section on the stack](#user-content-locations-in-detail-the-stack-in-detail-the-stack-direct-types-and-pointer-types)
   for details.
2. In Solidity 0.8.8, there is a bug that caused user-defined value types to
   always take up one full word in storage, regardless of the size of the
   underlying type; they would be padded as if they were being stored in a
   padded location.
3. Prior to Solidity 0.8.9, padding worked a bit differently in code; in code, all types
   were zero-padded, even if they would ordinarily be sign-padded.  This did not affect
   which side they are padded on.
4. Prior to Solidity 0.8.9, padding also worked a bit differently for immutables
   stored in memory during contract construction.  In this context, all types
   used to be zero-padded on the right, regardless of their usual padding.
5. Some types are marked with an asterisk regarding their padding.  These types
   may have incorrect padding while on the stack due to operations that overflow.
   Solidity will always restore the correct padding when it is necessary to do so;
   however, it will not do this *until* it is necessary to do so.  So, be aware
   that on the stack these types may be padded incorrectly.
6. The `ufixedMxN` and `fixedMxN` types are not implemented yet.  Their listed
   properies are largely inferred based on what we can expect.
7. Some direct types have aliases; these have not been listed in the above table.
   `uint` and `int` are aliases for `uint256` and `int256`; `ufixed` and `fixed`
   for `ufixed128x18` and `fixed128x18`; and `byte` for `bytes1`.
8. Each direct type's default value is simply whatever value is represented by
   a string of all zero bytes, with the one exception of internal functions in
   locations other than storage.  See [below](#user-content-types-overview-overview-of-the-types-direct-types-representations-of-direct-types) for more on this.
9. The `N` in `uintN` and `intN` must be a multiple of 8, from 8 to 256.  The
   `M` in `ufixedMxN` and `fixedMxN` must be a multiple of 8, from 8 to 256,
   while `N` must be from 0 to 80.  The `N` in `bytesN` must be from 1 to 32.
10. Function types are, of course, more complex than just their division into
    `internal` and `external`; they also have input parameter types, output
    parameter types, and mutability modifiers (`pure`, `view`, `payable`).
    However, these will not concern us here, and we will ignore them.
 
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

Internal functions may be represented in one of two ways.  The bottom 4 bytes
represented by the code address (in bytes from the beginning of code) of the
beginning of said function (specifically, the `JUMPDEST` instruction that
begins it).  If the value was set outside a constructor, the 4 bytes above that
will be 0.  However, inside a constructor, the 4 bytes above that will instead
be the code address of the function inside the constructor code rather than the
deployed code.

For internal functions, default values are also worth discussing, as in
non-storage locations, they have a nonzero default value.  In contracts for
which Solidity deems it necessary, there will be a special designated invalid
function.  In Solidity 0.8.0 and later, this function throws a `Panic(0x51)`;
in earlier versions of Solidity, it uses the `INVALID` opcode, reverting the
transaction and consuming all available gas.
In versions of Solidity prior to 0.8.0, it has the bytecode `0x5bfe`; in Solidity
0.8.0 to 0.8.4, it has the bytecode
```
0x5b7f000000000000000000000000000000000000000000000000000000004e487b71600052605160045260246000fd
```
and in Solidity 0.8.5 and later, it is a function that just jumps directly to
a function with the latter bytecode (this jumped-to function may also be identified
by the fact that it is a generated Yul function with name `panic_error_0x51`).
As mentioned, in all cases, such a function is only included if Solidity
deems it necessary.
The default value for an internal function, then, outside of storage, is to point to
this designated invalid function.  In all other respects, these default values
are encoded as above.

*Remark*: Prior to Solidity 0.5.8 (or Solidity 0.4.26, in the 0.4.x line) there
was a bug causing the default value for internal functions to be incorrectly
encoded when it was set in a constructor.  It would have 0 for the upper 4
bytes, and would have as the lower 4 bytes what the upper 4 bytes should have
been.

External functions are represented by a 20-byte address and a 4-byte selector;
in locations other than the stack, this consists of first the 20-byte address
and then the 4-byte selector.  On the stack, however, it is more complicated.
See the [section on the stack](#user-content-locations-in-detail-the-stack-in-detail-the-stack-direct-types-and-pointer-types) for details.

`ufixedMxN` and `fixedMxN` are interpreted as follows: If interpreting as a
(`M`-bit, big-endian) binary number (unsigned or signed as appropriate) would
yield `k`, the result is interpreted as the rational number `k/10**N`.

User-defined value types are always backed by another type (see the
[table](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types)
for which types are allowed in this context).  Their representation is the same
as that of the underlying type.

#### Presently unstoreable functions

Some legal values of function type presently have no representation and so
cannot be stored in a variable.  These are:

1.  External functions with a specified amount of `gas` or `value` attached
    (even if that amount is zero).
2.  External functions of libraries -- including library functions declared
    `public` when not in that library -- because there is presently no way to
    represent that they should be called with `DELEGATECALL`, and because they may
    accept non-ABI types and thus have no signature according to the ABI
    specification. This similarly includes functions created by `using ... for ...`
    directives.
3.  Special functions defined by the language.  This means globally available
    functions; functions which are members of arrays; functions which are
    members of addresses; and functions which are members of external functions.

So, the question of how these are presently represented when stored, is that
they are not.  (There are other presently unstoreable functions, too, but since
their unstorability is due to other issues, we will not discuss them here.)

### Overview of the types: Multivalue types
{"gitdown": "scroll-up", "upRef": "#user-content-types-overview", "upTitle": "Back to Types Overview"}

The multivalue types are `type[n]` (here `n` must be positive), which has `n`
elements of type `type`; and the various user-defined `struct` types, whose
multiple element variables (of which there must be at least one) are as
specified in the appropriate `struct` definition, and occur in the order
specified there.

*Remark*: Prior to Solidity 0.5.0, it was legal to have `type[0]` or empty
structs.

Note that it is legal to include a `mapping` type, or a (possibly
multidimensional) array of mappings, as an element of a `struct` type; prior to
Solidity 0.7.0, this did *not* preclude the `struct` type from being used in
memory (even though, as per the following section, mappings cannot appear in
memory), but rather, the mapping (or array) would be simply omitted in memory.
See the [memory
section](#user-content-locations-in-detail-memory-in-detail-memory-lookup-types)
for more details.  Such a struct has always been barred from appearing in
calldata, however.

Also note that circular struct types are allowed, so long as the circularity is
mediated by a lookup type.  That is to say, if a struct type `T0` has a element
type `T1` which has a element type ... which has a element type `Tn` with `Tn`
equal to T0, this is legal only if at least one of the types `Ti` is a lookup
type.  However, such types are allowed only in storage and memory, not
calldata.

The default value for a multivalue type consists of assigning the default value
to each of its element variables.

(There's no table for this section as there would be little point.)

### Overview of the types: Lookup types
{"gitdown": "scroll-up", "upRef": "#user-content-types-overview", "upTitle": "Back to Types Overview"}

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
Only certain types are allowed as key types for mappings; these can roughly
be described as the "value types" together with `string` and `bytes`, but one should see
the appropriate tables to see which [direct](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types) or
[lookup](#user-content-types-overview-overview-of-the-types-lookup-types-table-of-lookup-types) types are key types.
Observe that key types may all be meaningfully converted to a string of
bytes.

The default value for a lookup type is for it to be empty.  For the particular
case of a `type[]` in memory, the default value once it has been initialized to
a particular size is for all its elements to have their default value.

The information above is also summarized in the following table.

#### Table of lookup types

| Type                              | Element type                                    | Restricted to storage? | Is key type? |
|-----------------------------------|-------------------------------------------------|------------------------|--------------|
| `type[]`                          | `type`                                          | No                     | No           |
| `mapping(keyType => elementType)` | `elementType`                                   | Yes                    | No           |
| `bytes`                           | `byte` (`bytes1`)                               | No                     | Yes          |
| `string`                          | N/A, but underlying `bytes` has `byte` elements | No                     | Yes          |

Note that mappings have other special features -- e.g., they cannot be copied or
deleted -- but we will not go into that here.

### Overview of the types: Pointer types
{"gitdown": "scroll-up", "upRef": "#user-content-types-overview", "upTitle": "Back to Types Overview"}

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

#### Table of pointer types

| Type                                                 | Absolute or relative?        | Measured in... | Has second word for length? | Default value                                                  |
|------------------------------------------------------|------------------------------|----------------|-----------------------------|----------------------------------------------------------------|
| Pointer to storage                                   | Absolute                     | Words          | No                          | `0` (may be garbage, don't use!)                               |
| Pointer to memory                                    | Absolute                     | Bytes          | No                          | `0x60` for lookup types; no fixed default for multivalue types |
| Pointer to calldata from calldata                    | Relative (in an unusual way) | Bytes          | No                          | N/A                                                            |
| Pointer to calldata multivalue type from the stack   | Absolute                     | Bytes          | No                          | Equal to the length of calldata                                |
| Pointer to calldata lookup type from the stack       | Absolute (with an offset)    | Bytes          | Yes                         | Equal to the length of calldata; length word equal to zero     |
