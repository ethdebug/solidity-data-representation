### The stack in (some) detail
{"gitdown": "scroll-up", "upRef": "#user-content-locations-in-detail", "upTitle": "Back to Locations in Detail"}

The stack, as mentioned above, can hold only direct types and pointer types.

The stack is also, as mentioned above, is a [padded
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

The stack is a bit unpredictable in terms of data layout, as it's also used as
working space.  However, the location of local variables can be figured out by
other parts of the debugger, so we won't go into it here.  The location of
function parameters can also be figured out by the debugger, but we need to
discuss here the order in which such parameters go on the stack, so let us do
that.

Function parameters go on the bottom of a function's stackframe, directly above
the return address (if there is one -- constructors don't have them).  They go
in the order of first input parameters, in the order they were given, followed
by output parameters, in the order they were given.  Anonymous output parameters
are treated the same as named output parameters for these purposes.

### Memory in detail
{"gitdown": "scroll-up", "upRef": "#user-content-locations-in-detail", "upTitle": "Back to Locations in Detail"}

We won't discuss layout in memory since, as mentioned, we only access it via
pointers.  We'll break this down into sections depending on what type of
variable we're looking at.

#### Memory: Direct types and pointer types

Memory is a [padded location](#user-content-types-overview-overview-of-the-types-direct-types-basics-of-direct-types-packing-and-padding), so
direct types are padded as [described in their table](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types).
Pointers, as mentioned above, always take up a full word.

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

#### Pointers to memory

Pointers to memory are absolute and given in bytes.  Since memory is padded, all
pointers will point to the start of a word and thus be a multiple of `0x20`.

The pointer `0x60` is something of a null pointer; it points to a reserved slot
which is always zero.  By the previous section, this slot can therefore
represent any empty variable of lookup type in memory, and in fact it's used as
a default value for memory pointers of lookup type.

### Calldata in detail
{"gitdown": "scroll-up", "upRef": "#user-content-locations-in-detail", "upTitle": "Back to Locations in Detail"}

Calldata is largely the same as [memory](#user-content-locations-in-detail-memory-in-detail); so rather than
describing calldata from scratch, we will simply describe how it differs from
memory.

Importantly, we will use a different convention when talking about "slots" in
calldata; see the [following subsection](#user-content-locations-in-detail-calldata-in-detail-slots-in-calldata-and-the-offset).
(Although it's not *that* important, since, like with memory, we only access
calldata through pointers.  You just don't want to find yourself surprised by
it.)

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

#### Calldata: Direct types and pointer types

Direct types are the [same as in memory](#user-content-locations-in-detail-memory-in-detail-memory-direct-types-and-pointer-types).
Nothing more needs to be said. [Pointers to calldata](#user-content-locations-in-detail-calldata-in-detail-pointers-to-calldata)
are a bit different from
[pointers to memory](#user-content-locations-in-detail-memory-in-detail-pointers-to-memory),
but you can see below about that.

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

##### The special variable `msg.data`

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

#### Pointers to calldata

Pointers to calldata are different depending on whether they are from calldata
or from the stack; and pointers to calldata from the stack are different
depending on whether they point to a multivalue type (i.e. a `type[n]`) or to a
lookup type.

Note, by the way, that there is no need for any sort of
[null pointer](#user-content-locations-in-detail-pointers-to-memory) in calldata, and so no equivalent exists.
(Variables in calldata of lookup type may be empty, of course, but distinct
empty calldata variables are kept separate from another, not coalesced into a
single null location like in memory.)

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

#### Pointers to calldata from the stack

Pointers to a `type[n] calldata` (the only legal multivalue type in calldata,
presently) from the stack work like [pointers to memory](#user-content-locations-in-detail-pointers-to-memory):
They are absolute, given in bytes, and always point to the start of a word.  In
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

### Storage in detail
{"gitdown": "scroll-up", "upRef": "#user-content-locations-in-detail", "upTitle": "Back to Locations in Detail"}

Storage, unlike the other locations mentioned thus far, is a
[packed](#user-content-types-overview-overview-of-the-types-direct-types-basics-of-direct-types-packing-and-padding), not padded, location.
The sizes in bytes of the direct types can be found in the [direct types
table](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types).

Variables in storage are always laid out in the order that they were declared,
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

#### Storage: Inheritance

Before we move on to the individual types, we must discuss the matter of
inheritance.

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

#### Storage: Direct types

The layout of direct types has already been described
[above](#user-content-locations-in-detail-storage-in-detail), and the sizes of the direct types are found in the
[direct types table](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types).  Note that there are [no pointer
types in storage](#user-content-types-overview-overview-of-the-types-pointer-types).

#### Storage: Multivalue types

Variables of multivalue type simply have the elements stored consecutively
within storage -- they are packed within the multivalue type [just as variables
are packed within storage](#user-content-locations-in-detail-storage-in-detail).  The rules are exactly the same.

Again, remember that variables of multivalue type must occupy whole words; they
start on a word boundary, and whatever comes after starts on a word boundary
too.  And, obviously, this applies to variables of multivalue type *within*
another variable of multivalue type since, as mentioned, the rules are exactly
the same.   (But I thought that case was worth highlighting.)

#### Storage: Lookup types

There are three lookup types that can go in storage: `type[]`, `bytes` (and
`string`, but [again we will not treat that
separately](#user-content-types-overview-overview-of-the-types-lookup-types)), and `mapping(keyType =>
elementType)`.

As [mentioned above](#user-content-locations-in-detail-storage-in-detail), we regard each lookup type as taking
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
[right-to-left rule within storage](#user-content-locations-in-detail-storage-in-detail).)

Finally, we have mappings.  For mappings, the main word itself is unused and
left as zero; only its position `p` is used.  Mappings, famously, do not store
what keys exist; keys that don't exist and keys whose corresponding element is
`0` (which is always the encoding of the default value
([1](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types), [2](#user-content-types-overview-overview-of-the-types-multivalue-types),
[3](#user-content-types-overview-overview-of-the-types-lookup-types), [4](#user-content-locations-in-detail-storage-in-detail-storage-multivalue-types),
[5](#user-content-locations-in-detail-storage-in-detail-storage-lookup-types)) for anything in storage) are treated the same.

For a mapping `map` and a key `key`, then, the element `map[key]` is stored
starting at `keccak256(key . p)`, where `.` represents concatenation and `key`
here has been converted to a string of bytes -- something that is meaningful for
every [elementary type](#user-content-types-overview-overview-of-the-types-lookup-types) (the legal key
types).  For the elementary types which are direct, the value can be converted
to a string of bytes by the representations listed in the [section on direct
types](#user-content-types-overview-overview-of-the-types-direct-types-representations-of-direct-types), with the lengths as listed in the
[direct types table](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types); for the lookup elementary type
`bytes` ([and `string`](#user-content-types-overview-overview-of-the-types-lookup-types)), well, this by
itself represents a string of bytes!  Similarly, the position `p` is regarded as
a 32-byte unsigned integer, because that is how storage locations are accessed.

Note that if an element of a mapping is of direct type, this means it will
always start on a slot boundary, even if it doesn't normally have to.  In any
case, regardless of type, the element is stored [exactly the same as it would be
anywhere else in storage](#user-content-locations-in-detail-storage-in-detail).

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